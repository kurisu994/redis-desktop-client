use crate::config::store::StoredConnection;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Redis 客户端管理器 — 管理多个 Redis 连接的生命周期
/// 使用 ConnectionManager 自动处理断线重连
pub struct RedisClientManager {
    clients: Arc<Mutex<HashMap<String, redis::aio::ConnectionManager>>>,
}

impl RedisClientManager {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 根据完整连接配置建立连接并加入管理池
    pub async fn connect_with_config(&self, config: &StoredConnection) -> Result<(), String> {
        let tls_enabled = config.tls.as_ref().map(|t| t.enabled).unwrap_or(false);
        let scheme = if tls_enabled { "rediss" } else { "redis" };

        let url = build_redis_url(
            scheme,
            &config.host,
            config.port,
            config.username.as_deref(),
            config.password.as_deref(),
            config.db,
        );

        let client = redis::Client::open(url).map_err(|e| e.to_string())?;
        let conn = client
            .get_connection_manager()
            .await
            .map_err(|e| e.to_string())?;

        let mut clients = self.clients.lock().await;
        clients.insert(config.id.clone(), conn);
        Ok(())
    }

    /// 断开连接并从池中移除
    pub async fn disconnect(&self, id: &str) -> Result<(), String> {
        let mut clients = self.clients.lock().await;
        clients.remove(id);
        Ok(())
    }

    /// 获取连接引用（用于执行命令）
    pub async fn get_connection(
        &self,
        id: &str,
    ) -> Result<redis::aio::ConnectionManager, String> {
        let clients = self.clients.lock().await;
        clients
            .get(id)
            .cloned()
            .ok_or_else(|| format!("连接 {} 不存在或未连接", id))
    }

    /// 检查连接是否存在
    #[allow(dead_code)]
    pub async fn is_connected(&self, id: &str) -> bool {
        let clients = self.clients.lock().await;
        clients.contains_key(id)
    }
}

impl Default for RedisClientManager {
    fn default() -> Self {
        Self::new()
    }
}

/// 构建 Redis URL
fn build_redis_url(
    scheme: &str,
    host: &str,
    port: u16,
    username: Option<&str>,
    password: Option<&str>,
    db: u8,
) -> String {
    match (username, password) {
        (Some(user), Some(pwd)) => {
            format!("{}://{}:{}@{}:{}/{}", scheme, user, pwd, host, port, db)
        }
        (None, Some(pwd)) => format!("{}://:{}@{}:{}/{}", scheme, pwd, host, port, db),
        _ => format!("{}://{}:{}/{}", scheme, host, port, db),
    }
}
