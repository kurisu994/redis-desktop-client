use crate::config::store::{
    ClusterConfig, ConnectionStore, SentinelConfig, SshConfig, StoredConnection, TlsConfig,
};
use crate::redis::client::{
    build_redis_url, open_ssh_tunnel_if_needed, sanitize_redis_error, RedisClientManager,
};
use crate::redis::ssh_tunnel::SshTunnel;
use serde::{Deserialize, Serialize};
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
    pub password: Option<String>,
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

/// 保存连接配置（新建或更新）
#[tauri::command]
pub async fn save_connection(
    store: State<'_, ConnectionStore>,
    config: ConnectionConfig,
) -> Result<(), String> {
    validate_connection_config(&config)?;
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
    validate_connection_config(&config)?;
    let start = Instant::now();

    // 根据连接类型判断
    let conn_type = config.connection_type.as_deref().unwrap_or("standalone");
    let tls_enabled = config.tls.as_ref().map(|t| t.enabled).unwrap_or(false);
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
            let url = build_redis_url(
                scheme,
                nodes.0,
                nodes.1,
                config.username.as_deref(),
                config.password.as_deref(),
                0,
            )?;
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
            let url = build_redis_url(
                scheme,
                node.0,
                node.1,
                None,
                config
                    .sentinel
                    .as_ref()
                    .and_then(|s| s.sentinel_password.as_deref()),
                0,
            )?;
            test_single_connection(&url, start).await
        }
        _ => {
            // Standalone 模式：如启用 SSH 隧道则先建临时隧道再 PING
            let tunnel = open_ssh_tunnel_if_needed(
                config.ssh.as_ref(),
                &config.host,
                config.port,
                "standalone",
            )
            .await?;
            let (host, port) = match &tunnel {
                Some(t) => {
                    let a = t.local_addr();
                    (a.ip().to_string(), a.port())
                }
                None => (config.host.clone(), config.port),
            };
            let url = build_redis_url(
                scheme,
                &host,
                port,
                config.username.as_deref(),
                config.password.as_deref(),
                config.db,
            )?;
            // tunnel 持有到测试结束自然 drop（关闭 listener + 释放跳板 session）
            test_single_connection_with_tunnel(&url, start, tunnel).await
        }
    }
}

/// 重新排序连接列表
#[tauri::command]
pub async fn reorder_connections(
    store: State<'_, ConnectionStore>,
    ordered_ids: Vec<String>,
) -> Result<(), String> {
    store.reorder_connections(&ordered_ids)
}

/// 测试单个连接（cluster/sentinel 走该入口，无 SSH）
async fn test_single_connection(url: &str, start: Instant) -> Result<TestResult, String> {
    test_single_connection_with_tunnel(url, start, None).await
}

/// 测试单个连接，可选携带 SSH 隧道（standalone + ssh 走该入口）
///
/// `_tunnel` 仅用于保活：函数返回时 drop，listener 关闭，跳板 session 释放。
async fn test_single_connection_with_tunnel(
    url: &str,
    start: Instant,
    _tunnel: Option<SshTunnel>,
) -> Result<TestResult, String> {
    let client = redis::Client::open(url).map_err(|e| sanitize_redis_error(&e.to_string()))?;
    let mut conn = client
        .get_multiplexed_async_connection()
        .await
        .map_err(|e| sanitize_redis_error(&e.to_string()))?;
    let pong: String = redis::cmd("PING")
        .query_async(&mut conn)
        .await
        .map_err(|e| sanitize_redis_error(&e.to_string()))?;
    let latency = start.elapsed().as_millis() as u64;
    Ok(TestResult {
        success: pong == "PONG",
        latency_ms: latency,
        message: pong,
    })
}
