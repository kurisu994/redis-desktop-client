pub trait IEnum<'a, T> {
    fn from_i32(i: i32) -> Result<T, &'a str>;
    fn from_u8(i: u8) -> Result<T, &'a str>;
    fn to_value(&self) -> i32;
}

/// 主题
pub enum Theme {
    AUTO,
    LIGHT,
    DARK,
}

impl<'a> IEnum<'a, Self> for Theme {
    fn from_i32(i: i32) -> Result<Theme, &'a str> {
        match i {
            1 => Ok(Theme::AUTO),
            2 => Ok(Theme::LIGHT),
            3 => Ok(Theme::DARK),
            _ => { Err("can't find this theme") }
        }
    }

    fn from_u8(i: u8) -> Result<Self, &'a str> {
        Theme::from_i32(i as i32)
    }

    fn to_value(&self) -> i32 {
        match self {
            Theme::AUTO => { 1 }
            Theme::LIGHT => { 2 }
            Theme::DARK => { 3 }
        }
    }
}

/// 过期策略
pub enum TtlPolicy {
    // 过期时间[秒]
    EXPIRE,
    // 过期时刻[UNIX时间戳 秒]
    EXPIREAT,
    // 过期时间[毫秒]
    PEXPIRE,
    // 过期时刻[UNIX时间戳 毫秒]
    PEXPIREAT,
}

impl<'a> IEnum<'a, Self> for TtlPolicy {
    fn from_i32(i: i32) -> Result<Self, &'a str> {
        match i {
            1 => Ok(TtlPolicy::EXPIRE),
            2 => Ok(TtlPolicy::EXPIREAT),
            3 => Ok(TtlPolicy::PEXPIRE),
            4 => Ok(TtlPolicy::PEXPIREAT),
            _ => { Err("can't find this TtlType") }
        }
    }

    fn from_u8(i: u8) -> Result<Self, &'a str> {
        TtlPolicy::from_i32(i as i32)
    }

    fn to_value(&self) -> i32 {
        match self {
            TtlPolicy::EXPIRE => { 1 }
            TtlPolicy::EXPIREAT => { 2 }
            TtlPolicy::PEXPIRE => { 3 }
            TtlPolicy::PEXPIREAT => { 4 }
        }
    }
}

/// redis key 类型
pub enum RedisKeyType {
    STRING,
    LIST,
    SET,
    ZSET,
    HASH,
    GEO,
    BITMAP,
    HYPERLOGLOG,
    STREAM,
}

impl<'a> IEnum<'a, Self> for RedisKeyType {
    fn from_i32(i: i32) -> Result<Self, &'a str> {
        match i {
            1 => Ok(RedisKeyType::STRING),
            2 => Ok(RedisKeyType::LIST),
            3 => Ok(RedisKeyType::SET),
            4 => Ok(RedisKeyType::ZSET),
            5 => Ok(RedisKeyType::HASH),
            6 => Ok(RedisKeyType::GEO),
            7 => Ok(RedisKeyType::BITMAP),
            8 => Ok(RedisKeyType::HYPERLOGLOG),
            9 => Ok(RedisKeyType::STREAM),
            _ => { Err("can't analyze this type") }
        }
    }

    fn from_u8(i: u8) -> Result<Self, &'a str> {
        RedisKeyType::from_i32(i as i32)
    }

    fn to_value(&self) -> i32 {
        match self {
            RedisKeyType::STRING => { 1 }
            RedisKeyType::LIST => { 2 }
            RedisKeyType::SET => { 3 }
            RedisKeyType::ZSET => { 4 }
            RedisKeyType::HASH => { 5 }
            RedisKeyType::GEO => { 6 }
            RedisKeyType::BITMAP => { 7 }
            RedisKeyType::HYPERLOGLOG => { 8 }
            RedisKeyType::STREAM => { 9 }
        }
    }
}