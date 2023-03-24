use diesel::{Insertable, Queryable, QueryableByName};
use diesel::sql_types::*;
use serde::{Deserialize, Serialize};

use crate::schema::{connections, setting};

#[derive(Debug, Clone, Queryable, QueryableByName, Serialize)]
pub struct ServerInfo {
    #[diesel(sql_type = Integer)]
    pub id: i32,
    // 名称
    #[diesel(sql_type = Text)]
    pub name: String,
    // 服务器ip/域名
    #[diesel(sql_type = Text)]
    pub host: String,
    // 端口号 default 6379
    #[diesel(sql_type = Integer)]
    pub port: i32,
}

#[derive(Serialize, Deserialize, Insertable, Debug)]
#[diesel(table_name = connections)]
pub struct NewServer {
    // 名称
    pub name: String,
    // 服务器ip/域名
    pub host: String,
    // 端口号 default 6379
    pub port: i32,
    // 用户名
    pub username: String,
    // 密码
    pub password: String,
    // 集群
    pub cluster: i32,
    // 集群节点
    pub nodes: String,
    // 安全类型 0: 不使用 1：ssl/tls  2：ssh tunnel
    #[serde(rename = "securityType")]
    pub security_type: i32,
    // 是否使用私钥
    #[serde(rename = "usePrivateKey")]
    pub use_private_key: i32,
    // ssh 隧道的用户名
    #[serde(rename = "sshUsername")]
    pub ssh_username: String,
    // ssh 隧道的地址
    #[serde(rename = "sshHost")]
    pub ssh_host: String,
    // ssh隧道的端口号 默认22
    #[serde(rename = "sshPort")]
    pub ssh_port: i32,
    // ssh隧道密码 私钥是为私钥密码
    #[serde(rename = "sshPassword")]
    pub ssh_password: String,
    // 私钥文件路径
    #[serde(rename = "privateKeyPath")]
    pub private_key_path: String,
}

#[derive(Serialize, Deserialize, Queryable, Debug)]
#[diesel(table_name = setting)]
pub struct Settings {
    pub _id: i32,
    // 语言
    pub language: String,
    // 字体大小
    #[serde(rename = "fontSize")]
    pub font_size: i32,
    // 主题
    pub theme: String,
    // 实时刷新间隔 [秒]
    #[serde(rename = "refreshInterval")]
    pub refresh_interval: u32,
    // 编辑框字体大小
    #[serde(rename = "editorFontSize")]
    pub editor_font_size: i32,
}

#[derive(Serialize, Deserialize, Insertable, Debug)]
#[diesel(table_name = setting)]
pub struct NewSettings {
    // 语言
    pub language: String,
    // 字体大小
    #[serde(rename = "fontSize")]
    pub font_size: i32,
    // 主题
    pub theme: String,
    // 实时刷新间隔 [秒]
    #[serde(rename = "refreshInterval")]
    pub refresh_interval: i32,
    // 编辑框字体大小
    #[serde(rename = "editorFontSize")]
    pub editor_font_size: i32,
}