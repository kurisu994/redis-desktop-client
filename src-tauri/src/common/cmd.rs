use crate::common::request::SimpleServerInfo;
use crate::core::manager;
use crate::core::models::{RedisDatabase, RedisValue};
use crate::dao::models::{NewServer, ServerInfo, Settings};
use crate::dao::{server, setting};
use crate::{ret_err, wrap_err};

type CmdResult<T = ()> = Result<T, String>;

/// 查询所有redis服务器信息
///
/// # Arguments
///
/// * none
///
/// returns: Message<Vec<ServerInfo>>
///
#[tauri::command]
pub fn all_con() -> CmdResult<Vec<ServerInfo>> {
    Ok(wrap_err!(server::query_all(""))?)
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
pub fn save_con(server: Option<NewServer>) -> CmdResult<usize> {
    if let None = server {
        ret_err!("连接信息不能为空")
    }
    let server_info = server.unwrap();
    let _port = server_info.port;
    if _port > 65536 || _port <= 0 {
        ret_err!(String::from("端口号必须在1-65536之间"))
    }
    let result = wrap_err!(server::save_or_update(server_info))?;
    Ok(result)
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
pub fn delete_con(id: i32) -> CmdResult<usize> {
    Ok(wrap_err!(server::delete_by_id(id))?)
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
pub fn query_setting() -> CmdResult<Settings> {
    Ok(wrap_err!(setting::query())?)
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
pub fn update_setting(settings: Option<Settings>) -> CmdResult<bool> {
    println!("settings data: {:?}", settings);
    if let None = settings {
        ret_err!("设置信息不能为空")
    }
    Ok(setting::update(settings.unwrap())?)
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
pub fn test_con(info: Option<SimpleServerInfo>) -> CmdResult<bool> {
    if let None = info {
        ret_err!("设置信息不能为空")
    }
    let res = manager::test_server_info(info.unwrap().transform_server_info());
    Ok(wrap_err!(res)?)
}

///  打开redis连接并读取redis的db列表
///
/// # Arguments
///
/// * `id`: core server id
///
/// returns: ()
///
#[tauri::command]
pub fn read_redis_dbs(id: i32) -> CmdResult<Vec<RedisDatabase>> {
    let res = manager::get_db_key_count(id);
    Ok(wrap_err!(res)?)
}

/// 关闭redis
///
/// # Arguments
///
/// * `id`: redis服务器id
///
/// returns: Result<(), String>
#[tauri::command]
pub fn close_redis(id: i32) -> CmdResult {
    let _ = manager::disconnect_redis(id);
    Ok(())
}

///  读取redis服务器的状态
///
/// # Arguments
///
/// * `id`: core server id
///
/// returns: ()
///
#[tauri::command]
pub fn read_redis_status(id: i32) -> CmdResult {
    let server_info = server::query_by_id(id);
    println!("core server info is {:?}", server_info);
    Ok(())
}

/// 查询选中db的所有key
///
/// # Arguments
///
/// * `id`: core server id
/// * `db`: db编号
/// * `kw`: 搜索条件
///
/// returns: ()
///
///
#[tauri::command(rename_all = "snake_case")]
pub fn read_redis_key_list(id: i32, db: i64, kw: Option<String>) -> CmdResult<Vec<String>> {
    let key_list = wrap_err!(manager::all_keys_by_pattern(
        id,
        db,
        &kw.unwrap_or(String::from("*"))
    ))?;
    Ok(key_list)
}

/// 查询选中db的所有key树
///
/// # Arguments
///
/// * `id`: core server id
/// * `db`: db编号
/// * `delimiter`: 分隔符
/// * `execution_timeout`: 超时时间
///
/// returns: ()
///
///
#[tauri::command(rename_all = "snake_case")]
pub fn read_redis_key_tree(
    id: i32,
    db: i64,
    delimiter: String,
    execution_timeout: i32,
) -> CmdResult {
    println!(
        "query id {} db is {}, delimiter is {}, execution_timeout is {}",
        id, db, delimiter, execution_timeout
    );
    Ok(())
}

/// 根据redis key查询信息
///
/// # Arguments
///
/// * `id`: core server id
/// * `db`: db下标
/// * `key`: core key
///
/// returns: ()
///
#[tauri::command]
pub fn read_redis_value(id: i32, db: i64, key: String) -> CmdResult<RedisValue> {
    log::info!("redis id and db is  ({}-{}) key is {}", id, db, key);
    Ok(manager::get_value_by_key(id, db, &key)?)
}

///
/// 修改key的过期时间
/// # Arguments
///
/// * `id`: core server id
/// * `key`: core 的key
/// * `policy`: 过期类型 **[过期时间/过期时刻]**
/// * `ttl`: 有效时长/到期时间
///
/// returns: ()
///
///
#[tauri::command]
pub fn update_redis_key_ttl(id: i32, key: String, policy: u8, ttl: u32) -> CmdResult {
    println!(
        "core({}) key is {} ttl_type {} ttl {}",
        id, key, policy, ttl
    );
    Ok(())
}

///
///
/// # Arguments
///
/// * `id`: core server id
/// * `key`: core 的key
///
/// returns: ()
///
///
#[tauri::command]
pub fn delete_redis_key(id: i32, key: String) -> CmdResult {
    println!("core({}) key is {}", id, key);
    Ok(())
}
