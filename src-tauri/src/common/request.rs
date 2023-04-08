use serde::Deserialize;

use crate::dao::models::ServerInfo;
/// ### 简单`redis`服务器信息
/// #### 用于测试连接用
#[derive(Debug, Deserialize)]
pub struct SimpleServerInfo {
    // 服务器ip/域名
    pub host: String,
    // 端口号 default 6379
    pub port: i32,
    // 用户名
    pub username: Option<String>,
    // 密码
    pub password: Option<String>,
    // 连接超时
    #[serde(rename = "conTimeout")]
    pub con_timeout: i32,
    // 执行超时
    #[serde(rename = "executionTimeout")]
    pub execution_timeout: i32,
}

impl SimpleServerInfo {
    pub fn transform_server_info(&self) -> ServerInfo {
        ServerInfo {
            id: 0,
            name: "".to_string(),
            host: self.host.to_owned(),
            port: self.port,
            read_only: false,
            username: self.username.clone(),
            password: self.password.clone(),
            security_type: 0,
            key_filter: "".to_string(),
            delimiter: "".to_string(),
            con_timeout: self.con_timeout,
            execution_timeout: self.execution_timeout,
        }
    }
}

/// redis 操作所需必要条件
#[derive(Debug, Deserialize)]
pub struct RedisOptions {
    /// redis server id
    pub id: i32,
    /// redis db index
    pub db: i64,
    /// redis key
    pub key: String,
}
