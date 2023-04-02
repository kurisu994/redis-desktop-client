use std::time::Duration;

use redis::{Client, Connection, ConnectionLike, RedisResult};

use crate::dao::models::ServerInfo;

/// 测试连接信息是否正确
///
/// # Arguments
///
/// * `server`: redis连接信息
///
/// returns: RedisResult<bool>
///
pub fn test_server_info(server: ServerInfo) -> RedisResult<bool> {
    let mut con = open_redis(server)?;
    Ok(con.check_connection())
}

///
/// 打开redis连接
/// # Arguments
///
/// * `server`: redis连接信息
///
/// returns: Result<Connection, RedisError>
///
pub fn open_redis(server: ServerInfo) -> RedisResult<Connection> {
    let mut con_timeout = server.con_timeout;
    if con_timeout <= 0 {
        con_timeout = 60;
    }
    let client = gen_client(server)?;
    client.get_connection_with_timeout(Duration::from_secs(con_timeout as u64))
}

/// 创建redis client
///
/// # Arguments
///
/// * `server`: redis服务器信息
///
/// returns: Result<Client, RedisError>
///
fn gen_client(server: ServerInfo) -> RedisResult<Client> {
    let host = server.host;
    let port = server.port;
    let password = server.password;
    let username = server.username;
    // The URL format is redis://[<username>][:<password>@]<hostname>[:port][/<db>]
    let mut uri = "redis://".to_string();
    match username {
        Some(account) => { uri.push_str(&account); }
        _ => {}
    }
    match password {
        Some(pwd) => {
            uri.push_str(":");
            uri.push_str(&pwd);
            uri.push_str("@");
        }
        _ => {}
    }
    uri.push_str(&host);
    uri.push_str(":");
    uri.push_str(&port.to_string());

    println!("uri: {}", uri);
    Client::open(uri)
}