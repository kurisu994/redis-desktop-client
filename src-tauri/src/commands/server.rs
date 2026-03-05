use crate::redis::client::RedisClientManager;
use serde::Serialize;
use std::collections::HashMap;
use tauri::State;

/// 服务器 INFO 各区块的结构化数据
pub type ServerInfo = HashMap<String, HashMap<String, String>>;

/// 慢查询日志条目
#[derive(Debug, Clone, Serialize)]
pub struct SlowLogEntry {
    pub id: u64,
    pub timestamp: u64,
    pub duration_us: u64,
    pub command: String,
    pub client_addr: String,
}

/// 获取服务器 INFO 信息 — 解析为分区结构化数据
#[tauri::command]
pub async fn get_server_info(
    manager: State<'_, RedisClientManager>,
    id: String,
) -> Result<ServerInfo, String> {
    let mut conn = manager.get_connection(&id).await?;
    let info: String = redis::cmd("INFO")
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;
    Ok(parse_info(&info))
}

/// 获取慢查询日志
#[tauri::command]
pub async fn get_slowlog(
    manager: State<'_, RedisClientManager>,
    id: String,
    count: Option<u32>,
) -> Result<Vec<SlowLogEntry>, String> {
    let mut conn = manager.get_connection(&id).await?;
    let count = count.unwrap_or(50);
    let raw: Vec<redis::Value> = redis::cmd("SLOWLOG")
        .arg("GET")
        .arg(count)
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;
    Ok(parse_slowlog(&raw))
}

/// 清空慢查询日志
#[tauri::command]
pub async fn reset_slowlog(
    manager: State<'_, RedisClientManager>,
    id: String,
) -> Result<(), String> {
    let mut conn = manager.get_connection(&id).await?;
    redis::cmd("SLOWLOG")
        .arg("RESET")
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 设置慢查询阈值 (microseconds)
#[tauri::command]
pub async fn set_slowlog_threshold(
    manager: State<'_, RedisClientManager>,
    id: String,
    threshold: u64,
) -> Result<(), String> {
    let mut conn = manager.get_connection(&id).await?;
    redis::cmd("CONFIG")
        .arg("SET")
        .arg("slowlog-log-slower-than")
        .arg(threshold)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// 解析 INFO 命令返回的字符串为分区结构化数据
fn parse_info(info: &str) -> ServerInfo {
    let mut result: ServerInfo = HashMap::new();
    let mut current_section = String::new();

    for line in info.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Some(section) = line.strip_prefix("# ") {
            current_section = section.to_lowercase();
            result.entry(current_section.clone()).or_default();
        } else if let Some((key, value)) = line.split_once(':') {
            if !current_section.is_empty() {
                result
                    .entry(current_section.clone())
                    .or_default()
                    .insert(key.to_string(), value.to_string());
            }
        }
    }
    result
}

/// 解析 SLOWLOG GET 原始返回值
fn parse_slowlog(raw: &[redis::Value]) -> Vec<SlowLogEntry> {
    let mut entries = Vec::new();
    for item in raw {
        if let redis::Value::Array(ref arr) = item {
            if arr.len() >= 4 {
                let id = extract_int(&arr[0]).unwrap_or(0) as u64;
                let timestamp = extract_int(&arr[1]).unwrap_or(0) as u64;
                let duration_us = extract_int(&arr[2]).unwrap_or(0) as u64;
                let command = extract_string_array(&arr[3]);
                let client_addr = if arr.len() > 4 {
                    extract_string(&arr[4])
                } else {
                    String::new()
                };
                entries.push(SlowLogEntry {
                    id,
                    timestamp,
                    duration_us,
                    command,
                    client_addr,
                });
            }
        }
    }
    entries
}

/// 从 Redis Value 中提取整数
fn extract_int(v: &redis::Value) -> Option<i64> {
    match v {
        redis::Value::Int(n) => Some(*n),
        _ => None,
    }
}

/// 从 Redis Value 中提取字符串
fn extract_string(v: &redis::Value) -> String {
    match v {
        redis::Value::BulkString(bytes) => String::from_utf8_lossy(bytes).to_string(),
        redis::Value::SimpleString(s) => s.clone(),
        redis::Value::Int(n) => n.to_string(),
        _ => String::new(),
    }
}

/// 从 Redis Array Value 中提取字符串（用于命令参数拼接）
fn extract_string_array(v: &redis::Value) -> String {
    match v {
        redis::Value::Array(arr) => arr.iter().map(extract_string).collect::<Vec<_>>().join(" "),
        _ => extract_string(v),
    }
}
