use serde::{Deserialize, Serialize};

use crate::dao::models::ServerInfo;

#[derive(Debug, Deserialize, Serialize)]
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
            execution_timeout: 0,
        }
    }
}
