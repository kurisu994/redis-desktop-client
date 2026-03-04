use crate::config::store::{ConnectionStore, StoredConnection};
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

    pool.connect(
        &id,
        &config.host,
        config.port,
        config.username.as_deref(),
        config.password.as_deref(),
        config.db,
    )
    .await
}

/// 断开 Redis 连接
#[tauri::command]
pub async fn disconnect_redis(
    pool: State<'_, RedisClientManager>,
    id: String,
) -> Result<(), String> {
    pool.disconnect(&id).await
}

/// 测试连接 — 执行 PING 并返回延迟
#[tauri::command]
pub async fn test_connection(
    host: String,
    port: u16,
    username: Option<String>,
    password: Option<String>,
    db: Option<u8>,
) -> Result<TestResult, String> {
    let db = db.unwrap_or(0);
    let url = match (&username, &password) {
        (Some(user), Some(pwd)) => format!("redis://{}:{}@{}:{}/{}", user, pwd, host, port, db),
        (None, Some(pwd)) => format!("redis://:{}@{}:{}/{}", pwd, host, port, db),
        _ => format!("redis://{}:{}/{}", host, port, db),
    };

    let start = Instant::now();
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
