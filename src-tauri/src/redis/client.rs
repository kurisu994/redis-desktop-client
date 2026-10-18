use crate::config::store::StoredConnection;
use crate::redis::endpoint::RedisEndpoint;
use crate::redis::sentinel;
use crate::redis::ssh_tunnel::{self, SshTunnel, SshTunnelContext};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

pub use crate::redis::endpoint::sanitize_redis_error;

/// 一条已建立的逻辑连接。不同 db 各有独立的 `ConnectionManager`，互不 SELECT。
struct Session {
    endpoint: RedisEndpoint,
    by_db: HashMap<u32, redis::aio::ConnectionManager>,
    /// 只为把隧道活到会话结束。字段本身不读取，drop 时关闭本地转发。
    #[allow(dead_code)]
    tunnel: Option<SshTunnel>,
}

/// Redis 客户端管理器。
///
/// 连接按 `(connection_id, db)` 隔离。Browser 和 CLI 即使同时访问不同数据库，
/// 也不会共用一条会改变 SELECT 状态的多路复用连接。
pub struct RedisClientManager {
    sessions: Arc<Mutex<HashMap<String, Session>>>,
    subscribers: Arc<Mutex<HashMap<String, tauri::async_runtime::JoinHandle<()>>>>,
    monitors: Arc<Mutex<HashMap<String, tauri::async_runtime::JoinHandle<()>>>>,
}

impl RedisClientManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            subscribers: Arc::new(Mutex::new(HashMap::new())),
            monitors: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 根据完整连接配置建立会话，并先钉住配置里的默认 db。
    pub async fn connect_with_config(
        &self,
        config: &StoredConnection,
        context: Option<&SshTunnelContext>,
    ) -> Result<(), String> {
        let (endpoint, tunnel) = prepare_data_endpoint(config, context).await?;
        let db = u32::from(config.db);
        let conn = endpoint.open_manager(db).await?;
        let mut sessions = self.sessions.lock().await;
        sessions.insert(
            config.id.clone(),
            Session {
                endpoint,
                by_db: HashMap::from([(db, conn)]),
                tunnel,
            },
        );
        Ok(())
    }

    /// 断开连接并释放 SSH 隧道、Pub/Sub 和 MONITOR 任务。
    pub async fn disconnect(&self, id: &str) -> Result<(), String> {
        self.unregister_subscriber(id).await;
        self.unregister_monitor(id).await;
        let mut sessions = self.sessions.lock().await;
        sessions.remove(id);
        Ok(())
    }

    /// 取得已经钉在 `db` 上的连接。没有则通过同一端点（含 SSH/TLS）懒创建。
    pub async fn get_connection(
        &self,
        id: &str,
        db: u32,
    ) -> Result<redis::aio::ConnectionManager, String> {
        {
            let sessions = self.sessions.lock().await;
            let session = sessions
                .get(id)
                .ok_or_else(|| "error.connection.not_connected".to_string())?;
            if let Some(conn) = session.by_db.get(&db) {
                return Ok(conn.clone());
            }
        }

        let endpoint = self.endpoint_of(id).await?;
        let conn = endpoint.open_manager(db).await?;
        let mut sessions = self.sessions.lock().await;
        let session = sessions
            .get_mut(id)
            .ok_or_else(|| "error.connection.not_connected".to_string())?;
        Ok(session
            .by_db
            .entry(db)
            .or_insert_with(|| conn.clone())
            .clone())
    }

    /// 服务器级命令（INFO / SLOWLOG / PUBLISH）使用任意一条已钉住的连接，不再 SELECT。
    pub async fn get_server_connection(
        &self,
        id: &str,
    ) -> Result<redis::aio::ConnectionManager, String> {
        let sessions = self.sessions.lock().await;
        let session = sessions
            .get(id)
            .ok_or_else(|| "error.connection.not_connected".to_string())?;
        session
            .by_db
            .values()
            .next()
            .cloned()
            .ok_or_else(|| "error.connection.not_connected".to_string())
    }

    /// 为 Pub/Sub 或 MONITOR 打开独立客户端。端点与数据连接相同，因此会走 SSH 和 rustls。
    pub async fn open_dedicated_client(&self, id: &str, db: u32) -> Result<redis::Client, String> {
        let endpoint = self.endpoint_of(id).await?;
        endpoint.open_client(db)
    }

    async fn endpoint_of(&self, id: &str) -> Result<RedisEndpoint, String> {
        let sessions = self.sessions.lock().await;
        sessions
            .get(id)
            .map(|session| session.endpoint.clone())
            .ok_or_else(|| "error.connection.not_connected".to_string())
    }

    #[allow(dead_code)]
    pub async fn is_connected(&self, id: &str) -> bool {
        let sessions = self.sessions.lock().await;
        sessions.contains_key(id)
    }

    pub async fn register_subscriber(
        &self,
        id: String,
        handle: tauri::async_runtime::JoinHandle<()>,
    ) {
        let mut subscribers = self.subscribers.lock().await;
        if let Some(old) = subscribers.remove(&id) {
            old.abort();
        }
        subscribers.insert(id, handle);
    }

    pub async fn unregister_subscriber(&self, id: &str) {
        let mut subscribers = self.subscribers.lock().await;
        if let Some(handle) = subscribers.remove(id) {
            handle.abort();
        }
    }

    pub async fn register_monitor(&self, id: String, handle: tauri::async_runtime::JoinHandle<()>) {
        let mut monitors = self.monitors.lock().await;
        if let Some(old) = monitors.remove(&id) {
            old.abort();
        }
        monitors.insert(id, handle);
    }

    pub async fn unregister_monitor(&self, id: &str) {
        let mut monitors = self.monitors.lock().await;
        if let Some(handle) = monitors.remove(id) {
            handle.abort();
        }
    }
}

impl Default for RedisClientManager {
    fn default() -> Self {
        Self::new()
    }
}

/// 解析最终数据端点。
///
/// - Cluster：直接拒绝，避免把种子节点当成单机静默连上。
/// - Sentinel：向 Sentinel 查询当前 master，再连数据节点。
/// - Standalone：可选 SSH 隧道，Redis 拨本地转发端口。
pub async fn prepare_data_endpoint(
    config: &StoredConnection,
    context: Option<&SshTunnelContext>,
) -> Result<(RedisEndpoint, Option<SshTunnel>), String> {
    match config.connection_type.as_str() {
        "cluster" => Err("error.cluster.unsupported".to_string()),
        "sentinel" => {
            if config.ssh.as_ref().is_some_and(|ssh| ssh.enabled) {
                return Err("error.ssh.unsupported_for_cluster_sentinel".to_string());
            }
            let (host, port) = sentinel::resolve_master(config).await?;
            Ok((
                RedisEndpoint {
                    host,
                    port,
                    username: config.username.clone(),
                    password: config.password.clone(),
                    tls: config.tls.clone(),
                    via_ssh_tunnel: false,
                },
                None,
            ))
        }
        _ => {
            let tunnel = open_ssh_tunnel_if_needed(
                config.ssh.as_ref(),
                &config.host,
                config.port,
                "standalone",
                context,
            )
            .await?;
            let (host, port, via_ssh_tunnel) = match &tunnel {
                Some(tunnel) => {
                    let addr = tunnel.local_addr();
                    (addr.ip().to_string(), addr.port(), true)
                }
                None => (config.host.clone(), config.port, false),
            };
            Ok((
                RedisEndpoint {
                    host,
                    port,
                    username: config.username.clone(),
                    password: config.password.clone(),
                    tls: config.tls.clone(),
                    via_ssh_tunnel,
                },
                tunnel,
            ))
        }
    }
}

/// 若启用 SSH 隧道则建立之；返回 None 表示不需要隧道。
///
/// 错误返回 i18n key，由前端翻译展示。
pub async fn open_ssh_tunnel_if_needed(
    ssh: Option<&crate::config::store::SshConfig>,
    target_host: &str,
    target_port: u16,
    conn_type: &str,
    context: Option<&SshTunnelContext>,
) -> Result<Option<SshTunnel>, String> {
    let Some(ssh) = ssh else {
        return Ok(None);
    };
    if !ssh.enabled {
        return Ok(None);
    }
    if conn_type != "standalone" {
        return Err("error.ssh.unsupported_for_cluster_sentinel".to_string());
    }
    let Some(ctx) = context else {
        return Err("error.ssh.host_key_rejected".to_string());
    };
    let tunnel = ssh_tunnel::open(ssh, target_host, target_port, ctx)
        .await
        .map_err(|err| err.i18n_key().to_string())?;
    Ok(Some(tunnel))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::store::{ClusterConfig, ClusterNode, SentinelConfig};

    fn bare_config(connection_type: &str) -> StoredConnection {
        StoredConnection {
            id: "id".into(),
            name: "name".into(),
            host: "127.0.0.1".into(),
            port: 6379,
            username: None,
            password: None,
            db: 0,
            group: None,
            connection_type: connection_type.into(),
            ssh: None,
            tls: None,
            sentinel: None,
            cluster: Some(ClusterConfig {
                nodes: vec![ClusterNode {
                    host: "10.0.0.1".into(),
                    port: 7000,
                }],
            }),
        }
    }

    #[tokio::test]
    async fn cluster_is_rejected_without_dialing() {
        let err = match prepare_data_endpoint(&bare_config("cluster"), None).await {
            Err(err) => err,
            Ok(_) => panic!("Cluster 不应建立数据连接"),
        };
        assert_eq!(err, "error.cluster.unsupported");
    }

    #[tokio::test]
    async fn sentinel_without_nodes_is_rejected() {
        let mut config = bare_config("sentinel");
        config.cluster = None;
        config.sentinel = Some(SentinelConfig {
            nodes: vec![],
            master_name: "mymaster".into(),
            sentinel_password: None,
            has_sentinel_password: false,
            clear_password: false,
        });
        let err = match prepare_data_endpoint(&config, None).await {
            Err(err) => err,
            Ok(_) => panic!("没有 Sentinel 节点时不应建立连接"),
        };
        assert_eq!(err, "error.sentinel.no_nodes");
    }

    #[tokio::test]
    async fn disconnect_removes_session_and_tunnel() {
        let manager = RedisClientManager::new();
        manager.sessions.lock().await.insert(
            "conn-1".into(),
            Session {
                endpoint: RedisEndpoint {
                    host: "127.0.0.1".into(),
                    port: 1,
                    username: None,
                    password: None,
                    tls: None,
                    via_ssh_tunnel: true,
                },
                by_db: HashMap::new(),
                tunnel: Some(SshTunnel::test_handle("127.0.0.1:0".parse().unwrap())),
            },
        );

        manager.disconnect("conn-1").await.unwrap();
        assert!(!manager.sessions.lock().await.contains_key("conn-1"));
    }
}
