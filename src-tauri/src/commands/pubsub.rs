use crate::config::store::ConnectionStore;
use crate::redis::client::RedisClientManager;
use redis::AsyncCommands;
use serde::Serialize;
use tauri::Emitter;
use tauri::State;

/// 发布消息的结果
#[derive(Debug, Clone, Serialize)]
pub struct PublishResult {
    pub receivers: u64,
}

/// 发布消息到指定频道
#[tauri::command]
pub async fn publish_message(
    manager: State<'_, RedisClientManager>,
    id: String,
    channel: String,
    message: String,
) -> Result<PublishResult, String> {
    let mut conn = manager.get_connection(&id).await?;
    let receivers: u64 = conn
        .publish(&channel, &message)
        .await
        .map_err(|e| e.to_string())?;
    Ok(PublishResult { receivers })
}

/// 订阅频道 — 通过 Tauri Event 推送消息到前端
///
/// 由于 MultiplexedConnection 不支持 subscribe 模式，
/// 这里创建独立的 PubSub 连接来订阅频道。
#[tauri::command]
pub async fn subscribe_channels(
    manager: State<'_, RedisClientManager>,
    store: State<'_, ConnectionStore>,
    app: tauri::AppHandle,
    id: String,
    channels: Vec<String>,
) -> Result<(), String> {
    // 验证主连接存在
    let _ = manager.get_connection(&id).await?;

    // 从存储中读取连接配置以创建独立 PubSub 连接
    let connections = store.load_connections().map_err(|e| e.to_string())?;
    let config = connections
        .iter()
        .find(|c| c.id == id)
        .ok_or_else(|| format!("找不到连接配置: {}", id))?;

    let url = build_redis_url(
        &config.host,
        config.port,
        config.username.as_deref(),
        config.password.as_deref(),
        config.db,
    );

    let client = redis::Client::open(url).map_err(|e| e.to_string())?;
    let mut pubsub = client.get_async_pubsub().await.map_err(|e| e.to_string())?;

    for ch in &channels {
        // 支持模式订阅（包含 * 或 ?）
        if ch.contains('*') || ch.contains('?') {
            pubsub.psubscribe(ch).await.map_err(|e| e.to_string())?;
        } else {
            pubsub.subscribe(ch).await.map_err(|e| e.to_string())?;
        }
    }

    // 异步任务持续接收消息并通过 Tauri Event 推送
    let conn_id = id.clone();

    tauri::async_runtime::spawn(async move {
        use futures_util::StreamExt;
        let mut msg_stream = pubsub.on_message();

        while let Some(msg) = msg_stream.next().await {
            let channel: String = msg.get_channel_name().to_string();
            let payload: String = match msg.get_payload::<String>() {
                Ok(p) => p,
                Err(_) => continue,
            };

            #[derive(Clone, Serialize)]
            struct PubSubMessage {
                connection_id: String,
                channel: String,
                message: String,
                timestamp: u64,
            }

            let event = PubSubMessage {
                connection_id: conn_id.clone(),
                channel,
                message: payload,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64,
            };

            let _ = app.emit("redis://pubsub", &event);
        }
    });

    Ok(())
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
