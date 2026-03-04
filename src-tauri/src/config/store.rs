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
}
