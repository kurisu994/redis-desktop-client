use crate::config::ssh_known_hosts::{SshKnownHost, SshKnownHostsStore, SshTofuManager};
use std::sync::Arc;
use tauri::State;

/// 前端对某次 SSH TOFU 请求做出信任/拒绝决策
#[tauri::command]
pub async fn ssh_tofu_decide(
    tofu_manager: State<'_, Arc<SshTofuManager>>,
    connection_id: String,
    hop_index: usize,
    accept: bool,
) -> Result<(), String> {
    tofu_manager.resolve(&connection_id, hop_index, accept)
}

/// 获取所有已信任的 SSH 主机（指纹已解密）
#[tauri::command]
pub async fn list_ssh_known_hosts(
    store: State<'_, Arc<SshKnownHostsStore>>,
) -> Result<Vec<SshKnownHost>, String> {
    store.list()
}

/// 删除一条已信任的 SSH 主机记录
#[tauri::command]
pub async fn remove_ssh_known_host(
    store: State<'_, Arc<SshKnownHostsStore>>,
    host: String,
    port: u16,
) -> Result<bool, String> {
    store.remove(&host, port)
}
