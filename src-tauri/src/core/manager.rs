use std::collections::HashMap;
use std::sync::atomic::{AtomicI32, Ordering};
use std::time::Duration;

use redis::{ConnectionLike, RedisResult};

use crate::core::models::RedisDatabase;
use crate::core::redis_helper;
use crate::dao::models::ServerInfo;
use crate::utils::helper::parse_str;

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
    let con_timeout = server.con_timeout as u64;
    let execution_timeout = server.execution_timeout as u64;
    let mut con = redis_helper::get_redis_con(server)?;
    if con_timeout > 0 {
        con.set_read_timeout(Some(Duration::from_secs(con_timeout)))?;
    }
    if execution_timeout > 0 {
        con.set_write_timeout(Some(Duration::from_secs(execution_timeout)))?;
    }

    Ok(con.check_connection())
}

pub fn get_db_key_count(info: ServerInfo) -> RedisResult<Vec<RedisDatabase>> {
    let conn = &mut redis_helper::get_redis_con(info)?;

    let (_, db_size): (String, String) = redis::cmd("CONFIG").arg("GET").arg("databases").query(conn)?;
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
