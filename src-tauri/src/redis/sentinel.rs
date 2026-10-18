use crate::config::store::StoredConnection;
use crate::redis::endpoint::{sanitize_redis_error, RedisEndpoint};

/// 向 Sentinel 询问当前 master 地址。
///
/// 返回的是数据节点，而不是 Sentinel 自己的端口。调用方再用 Redis 账号连接该 master。
/// 这里不订阅 `+switch-master`，故障转移后需要重新连接，能力标志里会标成 degraded。
pub async fn resolve_master(config: &StoredConnection) -> Result<(String, u16), String> {
    let sentinel = config
        .sentinel
        .as_ref()
        .ok_or_else(|| "error.sentinel.no_nodes".to_string())?;
    if sentinel.master_name.trim().is_empty() {
        return Err("error.sentinel.no_master_name".to_string());
    }
    if sentinel.nodes.is_empty() {
        return Err("error.sentinel.no_nodes".to_string());
    }

    let mut last_error = "error.sentinel.master_not_found".to_string();
    for node in &sentinel.nodes {
        let endpoint = RedisEndpoint {
            host: node.host.clone(),
            port: node.port,
            username: None,
            password: sentinel.sentinel_password.clone(),
            tls: config.tls.clone(),
            via_ssh_tunnel: false,
        };
        match query_master(&endpoint, &sentinel.master_name).await {
            Ok(addr) => return Ok(addr),
            Err(err) => {
                log::warn!(
                    "Sentinel {}:{} 查询 master 失败: {}",
                    node.host,
                    node.port,
                    err
                );
                last_error = err;
            }
        }
    }
    Err(last_error)
}

async fn query_master(
    endpoint: &RedisEndpoint,
    master_name: &str,
) -> Result<(String, u16), String> {
    let client = endpoint.open_client(0)?;
    let mut conn = client
        .get_multiplexed_async_connection()
        .await
        .map_err(|err| sanitize_redis_error(&err.to_string()))?;
    let values: Vec<String> = redis::cmd("SENTINEL")
        .arg("get-master-addr-by-name")
        .arg(master_name)
        .query_async(&mut conn)
        .await
        .map_err(|err| sanitize_redis_error(&err.to_string()))?;
    parse_master_addr(&values)
}

pub fn parse_master_addr(values: &[String]) -> Result<(String, u16), String> {
    if values.len() < 2 || values[0].is_empty() {
        return Err("error.sentinel.master_not_found".to_string());
    }
    let port = values[1]
        .parse::<u16>()
        .map_err(|_| "error.sentinel.master_not_found".to_string())?;
    if port == 0 {
        return Err("error.sentinel.master_not_found".to_string());
    }
    Ok((values[0].clone(), port))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_master_addr_accepts_host_and_port() {
        let addr = parse_master_addr(&["10.1.0.8".into(), "6379".into()]).unwrap();
        assert_eq!(addr, ("10.1.0.8".into(), 6379));
    }

    #[test]
    fn parse_master_addr_rejects_incomplete_reply() {
        assert!(parse_master_addr(&["10.1.0.8".into()]).is_err());
        assert!(parse_master_addr(&["10.1.0.8".into(), "0".into()]).is_err());
    }
}
