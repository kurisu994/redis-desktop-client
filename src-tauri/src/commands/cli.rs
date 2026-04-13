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

/// 执行 Redis 命令 — 解析用户输入并发送到 Redis
#[tauri::command]
pub async fn execute_command(
    pool: State<'_, RedisClientManager>,
    id: String,
    db: u32,
    command: String,
) -> Result<CommandResult, String> {
    let mut conn = pool.get_connection(&id).await?;

    // 切换数据库
    redis::cmd("SELECT")
        .arg(db)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    // 解析命令字符串
    let args = parse_command(&command)?;
    if args.is_empty() {
        return Err("空命令".to_string());
    }

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
}
