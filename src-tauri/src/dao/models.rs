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
    // 是否只读
    #[serde(rename = "readOnly")]
    #[diesel(sql_type = Bool)]
    pub read_only: bool,
    // 用户名
    #[diesel(sql_type = Nullable < Text >)]
    pub username: Option<String>,
    // 密码
    #[diesel(sql_type = Nullable < Text >)]
    pub password: Option<String>,
    // 安全类型 0: 不使用 1：ssl/tls  2：ssh tunnel
    #[serde(rename = "securityType")]
    #[diesel(sql_type = Integer)]
    pub security_type: i32,
    // 默认过滤
    #[serde(rename = "keyFilter")]
    #[diesel(sql_type = Text)]
    pub key_filter: String,
    // 命名空间分割符
    #[diesel(sql_type = Text)]
    pub delimiter: String,
    // 连接超时
    #[serde(rename = "conTimeout")]
    #[diesel(sql_type = Integer)]
    pub con_timeout: i32,
    // 执行超时
    #[serde(rename = "executionTimeout")]
    #[diesel(sql_type = Integer)]
    pub execution_timeout: i32,
}

#[derive(Serialize, Deserialize, Insertable, Debug)]
#[diesel(table_name = connections)]
pub struct NewServer {
    pub id: Option<i32>,
    // 名称
    pub name: String,
    // 服务器ip/域名
    pub host: String,
    // 端口号 default 6379
    pub port: i32,
    // 是否只读
    #[serde(rename = "readOnly")]
    pub read_only: bool,
    // 用户名
    pub username: Option<String>,
    // 密码
    pub password: Option<String>,
    // 集群
    pub cluster: Option<i32>,
    // 集群节点
    pub nodes: Option<String>,
    // 安全类型 0: 不使用 1：ssl/tls  2：ssh tunnel
    #[serde(rename = "securityType")]
    pub security_type: i32,
    // 是否使用私钥
    #[serde(rename = "usePrivateKey")]
    pub use_private_key: Option<i32>,
    // ssh 隧道的用户名
    #[serde(rename = "sshUsername")]
    pub ssh_username: Option<String>,
    // ssh 隧道的地址
    #[serde(rename = "sshHost")]
    pub ssh_host: Option<String>,
    // ssh隧道的端口号 默认22
    #[serde(rename = "sshPort")]
    pub ssh_port: Option<i32>,
    // ssh隧道密码 私钥是为私钥密码
    #[serde(rename = "sshPassword")]
    pub ssh_password: Option<String>,
    // 私钥文件路径
    #[serde(rename = "privateKeyPath")]
    pub private_key_path: Option<String>,
    // 默认过滤
    #[serde(rename = "keyFilter")]
    pub key_filter: String,
    // 命名空间分割符
    pub delimiter: String,
    // 连接超时
    #[serde(rename = "conTimeout")]
    pub con_timeout: i32,
    // 执行超时
    #[serde(rename = "executionTimeout")]
    pub execution_timeout: i32,
}

#[derive(Serialize, Deserialize, Insertable, Queryable, QueryableByName, Debug)]
#[diesel(table_name = setting)]
pub struct Settings {
    #[diesel(sql_type = Integer)]
    pub id: i32,
    // 语言
    #[diesel(sql_type = Text)]
    pub language: String,
    // 字体大小
    #[serde(rename = "fontSize")]
    #[diesel(sql_type = Integer)]
    pub font_size: i32,
    // 主题
    #[diesel(sql_type = Integer)]
    pub theme: i32,
    // 实时刷新间隔 [秒]
    #[serde(rename = "refreshInterval")]
    #[diesel(sql_type = Integer)]
    pub refresh_interval: i32,
    // 编辑框字体大小
    #[serde(rename = "editorFontSize")]
    #[diesel(sql_type = Integer)]
    pub editor_font_size: i32,
}
