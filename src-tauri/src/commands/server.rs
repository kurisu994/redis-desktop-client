use crate::config::store::ConnectionStore;
use crate::redis::client::RedisClientManager;
use serde::Serialize;
use std::collections::HashMap;
use tauri::Emitter;
use tauri::State;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;

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

/// 慢查询日志条数上限
const MAX_SLOWLOG_COUNT: u32 = 1000;

/// 获取慢查询日志
#[tauri::command]
pub async fn get_slowlog(
    manager: State<'_, RedisClientManager>,
    id: String,
    count: Option<u32>,
) -> Result<Vec<SlowLogEntry>, String> {
    let mut conn = manager.get_connection(&id).await?;
    let count = count.unwrap_or(50).min(MAX_SLOWLOG_COUNT);
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

/// 启动 MONITOR 监控 — 创建独立 TCP 连接持续读取命令日志
#[tauri::command]
pub async fn start_monitor(
    manager: State<'_, RedisClientManager>,
    store: State<'_, ConnectionStore>,
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    // 验证主连接存在
    let _ = manager.get_connection(&id).await?;

    // 从存储中读取连接配置
    let connections = store.load_connections().map_err(|e| e.to_string())?;
    let config = connections
        .iter()
        .find(|c| c.id == id)
        .ok_or_else(|| format!("找不到连接配置: {}", id))?;

    // 暂不支持的连接类型
    if config.ssh.is_some() {
        return Err("SSH 隧道连接暂不支持 MONITOR".to_string());
    }
    let tls_enabled = config.tls.as_ref().map(|t| t.enabled).unwrap_or(false);
    if tls_enabled {
        return Err("TLS 连接暂不支持 MONITOR".to_string());
    }

    // 建立独立 TCP 连接
    let host = &config.host;
    let port = config.port;
    let username = config.username.clone();
    let password = config.password.clone();
    let db = config.db;

    let stream = TcpStream::connect((host.as_str(), port))
        .await
        .map_err(|e| format!("MONITOR 连接失败: {}", e))?;

    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::new(reader);

    // 可选：AUTH
    if let Some(pass) = password {
        let auth_cmd = if let Some(user) = username {
            format!(
                "*3\r\n$4\r\nAUTH\r\n${}\r\n{}\r\n${}\r\n{}\r\n",
                user.len(),
                user,
                pass.len(),
                pass
            )
        } else {
            format!("*2\r\n$4\r\nAUTH\r\n${}\r\n{}\r\n", pass.len(), pass)
        };
        writer
            .write_all(auth_cmd.as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        writer.flush().await.map_err(|e| e.to_string())?;

        let mut line = String::new();
        reader
            .read_line(&mut line)
            .await
            .map_err(|e| e.to_string())?;
        if !line.starts_with("+OK") {
            return Err(format!("MONITOR AUTH 失败: {}", line.trim()));
        }
    }

    // 可选：SELECT db
    if db > 0 {
        let db_str = db.to_string();
        let select_cmd = format!(
            "*2\r\n$6\r\nSELECT\r\n${}\r\n{}\r\n",
            db_str.len(),
            db_str
        );
        writer
            .write_all(select_cmd.as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        writer.flush().await.map_err(|e| e.to_string())?;

        let mut line = String::new();
        reader
            .read_line(&mut line)
            .await
            .map_err(|e| e.to_string())?;
        if !line.starts_with("+OK") {
            return Err(format!("MONITOR SELECT 失败: {}", line.trim()));
        }
    }

    // 发送 MONITOR
    writer
        .write_all(b"*1\r\n$7\r\nMONITOR\r\n")
        .await
        .map_err(|e| e.to_string())?;
    writer.flush().await.map_err(|e| e.to_string())?;

    // 读取 OK
    let mut line = String::new();
    reader
        .read_line(&mut line)
        .await
        .map_err(|e| e.to_string())?;
    if !line.starts_with("+OK") {
        return Err(format!("MONITOR 启动失败: {}", line.trim()));
    }

    // 异步任务持续读取监控数据并通过 Tauri Event 推送
    let _conn_id = id.clone();
    let handle = tauri::async_runtime::spawn(async move {
        loop {
            let mut line = String::new();
            match reader.read_line(&mut line).await {
                Ok(0) => break, // 连接断开
                Ok(_) => {
                    if line.starts_with('+') {
                        let data = line
                            .trim_start_matches('+')
                            .trim_end_matches("\r\n")
                            .trim_end_matches('\n');
                        let _ = app.emit("redis://monitor", data);
                    }
                }
                Err(_) => break,
            }
        }
    });

    // 注册监控任务句柄，便于后续取消
    manager.register_subscriber(id, handle).await;

    Ok(())
}

/// 停止 MONITOR 监控
#[tauri::command]
pub async fn stop_monitor(
    manager: State<'_, RedisClientManager>,
    id: String,
) -> Result<(), String> {
    manager.unregister_subscriber(&id).await;
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
