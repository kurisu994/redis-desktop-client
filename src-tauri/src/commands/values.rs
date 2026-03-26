use crate::redis::client::RedisClientManager;
use redis::AsyncCommands;
use serde::Serialize;
use tauri::State;

// ============ 通用数据结构 ============

/// Hash 扫描结果
#[derive(Debug, Clone, Serialize)]
pub struct HashScanResult {
    pub cursor: u64,
    pub fields: Vec<HashField>,
}

#[derive(Debug, Clone, Serialize)]
pub struct HashField {
    pub field: String,
    pub value: String,
}

/// Set 扫描结果
#[derive(Debug, Clone, Serialize)]
pub struct SetScanResult {
    pub cursor: u64,
    pub members: Vec<String>,
}

/// ZSet 成员
#[derive(Debug, Clone, Serialize)]
pub struct ZSetMember {
    pub member: String,
    pub score: f64,
}

/// Stream 条目
#[derive(Debug, Clone, Serialize)]
pub struct StreamEntry {
    pub id: String,
    pub fields: Vec<(String, String)>,
}

// ============ 辅助宏：SELECT 数据库 ============

/// 切换到指定 db 的辅助函数
async fn select_db(
    conn: &mut redis::aio::MultiplexedConnection,
    db: u32,
) -> Result<(), String> {
    redis::cmd("SELECT")
        .arg(db)
        .query_async::<()>(conn)
        .await
        .map_err(|e| e.to_string())
}

// ============ 读取命令 ============

/// 获取 String 类型的值
#[tauri::command]
pub async fn get_string_value(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
) -> Result<String, String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;
    conn.get(&key).await.map_err(|e| e.to_string())
}

/// 部分读取 String 值 — 使用 GETRANGE 分块读取大值
#[tauri::command]
pub async fn get_string_value_partial(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    start: i64,
    end: i64,
) -> Result<String, String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;
    redis::cmd("GETRANGE")
        .arg(&key)
        .arg(start)
        .arg(end)
        .query_async::<String>(&mut conn)
        .await
        .map_err(|e| e.to_string())
}

/// 获取 Hash 类型的值 — HSCAN 分页（循环迭代直到收集满 count 条或扫描完毕）
#[tauri::command]
pub async fn get_hash_value(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    cursor: u64,
    pattern: String,
    count: u64,
) -> Result<HashScanResult, String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;

    let match_pattern = if pattern.is_empty() { "*".to_string() } else { pattern };
    let mut accumulated_fields: Vec<HashField> = Vec::new();
    let mut current_cursor = cursor;

    // 循环 HSCAN 直到收集满 count 条或游标归零（扫描完毕）
    loop {
        let (new_cursor, raw): (u64, Vec<String>) = redis::cmd("HSCAN")
            .arg(&key)
            .arg(current_cursor)
            .arg("MATCH")
            .arg(&match_pattern)
            .arg("COUNT")
            .arg(count)
            .query_async(&mut conn)
            .await
            .map_err(|e| e.to_string())?;

        // raw 是 [field1, value1, field2, value2, ...] 的交错数组
        for chunk in raw.chunks(2) {
            if chunk.len() == 2 {
                accumulated_fields.push(HashField {
                    field: chunk[0].clone(),
                    value: chunk[1].clone(),
                });
            }
        }

        current_cursor = new_cursor;
        if accumulated_fields.len() >= count as usize || current_cursor == 0 {
            break;
        }
    }

    Ok(HashScanResult {
        cursor: current_cursor,
        fields: accumulated_fields,
    })
}

/// 获取 List 类型的值 — LRANGE 分页
#[tauri::command]
pub async fn get_list_value(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    start: i64,
    stop: i64,
) -> Result<Vec<String>, String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;
    conn.lrange(&key, start as isize, stop as isize)
        .await
        .map_err(|e| e.to_string())
}

/// 获取 Set 类型的值 — SSCAN 分页（循环迭代直到收集满 count 条或扫描完毕）
#[tauri::command]
pub async fn get_set_value(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    cursor: u64,
    pattern: String,
    count: u64,
) -> Result<SetScanResult, String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;

    let match_pattern = if pattern.is_empty() { "*".to_string() } else { pattern };
    let mut accumulated_members: Vec<String> = Vec::new();
    let mut current_cursor = cursor;

    // 循环 SSCAN 直到收集满 count 条或游标归零（扫描完毕）
    loop {
        let (new_cursor, members): (u64, Vec<String>) = redis::cmd("SSCAN")
            .arg(&key)
            .arg(current_cursor)
            .arg("MATCH")
            .arg(&match_pattern)
            .arg("COUNT")
            .arg(count)
            .query_async(&mut conn)
            .await
            .map_err(|e| e.to_string())?;

        accumulated_members.extend(members);
        current_cursor = new_cursor;
        if accumulated_members.len() >= count as usize || current_cursor == 0 {
            break;
        }
    }

    Ok(SetScanResult {
        cursor: current_cursor,
        members: accumulated_members,
    })
}

/// 获取 ZSet 类型的值 — ZRANGE WITHSCORES
#[tauri::command]
pub async fn get_zset_value(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    start: i64,
    stop: i64,
) -> Result<Vec<ZSetMember>, String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;

    let raw: Vec<(String, f64)> = conn
        .zrange_withscores(&key, start as isize, stop as isize)
        .await
        .map_err(|e| e.to_string())?;

    Ok(raw
        .into_iter()
        .map(|(member, score)| ZSetMember { member, score })
        .collect())
}

/// 获取 Stream 类型的值 — XRANGE
#[tauri::command]
pub async fn get_stream_value(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    start: String,
    end: String,
    count: u64,
) -> Result<Vec<StreamEntry>, String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;

    let start_id = if start.is_empty() { "-".to_string() } else { start };
    let end_id = if end.is_empty() { "+".to_string() } else { end };

    let raw: redis::Value = redis::cmd("XRANGE")
        .arg(&key)
        .arg(&start_id)
        .arg(&end_id)
        .arg("COUNT")
        .arg(count)
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    // 解析 XRANGE 返回值
    parse_stream_entries(raw)
}

/// 解析 XRANGE 返回的嵌套 Value
fn parse_stream_entries(value: redis::Value) -> Result<Vec<StreamEntry>, String> {
    let entries = match value {
        redis::Value::Array(arr) => arr,
        _ => return Ok(vec![]),
    };

    let mut result = Vec::new();
    for entry in entries {
        if let redis::Value::Array(parts) = entry {
            if parts.len() >= 2 {
                let id = value_to_string(&parts[0]);
                let fields = if let redis::Value::Array(ref kvs) = parts[1] {
                    kvs.chunks(2)
                        .filter_map(|chunk| {
                            if chunk.len() == 2 {
                                Some((value_to_string(&chunk[0]), value_to_string(&chunk[1])))
                            } else {
                                None
                            }
                        })
                        .collect()
                } else {
                    vec![]
                };
                result.push(StreamEntry { id, fields });
            }
        }
    }
    Ok(result)
}

/// redis::Value 转 String 辅助函数
fn value_to_string(v: &redis::Value) -> String {
    match v {
        redis::Value::BulkString(bytes) => String::from_utf8_lossy(bytes).to_string(),
        redis::Value::SimpleString(s) => s.clone(),
        redis::Value::Int(n) => n.to_string(),
        _ => String::new(),
    }
}

// ============ 写入命令 ============

/// 设置 String 类型的值
#[tauri::command]
pub async fn set_string_value(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    value: String,
    ttl: Option<i64>,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;

    if let Some(t) = ttl {
        if t > 0 {
            conn.set_ex::<_, _, ()>(&key, &value, t as u64)
                .await
                .map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    conn.set::<_, _, ()>(&key, &value)
        .await
        .map_err(|e| e.to_string())
}

/// 设置 Hash 字段值
#[tauri::command]
pub async fn set_hash_field(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    field: String,
    value: String,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;
    conn.hset(&key, &field, &value)
        .await
        .map_err(|e| e.to_string())
}

/// 删除 Hash 字段
#[tauri::command]
pub async fn delete_hash_field(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    field: String,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;
    conn.hdel(&key, &field)
        .await
        .map_err(|e| e.to_string())
}

/// 添加 List 元素
#[tauri::command]
pub async fn add_list_element(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    value: String,
    position: String,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;

    if position == "head" {
        conn.lpush(&key, &value)
            .await
            .map_err(|e| e.to_string())
    } else {
        conn.rpush(&key, &value)
            .await
            .map_err(|e| e.to_string())
    }
}

/// 设置 List 元素值（按索引）
#[tauri::command]
pub async fn set_list_element(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    index: i64,
    value: String,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;
    conn.lset(&key, index as isize, &value)
        .await
        .map_err(|e| e.to_string())
}

/// 删除 List 元素（通过占位符+LREM 实现）
#[tauri::command]
pub async fn delete_list_element(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    index: i64,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;

    // 使用唯一占位符标记要删除的元素
    let placeholder = format!("__DELETED_{}_{}", uuid::Uuid::new_v4(), index);
    conn.lset::<_, _, ()>(&key, index as isize, &placeholder)
        .await
        .map_err(|e| e.to_string())?;
    conn.lrem::<_, _, ()>(&key, 1, &placeholder)
        .await
        .map_err(|e| e.to_string())
}

/// 添加 Set 成员
#[tauri::command]
pub async fn add_set_member(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    member: String,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;
    conn.sadd(&key, &member)
        .await
        .map_err(|e| e.to_string())
}

/// 删除 Set 成员
#[tauri::command]
pub async fn delete_set_member(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    member: String,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;
    conn.srem(&key, &member)
        .await
        .map_err(|e| e.to_string())
}

/// 添加 ZSet 成员
#[tauri::command]
pub async fn add_zset_member(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    member: String,
    score: f64,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;
    conn.zadd(&key, &member, score)
        .await
        .map_err(|e| e.to_string())
}

/// 删除 ZSet 成员
#[tauri::command]
pub async fn delete_zset_member(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    member: String,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;
    conn.zrem(&key, &member)
        .await
        .map_err(|e| e.to_string())
}

/// 添加 Stream 条目
#[tauri::command]
pub async fn add_stream_entry(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    fields: Vec<(String, String)>,
) -> Result<String, String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;

    let mut cmd = redis::cmd("XADD");
    cmd.arg(&key).arg("*");
    for (k, v) in &fields {
        cmd.arg(k).arg(v);
    }
    let entry_id: String = cmd.query_async(&mut conn).await.map_err(|e| e.to_string())?;
    Ok(entry_id)
}

/// 删除 Stream 条目
#[tauri::command]
pub async fn delete_stream_entry(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    entry_id: String,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;

    redis::cmd("XDEL")
        .arg(&key)
        .arg(&entry_id)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| e.to_string())
}

/// 创建新 Key — 根据类型创建并设置初始值
#[tauri::command]
pub async fn create_key(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    key_type: String,
    value: String,
    ttl: Option<i64>,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;

    match key_type.as_str() {
        "string" => {
            conn.set::<_, _, ()>(&key, &value)
                .await
                .map_err(|e| e.to_string())?;
        }
        "hash" => {
            conn.hset::<_, _, _, ()>(&key, "field1", &value)
                .await
                .map_err(|e| e.to_string())?;
        }
        "list" => {
            conn.rpush::<_, _, ()>(&key, &value)
                .await
                .map_err(|e| e.to_string())?;
        }
        "set" => {
            conn.sadd::<_, _, ()>(&key, &value)
                .await
                .map_err(|e| e.to_string())?;
        }
        "zset" => {
            conn.zadd::<_, _, _, ()>(&key, &value, 0.0f64)
                .await
                .map_err(|e| e.to_string())?;
        }
        "stream" => {
            redis::cmd("XADD")
                .arg(&key)
                .arg("*")
                .arg("data")
                .arg(&value)
                .query_async::<String>(&mut conn)
                .await
                .map_err(|e| e.to_string())?;
        }
        "ReJSON-RL" | "rejson" => {
            // RedisJSON: 使用 JSON.SET 创建
            redis::cmd("JSON.SET")
                .arg(&key)
                .arg("$")
                .arg(&value)
                .query_async::<String>(&mut conn)
                .await
                .map_err(|e| e.to_string())?;
        }
        _ => return Err(format!("不支持的 Key 类型: {}", key_type)),
    }

    // 设置 TTL
    if let Some(t) = ttl {
        if t > 0 {
            conn.expire::<_, ()>(&key, t)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

// ============ RedisJSON 命令 ============

/// 获取 RedisJSON 类型的值 — JSON.GET key [path]
#[tauri::command]
pub async fn get_json_value(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    path: Option<String>,
) -> Result<String, String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;

    let json_path = path.unwrap_or_else(|| "$".to_string());
    let result: String = redis::cmd("JSON.GET")
        .arg(&key)
        .arg(&json_path)
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;
    Ok(result)
}

/// 设置 RedisJSON 类型的值 — JSON.SET key path value
#[tauri::command]
pub async fn set_json_value(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    path: String,
    value: String,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    select_db(&mut conn, db).await?;

    redis::cmd("JSON.SET")
        .arg(&key)
        .arg(&path)
        .arg(&value)
        .query_async::<String>(&mut conn)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

