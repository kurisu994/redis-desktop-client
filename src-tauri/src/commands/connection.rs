use crate::config::store::{
    ClusterConfig, ConnectionStore, SentinelConfig, SshConfig, StoredConnection, TlsConfig,
};
use crate::redis::client::RedisClientManager;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::State;

/// 前端传入的连接配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub db: u8,
    pub group: Option<String>,
    /// 连接类型: standalone / sentinel / cluster
    #[serde(default = "default_connection_type")]
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

/// 测试连接结果
#[derive(Debug, Clone, Serialize)]
pub struct TestResult {
    pub success: bool,
    pub latency_ms: u64,
    pub message: String,
}

/// 保存连接配置（新建或更新）
#[tauri::command]
pub async fn save_connection(
    store: State<'_, ConnectionStore>,
    config: ConnectionConfig,
) -> Result<(), String> {
    let stored = StoredConnection {
        id: config.id,
        name: config.name,
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        db: config.db,
        group: config.group,
        connection_type: config.connection_type.unwrap_or_else(|| "standalone".to_string()),
        ssh: config.ssh,
        tls: config.tls,
        sentinel: config.sentinel,
        cluster: config.cluster,
    };
    store.upsert_connection(stored)
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
    Ok(connections
        .into_iter()
        .map(|c| ConnectionConfig {
            id: c.id,
            name: c.name,
            host: c.host,
            port: c.port,
            username: c.username,
            password: c.password,
            db: c.db,
            group: c.group,
            connection_type: Some(c.connection_type),
            ssh: c.ssh,
            tls: c.tls,
            sentinel: c.sentinel,
            cluster: c.cluster,
        })
        .collect())
}

/// 连接到 Redis 服务器
#[tauri::command]
pub async fn connect_redis(
    store: State<'_, ConnectionStore>,
    pool: State<'_, RedisClientManager>,
    id: String,
) -> Result<(), String> {
    let connections = store.load_connections()?;
    let config = connections
        .iter()
        .find(|c| c.id == id)
        .ok_or_else(|| format!("连接 {} 不存在", id))?;

    pool.connect_with_config(config).await
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
pub async fn test_connection(config: ConnectionConfig) -> Result<TestResult, String> {
    let start = Instant::now();

    // 根据连接类型判断
    let conn_type = config.connection_type.as_deref().unwrap_or("standalone");
    let tls_enabled = config
        .tls
        .as_ref()
        .map(|t| t.enabled)
        .unwrap_or(false);
    let scheme = if tls_enabled { "rediss" } else { "redis" };

    match conn_type {
        "cluster" => {
            // Cluster 模式：使用第一个种子节点测试
            let nodes = config
                .cluster
                .as_ref()
                .and_then(|c| c.nodes.first())
                .map(|n| (n.host.as_str(), n.port))
                .unwrap_or((config.host.as_str(), config.port));
            let url = build_url(
                scheme,
                nodes.0,
                nodes.1,
                config.username.as_deref(),
                config.password.as_deref(),
                0,
            );
            test_single_connection(&url, start).await
        }
        "sentinel" => {
            // Sentinel 模式：测试第一个 sentinel 节点连通性
            let node = config
                .sentinel
                .as_ref()
                .and_then(|s| s.nodes.first())
                .map(|n| (n.host.as_str(), n.port))
                .unwrap_or((config.host.as_str(), config.port));
            let url = build_url(
                scheme,
                node.0,
                node.1,
                None,
                config.sentinel.as_ref().and_then(|s| s.sentinel_password.as_deref()),
                0,
            );
            test_single_connection(&url, start).await
        }
        _ => {
            // Standalone 模式
            let url = build_url(
                scheme,
                &config.host,
                config.port,
                config.username.as_deref(),
                config.password.as_deref(),
                config.db,
            );
            test_single_connection(&url, start).await
        }
    }
}

/// 构建 Redis URL
fn build_url(
    scheme: &str,
    host: &str,
    port: u16,
    username: Option<&str>,
    password: Option<&str>,
    db: u8,
) -> String {
    match (username, password) {
        (Some(user), Some(pwd)) => format!("{}://{}:{}@{}:{}/{}", scheme, user, pwd, host, port, db),
        (None, Some(pwd)) => format!("{}://:{}@{}:{}/{}", scheme, pwd, host, port, db),
        _ => format!("{}://{}:{}/{}", scheme, host, port, db),
    }
}

/// 测试单个连接
async fn test_single_connection(url: &str, start: Instant) -> Result<TestResult, String> {
    let client = redis::Client::open(url).map_err(|e| e.to_string())?;
    let mut conn = client
        .get_multiplexed_async_connection()
        .await
        .map_err(|e| e.to_string())?;
    let pong: String = redis::cmd("PING")
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;
    let latency = start.elapsed().as_millis() as u64;
    Ok(TestResult {
        success: pong == "PONG",
        latency_ms: latency,
        message: pong,
    })
}
