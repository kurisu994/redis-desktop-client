use crate::config::ssh_known_hosts::{SshKnownHostsStore, SshTofuManager};
use crate::config::store::{
    merge_connection_secrets, ClusterConfig, ConnectionStore, SentinelConfig, SshConfig,
    StoredConnection, TlsConfig,
};
use crate::redis::client::{prepare_data_endpoint, sanitize_redis_error, RedisClientManager};
use crate::redis::ssh_tunnel::SshTunnelContext;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use tauri::State;

/// 前端传入的连接配置
///
/// 序列化字段统一为 camelCase 与前端 TypeScript 对齐；
/// `connection_type` 老磁盘 snake_case 通过 alias 兼容（用户曾保存过的连接读出时）。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    /// 读取接口始终为 null。写入时：null/缺省保留已存密码，空字符串或 `clearPassword` 清空，非空则更新。
    #[serde(default)]
    pub password: Option<String>,
    /// 列表接口标记磁盘上是否已有 Redis 密码。前端不应再期待收到明文。
    #[serde(default, skip_serializing_if = "is_false")]
    pub has_password: bool,
    /// 为 true 时清空已保存的 Redis 密码。
    #[serde(default, skip_serializing_if = "is_false")]
    pub clear_password: bool,
    pub db: u8,
    pub group: Option<String>,
    /// 连接类型: standalone / sentinel / cluster
    #[serde(default = "default_connection_type", alias = "connection_type")]
    pub connection_type: Option<String>,
    /// SSH 隧道配置
    pub ssh: Option<SshConfig>,
    /// TLS/SSL 配置
    pub tls: Option<TlsConfig>,
    /// Sentinel 配置
    pub sentinel: Option<SentinelConfig>,
    /// Cluster 配置
    pub cluster: Option<ClusterConfig>,
}

fn default_connection_type() -> Option<String> {
    Some("standalone".to_string())
}

fn is_false(value: &bool) -> bool {
    !*value
}

/// 测试连接结果
#[derive(Debug, Clone, Serialize)]
pub struct TestResult {
    pub success: bool,
    pub latency_ms: u64,
    pub message: String,
}

/// 验证连接配置字段
fn validate_connection_config(config: &ConnectionConfig) -> Result<(), String> {
    if config.name.trim().is_empty() {
        return Err("连接名称不能为空".to_string());
    }
    if config.name.len() > 128 {
        return Err("连接名称不能超过 128 个字符".to_string());
    }
    if config.host.trim().is_empty() {
        return Err("主机地址不能为空".to_string());
    }
    if config.host.len() > 256 {
        return Err("主机地址不能超过 256 个字符".to_string());
    }
    if config.port == 0 {
        return Err("端口号不能为 0".to_string());
    }
    let conn_type = config.connection_type.as_deref().unwrap_or("standalone");
    if !matches!(conn_type, "standalone" | "sentinel" | "cluster") {
        return Err("连接类型无效".to_string());
    }
    if let Some(ref ssh) = config.ssh {
        if ssh.enabled {
            if conn_type != "standalone" {
                return Err("error.ssh.unsupported_for_cluster_sentinel".to_string());
            }
            if ssh.hops.is_empty() {
                return Err("SSH 隧道至少需要 1 个跳板/终点主机".to_string());
            }
            for (i, hop) in ssh.hops.iter().enumerate() {
                let n = i + 1;
                if hop.host.trim().is_empty() {
                    return Err(format!("SSH 第 {} 跳主机地址不能为空", n));
                }
                if hop.port == 0 {
                    return Err(format!("SSH 第 {} 跳端口号不能为 0", n));
                }
                if hop.username.trim().is_empty() {
                    return Err(format!("SSH 第 {} 跳用户名不能为空", n));
                }
                if !matches!(hop.auth_type.as_str(), "password" | "privateKey") {
                    return Err(format!("SSH 第 {} 跳认证方式无效", n));
                }
                if hop.auth_type == "privateKey"
                    && hop
                        .private_key_path
                        .as_deref()
                        .unwrap_or("")
                        .trim()
                        .is_empty()
                {
                    return Err(format!("SSH 第 {} 跳私钥路径不能为空", n));
                }
            }
        }
    }
    Ok(())
}

/// 保存连接配置（新建或更新）。省略的机密沿用磁盘上的旧值。
#[tauri::command]
pub async fn save_connection(
    store: State<'_, ConnectionStore>,
    config: ConnectionConfig,
) -> Result<(), String> {
    validate_connection_config(&config)?;
    let (mut stored, clear_password) = into_stored(config);
    let existing = store
        .load_connections()?
        .into_iter()
        .find(|conn| conn.id == stored.id);
    merge_connection_secrets(&mut stored, existing.as_ref(), clear_password);
    store.upsert_connection(stored)
}

/// 复制连接。机密只在后端复制，避免前端拿不到明文就把密码弄丢。
#[tauri::command]
pub async fn duplicate_connection(
    store: State<'_, ConnectionStore>,
    id: String,
    name: String,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("连接名称不能为空".to_string());
    }
    let mut source = store
        .load_connections()?
        .into_iter()
        .find(|conn| conn.id == id)
        .ok_or_else(|| "error.connection.not_found".to_string())?;
    source.id = uuid::Uuid::new_v4().to_string();
    source.name = name;
    store.upsert_connection(source)
}

/// 删除连接配置
#[tauri::command]
pub async fn delete_connection(
    store: State<'_, ConnectionStore>,
    pool: State<'_, RedisClientManager>,
    id: String,
) -> Result<(), String> {
    // 如果连接在线，先断开
    pool.disconnect(&id).await?;
    store.delete_connection(&id)
}

/// 获取所有连接配置
#[tauri::command]
pub async fn list_connections(
    store: State<'_, ConnectionStore>,
) -> Result<Vec<ConnectionConfig>, String> {
    let connections = store.load_connections()?;
    Ok(connections.into_iter().map(redact_connection).collect())
}

/// 连接到 Redis 服务器
#[tauri::command]
pub async fn connect_redis(
    store: State<'_, ConnectionStore>,
    pool: State<'_, RedisClientManager>,
    known_hosts: State<'_, Arc<SshKnownHostsStore>>,
    tofu_manager: State<'_, Arc<SshTofuManager>>,
    app_handle: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let connections = store.load_connections()?;
    let config = connections
        .iter()
        .find(|c| c.id == id)
        .ok_or_else(|| format!("连接 {} 不存在", id))?;

    let context = SshTunnelContext {
        known_hosts: Arc::clone(known_hosts.inner()),
        tofu_manager: Arc::clone(tofu_manager.inner()),
        app_handle,
        connection_id: id,
    };
    pool.connect_with_config(config, Some(&context)).await
}

/// 断开 Redis 连接
#[tauri::command]
pub async fn disconnect_redis(
    pool: State<'_, RedisClientManager>,
    id: String,
) -> Result<(), String> {
    pool.disconnect(&id).await
}

/// 测试连接 — 根据连接配置执行 PING 并返回延迟
#[tauri::command]
pub async fn test_connection(
    store: State<'_, ConnectionStore>,
    known_hosts: State<'_, Arc<SshKnownHostsStore>>,
    tofu_manager: State<'_, Arc<SshTofuManager>>,
    app_handle: tauri::AppHandle,
    config: ConnectionConfig,
) -> Result<TestResult, String> {
    validate_connection_config(&config)?;
    let start = Instant::now();
    let (mut stored, clear_password) = into_stored(config);
    let existing = store
        .load_connections()
        .ok()
        .and_then(|connections| connections.into_iter().find(|conn| conn.id == stored.id));
    merge_connection_secrets(&mut stored, existing.as_ref(), clear_password);

    let context = SshTunnelContext {
        known_hosts: Arc::clone(known_hosts.inner()),
        tofu_manager: Arc::clone(tofu_manager.inner()),
        app_handle,
        connection_id: stored.id.clone(),
    };
    let (endpoint, tunnel) = prepare_data_endpoint(&stored, Some(&context)).await?;
    let client = endpoint
        .open_client(u32::from(stored.db))
        .map_err(|err| sanitize_redis_error(&err))?;
    let mut conn = client
        .get_multiplexed_async_connection()
        .await
        .map_err(|err| sanitize_redis_error(&err.to_string()))?;
    let pong: String = redis::cmd("PING")
        .query_async(&mut conn)
        .await
        .map_err(|err| sanitize_redis_error(&err.to_string()))?;
    // tunnel 持有到测试结束自然 drop
    drop(tunnel);
    let latency = start.elapsed().as_millis() as u64;
    Ok(TestResult {
        success: pong == "PONG",
        latency_ms: latency,
        message: pong,
    })
}

/// 重新排序连接列表
#[tauri::command]
pub async fn reorder_connections(
    store: State<'_, ConnectionStore>,
    ordered_ids: Vec<String>,
) -> Result<(), String> {
    store.reorder_connections(&ordered_ids)
}

fn into_stored(config: ConnectionConfig) -> (StoredConnection, bool) {
    let clear_password = config.clear_password;
    let stored = StoredConnection {
        id: config.id,
        name: config.name,
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        db: config.db,
        group: config.group,
        connection_type: config
            .connection_type
            .unwrap_or_else(|| "standalone".to_string()),
        ssh: config.ssh,
        tls: config.tls,
        sentinel: config.sentinel,
        cluster: config.cluster,
    };
    (stored, clear_password)
}

/// 返回给前端的连接配置。密码、SSH 机密和 Sentinel 密码一律抹掉。
pub(crate) fn redact_connection(mut conn: StoredConnection) -> ConnectionConfig {
    let has_password = conn
        .password
        .as_ref()
        .is_some_and(|value| !value.is_empty());
    conn.password = None;
    if let Some(ssh) = conn.ssh.as_mut() {
        for hop in &mut ssh.hops {
            hop.has_password = hop.password.as_ref().is_some_and(|value| !value.is_empty());
            hop.has_passphrase = hop
                .passphrase
                .as_ref()
                .is_some_and(|value| !value.is_empty());
            hop.password = None;
            hop.passphrase = None;
            hop.clear_password = false;
            hop.clear_passphrase = false;
        }
    }
    if let Some(sentinel) = conn.sentinel.as_mut() {
        sentinel.has_sentinel_password = sentinel
            .sentinel_password
            .as_ref()
            .is_some_and(|value| !value.is_empty());
        sentinel.sentinel_password = None;
        sentinel.clear_password = false;
    }
    ConnectionConfig {
        id: conn.id,
        name: conn.name,
        host: conn.host,
        port: conn.port,
        username: conn.username,
        password: None,
        has_password,
        clear_password: false,
        db: conn.db,
        group: conn.group,
        connection_type: Some(conn.connection_type),
        ssh: conn.ssh,
        tls: conn.tls,
        sentinel: conn.sentinel,
        cluster: conn.cluster,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::store::SshHop;

    /// 构造一份最小可用的 standalone 连接配置
    fn base_config() -> ConnectionConfig {
        ConnectionConfig {
            id: "id".into(),
            name: "name".into(),
            host: "127.0.0.1".into(),
            port: 6379,
            username: None,
            password: None,
            has_password: false,
            clear_password: false,
            db: 0,
            group: None,
            connection_type: Some("standalone".into()),
            ssh: None,
            tls: None,
            sentinel: None,
            cluster: None,
        }
    }

    fn ssh_hop_password(host: &str) -> SshHop {
        SshHop {
            host: host.into(),
            port: 22,
            username: "u".into(),
            auth_type: "password".into(),
            password: Some("pw".into()),
            private_key_path: None,
            passphrase: None,
            has_password: false,
            has_passphrase: false,
            clear_password: false,
            clear_passphrase: false,
        }
    }

    #[test]
    fn validate_accepts_standalone_without_ssh() {
        assert!(validate_connection_config(&base_config()).is_ok());
    }

    #[test]
    fn validate_accepts_ssh_with_valid_hop() {
        let mut cfg = base_config();
        cfg.ssh = Some(SshConfig {
            enabled: true,
            hops: vec![ssh_hop_password("jump.example.com")],
        });
        assert!(validate_connection_config(&cfg).is_ok());
    }

    #[test]
    fn validate_rejects_ssh_enabled_for_cluster_or_sentinel() {
        for conn_type in ["cluster", "sentinel"] {
            let mut cfg = base_config();
            cfg.connection_type = Some(conn_type.into());
            cfg.ssh = Some(SshConfig {
                enabled: true,
                hops: vec![ssh_hop_password("jump.example.com")],
            });
            let err = validate_connection_config(&cfg).unwrap_err();
            assert_eq!(err, "error.ssh.unsupported_for_cluster_sentinel");
        }
    }

    #[test]
    fn validate_rejects_ssh_enabled_with_empty_hops() {
        let mut cfg = base_config();
        cfg.ssh = Some(SshConfig {
            enabled: true,
            hops: vec![],
        });
        let err = validate_connection_config(&cfg).unwrap_err();
        assert!(err.contains("SSH"), "应提示 SSH 相关错误，实际：{err}");
    }

    #[test]
    fn validate_rejects_ssh_hop_with_invalid_auth_type() {
        let mut hop = ssh_hop_password("h");
        hop.auth_type = "weird".into();
        let mut cfg = base_config();
        cfg.ssh = Some(SshConfig {
            enabled: true,
            hops: vec![hop],
        });
        assert!(validate_connection_config(&cfg).is_err());
    }

    #[test]
    fn validate_rejects_ssh_private_key_hop_without_path() {
        let mut hop = ssh_hop_password("h");
        hop.auth_type = "privateKey".into();
        hop.private_key_path = None;
        let mut cfg = base_config();
        cfg.ssh = Some(SshConfig {
            enabled: true,
            hops: vec![hop],
        });
        let err = validate_connection_config(&cfg).unwrap_err();
        assert!(err.contains("私钥"), "应提示私钥路径相关错误，实际：{err}");
    }

    #[test]
    fn validate_skips_ssh_when_disabled_even_with_empty_hops() {
        // SSH 未启用时不应校验 hops（用户保存了 disabled SSH 配置应允许通过）
        let mut cfg = base_config();
        cfg.ssh = Some(SshConfig {
            enabled: false,
            hops: vec![],
        });
        assert!(validate_connection_config(&cfg).is_ok());
    }

    #[test]
    fn redact_connection_strips_every_secret() {
        let mut hop = ssh_hop_password("jump");
        hop.passphrase = Some("phrase".into());
        let stored = StoredConnection {
            id: "id".into(),
            name: "name".into(),
            host: "127.0.0.1".into(),
            port: 6379,
            username: None,
            password: Some("redis-secret".into()),
            db: 0,
            group: None,
            connection_type: "sentinel".into(),
            ssh: Some(SshConfig {
                enabled: true,
                hops: vec![hop],
            }),
            tls: None,
            sentinel: Some(crate::config::store::SentinelConfig {
                nodes: vec![],
                master_name: "mymaster".into(),
                sentinel_password: Some("sent-secret".into()),
                has_sentinel_password: false,
                clear_password: false,
            }),
            cluster: None,
        };
        let public = redact_connection(stored);
        let json = serde_json::to_string(&public).unwrap();
        assert!(public.has_password);
        assert!(public.password.is_none());
        assert!(public.ssh.as_ref().unwrap().hops[0].has_password);
        assert!(public.ssh.as_ref().unwrap().hops[0].has_passphrase);
        assert!(public.ssh.as_ref().unwrap().hops[0].password.is_none());
        assert!(public.sentinel.as_ref().unwrap().has_sentinel_password);
        assert!(public
            .sentinel
            .as_ref()
            .unwrap()
            .sentinel_password
            .is_none());
        assert!(!json.contains("redis-secret"));
        assert!(!json.contains("sent-secret"));
        assert!(!json.contains("\"phrase\""));
        assert!(!json.contains("\"pw\""));
    }
}
