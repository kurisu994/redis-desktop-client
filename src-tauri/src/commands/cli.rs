use crate::redis::client::RedisClientManager;
use serde::Serialize;
use tauri::State;

/// CLI 命令执行结果
#[derive(Debug, Clone, Serialize)]
pub struct CommandResult {
    /// 格式化后的输出文本
    pub output: String,
    /// 结果类型（用于前端着色）：ok / error / integer / bulk / nil / array
    pub result_type: String,
    /// 执行耗时（毫秒）
    pub elapsed_ms: u64,
}

/// 命令黑名单 — 禁止危险管理操作及改变共享连接会话状态的命令
const BLOCKED_COMMANDS: &[&str] = &[
    "FLUSHALL",
    "FLUSHDB",
    "SHUTDOWN",
    "CONFIG",
    "DEBUG",
    "SAVE",
    "BGSAVE",
    "BGREWRITEAOF",
    "MODULE",
    "SLAVEOF",
    "REPLICAOF",
    // 脚本 / ACL / 全库扫描，和上面的管理命令同一类
    "EVAL",
    "EVALSHA",
    "EVAL_RO",
    "EVALSHA_RO",
    "FCALL",
    "FCALL_RO",
    "FUNCTION",
    "SCRIPT",
    "ACL",
    "KEYS",
    // 数据库由连接池钉住；RESET 还会重置认证、协议和事务等会话状态
    "SELECT",
    "SWAPDB",
    "RESET",
    // 认证、协议和连接生命周期不能由共享连接上的单次 CLI 调用改变
    "AUTH",
    "HELLO",
    "QUIT",
    // CLIENT REPLY / TRACKING 等会改变响应或推送行为，按命令级统一禁用
    "CLIENT",
    // 事务及 WATCH 状态属于整条连接，可能混入 Browser 或其他 CLI 请求
    "MULTI",
    "EXEC",
    "DISCARD",
    "WATCH",
    "UNWATCH",
    // 集群读写模式和一次性 ASKING 标志也会影响共享连接上的后续请求
    "READONLY",
    "READWRITE",
    "ASKING",
    // 独占流模式及订阅退出可能产生推送或多条响应，不走多路复用命令通道
    "MONITOR",
    "SUBSCRIBE",
    "PSUBSCRIBE",
    "SSUBSCRIBE",
    "UNSUBSCRIBE",
    "PUNSUBSCRIBE",
    "SUNSUBSCRIBE",
    // 复制握手不属于普通请求/响应；REPLCONF ACK 等调用不会返回普通响应
    "SYNC",
    "PSYNC",
    "REPLCONF",
];

/// 检查命令是否在黑名单中
fn check_command_blocked(cmd: &str) -> Result<(), String> {
    let upper = cmd.to_uppercase();
    if BLOCKED_COMMANDS.contains(&upper.as_str()) {
        return Err(format!("该命令已被禁用: {}", upper));
    }
    Ok(())
}

/// 执行 Redis 命令 — 解析用户输入并发送到 Redis
#[tauri::command]
pub async fn execute_command(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    command: String,
) -> Result<CommandResult, String> {
    let args = parse_command(&command)?;
    if args.is_empty() {
        return Err("空命令".to_string());
    }

    // 先检查黑名单，避免 CLI 改变按 db 钉住的共享连接的会话状态。
    check_command_blocked(&args[0])?;

    let mut conn = pool.get_connection(&id, db).await?;

    // 构建并执行命令
    let start = std::time::Instant::now();
    let mut cmd = redis::cmd(&args[0].to_uppercase());
    for arg in &args[1..] {
        cmd.arg(arg.as_str());
    }

    let result: redis::Value = cmd
        .query_async(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    let elapsed_ms = start.elapsed().as_millis() as u64;

    // 格式化输出
    let (output, result_type) = format_redis_value(&result, 0);

    Ok(CommandResult {
        output,
        result_type,
        elapsed_ms,
    })
}

/// 解析命令字符串 — 支持引号和转义
fn parse_command(input: &str) -> Result<Vec<String>, String> {
    let input = input.trim();
    if input.is_empty() {
        return Ok(vec![]);
    }

    let mut args = Vec::new();
    let mut current = String::new();
    let mut chars = input.chars().peekable();
    let mut in_single_quote = false;
    let mut in_double_quote = false;

    while let Some(ch) = chars.next() {
        match ch {
            '\'' if !in_double_quote => {
                in_single_quote = !in_single_quote;
            }
            '"' if !in_single_quote => {
                in_double_quote = !in_double_quote;
            }
            '\\' if in_double_quote => {
                // 双引号内支持转义
                if let Some(&next) = chars.peek() {
                    match next {
                        '"' | '\\' => {
                            current.push(next);
                            chars.next();
                        }
                        'n' => {
                            current.push('\n');
                            chars.next();
                        }
                        't' => {
                            current.push('\t');
                            chars.next();
                        }
                        _ => current.push(ch),
                    }
                } else {
                    current.push(ch);
                }
            }
            ' ' | '\t' if !in_single_quote && !in_double_quote => {
                if !current.is_empty() {
                    args.push(std::mem::take(&mut current));
                }
            }
            _ => current.push(ch),
        }
    }

    if in_single_quote || in_double_quote {
        return Err("引号未闭合".to_string());
    }

    if !current.is_empty() {
        args.push(current);
    }

    Ok(args)
}

/// 格式化 Redis 返回值为可读字符串
fn format_redis_value(value: &redis::Value, indent: usize) -> (String, String) {
    let prefix = "  ".repeat(indent);
    match value {
        redis::Value::Nil => ("(nil)".to_string(), "nil".to_string()),
        redis::Value::Int(n) => (format!("(integer) {}", n), "integer".to_string()),
        redis::Value::BulkString(bytes) => {
            match String::from_utf8(bytes.clone()) {
                Ok(s) => (format!("\"{}\"", s), "bulk".to_string()),
                Err(_) => {
                    // 二进制数据用十六进制展示
                    let hex: Vec<String> = bytes.iter().map(|b| format!("{:02x}", b)).collect();
                    (hex.join(" "), "bulk".to_string())
                }
            }
        }
        redis::Value::SimpleString(s) => (s.clone(), "ok".to_string()),
        redis::Value::Okay => ("OK".to_string(), "ok".to_string()),
        redis::Value::Array(arr) => {
            if arr.is_empty() {
                return ("(empty array)".to_string(), "array".to_string());
            }
            let mut lines = Vec::new();
            for (i, item) in arr.iter().enumerate() {
                let (formatted, _) = format_redis_value(item, indent + 1);
                lines.push(format!("{}{}) {}", prefix, i + 1, formatted));
            }
            (lines.join("\n"), "array".to_string())
        }
        redis::Value::Map(pairs) => {
            if pairs.is_empty() {
                return ("(empty map)".to_string(), "array".to_string());
            }
            let mut lines = Vec::new();
            for (i, (k, v)) in pairs.iter().enumerate() {
                let (fk, _) = format_redis_value(k, 0);
                let (fv, _) = format_redis_value(v, indent + 1);
                lines.push(format!("{}{}) {} -> {}", prefix, i + 1, fk, fv));
            }
            (lines.join("\n"), "array".to_string())
        }
        redis::Value::Set(items) => {
            if items.is_empty() {
                return ("(empty set)".to_string(), "array".to_string());
            }
            let mut lines = Vec::new();
            for (i, item) in items.iter().enumerate() {
                let (formatted, _) = format_redis_value(item, indent + 1);
                lines.push(format!("{}{}) {}", prefix, i + 1, formatted));
            }
            (lines.join("\n"), "array".to_string())
        }
        redis::Value::Double(f) => (format!("(double) {}", f), "integer".to_string()),
        redis::Value::Boolean(b) => (format!("(boolean) {}", b), "ok".to_string()),
        redis::Value::VerbatimString { text, .. } => (format!("\"{}\"", text), "bulk".to_string()),
        redis::Value::ServerError(err) => {
            let msg = match err.details() {
                Some(detail) => format!("(error) {} {}", err.code(), detail),
                None => format!("(error) {}", err.code()),
            };
            (msg, "error".to_string())
        }
        _ => (format!("{:?}", value), "bulk".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_command() {
        let args = parse_command("GET key").unwrap();
        assert_eq!(args, vec!["GET", "key"]);
    }

    #[test]
    fn test_parse_quoted_command() {
        let args = parse_command(r#"SET key "hello world""#).unwrap();
        assert_eq!(args, vec!["SET", "key", "hello world"]);
    }

    #[test]
    fn test_parse_single_quoted() {
        let args = parse_command("SET key 'hello world'").unwrap();
        assert_eq!(args, vec!["SET", "key", "hello world"]);
    }

    #[test]
    fn test_parse_empty() {
        let args = parse_command("").unwrap();
        assert!(args.is_empty());
    }

    #[test]
    fn test_parse_unclosed_quote() {
        let result = parse_command(r#"SET key "hello"#);
        assert!(result.is_err());
    }

    #[test]
    fn blocks_reset_case_insensitively() {
        for cmd in ["RESET", "reset", "ReSeT"] {
            assert!(check_command_blocked(cmd).is_err(), "{cmd} 应被禁用");
        }
    }

    #[test]
    fn blocks_shared_connection_session_commands() {
        for cmd in [
            "AUTH",
            "HELLO",
            "CLIENT",
            "QUIT",
            "MULTI",
            "EXEC",
            "DISCARD",
            "WATCH",
            "UNWATCH",
            "READONLY",
            "READWRITE",
            "ASKING",
            "MONITOR",
            "SUBSCRIBE",
            "PSUBSCRIBE",
            "SSUBSCRIBE",
            "UNSUBSCRIBE",
            "PUNSUBSCRIBE",
            "SUNSUBSCRIBE",
            "SYNC",
            "PSYNC",
            "REPLCONF",
        ] {
            assert!(check_command_blocked(cmd).is_err(), "{cmd} 应被禁用");
            let lower = cmd.to_ascii_lowercase();
            assert!(check_command_blocked(&lower).is_err(), "{lower} 应被禁用");
        }
    }

    #[test]
    fn allows_common_read_commands() {
        for cmd in [
            "GET", "mget", "SCAN", "scan", "HGET", "HGETALL", "LRANGE", "SMEMBERS", "ZRANGE",
            "XRANGE", "TYPE", "TTL", "DBSIZE", "INFO", "PING",
        ] {
            assert!(check_command_blocked(cmd).is_ok(), "{cmd} 应保持可用");
        }
    }

    #[test]
    fn blocks_eval_acl_keys_and_select() {
        for cmd in [
            "EVAL", "evalsha", "ACL", "KEYS", "SELECT", "FCALL", "SCRIPT",
        ] {
            assert!(check_command_blocked(cmd).is_err(), "{cmd} 应被禁用");
        }
        assert!(check_command_blocked("SCAN").is_ok());
        assert!(check_command_blocked("GET").is_ok());
    }
}
