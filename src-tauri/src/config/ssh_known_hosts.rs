use crate::config::encryption;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tokio::sync::oneshot;

/// SSH known_hosts 存储文件名
pub const SSH_KNOWN_HOSTS_FILENAME: &str = "ssh-known-hosts.json";

/// 单个已知主机的指纹记录
///
/// `fingerprint` 字段落盘时为 AES-256-GCM 密文（base64 编码），运行时按需解密。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshKnownHost {
    pub host: String,
    pub port: u16,
    /// 加密后的 OpenSSH 风格指纹，例如 `SHA256:abc123...`
    pub fingerprint: String,
    pub first_seen_at: String,
    pub last_used_at: String,
}

/// SSH known_hosts 管理器 — 线程安全，供异步任务共享
///
/// 存储路径为 `app_data_dir/ssh-known-hosts.json`，与 `connections.json` 同目录，
/// 指纹字段走同一 `master-key` 做 AES-256-GCM 加密。
pub struct SshKnownHostsStore {
    master_key: [u8; 32],
    store_path: PathBuf,
    entries: Mutex<HashMap<(String, u16), SshKnownHost>>,
}

impl SshKnownHostsStore {
    /// 初始化 known_hosts 存储，自动加载已有记录（文件不存在则空）
    pub fn new(app_data_dir: PathBuf, master_key: [u8; 32]) -> Result<Self, String> {
        let store_path = app_data_dir.join(SSH_KNOWN_HOSTS_FILENAME);
        let mut store = Self {
            master_key,
            store_path,
            entries: Mutex::new(HashMap::new()),
        };
        store.load()?;
        Ok(store)
    }

    /// 查询指定主机的已信任指纹（解密后返回）
    pub fn find(&self, host: &str, port: u16) -> Result<Option<String>, String> {
        let entries = self.entries.lock().map_err(|e| e.to_string())?;
        let Some(record) = entries.get(&(host.to_string(), port)) else {
            return Ok(None);
        };
        let plaintext = encryption::decrypt_password(&self.master_key, &record.fingerprint)?;
        Ok(Some(plaintext))
    }

    /// 信任并保存某个主机的指纹
    pub fn trust(&self, host: &str, port: u16, fingerprint: &str) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();
        let encrypted = encryption::encrypt_password(&self.master_key, fingerprint)?;

        let mut entries = self.entries.lock().map_err(|e| e.to_string())?;
        let key = (host.to_string(), port);
        if let Some(existing) = entries.get_mut(&key) {
            existing.fingerprint = encrypted;
            existing.last_used_at = now;
        } else {
            entries.insert(
                key,
                SshKnownHost {
                    host: host.to_string(),
                    port,
                    fingerprint: encrypted,
                    first_seen_at: now.clone(),
                    last_used_at: now,
                },
            );
        }
        drop(entries);

        self.save()
    }

    /// 移除某条已信任记录；返回是否实际删除了数据
    pub fn remove(&self, host: &str, port: u16) -> Result<bool, String> {
        let mut entries = self.entries.lock().map_err(|e| e.to_string())?;
        let removed = entries.remove(&(host.to_string(), port)).is_some();
        drop(entries);

        if removed {
            self.save()?;
        }
        Ok(removed)
    }

    /// 列出所有已信任主机（指纹已解密，用于前端展示）
    pub fn list(&self) -> Result<Vec<SshKnownHost>, String> {
        let entries = self.entries.lock().map_err(|e| e.to_string())?;
        let mut list: Vec<SshKnownHost> = entries.values().cloned().collect();
        drop(entries);

        list.sort_by(|a, b| a.host.cmp(&b.host).then(a.port.cmp(&b.port)));
        for item in &mut list {
            item.fingerprint = encryption::decrypt_password(&self.master_key, &item.fingerprint)?;
        }
        Ok(list)
    }

    fn load(&mut self) -> Result<(), String> {
        if !self.store_path.exists() {
            return Ok(());
        }
        let content = std::fs::read_to_string(&self.store_path).map_err(|e| e.to_string())?;
        let list: Vec<SshKnownHost> = serde_json::from_str(&content).map_err(|e| e.to_string())?;

        let mut entries = self.entries.lock().map_err(|e| e.to_string())?;
        entries.clear();
        for item in list {
            entries.insert((item.host.clone(), item.port), item);
        }
        Ok(())
    }

    fn save(&self) -> Result<(), String> {
        let entries = self.entries.lock().map_err(|e| e.to_string())?;
        let mut list: Vec<SshKnownHost> = entries.values().cloned().collect();
        drop(entries);

        list.sort_by(|a, b| a.host.cmp(&b.host).then(a.port.cmp(&b.port)));
        let json = serde_json::to_string_pretty(&list).map_err(|e| e.to_string())?;

        if let Some(parent) = self.store_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let tmp_path = self.store_path.with_extension("tmp");
        std::fs::write(&tmp_path, json).map_err(|e| e.to_string())?;
        std::fs::rename(&tmp_path, &self.store_path).map_err(|e| e.to_string())?;
        Ok(())
    }
}

/// SSH TOFU（Trust on First Use）待决策请求管理器
///
/// 后端在 `check_server_key` 中遇到未知主机时注册一个待决策项并等待 `oneshot` 通道；
/// 前端通过 `ssh_tofu_decide` 命令把用户选择写回通道。
pub struct SshTofuManager {
    pending: Mutex<HashMap<(String, usize), oneshot::Sender<bool>>>,
}

impl SshTofuManager {
    pub fn new() -> Self {
        Self {
            pending: Mutex::new(HashMap::new()),
        }
    }

    /// 注册一次 TOFU 决策请求，返回用于等待决策的接收端
    pub fn register(
        &self,
        connection_id: String,
        hop_index: usize,
    ) -> Result<oneshot::Receiver<bool>, String> {
        let (tx, rx) = oneshot::channel();
        let mut pending = self.pending.lock().map_err(|e| e.to_string())?;
        pending.insert((connection_id, hop_index), tx);
        Ok(rx)
    }

    /// 前端做出决策后调用：接受/拒绝某次 TOFU 请求
    pub fn resolve(
        &self,
        connection_id: &str,
        hop_index: usize,
        accept: bool,
    ) -> Result<(), String> {
        let mut pending = self.pending.lock().map_err(|e| e.to_string())?;
        let tx = pending
            .remove(&(connection_id.to_string(), hop_index))
            .ok_or_else(|| "TOFU 请求已过期或不存在".to_string())?;
        tx.send(accept).map_err(|_| "TOFU 决策通道已关闭".to_string())?;
        Ok(())
    }

    /// 连接尝试结束时清理可能遗留的待决策项（避免内存泄漏）
    pub fn cleanup(&self, connection_id: &str, hop_index: usize) {
        if let Ok(mut pending) = self.pending.lock() {
            pending.remove(&(connection_id.to_string(), hop_index));
        }
    }
}

impl Default for SshTofuManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir() -> PathBuf {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let n = COUNTER.fetch_add(1, Ordering::SeqCst);
        std::env::temp_dir().join(format!("rdc-known-hosts-test-{}", n))
    }

    fn sample_fingerprint() -> &'static str {
        "SHA256:abcdefg1234567890"
    }

    #[test]
    fn trust_and_find_roundtrip() {
        let dir = temp_dir();
        let key = [42u8; 32];
        let store = SshKnownHostsStore::new(dir.clone(), key).unwrap();

        store.trust("jump.example.com", 22, sample_fingerprint()).unwrap();
        let found = store.find("jump.example.com", 22).unwrap();
        assert_eq!(found.as_deref(), Some(sample_fingerprint()));

        // 未信任的主机应返回 None
        assert!(store.find("other.example.com", 22).unwrap().is_none());
        // 端口不匹配应返回 None
        assert!(store.find("jump.example.com", 2222).unwrap().is_none());

        // 清理
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn trust_updates_fingerprint_and_last_used() {
        let dir = temp_dir();
        let key = [42u8; 32];
        let store = SshKnownHostsStore::new(dir.clone(), key).unwrap();

        store.trust("h", 22, "SHA256:old").unwrap();
        store.trust("h", 22, "SHA256:new").unwrap();

        let found = store.find("h", 22).unwrap();
        assert_eq!(found.as_deref(), Some("SHA256:new"));

        // 同目录重新加载应能读出更新后的指纹
        let store2 = SshKnownHostsStore::new(dir.clone(), key).unwrap();
        assert_eq!(store2.find("h", 22).unwrap().as_deref(), Some("SHA256:new"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn remove_trusted_host() {
        let dir = temp_dir();
        let key = [42u8; 32];
        let store = SshKnownHostsStore::new(dir.clone(), key).unwrap();

        store.trust("h", 22, sample_fingerprint()).unwrap();
        assert!(store.remove("h", 22).unwrap());
        assert!(store.find("h", 22).unwrap().is_none());
        assert!(!store.remove("h", 22).unwrap());

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn list_decrypts_fingerprints() {
        let dir = temp_dir();
        let key = [42u8; 32];
        let store = SshKnownHostsStore::new(dir.clone(), key).unwrap();

        store.trust("b", 22, "SHA256:bbb").unwrap();
        store.trust("a", 22, "SHA256:aaa").unwrap();

        let list = store.list().unwrap();
        assert_eq!(list.len(), 2);
        // 按 host 排序
        assert_eq!(list[0].host, "a");
        assert_eq!(list[0].fingerprint, "SHA256:aaa");
        assert_eq!(list[1].host, "b");
        assert_eq!(list[1].fingerprint, "SHA256:bbb");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn persisted_fingerprint_is_encrypted() {
        let dir = temp_dir();
        let key = [42u8; 32];
        let store = SshKnownHostsStore::new(dir.clone(), key).unwrap();
        store.trust("h", 22, sample_fingerprint()).unwrap();

        let raw = std::fs::read_to_string(dir.join(SSH_KNOWN_HOSTS_FILENAME)).unwrap();
        // 原始 JSON 里不应出现明文指纹
        assert!(!raw.contains(sample_fingerprint()));
        // 但应出现 host / port 等元数据（pretty JSON 含空格）
        assert!(raw.contains("\"host\": \"h\""));
        assert!(raw.contains("\"port\": 22"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn tofu_manager_register_resolve_accept() {
        let manager = SshTofuManager::new();
        let rx = manager.register("conn-1".into(), 0).unwrap();

        manager.resolve("conn-1", 0, true).unwrap();

        let decision = rx.blocking_recv().unwrap();
        assert!(decision);
    }

    #[test]
    fn tofu_manager_register_resolve_reject() {
        let manager = SshTofuManager::new();
        let rx = manager.register("conn-1".into(), 1).unwrap();

        manager.resolve("conn-1", 1, false).unwrap();

        let decision = rx.blocking_recv().unwrap();
        assert!(!decision);
    }

    #[test]
    fn tofu_manager_resolve_unknown_request_fails() {
        let manager = SshTofuManager::new();
        let err = manager.resolve("missing", 0, true).unwrap_err();
        assert!(err.contains("过期") || err.contains("不存在"));
    }
}
