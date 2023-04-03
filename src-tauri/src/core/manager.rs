use std::sync::atomic::{AtomicI32, Ordering};
use std::time::Duration;

use redis::{ConnectionLike, RedisResult};

use crate::dao::models::ServerInfo;
use crate::core::redis_helper;

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
    let execution_timeout = server.execution_timeout as u64;
    let mut con = redis_helper::open_redis(server)?;

    // con.set_read_timeout(Some(Duration::from_secs(execution_timeout)))?;
    // con.set_write_timeout(Some(Duration::from_secs(execution_timeout)))?;

    Ok(con.check_connection())
}