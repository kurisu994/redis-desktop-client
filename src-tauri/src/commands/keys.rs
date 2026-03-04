use crate::redis::client::RedisClientManager;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use tauri::State;

/// 扫描结果中的 Key 条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyEntry {
    pub key: String,
    pub key_type: String,
}

/// SCAN 扫描结果
#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub cursor: u64,
    pub keys: Vec<KeyEntry>,
}

/// 数据库信息
#[derive(Debug, Clone, Serialize)]
pub struct DbInfo {
    pub db_count: u32,
    pub db_sizes: Vec<DbSize>,
}

/// 单个数据库的 Key 数量
#[derive(Debug, Clone, Serialize)]
pub struct DbSize {
    pub db: u32,
    pub size: u64,
}

/// Key 详细信息
#[derive(Debug, Clone, Serialize)]
pub struct KeyInfo {
    pub key_type: String,
    pub ttl: i64,
    pub size: i64,
    pub encoding: String,
    pub length: i64,
}

/// 基于 SCAN 分页扫描 Key 列表 + pipeline 批量 TYPE
#[tauri::command]
pub async fn scan_keys(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    cursor: u64,
    pattern: String,
    count: u64,
) -> Result<ScanResult, String> {
    let mut conn = pool.get_connection(&id).await?;

    // 切换数据库
    redis::cmd("SELECT")
        .arg(db)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    // SCAN 扫描
    let scan_pattern = if pattern.is_empty() { "*".to_string() } else { pattern };
    let (new_cursor, raw_keys): (u64, Vec<String>) = redis::cmd("SCAN")
        .arg(cursor)
        .arg("MATCH")
        .arg(&scan_pattern)
        .arg("COUNT")
        .arg(count)
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    // Pipeline 批量获取 TYPE
    let mut keys = Vec::with_capacity(raw_keys.len());
    if !raw_keys.is_empty() {
        let mut pipe = redis::pipe();
        for k in &raw_keys {
            pipe.cmd("TYPE").arg(k);
        }
        let types: Vec<String> = pipe
            .query_async(&mut conn)
            .await
            .map_err(|e| e.to_string())?;

        for (k, t) in raw_keys.into_iter().zip(types.into_iter()) {
            keys.push(KeyEntry {
                key: k,
                key_type: t,
            });
        }
    }

    Ok(ScanResult {
        cursor: new_cursor,
        keys,
    })
}

/// 获取数据库信息 — 解析 INFO keyspace
#[tauri::command]
pub async fn get_db_info(
    pool: State<'_, RedisClientManager>,
    id: String,
) -> Result<DbInfo, String> {
    let mut conn = pool.get_connection(&id).await?;

    // 获取数据库数量配置
    let config: Vec<String> = redis::cmd("CONFIG")
        .arg("GET")
        .arg("databases")
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;
    let db_count = config
        .get(1)
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(16);

    // 解析 INFO keyspace
    let info: String = redis::cmd("INFO")
        .arg("keyspace")
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    let mut db_sizes = Vec::new();
    for line in info.lines() {
        // 格式: db0:keys=1245,expires=10,avg_ttl=0
        if let Some(rest) = line.strip_prefix("db") {
            if let Some((db_str, kv)) = rest.split_once(':') {
                if let Ok(db_num) = db_str.parse::<u32>() {
                    let size = kv
                        .split(',')
                        .find_map(|part| {
                            part.strip_prefix("keys=")
                                .and_then(|v| v.parse::<u64>().ok())
                        })
                        .unwrap_or(0);
                    db_sizes.push(DbSize { db: db_num, size });
                }
            }
        }
    }

    Ok(DbInfo { db_count, db_sizes })
}

/// 切换数据库
#[tauri::command]
pub async fn select_database(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;
    redis::cmd("SELECT")
        .arg(db)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| e.to_string())
}

/// 获取 Key 详细信息 — TYPE + TTL + MEMORY USAGE + OBJECT ENCODING
#[tauri::command]
pub async fn get_key_info(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
) -> Result<KeyInfo, String> {
    let mut conn = pool.get_connection(&id).await?;

    redis::cmd("SELECT")
        .arg(db)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    // Pipeline 批量获取信息
    let mut pipe = redis::pipe();
    pipe.cmd("TYPE").arg(&key);
    pipe.cmd("TTL").arg(&key);
    pipe.cmd("MEMORY").arg("USAGE").arg(&key);
    pipe.cmd("OBJECT").arg("ENCODING").arg(&key);

    let results: (String, i64, redis::Value, redis::Value) = pipe
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    let size = match results.2 {
        redis::Value::Int(n) => n,
        _ => -1,
    };

    let encoding = match results.3 {
        redis::Value::BulkString(ref bytes) => String::from_utf8_lossy(bytes).to_string(),
        redis::Value::SimpleString(ref s) => s.clone(),
        _ => "unknown".to_string(),
    };

    // 获取集合长度
    let length: i64 = match results.0.as_str() {
        "string" => conn.strlen(&key).await.unwrap_or(0) as i64,
        "hash" => conn.hlen(&key).await.unwrap_or(0) as i64,
        "list" => conn.llen(&key).await.unwrap_or(0) as i64,
        "set" => conn.scard(&key).await.unwrap_or(0) as i64,
        "zset" => conn.zcard(&key).await.unwrap_or(0) as i64,
        "stream" => {
            redis::cmd("XLEN")
                .arg(&key)
                .query_async::<i64>(&mut conn)
                .await
                .unwrap_or(0)
        }
        _ => 0,
    };

    Ok(KeyInfo {
        key_type: results.0,
        ttl: results.1,
        size,
        encoding,
        length,
    })
}

/// 批量删除 Key
#[tauri::command]
pub async fn delete_keys(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    keys: Vec<String>,
) -> Result<u64, String> {
    let mut conn = pool.get_connection(&id).await?;

    redis::cmd("SELECT")
        .arg(db)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    let count: u64 = conn.del(&keys).await.map_err(|e| e.to_string())?;
    Ok(count)
}

/// 重命名 Key
#[tauri::command]
pub async fn rename_key(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    old_key: String,
    new_key: String,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;

    redis::cmd("SELECT")
        .arg(db)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    conn.rename(&old_key, &new_key)
        .await
        .map_err(|e| e.to_string())
}

/// 设置 Key 的 TTL — ttl=-1 表示持久化（移除 TTL）
#[tauri::command]
pub async fn set_key_ttl(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    key: String,
    ttl: i64,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;

    redis::cmd("SELECT")
        .arg(db)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    if ttl < 0 {
        conn.persist(&key).await.map_err(|e| e.to_string())
    } else {
        conn.expire(&key, ttl).await.map_err(|e| e.to_string())
    }
}

/// 复制 Key — 通过 DUMP + RESTORE 实现
#[tauri::command]
pub async fn copy_key(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    src: String,
    dst: String,
) -> Result<(), String> {
    let mut conn = pool.get_connection(&id).await?;

    redis::cmd("SELECT")
        .arg(db)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    let dump: Vec<u8> = redis::cmd("DUMP")
        .arg(&src)
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    let ttl: i64 = redis::cmd("PTTL")
        .arg(&src)
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    let restore_ttl = if ttl < 0 { 0 } else { ttl };

    redis::cmd("RESTORE")
        .arg(&dst)
        .arg(restore_ttl)
        .arg(dump)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| e.to_string())
}
