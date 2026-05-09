use crate::config::store::StoredConnection;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Redis 客户端管理器 — 管理多个 Redis 连接的生命周期
/// 使用 ConnectionManager 自动处理断线重连
pub struct RedisClientManager {
    clients: Arc<Mutex<HashMap<String, redis::aio::ConnectionManager>>>,
    /// PubSub 订阅任务句柄 — 用于取消订阅
    subscribers: Arc<Mutex<HashMap<String, tauri::async_runtime::JoinHandle<()>>>>,
}

impl RedisClientManager {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(Mutex::new(HashMap::new())),
            subscribers: Arc::new(Mutex::new(HashMap::new())),
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
        )?;

        let client = redis::Client::open(url).map_err(|e| sanitize_redis_error(&e.to_string()))?;
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
    pub async fn get_connection(&self, id: &str) -> Result<redis::aio::ConnectionManager, String> {
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

    /// 注册 PubSub 订阅任务句柄
    pub async fn register_subscriber(
        &self,
        id: String,
        handle: tauri::async_runtime::JoinHandle<()>,
    ) {
        let mut subscribers = self.subscribers.lock().await;
        // 如果已有同连接的任务，先取消旧任务
        if let Some(old) = subscribers.remove(&id) {
            old.abort();
        }
        subscribers.insert(id, handle);
    }

    /// 取消指定连接的 PubSub 订阅
    pub async fn unregister_subscriber(&self, id: &str) {
        let mut subscribers = self.subscribers.lock().await;
        if let Some(handle) = subscribers.remove(id) {
            handle.abort();
        }
    }
}

impl Default for RedisClientManager {
    fn default() -> Self {
        Self::new()
    }
}

/// 构建 Redis URL — 使用 url crate 进行结构化编码，避免特殊字符破坏 URL 解析
pub fn build_redis_url(
    scheme: &str,
    host: &str,
    port: u16,
    username: Option<&str>,
    password: Option<&str>,
    db: u8,
) -> Result<String, String> {
    let mut url = url::Url::parse(&format!("{}://{}:{}/{}", scheme, host, port, db))
        .map_err(|e| format!("无效的 Redis URL: {}", e))?;
    if let Some(user) = username {
        url.set_username(user)
            .map_err(|_| "设置用户名失败".to_string())?;
    }
    if let Some(pwd) = password {
        url.set_password(Some(pwd))
            .map_err(|_| "设置密码失败".to_string())?;
    }
    Ok(url.to_string())
}

/// 对包含 Redis URL 的错误信息进行脱敏，防止密码泄露
pub fn sanitize_redis_error(err: &str) -> String {
    // 匹配 redis://user:password@host 或 redis://:password@host
    let re = regex::Regex::new(r"(redis(?:s)?://)[^@]+@").unwrap();
    re.replace_all(err, "${1}***@").to_string()
}
