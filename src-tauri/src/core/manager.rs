use std::collections::HashMap;
use std::sync::atomic::{AtomicI32, Ordering};
use std::time::Duration;

use redis::{Commands, ConnectionLike, RedisResult};
use tauri::async_runtime::block_on;

use crate::common::enums::{IEnum, RedisKeyType, TtlPolicy};
use crate::core::models::{KeyValue, RedisDatabase, RedisValue, RedisValueTrait};
use crate::core::redis_helper;
use crate::dao::models::ServerInfo;
use crate::utils::helper::parse_str;
use crate::wrap_err;

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
/// returns: RedisResult<bool>
///
pub fn test_server_info(server: ServerInfo) -> RedisResult<bool> {
    let mut con_timeout = server.con_timeout as u64;
    if con_timeout <= 0 {
        con_timeout = 60;
    }
    let execution_timeout = server.execution_timeout as u64;
    let mut con = redis_helper::gen_client(server)?
        .get_connection_with_timeout(Duration::from_secs(con_timeout))?;

    if execution_timeout > 0 {
        con.set_read_timeout(Some(Duration::from_secs(execution_timeout)))?;
        con.set_write_timeout(Some(Duration::from_secs(execution_timeout)))?;
    }

    Ok(con.check_connection())
}

/// 查询redis所有数据库及每个数据库的key的数量
///
/// # Arguments
///
/// * `info`: redis server信息
///
/// returns: Result<Vec<RedisDatabase, Global>, RedisError>
///
pub fn get_db_key_count(server_id: i32) -> RedisResult<Vec<RedisDatabase>> {
    let conn = &mut block_on(redis_helper::get_redis_con(server_id))?;

    let (_, db_size): (String, String) = redis::cmd("CONFIG")
        .arg("GET")
        .arg("databases")
        .query(conn)?;
    let db_size: usize = db_size.parse::<usize>().unwrap_or(0);
    let mut db_list: Vec<RedisDatabase> = Vec::with_capacity(db_size);

    let response: String = redis::cmd("INFO").arg("keyspace").query(conn)?;
    let key_count_map: HashMap<usize, usize> = response
        .split('\n')
        .filter(|line| line.starts_with("db"))
        .map(|line| {
            (
                parse_str::<usize>(line, "db", Some(":")).unwrap(),
                parse_str::<usize>(line, "keys=", Some(",")).unwrap_or(0),
            )
        })
        .collect();
    for i in 0..db_size {
        db_list.push(RedisDatabase {
            id: i,
            name: format!("db{}", i),
            count: *key_count_map.get(&i).unwrap_or(&0),
        });
    }

    Ok(db_list)
}

/// 关闭一个redis连接
///
/// # Arguments
///
/// * `id`: redis服务器id
///
/// returns: Result<(), RedisError>
pub fn disconnect_redis(id: i32) -> RedisResult<()> {
    block_on(redis_helper::disconnect_con(id));
    Ok(())
}

/// 查询指定数据库的所有key
///
/// # Arguments
///
/// * `id`: redis服务器id
/// * `db`: 数据库下标
///
/// returns: Result<Vec<String, Global>, RedisError>
pub fn all_keys_by_pattern(id: i32, db: i64, pattern: &str) -> RedisResult<Vec<String>> {
    let conn = &mut block_on(redis_helper::get_redis_con(id))?;
    let keys: Vec<String> = if conn.get_db().eq(&db) {
        conn.scan_match(pattern)?.collect()
    } else {
        redis::cmd("SELECT").arg(db).query(conn)?;
        conn.scan_match(pattern)?.collect()
    };
    Ok(keys)
}

pub fn get_value_by_key(id: i32, db: i64, key: &str) -> Result<RedisValue, String> {
    let conn = &mut wrap_err!(block_on(redis_helper::get_redis_con(id)))?;
    if conn.get_db().ne(&db) {
        wrap_err!(redis::cmd("SELECT").arg(db).query(conn))?;
    };
    let exist: bool = wrap_err!(conn.exists(key))?;
    if !exist {
        return Ok(RedisValue::default(key));
    }
    let key_type: String = wrap_err!(redis::cmd("TYPE").arg(key).query(conn))?;
    let key_type = RedisKeyType::from_str(&key_type)?;
    let ttl = conn.ttl(key).unwrap_or(-2);

    if ttl < -1 {
        return Ok(RedisValue::default(key));
    }
//todo
    match key_type {
        RedisKeyType::STRING => {
            let str_data: RedisResult<String> = conn.get(key);
            match str_data {
                Ok(str) => {}
                Err(_) => {}
            }
        }
        RedisKeyType::LIST => {}
        RedisKeyType::SET => {}
        RedisKeyType::ZSET => {}
        RedisKeyType::HASH => {}
        RedisKeyType::GEO => {}
        RedisKeyType::BITMAP => {}
        RedisKeyType::HYPERLOGLOG => {}
        RedisKeyType::STREAM => {}
    }
    Ok(RedisValue::default(key))
}
