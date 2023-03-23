use serde_derive::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct ServerInfo {
    pub _id: Option<i32>,
    // 名称
    pub name: String,
    // 服务器ip/域名
    pub host: String,
    // 端口号 default 6379
    pub port: i32,
    // 用户名
    pub username: Option<String>,
    // 密码
    pub password: Option<String>,
    // 集群
    pub cluster: Option<i32>,
    // 集群节点
    pub nodes: Option<String>,
    // 安全类型 0: 不使用 1：ssl/tls  2：ssh tunnel
    #[serde(rename="securityType")]
    pub security_type: Option<i32>,
    // 是否使用私钥
    #[serde(rename="usePrivateKey")]
    pub use_private_key: Option<bool>,
    // ssh 隧道的用户名
    #[serde(rename="sshUsername")]
    pub ssh_username: Option<String>,
    // ssh 隧道的地址
    #[serde(rename="sshHost")]
    pub ssh_host: Option<String>,
    // ssh隧道的端口号 默认22
    #[serde(rename="sshPort")]
    pub ssh_port: Option<i32>,
    // ssh隧道密码 私钥是为私钥密码
    #[serde(rename="sshPassword")]
    pub ssh_password: Option<String>,
    // 私钥文件路径
    #[serde(rename="privateKeyPath")]
    pub private_key_path: Option<String>,
}

impl ServerInfo {
    pub fn create(name: String, host: String, port: i32, password: Option<String>, username: Option<String>) -> ServerInfo {
        ServerInfo {
            _id: None,
            name,
            host,
            port,
            username,
            password,
            cluster: None,
            nodes: None,
            security_type: None,
            use_private_key: None,
            ssh_username: None,
            ssh_host: None,
            ssh_port: None,
            ssh_password: None,
            private_key_path: None,
        }
    }
}