use crate::config::store::TlsConfig;
use std::sync::Once;

/// 实际拨号用的 Redis 端点。
///
/// SSH 隧道启用时 `host`/`port` 是本地转发地址，而不是用户填写的 Redis 地址。
/// Pub/Sub、MONITOR 和按 db 懒创建的连接都必须复用这份端点，禁止再直连配置里的 host。
#[derive(Debug, Clone)]
pub struct RedisEndpoint {
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub tls: Option<TlsConfig>,
    /// 流量经 SSH 本地转发拨出时，证书主机名与 `127.0.0.1` 不一致。
    pub via_ssh_tunnel: bool,
}

/// rustls 0.23 在第一次 TLS 握手前必须安装 CryptoProvider。
pub fn install_rustls_provider() {
    static ONCE: Once = Once::new();
    ONCE.call_once(|| {
        let _ = rustls::crypto::ring::default_provider().install_default();
    });
}

impl RedisEndpoint {
    pub fn tls_enabled(&self) -> bool {
        self.tls.as_ref().is_some_and(|tls| tls.enabled)
    }

    /// 打开一个按 `db` 钉死的客户端。连接 URL 的 path 就是数据库编号，调用方不应再 SELECT。
    pub fn open_client(&self, db: u32) -> Result<redis::Client, String> {
        install_rustls_provider();
        let scheme = if self.tls_enabled() {
            "rediss"
        } else {
            "redis"
        };
        let skip_verify = self.tls.as_ref().is_some_and(|tls| tls.skip_verify);
        let insecure = tls_uses_insecure(self.tls_enabled(), skip_verify, self.via_ssh_tunnel);
        let url = redis_url(
            scheme,
            &self.host,
            self.port,
            self.username.as_deref(),
            self.password.as_deref(),
            db,
            insecure,
        )?;

        if self.tls_enabled() {
            let certs = load_tls_certificates(self.tls.as_ref())?;
            redis::Client::build_with_tls(url, certs)
                .map_err(|e| sanitize_redis_error(&e.to_string()))
        } else {
            redis::Client::open(url).map_err(|e| sanitize_redis_error(&e.to_string()))
        }
    }

    pub async fn open_manager(&self, db: u32) -> Result<redis::aio::ConnectionManager, String> {
        let client = self.open_client(db)?;
        client
            .get_connection_manager()
            .await
            .map_err(|e| sanitize_redis_error(&e.to_string()))
    }
}

/// TLS 是否走 redis-rs 的 `#insecure`。
///
/// `skip_verify` 是用户显式关闭校验。SSH 隧道还必须跳过主机名校验，
/// 因为 TCP 拨的是本地转发端口，证书通常签给真实 Redis 主机名。
pub fn tls_uses_insecure(tls_enabled: bool, skip_verify: bool, via_ssh_tunnel: bool) -> bool {
    tls_enabled && (skip_verify || via_ssh_tunnel)
}

/// 构建 Redis URL。`insecure` 为 true 时追加 `#insecure`，供 rustls 跳过证书主机名校验。
pub fn redis_url(
    scheme: &str,
    host: &str,
    port: u16,
    username: Option<&str>,
    password: Option<&str>,
    db: u32,
    insecure: bool,
) -> Result<String, String> {
    let mut url = url::Url::parse(&format!("{scheme}://{host}:{port}/{db}"))
        .map_err(|_| "error.connection.invalid_url".to_string())?;
    if let Some(user) = username {
        url.set_username(user)
            .map_err(|_| "error.connection.invalid_url".to_string())?;
    }
    if let Some(pwd) = password {
        url.set_password(Some(pwd))
            .map_err(|_| "error.connection.invalid_url".to_string())?;
    }
    if insecure {
        url.set_fragment(Some("insecure"));
    }
    Ok(url.to_string())
}

/// 对包含 Redis URL 的错误信息进行脱敏，防止密码泄露到前端或日志。
pub fn sanitize_redis_error(err: &str) -> String {
    let re = regex::Regex::new(r"(redis(?:s)?://)[^@\s]+@").unwrap();
    re.replace_all(err, "${1}***@").to_string()
}

fn load_tls_certificates(tls: Option<&TlsConfig>) -> Result<redis::TlsCertificates, String> {
    let Some(tls) = tls.filter(|item| item.enabled) else {
        return Ok(redis::TlsCertificates {
            client_tls: None,
            root_cert: None,
        });
    };

    let root_cert = match non_empty(tls.ca_cert_path.as_deref()) {
        Some(path) => Some(read_pem(path)?),
        None => None,
    };
    let cert_path = non_empty(tls.client_cert_path.as_deref());
    let key_path = non_empty(tls.client_key_path.as_deref());
    let client_tls = match (cert_path, key_path) {
        (None, None) => None,
        (Some(cert), Some(key)) => Some(redis::ClientTlsConfig {
            client_cert: read_pem(cert)?,
            client_key: read_pem(key)?,
        }),
        _ => return Err("error.tls.client_cert_incomplete".to_string()),
    };

    Ok(redis::TlsCertificates {
        client_tls,
        root_cert,
    })
}

fn non_empty(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|text| !text.is_empty())
}

fn read_pem(path: &str) -> Result<Vec<u8>, String> {
    std::fs::read(path).map_err(|err| {
        log::warn!("读取 TLS 证书文件失败: {err}");
        "error.tls.cert_read_failed".to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redis_url_encodes_password_and_pins_db() {
        let url = redis_url(
            "redis",
            "127.0.0.1",
            6379,
            Some("alice"),
            Some("p@ss/word"),
            3,
            false,
        )
        .unwrap();
        assert!(url.starts_with("redis://alice:"), "{url}");
        assert!(url.contains("/3"), "{url}");
        assert!(!url.contains("p@ss/word"), "密码必须被编码: {url}");
        assert!(!url.contains("#insecure"), "{url}");
    }

    #[test]
    fn insecure_fragment_only_when_requested() {
        let url = redis_url("rediss", "db.internal", 6379, None, None, 0, true).unwrap();
        assert!(
            url.starts_with("rediss://db.internal:6379/0#insecure"),
            "{url}"
        );
    }

    #[test]
    fn ssh_tunnel_forces_insecure_hostname_mode() {
        assert!(tls_uses_insecure(true, false, true));
        assert!(tls_uses_insecure(true, true, false));
        assert!(!tls_uses_insecure(false, true, true));
        assert!(!tls_uses_insecure(true, false, false));
    }

    #[test]
    fn sanitize_strips_userinfo() {
        let raw = "failed redis://alice:secret@10.0.0.1:6379/0 and rediss://:pw@host/1";
        let clean = sanitize_redis_error(raw);
        assert!(!clean.contains("secret"));
        assert!(!clean.contains("pw"));
        assert!(clean.contains("redis://***@"));
        assert!(clean.contains("rediss://***@"));
    }
}
