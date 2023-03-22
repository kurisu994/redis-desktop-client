
#[derive(Debug)]
pub struct ServerInfo {
    /// 服务器ip/域名
    pub host: String,
    /// 端口号
    pub port: i32,
    /// 密码
    pub password: String,
}

impl ServerInfo {
    pub fn default() -> Self {
        let info = ServerInfo {
            host: "127.0.0.1".to_string(),
            port: 6379,
            password: "".to_string(),
        };
        return info;
    }
}