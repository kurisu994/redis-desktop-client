use crate::config::encryption;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// 存储文件名常量
pub const CONNECTIONS_FILENAME: &str = "connections.json";
pub const MASTER_KEY_FILENAME: &str = "master-key";

/// 持久化存储的连接配置（密码已加密）
#[derive(Debug, Clone, Serialize, Deserialize)]
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
    #[serde(default = "default_connection_type")]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TlsConfig {
    pub enabled: bool,
    pub ca_cert_path: Option<String>,
    pub client_cert_path: Option<String>,
    pub client_key_path: Option<String>,
    #[serde(default)]
    pub skip_verify: bool,
}

/// Sentinel 节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentinelNode {
    pub host: String,
    pub port: u16,
}

/// Sentinel 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentinelConfig {
    pub nodes: Vec<SentinelNode>,
    pub master_name: String,
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
