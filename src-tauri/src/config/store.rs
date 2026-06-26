use crate::config::encryption;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// 存储文件名常量
pub const CONNECTIONS_FILENAME: &str = "connections.json";
pub const MASTER_KEY_FILENAME: &str = "master-key";

/// 持久化存储的连接配置（密码已加密）
///
/// 序列化字段统一为 camelCase 与前端 TypeScript / IPC 对齐；老磁盘格式中
/// `connection_type` snake_case 经 `serde(alias)` 兼容自动迁移。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    /// 加密后的密码（base64 编码）
    pub password: Option<String>,
    pub db: u8,
    pub group: Option<String>,
    /// 连接类型: standalone / sentinel / cluster
    #[serde(default = "default_connection_type", alias = "connection_type")]
    pub connection_type: String,
    /// SSH 隧道配置
    #[serde(default)]
    pub ssh: Option<SshConfig>,
    /// TLS/SSL 配置
    #[serde(default)]
    pub tls: Option<TlsConfig>,
    /// Sentinel 配置
    #[serde(default)]
    pub sentinel: Option<SentinelConfig>,
    /// Cluster 配置
    #[serde(default)]
    pub cluster: Option<ClusterConfig>,
}

fn default_connection_type() -> String {
    "standalone".to_string()
}

/// SSH 跳板/终点主机配置 — 隧道链路中的一个节点
///
/// 序列化字段统一为 camelCase，与前端 TypeScript 类型对齐；
/// Rust 内部仍按 snake_case 访问。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshHop {
    pub host: String,
    pub port: u16,
    pub username: String,
    /// 认证方式: "password" | "privateKey"
    pub auth_type: String,
    /// 密码（运行时明文，落盘前 AES-256-GCM 加密）
    pub password: Option<String>,
    pub private_key_path: Option<String>,
    /// 私钥 passphrase（运行时明文，落盘前 AES-256-GCM 加密）
    pub passphrase: Option<String>,
}

/// SSH 隧道配置 — 支持任意 N 跳串联
///
/// `hops` 数组顺序即链路顺序：第一项是本地直连的 SSH 主机，最后一项是
/// 在其上发起 direct-tcpip channel 到目标 Redis 的"出口"主机。当 N=1 时
/// 等价于"一台堡垒机直连内网 Redis"；N=2 时对应 `ssh -J jump endpoint`。
#[derive(Debug, Clone, Serialize)]
pub struct SshConfig {
    pub enabled: bool,
    pub hops: Vec<SshHop>,
}

// 自定义反序列化：兼容老的"单跳"格式（v0.2.x 之前）
impl<'de> Deserialize<'de> for SshConfig {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(Deserialize)]
        #[serde(untagged)]
        enum OnDisk {
            New {
                enabled: bool,
                hops: Vec<SshHop>,
            },
            Legacy {
                enabled: bool,
                host: String,
                port: u16,
                username: String,
                auth_type: String,
                #[serde(default)]
                password: Option<String>,
                #[serde(default)]
                private_key_path: Option<String>,
                #[serde(default)]
                passphrase: Option<String>,
            },
        }

        match OnDisk::deserialize(deserializer)? {
            OnDisk::New { enabled, hops } => Ok(SshConfig { enabled, hops }),
            OnDisk::Legacy {
                enabled,
                host,
                port,
                username,
                auth_type,
                password,
                private_key_path,
                passphrase,
            } => Ok(SshConfig {
                enabled,
                hops: vec![SshHop {
                    host,
                    port,
                    username,
                    auth_type,
                    password,
                    private_key_path,
                    passphrase,
                }],
            }),
        }
    }
}

/// TLS/SSL 配置
///
/// 序列化字段统一为 camelCase 与前端对齐；老磁盘 snake_case 经 alias 兼容
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TlsConfig {
    pub enabled: bool,
    #[serde(default, alias = "ca_cert_path")]
    pub ca_cert_path: Option<String>,
    #[serde(default, alias = "client_cert_path")]
    pub client_cert_path: Option<String>,
    #[serde(default, alias = "client_key_path")]
    pub client_key_path: Option<String>,
    #[serde(default, alias = "skip_verify")]
    pub skip_verify: bool,
}

/// Sentinel 节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentinelNode {
    pub host: String,
    pub port: u16,
}

/// Sentinel 配置
///
/// 序列化字段统一为 camelCase 与前端对齐；老磁盘 snake_case 经 alias 兼容
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SentinelConfig {
    pub nodes: Vec<SentinelNode>,
    #[serde(alias = "master_name")]
    pub master_name: String,
    #[serde(default, alias = "sentinel_password")]
    pub sentinel_password: Option<String>,
}

/// Cluster 节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterNode {
    pub host: String,
    pub port: u16,
}

/// Cluster 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterConfig {
    pub nodes: Vec<ClusterNode>,
}

/// 连接存储管理器 — 负责连接配置的持久化读写
pub struct ConnectionStore {
    master_key: [u8; 32],
    store_path: PathBuf,
}

impl ConnectionStore {
    /// 初始化连接存储 — 加载或生成 Master Key
    pub fn new(app_data_dir: PathBuf) -> Result<Self, String> {
        let key_path = app_data_dir.join(MASTER_KEY_FILENAME);
        let master_key = encryption::get_or_create_master_key(&key_path)?;
        let store_path = app_data_dir.join(CONNECTIONS_FILENAME);
        Ok(Self {
            master_key,
            store_path,
        })
    }

    /// 加载所有连接配置 — Redis 密码 + 每跳 SSH 密码/passphrase 自动解密
    pub fn load_connections(&self) -> Result<Vec<StoredConnection>, String> {
        if !self.store_path.exists() {
            return Ok(vec![]);
        }
        let content = std::fs::read_to_string(&self.store_path).map_err(|e| e.to_string())?;
        let mut connections: Vec<StoredConnection> =
            serde_json::from_str(&content).map_err(|e| e.to_string())?;

        for conn in &mut connections {
            self.decrypt_secret_field(&mut conn.password)?;
            if let Some(ref mut ssh) = conn.ssh {
                for hop in &mut ssh.hops {
                    self.decrypt_secret_field(&mut hop.password)?;
                    self.decrypt_secret_field(&mut hop.passphrase)?;
                }
            }
        }
        Ok(connections)
    }

    /// 保存所有连接配置 — Redis 密码 + 每跳 SSH 密码/passphrase 自动加密
    pub fn save_connections(&self, connections: &[StoredConnection]) -> Result<(), String> {
        let mut to_save = connections.to_vec();

        for conn in &mut to_save {
            self.encrypt_secret_field(&mut conn.password)?;
            if let Some(ref mut ssh) = conn.ssh {
                for hop in &mut ssh.hops {
                    self.encrypt_secret_field(&mut hop.password)?;
                    self.encrypt_secret_field(&mut hop.passphrase)?;
                }
            }
        }

        let json = serde_json::to_string_pretty(&to_save).map_err(|e| e.to_string())?;
        if let Some(parent) = self.store_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        // 使用临时文件 + rename 实现原子写入，避免进程崩溃导致文件损坏
        let tmp_path = self.store_path.with_extension("tmp");
        std::fs::write(&tmp_path, json).map_err(|e| e.to_string())?;
        std::fs::rename(&tmp_path, &self.store_path).map_err(|e| e.to_string())?;
        Ok(())
    }

    /// 添加或更新连接配置
    pub fn upsert_connection(&self, connection: StoredConnection) -> Result<(), String> {
        let mut connections = self.load_connections()?;
        if let Some(pos) = connections.iter().position(|c| c.id == connection.id) {
            connections[pos] = connection;
        } else {
            connections.push(connection);
        }
        self.save_connections(&connections)
    }

    /// 删除连接配置
    pub fn delete_connection(&self, id: &str) -> Result<(), String> {
        let mut connections = self.load_connections()?;
        connections.retain(|c| c.id != id);
        self.save_connections(&connections)
    }

    /// 加密单个机密字段（None / 空字符串保持原样）
    fn encrypt_secret_field(&self, field: &mut Option<String>) -> Result<(), String> {
        if let Some(ref plaintext) = field {
            if !plaintext.is_empty() {
                *field = Some(encryption::encrypt_password(&self.master_key, plaintext)?);
            }
        }
        Ok(())
    }

    /// 解密单个机密字段（None / 空字符串保持原样）
    fn decrypt_secret_field(&self, field: &mut Option<String>) -> Result<(), String> {
        if let Some(ref encrypted) = field {
            if !encrypted.is_empty() {
                *field = Some(encryption::decrypt_password(&self.master_key, encrypted)?);
            }
        }
        Ok(())
    }

    /// 重新排序连接 — 按给定的 ID 列表顺序重排持久化
    pub fn reorder_connections(&self, ordered_ids: &[String]) -> Result<(), String> {
        let connections = self.load_connections()?;
        let mut reordered: Vec<StoredConnection> = Vec::with_capacity(connections.len());
        for id in ordered_ids {
            if let Some(conn) = connections.iter().find(|c| c.id == *id) {
                reordered.push(conn.clone());
            }
        }
        // 追加不在列表中的连接（安全兜底）
        for conn in &connections {
            if !ordered_ids.contains(&conn.id) {
                reordered.push(conn.clone());
            }
        }
        self.save_connections(&reordered)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- SshConfig 反序列化兼容 ----------

    #[test]
    fn ssh_config_deserialize_new_format_camel_case_hops() {
        // 前端 IPC / 新磁盘格式：嵌套 hops 数组，SshHop 内部 camelCase
        let json = r#"{
            "enabled": true,
            "hops": [
                {
                    "host": "10.0.0.1",
                    "port": 22,
                    "username": "alice",
                    "authType": "password",
                    "password": "p1",
                    "privateKeyPath": null,
                    "passphrase": null
                }
            ]
        }"#;
        let cfg: SshConfig = serde_json::from_str(json).unwrap();
        assert!(cfg.enabled);
        assert_eq!(cfg.hops.len(), 1);
        assert_eq!(cfg.hops[0].host, "10.0.0.1");
        assert_eq!(cfg.hops[0].auth_type, "password");
        assert_eq!(cfg.hops[0].password.as_deref(), Some("p1"));
    }

    #[test]
    fn ssh_config_deserialize_legacy_single_hop_snake_case() {
        // v0.2.x 老格式：扁平 snake_case 字段，应自动迁移为 hops[0]
        let json = r#"{
            "enabled": true,
            "host": "legacy.example.com",
            "port": 2222,
            "username": "root",
            "auth_type": "privateKey",
            "password": null,
            "private_key_path": "/keys/id_rsa",
            "passphrase": "secret"
        }"#;
        let cfg: SshConfig = serde_json::from_str(json).unwrap();
        assert!(cfg.enabled);
        assert_eq!(cfg.hops.len(), 1);
        let hop = &cfg.hops[0];
        assert_eq!(hop.host, "legacy.example.com");
        assert_eq!(hop.port, 2222);
        assert_eq!(hop.auth_type, "privateKey");
        assert_eq!(hop.private_key_path.as_deref(), Some("/keys/id_rsa"));
        assert_eq!(hop.passphrase.as_deref(), Some("secret"));
    }

    #[test]
    fn ssh_config_serialize_emits_camel_case_for_hops() {
        // 写入磁盘 / 返回前端时，SshHop 字段必须输出 camelCase
        let cfg = SshConfig {
            enabled: true,
            hops: vec![SshHop {
                host: "h".to_string(),
                port: 22,
                username: "u".to_string(),
                auth_type: "password".to_string(),
                password: Some("p".to_string()),
                private_key_path: None,
                passphrase: None,
            }],
        };
        let json = serde_json::to_string(&cfg).unwrap();
        assert!(
            json.contains(r#""authType":"password""#),
            "expected camelCase authType, got: {json}"
        );
        assert!(
            !json.contains(r#""auth_type":"#),
            "snake_case auth_type should NOT appear, got: {json}"
        );
    }

    // ---------- TlsConfig / SentinelConfig 双向兼容 ----------

    #[test]
    fn tls_config_deserialize_camel_case_and_snake_case_alias() {
        // 新格式（前端 IPC + 新磁盘）：camelCase
        let camel = r#"{
            "enabled": true,
            "caCertPath": "/ca.pem",
            "clientCertPath": "/c.pem",
            "clientKeyPath": "/c.key",
            "skipVerify": true
        }"#;
        let cfg: TlsConfig = serde_json::from_str(camel).unwrap();
        assert!(cfg.enabled);
        assert_eq!(cfg.ca_cert_path.as_deref(), Some("/ca.pem"));
        assert!(cfg.skip_verify);

        // 老磁盘 snake_case 通过 alias 兼容读取
        let snake = r#"{
            "enabled": true,
            "ca_cert_path": "/ca.pem",
            "client_cert_path": "/c.pem",
            "client_key_path": "/c.key",
            "skip_verify": true
        }"#;
        let cfg: TlsConfig = serde_json::from_str(snake).unwrap();
        assert_eq!(cfg.ca_cert_path.as_deref(), Some("/ca.pem"));
        assert!(cfg.skip_verify);
    }

    #[test]
    fn sentinel_config_deserialize_camel_case_and_snake_case_alias() {
        let camel = r#"{
            "nodes": [{"host":"127.0.0.1","port":26379}],
            "masterName": "mymaster",
            "sentinelPassword": "spass"
        }"#;
        let cfg: SentinelConfig = serde_json::from_str(camel).unwrap();
        assert_eq!(cfg.master_name, "mymaster");
        assert_eq!(cfg.sentinel_password.as_deref(), Some("spass"));

        // 老磁盘格式
        let snake = r#"{
            "nodes": [{"host":"127.0.0.1","port":26379}],
            "master_name": "mymaster",
            "sentinel_password": "spass"
        }"#;
        let cfg: SentinelConfig = serde_json::from_str(snake).unwrap();
        assert_eq!(cfg.master_name, "mymaster");
        assert_eq!(cfg.sentinel_password.as_deref(), Some("spass"));
    }

    #[test]
    fn stored_connection_connection_type_alias_legacy_snake_case() {
        // 老磁盘 connection_type 必须能被读出来（用户老连接保留正确类型）
        let json = r#"{
            "id": "x",
            "name": "old",
            "host": "127.0.0.1",
            "port": 6379,
            "username": null,
            "password": null,
            "db": 0,
            "group": null,
            "connection_type": "sentinel"
        }"#;
        let conn: StoredConnection = serde_json::from_str(json).unwrap();
        assert_eq!(conn.connection_type, "sentinel");

        // 新格式 connectionType 也能读
        let json_new = r#"{
            "id": "y",
            "name": "new",
            "host": "127.0.0.1",
            "port": 6379,
            "username": null,
            "password": null,
            "db": 0,
            "group": null,
            "connectionType": "cluster"
        }"#;
        let conn: StoredConnection = serde_json::from_str(json_new).unwrap();
        assert_eq!(conn.connection_type, "cluster");
    }
}
