use crate::common::request::SimpleServerInfo;
use crate::common::response::Message;
use crate::dao::{server, setting};
use crate::dao::models::{NewServer, ServerInfo, Settings};
use crate::redis::redis_helper;

/// 查询所有redis服务器信息
///
/// # Arguments
///
/// * none
///
/// returns: Message<Vec<ServerInfo>>
///
#[tauri::command]
pub fn all_con() -> Message<Vec<ServerInfo>> {
    match server::query_all("") {
        Ok(data) => Message::ok(data),
        Err(err) => Message::err(&err),
    }
}

/// 保存和修改redis服务器信息
///
/// # Arguments
///
/// * `server`: redis服务器信息
///
/// returns: Message<bool>
///
#[tauri::command(rename_all = "snake_case")]
pub fn save_con(server: Option<NewServer>) -> Message<bool> {
    println!("{:?}", server);
    if let None = server {
        return Message::err("连接信息不能为空");
    }
    match server::save_or_update(server.unwrap()) {
        Ok(data) => Message::ok(data),
        Err(err) => Message::err(&err),
    }
}

/// 删除连接信息
///
/// # Arguments
///
/// * `id`: redis服务器id
///
/// returns: Message<bool>
///
#[tauri::command]
pub fn delete_con(id: i32) -> Message<bool> {
    match server::delete_by_id(id) {
        Ok(data) => Message::ok(data),
        Err(err) => Message::err(&err),
    }
}

///查询设置
///
/// # Arguments
///
/// * none
///
/// returns: Message<Settings>
///
#[tauri::command]
pub fn query_setting() -> Message<Settings> {
    match setting::query() {
        Ok(data) => Message::ok(data),
        Err(err) => Message::err(&err),
    }
}

/// 修改设置
///
/// # Arguments
///
/// * `settings`: 设置信息
///
/// returns: Message<bool>
///
#[tauri::command]
pub fn update_setting(settings: Option<Settings>) -> Message<bool> {
    println!("{:?}", settings);
    if let None = settings {
        return Message::err("设置信息不能为空");
    }
    match setting::update(settings.unwrap()) {
        Ok(data) => Message::ok(data),
        Err(err) => Message::err(&err),
    }
}

/// 测试连接
///
/// # Arguments
///
/// * `info`: redis服务器信息
///
/// returns: Message<bool>
///
///
#[tauri::command]
pub fn test_con(info: Option<SimpleServerInfo>) -> Message<bool> {
    if let None = info {
        return Message::err("连接信息不能为空");
    }
    match redis_helper::test_server_info(info.unwrap().transform_server_info()) {
        Ok(data) => if data {
            Message::ok(data)
        } else {
            Message::err("can't connect redis-server")
        }

        Err(err) => Message::err(&err.to_string()),
    }
}

///  打开redis连接并读取redis的db列表
///
/// # Arguments
///
/// * `id`: redis server id
///
/// returns: ()
///
#[tauri::command]
pub fn read_redis_dbs(id: i32) -> () {
    let server_info = server::query_by_id(id);
    println!("redis server info is {:?}", server_info);
}

/// 查询选中db的所有key树
///
/// # Arguments
///
/// * `id`: redis server id
/// * `db`: db编号
/// * `delimiter`: 分隔符
/// * `execution_timeout`: 超时时间
///
/// returns: ()
///
///
#[tauri::command(rename_all = "snake_case")]
pub fn read_redis_key_tree(id: i32, db: i32, delimiter: String, execution_timeout: i32) -> () {
    println!("query id {} db is {}, delimiter is {}, execution_timeout is {}", id, db, delimiter, execution_timeout);
}

/// 根据redis key查询信息
///
/// # Arguments
///
/// * `id`: redis server id
/// * `key`: redis key
///
/// returns: ()
///
#[tauri::command]
pub fn read_redis_value(id: i32, key: String) -> () {
    println!("redis({}) key is {}", id, key);
}

///
/// 修改key的过期时间
/// # Arguments
///
/// * `id`: redis server id
/// * `key`: redis 的key
/// * `ttl_type`: 过期类型 **[过期时间/过期时刻]**
/// * `ttl`: 有效时长/到期时间
///
/// returns: ()
///
///
#[tauri::command]
pub fn update_redis_key_ttl(id: i32, key: String, policy: u8, ttl: u32) -> () {
    println!("redis({}) key is {} ttl_type {} ttl {}", id, key, policy, ttl);
}

///
///
/// # Arguments
///
/// * `id`: redis server id
/// * `key`: redis 的key
///
/// returns: ()
///
///
#[tauri::command]
pub fn delete_redis_key(id: i32, key: String) -> () {
    println!("redis({}) key is {}", id, key);
}
