use std::sync::atomic::{AtomicI32, Ordering};
use std::time::Duration;

use redis::{Client, ConnectionLike, RedisResult};

use crate::dao::models::ServerInfo;

pub static REFRESH_INTERVAL: AtomicI32 = AtomicI32::new(0);

pub fn set_refresh_interval(interval: i32) {
    REFRESH_INTERVAL.swap(interval, Ordering::SeqCst);
}


/// 测试连接信息是否正确
///
/// # Arguments
///
/// * `server`: redis连接信息
///
/// returns: Result<bool, String>
/// todo -> 连接不成功的异常处理 3.31
///
pub fn test_server_info(server: ServerInfo) -> RedisResult<bool> {
    let mut con_timeout = server.con_timeout;
    if con_timeout <= 0 {
        con_timeout = 60;
    }
    let client = open_redis(server)?;
    let mut con = client.get_connection_with_timeout(Duration::from_secs(con_timeout as u64))?;
    let is_ok = con.check_connection();
    Ok(is_ok)
}

///
/// 打开redis连接
/// # Arguments
///
/// * `server`: redis连接信息
///
/// returns: Result<Connection, RedisError>
///
fn open_redis(server: ServerInfo) -> RedisResult<Client> {
    let host = server.host;
    let port = server.port;
    let password = server.password;
    let username = server.username;
    // The URL format is redis://[<username>][:<password>@]<hostname>[:port][/<db>]
    let mut uri = "redis://".to_string();
    match username {
        Some(_username) => { uri.push_str(&_username); }
        _ => {}
    }
    match password {
        Some(_password) => {
            uri.push_str(":");
            uri.push_str(&_password);
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