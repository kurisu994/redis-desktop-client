use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RedisDatabase {
    /// db id即下标
    pub id: usize,
    /// 名称
    pub name: String,
    /// 包含的key数量
    pub count: usize,
}
