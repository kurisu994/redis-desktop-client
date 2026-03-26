use crate::redis::client::RedisClientManager;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use tauri::State;

/// 导出的 Key 数据条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportedKey {
    pub key: String,
    pub key_type: String,
    pub ttl: i64,
    pub value: serde_json::Value,
}

/// 导出数据的完整结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyExportData {
    pub version: u32,
    pub exported_at: String,
    pub db: u8,
    pub keys: Vec<ExportedKey>,
}

/// 导入结果
#[derive(Debug, Clone, Serialize)]
pub struct KeyImportResult {
    pub total: usize,
    pub imported: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

/// 导出指定 Key 的数据为 JSON
#[tauri::command]
pub async fn export_keys(
    manager: State<'_, RedisClientManager>,
    id: String,
    db: u8,
    keys: Vec<String>,
) -> Result<String, String> {
    let mut conn = manager.get_connection(&id).await?;

    // 切换数据库
    if db > 0 {
        redis::cmd("SELECT")
            .arg(db)
            .query_async::<()>(&mut conn)
            .await
            .map_err(|e| e.to_string())?;
    }

    let mut exported_keys = Vec::new();

    for key in &keys {
        let key_type: String = redis::cmd("TYPE")
            .arg(key)
            .query_async(&mut conn)
            .await
            .map_err(|e| e.to_string())?;

        let ttl: i64 = conn.ttl(key).await.map_err(|e| e.to_string())?;

        let value = match key_type.as_str() {
            "string" => {
                let v: String = conn.get(key).await.map_err(|e| e.to_string())?;
                serde_json::Value::String(v)
            }
            "hash" => {
                let v: Vec<(String, String)> =
                    conn.hgetall(key).await.map_err(|e| e.to_string())?;
                let map: serde_json::Map<String, serde_json::Value> = v
                    .into_iter()
                    .map(|(k, v)| (k, serde_json::Value::String(v)))
                    .collect();
                serde_json::Value::Object(map)
            }
            "list" => {
                let v: Vec<String> = conn.lrange(key, 0, -1).await.map_err(|e| e.to_string())?;
                serde_json::Value::Array(v.into_iter().map(serde_json::Value::String).collect())
            }
            "set" => {
                let v: Vec<String> = conn.smembers(key).await.map_err(|e| e.to_string())?;
                serde_json::Value::Array(v.into_iter().map(serde_json::Value::String).collect())
            }
            "zset" => {
                let v: Vec<(String, f64)> = conn
                    .zrange_withscores(key, 0, -1)
                    .await
                    .map_err(|e| e.to_string())?;
                let arr: Vec<serde_json::Value> = v
                    .into_iter()
                    .map(|(member, score)| {
                        serde_json::json!({"member": member, "score": score})
                    })
                    .collect();
                serde_json::Value::Array(arr)
            }
            _ => {
                // stream 等其他类型暂时跳过
                continue;
            }
        };

        exported_keys.push(ExportedKey {
            key: key.clone(),
            key_type,
            ttl,
            value,
        });
    }

    let data = KeyExportData {
        version: 1,
        exported_at: chrono::Utc::now().to_rfc3339(),
        db,
        keys: exported_keys,
    };

    serde_json::to_string_pretty(&data).map_err(|e| e.to_string())
}

/// 从 JSON 导入 Key 数据
#[tauri::command]
pub async fn import_keys(
    manager: State<'_, RedisClientManager>,
    id: String,
    db: u8,
    json: String,
    conflict_strategy: String,
) -> Result<KeyImportResult, String> {
    let data: KeyExportData = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    let mut conn = manager.get_connection(&id).await?;

    // 切换数据库
    if db > 0 {
        redis::cmd("SELECT")
            .arg(db)
            .query_async::<()>(&mut conn)
            .await
            .map_err(|e| e.to_string())?;
    }

    let total = data.keys.len();
    let mut imported = 0;
    let mut skipped = 0;
    let mut errors = Vec::new();

    for entry in &data.keys {
        // 检查 Key 是否存在
        let exists: bool = conn.exists(&entry.key).await.map_err(|e| e.to_string())?;

        if exists {
            match conflict_strategy.as_str() {
                "skip" => {
                    skipped += 1;
                    continue;
                }
                "overwrite" => {
                    let _: () = conn.del(&entry.key).await.map_err(|e| e.to_string())?;
                }
                "rename" => {
                    // 使用递增后缀找到可用名称
                    let new_key = find_available_key(&mut conn, &entry.key).await?;
                    match write_key(&mut conn, &new_key, &entry.key_type, &entry.value).await {
                        Ok(()) => {
                            set_ttl_if_needed(&mut conn, &new_key, entry.ttl).await?;
                            imported += 1;
                        }
                        Err(e) => errors.push(format!("{}: {}", entry.key, e)),
                    }
                    continue;
                }
                _ => {
                    skipped += 1;
                    continue;
                }
            }
        }

        match write_key(&mut conn, &entry.key, &entry.key_type, &entry.value).await {
            Ok(()) => {
                set_ttl_if_needed(&mut conn, &entry.key, entry.ttl).await?;
                imported += 1;
            }
            Err(e) => errors.push(format!("{}: {}", entry.key, e)),
        }
    }

    Ok(KeyImportResult {
        total,
        imported,
        skipped,
        errors,
    })
}

/// 根据类型写入 Key
async fn write_key(
    conn: &mut redis::aio::ConnectionManager,
    key: &str,
    key_type: &str,
    value: &serde_json::Value,
) -> Result<(), String> {
    match key_type {
        "string" => {
            let v = value
                .as_str()
                .ok_or_else(|| "string 值无效".to_string())?;
            conn.set::<_, _, ()>(key, v).await.map_err(|e| e.to_string())?;
        }
        "hash" => {
            if let Some(obj) = value.as_object() {
                for (field, val) in obj {
                    let v = val.as_str().unwrap_or("");
                    let _: () = conn.hset(key, field, v).await.map_err(|e| e.to_string())?;
                }
            }
        }
        "list" => {
            if let Some(arr) = value.as_array() {
                for item in arr {
                    let v = item.as_str().unwrap_or("");
                    let _: () = conn.rpush(key, v).await.map_err(|e| e.to_string())?;
                }
            }
        }
        "set" => {
            if let Some(arr) = value.as_array() {
                for item in arr {
                    let v = item.as_str().unwrap_or("");
                    let _: () = conn.sadd(key, v).await.map_err(|e| e.to_string())?;
                }
            }
        }
        "zset" => {
            if let Some(arr) = value.as_array() {
                for item in arr {
                    let member = item
                        .get("member")
                        .and_then(|m| m.as_str())
                        .unwrap_or("");
                    let score = item
                        .get("score")
                        .and_then(|s| s.as_f64())
                        .unwrap_or(0.0);
                    let _: () = conn
                        .zadd(key, member, score)
                        .await
                        .map_err(|e| e.to_string())?;
                }
            }
        }
        _ => return Err(format!("不支持的类型: {}", key_type)),
    }
    Ok(())
}

/// 设置 TTL（如果需要）
async fn set_ttl_if_needed(
    conn: &mut redis::aio::ConnectionManager,
    key: &str,
    ttl: i64,
) -> Result<(), String> {
    if ttl > 0 {
        conn.expire::<_, ()>(key, ttl).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 寻找可用的 Key 名（递增后缀）
async fn find_available_key(
    conn: &mut redis::aio::ConnectionManager,
    base_key: &str,
) -> Result<String, String> {
    for i in 1..=100 {
        let candidate = format!("{}_{}", base_key, i);
        let exists: bool = conn.exists(&candidate).await.map_err(|e| e.to_string())?;
        if !exists {
            return Ok(candidate);
        }
    }
    Err(format!("无法为 {} 找到可用的重命名", base_key))
}
