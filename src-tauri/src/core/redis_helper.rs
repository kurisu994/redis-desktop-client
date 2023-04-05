use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use lazy_static::lazy_static;
use redis::{Client, Connection, RedisResult};
use tauri::async_runtime::Mutex;

use crate::dao::models::ServerInfo;

lazy_static! {
    static ref CON_INFO_MAP: Arc<Mutex<HashMap<i32,redis::Client>>> = Arc::new(Mutex::new(HashMap::new()));
}


///
/// 打开redis连接
/// # Arguments
///
/// * `server`: redis连接信息
///
/// returns: Result<Connection, RedisError>
///
pub async fn get_redis_con(server: ServerInfo) -> RedisResult<Connection> {
    let server_id = server.id;
    let mut con_timeout = server.con_timeout;
    if con_timeout <= 0 {
        con_timeout = 60;
    }
    let mut map = CON_INFO_MAP.lock().await;
    match map.get(&server_id) {
        None => {
            println!("init redis connection");
            let cl = gen_client(server)?;
            map.insert(server_id, cl.clone());
            cl.get_connection_with_timeout(Duration::from_secs(con_timeout as u64))
        }
        Some(cl) => {
            cl.get_connection_with_timeout(Duration::from_secs(con_timeout as u64))
        }
    }
}

/// 断开一个redis服务的连接
///
/// # Arguments
///
/// * `server_id`: redis服务器id
///
/// returns: ()
///
pub async fn disconnect_con(server_id: i32) {
    let mut map = CON_INFO_MAP.lock().await;
    map.remove(&server_id);
}

/// 创建redis client
///
/// # Arguments
///
/// * `server`: redis服务器信息
///
/// returns: Result<Client, RedisError>
///
pub fn gen_client(server: ServerInfo) -> RedisResult<Client> {
    let host = server.host;
    let port = server.port;
    let password = server.password;
    let username = server.username;
    // The URL format is redis://[<username>][:<password>@]<hostname>[:port][/<db>]
    let mut uri = "redis://".to_string();
    match username {
        Some(account) => {
            uri.push_str(&account);
        }
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

    log::info!("uri: {}", uri);
    Client::open(uri)
}
