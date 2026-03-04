use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Redis 客户端管理器 — 管理多个 Redis 连接的生命周期
pub struct RedisClientManager {
    clients: Arc<Mutex<HashMap<String, redis::aio::MultiplexedConnection>>>,
}

impl RedisClientManager {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 建立连接并加入管理池
    pub async fn connect(
        &self,
        id: &str,
        host: &str,
        port: u16,
        username: Option<&str>,
        password: Option<&str>,
        db: u8,
    ) -> Result<(), String> {
        let url = build_redis_url(host, port, username, password, db);
        let client = redis::Client::open(url).map_err(|e| e.to_string())?;
        let conn = client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| e.to_string())?;

        let mut clients = self.clients.lock().await;
        clients.insert(id.to_string(), conn);
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
    ) -> Result<redis::aio::MultiplexedConnection, String> {
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
    host: &str,
    port: u16,
    username: Option<&str>,
    password: Option<&str>,
    db: u8,
) -> String {
    match (username, password) {
        (Some(user), Some(pwd)) => format!("redis://{}:{}@{}:{}/{}", user, pwd, host, port, db),
        (None, Some(pwd)) => format!("redis://:{}@{}:{}/{}", pwd, host, port, db),
        _ => format!("redis://{}:{}/{}", host, port, db),
    }
}
