use std::sync::atomic::{AtomicI32, Ordering};

pub static REFRESH_INTERVAL: AtomicI32 = AtomicI32::new(0);

pub fn set_refresh_interval(interval: i32) {
    REFRESH_INTERVAL.swap(interval, Ordering::SeqCst);
}
