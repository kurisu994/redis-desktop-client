use crate::redis::client::{sanitize_redis_error, RedisClientManager};
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
    let mut conn = manager.get_server_connection(&id).await?;
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
    app: tauri::AppHandle,
    id: String,
    channels: Vec<String>,
) -> Result<(), String> {
    // 独立订阅连接复用会话端点，SSH / TLS 与数据面一致，不会退回明文直连。
    let client = manager.open_dedicated_client(&id, 0).await?;
    let mut pubsub = client
        .get_async_pubsub()
        .await
        .map_err(|err| sanitize_redis_error(&err.to_string()))?;

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

    let handle = tauri::async_runtime::spawn(async move {
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

    // 注册订阅任务句柄，便于后续取消
    manager.register_subscriber(id, handle).await;

    Ok(())
}

/// 取消指定连接的所有频道订阅
#[tauri::command]
pub async fn unsubscribe_channels(
    manager: State<'_, RedisClientManager>,
    id: String,
) -> Result<(), String> {
    manager.unregister_subscriber(&id).await;
    Ok(())
}
