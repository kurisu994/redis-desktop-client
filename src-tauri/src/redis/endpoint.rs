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
        let insecure = tls_uses_insecure(self.tls_enabled(), skip_verify);
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
            let client = redis::Client::build_with_tls(url, certs)
                .map_err(|e| sanitize_redis_error(&e.to_string()))?;
            let mut info = client.get_connection_info().clone();
            // SSH 仅放宽本地转发地址的主机名校验，仍校验证书链、有效期和签名。
            // 必须在 build_with_tls 之后设置，否则加载 CA / mTLS 参数会覆盖此标志。
            // #insecure 会关闭全部校验，只允许用户显式勾选 skipVerify 时使用。
            info.addr
                .set_danger_accept_invalid_hostnames(self.via_ssh_tunnel);
            redis::Client::open(info).map_err(|e| sanitize_redis_error(&e.to_string()))
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
/// `#insecure` 会关闭证书链和主机名等全部校验，只能由用户显式的 `skipVerify` 启用。
/// SSH 的主机名放宽使用独立 API，不能通过此开关隐式关闭证书链验证。
pub fn tls_uses_insecure(tls_enabled: bool, skip_verify: bool) -> bool {
    tls_enabled && skip_verify
}

/// 构建 Redis URL。`insecure` 为 true 时追加 `#insecure`，关闭全部 TLS 证书校验。
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
    fn insecure_mode_requires_explicit_skip_verify() {
        assert!(tls_uses_insecure(true, true));
        assert!(!tls_uses_insecure(false, true));
        assert!(!tls_uses_insecure(true, false));
    }

    #[test]
    fn ssh_tls_client_does_not_disable_certificate_chain_verification() {
        let endpoint = tls_endpoint(1, true, false, None);
        let client = endpoint.open_client(3).unwrap();
        let info = client.get_connection_info();
        assert_eq!(info.redis.db, 3);
        assert!(matches!(
            info.addr,
            redis::ConnectionAddr::TcpTls {
                insecure: false,
                tls_params: Some(_),
                ..
            }
        ));
    }

    /// 构造 TLS 端点，覆盖与生产共用的 CA 加载和客户端创建路径。
    fn tls_endpoint(
        port: u16,
        via_ssh_tunnel: bool,
        skip_verify: bool,
        ca_cert_path: Option<String>,
    ) -> RedisEndpoint {
        RedisEndpoint {
            host: "127.0.0.1".into(),
            port,
            username: None,
            password: None,
            tls: Some(TlsConfig {
                enabled: true,
                ca_cert_path,
                client_cert_path: None,
                client_key_path: None,
                skip_verify,
            }),
            via_ssh_tunnel,
        }
    }

    /// 使用临时内存私钥进行真实 rustls 握手；只把公开的信任证书写入临时文件。
    async fn tls_handshake(
        via_ssh: bool,
        skip_verify: bool,
        trust_server: bool,
        expired: bool,
    ) -> Result<(), String> {
        use crate::redis::test_support::serve_redis;
        use rustls::pki_types::PrivatePkcs8KeyDer;
        use std::net::TcpListener;
        use std::sync::Arc;
        use std::time::Duration;

        install_rustls_provider();
        let key = rcgen::KeyPair::generate().unwrap();
        let mut params = rcgen::CertificateParams::new(vec!["redis.internal".to_string()]).unwrap();
        if expired {
            params.not_before = rcgen::date_time_ymd(2020, 1, 1);
            params.not_after = rcgen::date_time_ymd(2021, 1, 1);
        }
        let cert = params.self_signed(&key).unwrap();
        let trusted_pem = if trust_server {
            cert.pem()
        } else {
            let mut other = rcgen::CertificateParams::default();
            other
                .distinguished_name
                .push(rcgen::DnType::CommonName, "untrusted-test-ca");
            other
                .self_signed(&rcgen::KeyPair::generate().unwrap())
                .unwrap()
                .pem()
        };
        let ca_path =
            std::env::temp_dir().join(format!("redis-tls-test-{}.pem", uuid::Uuid::new_v4()));
        std::fs::write(&ca_path, trusted_pem).unwrap();
        let server_config = rustls::ServerConfig::builder()
            .with_no_client_auth()
            .with_single_cert(
                vec![cert.der().clone()],
                PrivatePkcs8KeyDer::from(key.serialize_der()).into(),
            )
            .unwrap();
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let endpoint = tls_endpoint(
            listener.local_addr().unwrap().port(),
            via_ssh,
            skip_verify,
            Some(ca_path.to_string_lossy().into_owned()),
        );
        let server = tokio::task::spawn_blocking(move || {
            let (stream, _) = listener.accept().unwrap();
            stream
                .set_read_timeout(Some(Duration::from_secs(5)))
                .unwrap();
            stream
                .set_write_timeout(Some(Duration::from_secs(5)))
                .unwrap();
            let conn = rustls::ServerConnection::new(Arc::new(server_config)).unwrap();
            serve_redis(rustls::StreamOwned::new(conn, stream));
        });
        let client = endpoint.open_client(3).unwrap();
        let result = tokio::time::timeout(Duration::from_secs(5), async {
            let mut conn = client.get_multiplexed_async_connection().await?;
            redis::cmd("PING").query_async::<String>(&mut conn).await
        })
        .await
        .unwrap()
        .map(|reply| assert_eq!(reply, "PONG"))
        .map_err(|err| err.to_string());
        server.await.unwrap();
        std::fs::remove_file(ca_path).unwrap();
        result
    }

    #[tokio::test]
    async fn ssh_tls_accepts_trusted_certificate_with_forwarded_hostname() {
        tls_handshake(true, false, true, false).await.unwrap();
    }

    #[tokio::test]
    async fn direct_tls_still_rejects_wrong_hostname() {
        let err = tls_handshake(false, false, true, false).await.unwrap_err();
        assert!(err.contains("not valid for name"), "{err}");
    }

    #[tokio::test]
    async fn ssh_tls_rejects_untrusted_certificate() {
        let err = tls_handshake(true, false, false, false).await.unwrap_err();
        assert!(
            err.contains("UnknownIssuer") || err.contains("unknown issuer"),
            "{err}"
        );
    }

    #[tokio::test]
    async fn ssh_tls_rejects_expired_certificate() {
        let err = tls_handshake(true, false, true, true).await.unwrap_err();
        assert!(err.contains("certificate expired"), "{err}");
    }

    #[tokio::test]
    async fn explicit_skip_verify_disables_all_certificate_checks() {
        tls_handshake(false, true, false, false).await.unwrap();
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
