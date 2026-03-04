use serde::{Deserialize, Serialize};

/// 连接配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub db: u8,
}

/// 测试连接命令 — 验证 Redis 连接是否可用
#[tauri::command]
pub async fn test_connection(host: String, port: u16, password: Option<String>) -> Result<String, String> {
    let url = if let Some(ref pwd) = password {
        format!("redis://:{}@{}:{}", pwd, host, port)
    } else {
        format!("redis://{}:{}", host, port)
    };

    let client = redis::Client::open(url).map_err(|e| e.to_string())?;
    let mut conn = client
        .get_multiplexed_async_connection()
        .await
        .map_err(|e| e.to_string())?;

    let pong: String = redis::cmd("PING")
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(pong)
}
