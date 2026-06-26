use crate::config::store::StoredConnection;
use crate::redis::ssh_tunnel::{self, SshTunnel, SshTunnelContext};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Redis 客户端管理器 — 管理多个 Redis 连接的生命周期
/// 使用 ConnectionManager 自动处理断线重连
pub struct RedisClientManager {
    clients: Arc<Mutex<HashMap<String, redis::aio::ConnectionManager>>>,
    /// SSH 隧道句柄 — 与连接共享生命周期，disconnect / drop 时一并清理
    tunnels: Arc<Mutex<HashMap<String, SshTunnel>>>,
    /// PubSub 订阅任务句柄 — 用于取消订阅
    subscribers: Arc<Mutex<HashMap<String, tauri::async_runtime::JoinHandle<()>>>>,
}

impl RedisClientManager {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(Mutex::new(HashMap::new())),
            tunnels: Arc::new(Mutex::new(HashMap::new())),
            subscribers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 根据完整连接配置建立连接并加入管理池
    ///
    /// 若 `config.ssh.enabled = true` 且为 standalone 连接，先建立 SSH 隧道，
    /// 再以本地 127.0.0.1:local_port 作为实际 Redis 地址。Cluster / Sentinel
    /// 走 SSH 涉及多节点隧道协调，暂未实现（阶段 3 范围）。
    pub async fn connect_with_config(
        &self,
        config: &StoredConnection,
        context: Option<&SshTunnelContext>,
    ) -> Result<(), String> {
        let tls_enabled = config.tls.as_ref().map(|t| t.enabled).unwrap_or(false);
        let scheme = if tls_enabled { "rediss" } else { "redis" };
        let conn_type = config.connection_type.as_str();

        // 仅 standalone 模式支持 SSH 隧道（阶段 3 范围）
        let tunnel = open_ssh_tunnel_if_needed(
            config.ssh.as_ref(),
            &config.host,
            config.port,
            conn_type,
            context,
        )
        .await?;
        let (effective_host, effective_port) = match &tunnel {
            Some(t) => {
                let addr = t.local_addr();
                (addr.ip().to_string(), addr.port())
            }
            None => (config.host.clone(), config.port),
        };

        let url = build_redis_url(
            scheme,
            &effective_host,
            effective_port,
            config.username.as_deref(),
            config.password.as_deref(),
            config.db,
        )?;

        let client = redis::Client::open(url).map_err(|e| sanitize_redis_error(&e.to_string()))?;
        let conn = client
            .get_connection_manager()
            .await
            .map_err(|e| sanitize_redis_error(&e.to_string()))?;

        // 锁顺序：先 clients 再 tunnels（与 disconnect 一致避免死锁）
        let mut clients = self.clients.lock().await;
        clients.insert(config.id.clone(), conn);
        if let Some(t) = tunnel {
            let mut tunnels = self.tunnels.lock().await;
            tunnels.insert(config.id.clone(), t);
        }
        Ok(())
    }

    /// 断开连接并从池中移除（同时释放 SSH 隧道）
    pub async fn disconnect(&self, id: &str) -> Result<(), String> {
        let mut clients = self.clients.lock().await;
        clients.remove(id);
        let mut tunnels = self.tunnels.lock().await;
        tunnels.remove(id);
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

/// 若启用 SSH 隧道则建立之；返回 None 表示不需要隧道
///
/// - `ssh`：当前连接的 SSH 配置（None 或 disabled 时直接返回 None）
/// - `target_host` / `target_port`：隧道桥接到的最终 Redis 端点
/// - `conn_type`："standalone" / "sentinel" / "cluster"；阶段 3 仅 standalone 走 SSH
/// - `context`：包含 known_hosts 存储、TOFU 管理器与 AppHandle，首次连接时需要
///
/// 错误返回 SshTunnelError 对应的 i18n key，由前端翻译展示
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
        // Cluster / Sentinel 走 SSH 涉及多节点隧道协调，暂不支持
        return Err("error.ssh.unsupported_for_cluster_sentinel".to_string());
    }
    let Some(ctx) = context else {
        // 启用 SSH 但未提供上下文（理论上不应发生），保守拒绝
        return Err("error.ssh.host_key_rejected".to_string());
    };
    let tunnel = ssh_tunnel::open(ssh, target_host, target_port, ctx)
        .await
        .map_err(|e| e.i18n_key().to_string())?;
    Ok(Some(tunnel))
}
