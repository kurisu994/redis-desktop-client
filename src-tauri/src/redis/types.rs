use serde::{Deserialize, Serialize};

/// Redis 数据类型枚举
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RedisValueType {
    String,
    Hash,
    List,
    Set,
    ZSet,
    Stream,
    Unknown,
}

/// IPC 统一响应结构
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpcResponse<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

#[allow(dead_code)]
impl<T: Serialize> IpcResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(msg: impl Into<String>) -> Self {
        Self {
            success: true,
            data: None,
            error: Some(msg.into()),
        }
    }
}
