use crate::common::enums::{IEnum, TtlPolicy};
use crate::common::request::{RedisOptions, SimpleServerInfo};
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
pub fn all_server() -> CmdResult<Vec<ServerInfo>> {
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
pub fn save_server(server: Option<NewServer>) -> CmdResult<usize> {
    if let None = server {
        ret_err!("连接信息不能为空")
    }
    let server_info = server.unwrap();
    let _port = server_info.port;
    let server_id: Option<i32> = server_info.id;

    if _port > 65536 || _port <= 0 {
        ret_err!(String::from("端口号必须在1-65536之间"))
    }
    let result = wrap_err!(server::save_or_update(server_info))?;

    match server_id {
        Some(id) => {
            manager::disconnect_redis(id).expect_err("disconnect redis error");
        }
        None => {}
    };
    Ok(result)
}

/// 复制一个redis服务
///
/// # Arguments
///
/// * `id`: server origin id
///
/// returns: Result<bool, String>
///
#[tauri::command]
pub fn copy_server(id: i32) -> CmdResult<bool> {
    log::info!("copy server origin id: {}", id);
    Ok(server::copy_server(id)?)
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
pub fn delete_server(id: i32) -> CmdResult<usize> {
    log::info!("delete server id: {}", id);
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
    log::info!("settings data: {:?}", settings);
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
pub fn test_server(info: Option<SimpleServerInfo>) -> CmdResult<bool> {
    log::info!("test server info is: {:?}", info);
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
    log::info!("read redis keys db id: {}", id);
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
    log::info!("close redis:{}", id);
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
    log::info!("core server info is {:?}", server_info);
    // todo need check
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
/// * `redis_option`: 操作redis必要条件
///
/// returns: ()
///
#[tauri::command(rename_all = "snake_case")]
pub fn read_redis_value(redis_option: RedisOptions) -> CmdResult<RedisValue> {
    log::info!("option info ({:?})", redis_option);
    Ok(manager::get_value_by_key(
        redis_option.id,
        redis_option.db,
        &redis_option.key,
    )?)
}

///
/// 修改key的过期时间
/// # Arguments
///
/// * `redis_option`: 操作redis必要条件
/// * `policy`: 过期类型 **[过期时间/过期时刻]**
/// * `ttl`: 有效时长/到期时间
///
/// returns: ()
///
///
#[tauri::command(rename_all = "snake_case")]
pub fn update_redis_key_ttl(redis_option: RedisOptions, policy: u8, ttl: usize) -> CmdResult<bool> {
    log::info!(
        "option ({:?}) and ttl_type {} ttl {}",
        redis_option,
        policy,
        ttl
    );
    let policy = TtlPolicy::from_u8(policy)?;
    Ok(manager::update_key_ttl(
        redis_option.id,
        redis_option.db,
        &redis_option.key,
        policy.to_redis_expiry(ttl),
    )?)
}

///
///
/// # Arguments
///
/// * `redis_option`: 操作redis必要条件
///
/// returns: ()
///
///
#[tauri::command(rename_all = "snake_case")]
pub fn delete_redis_key(redis_option: RedisOptions) -> CmdResult {
    log::info!("option info ({:?})", redis_option);
    wrap_err!(manager::delete_key(
        redis_option.id,
        redis_option.db,
        &redis_option.key
    ))?;
    Ok(())
}

/// 重命名某个key
///
/// # Arguments
///
/// * `id`: redis server id
/// * `db`: db下标
/// * `old_key`: redis key
/// * `new_key`: 修改后的key
///
/// returns: Result<(), String>
#[tauri::command(rename_all = "snake_case")]
pub fn rename_key(id: i32, db: i64, old_key: String, new_key: String) -> CmdResult {
    wrap_err!(manager::rename_key(id, db, &old_key, &new_key))?;
    Ok(())
}
