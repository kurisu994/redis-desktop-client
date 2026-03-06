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

/// SSH 隧道配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshConfig {
    pub enabled: bool,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: String,
    pub password: Option<String>,
    pub private_key_path: Option<String>,
    pub passphrase: Option<String>,
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

    /// 加载所有连接配置 — 密码自动解密
    pub fn load_connections(&self) -> Result<Vec<StoredConnection>, String> {
        if !self.store_path.exists() {
            return Ok(vec![]);
        }
        let content = std::fs::read_to_string(&self.store_path).map_err(|e| e.to_string())?;
        let mut connections: Vec<StoredConnection> =
            serde_json::from_str(&content).map_err(|e| e.to_string())?;

        // 解密密码
        for conn in &mut connections {
            if let Some(ref encrypted) = conn.password {
                if !encrypted.is_empty() {
                    conn.password =
                        Some(encryption::decrypt_password(&self.master_key, encrypted)?);
                }
            }
        }
        Ok(connections)
    }

    /// 保存所有连接配置 — 密码自动加密
    pub fn save_connections(&self, connections: &[StoredConnection]) -> Result<(), String> {
        let mut to_save = connections.to_vec();

        // 加密密码
        for conn in &mut to_save {
            if let Some(ref plaintext) = conn.password {
                if !plaintext.is_empty() {
                    conn.password =
                        Some(encryption::encrypt_password(&self.master_key, plaintext)?);
                }
            }
        }

        let json = serde_json::to_string_pretty(&to_save).map_err(|e| e.to_string())?;
        if let Some(parent) = self.store_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&self.store_path, json).map_err(|e| e.to_string())?;
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
