use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize, Serializer};
use serde::ser::SerializeStruct;
use crate::common::enums::{IEnum, RedisKeyType};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RedisDatabase {
    /// db id即下标
    pub id: usize,
    /// 名称
    pub name: String,
    /// 包含的key数量
    pub count: usize,
}

#[derive(Debug, Clone)]
pub enum KeyValue {
    Nil,
    STRING(String),
    LIST(Vec<String>),
    SET(HashSet<String>),
    ZSET(HashSet<String, isize>),
    HASH(HashMap<String, String>),
}

#[derive(Debug, Clone)]
pub struct RedisValue {
    /// redis key
    pub key: String,
    /// redis key type
    pub key_type: RedisKeyType,
    /// key 对应的value
    pub value: KeyValue,
    /// 过期时间
    pub ttl: isize,
    /// 所占空间
    pub size: usize,
}

impl RedisValue {
    pub fn default(key: &str) -> Self {
        RedisValue {
            key: key.to_string(),
            key_type: RedisKeyType::STRING,
            value: KeyValue::Nil,
            ttl: -1,
            size: 0,
        }
    }
}

impl Serialize for RedisValue {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error> where S: Serializer {
        let mut state = serializer.serialize_struct("RedisValue", 5)?;
        state.serialize_field("key", &self.key)?;
        state.serialize_field("keyType", &self.key_type.to_value())?;
        match &self.value {
            KeyValue::STRING(s) => {
                state.serialize_field("value", s)?;
            }
            KeyValue::LIST(data) => {
                state.serialize_field("value", data)?;
            }
            KeyValue::SET(data) => {
                state.serialize_field("value", data)?;
            }
            KeyValue::ZSET(data) => {
                state.serialize_field("value", data)?;
            }
            KeyValue::HASH(data) => {
                state.serialize_field("value", data)?;
            }
            _ => {}
        }
        state.serialize_field("ttl", &self.ttl)?;
        state.serialize_field("size", &self.size)?;
        state.end()
    }
}

