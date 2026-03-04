use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Redis 客户端管理器 — 管理多个 Redis 连接
pub struct RedisClientManager {
    clients: Arc<Mutex<HashMap<String, redis::aio::MultiplexedConnection>>>,
}

impl RedisClientManager {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Default for RedisClientManager {
    fn default() -> Self {
        Self::new()
    }
}
