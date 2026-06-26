use crate::config::ssh_known_hosts::{SshKnownHostsStore, SshTofuManager};
use crate::config::store::{SshConfig, SshHop};
use russh::client::{self, AuthResult, Config, Handle, Handler};
use russh::keys::{load_secret_key, ssh_key, PrivateKeyWithHashAlg};
use std::net::SocketAddr;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Emitter;
use thiserror::Error;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex as TokioMutex;
use tokio::task::JoinHandle;

/// SSH 隧道空闲超时（用于 `russh` 心跳与断连判定）
const TUNNEL_INACTIVITY: Duration = Duration::from_secs(3600);

/// SSH 隧道建立所需上下文 — 由调用方（Tauri 命令层）注入
pub struct SshTunnelContext {
    pub known_hosts: Arc<SshKnownHostsStore>,
    pub tofu_manager: Arc<SshTofuManager>,
    pub app_handle: tauri::AppHandle,
    pub connection_id: String,
}

/// SSH 隧道错误 — 每个变体对应一个前端 i18n key，避免泄露后端语言
#[derive(Debug, Error)]
pub enum SshTunnelError {
    #[error("error.ssh.no_hops")]
    NoHops,
    #[error("error.ssh.connect_failed: {0}")]
    ConnectFailed(String),
    #[error("error.ssh.auth_failed")]
    AuthFailed,
    #[error("error.ssh.invalid_passphrase")]
    InvalidPassphrase,
    #[error("error.ssh.key_not_found")]
    KeyNotFound,
    #[error("error.ssh.channel_open_failed: {0}")]
    ChannelOpenFailed(String),
    #[error("error.ssh.local_listen_failed")]
    LocalListenFailed,
    #[error("error.ssh.invalid_auth_type")]
    InvalidAuthType,
    /// 服务器公钥指纹与已信任记录不符 — 硬拒绝，不允许 UI 忽略
    #[error("error.ssh.host_key_mismatch")]
    HostKeyMismatch { host: String, port: u16 },
    /// 用户拒绝信任未知主机公钥
    #[error("error.ssh.host_key_rejected")]
    HostKeyRejected,
}

impl SshTunnelError {
    /// 返回稳定的 i18n key（不含具体错误描述），供前端翻译
    pub fn i18n_key(&self) -> &'static str {
        match self {
            Self::NoHops => "error.ssh.no_hops",
            Self::ConnectFailed(_) => "error.ssh.connect_failed",
            Self::AuthFailed => "error.ssh.auth_failed",
            Self::InvalidPassphrase => "error.ssh.invalid_passphrase",
            Self::KeyNotFound => "error.ssh.key_not_found",
            Self::ChannelOpenFailed(_) => "error.ssh.channel_open_failed",
            Self::LocalListenFailed => "error.ssh.local_listen_failed",
            Self::InvalidAuthType => "error.ssh.invalid_auth_type",
            Self::HostKeyMismatch { .. } => "error.ssh.host_key_mismatch",
            Self::HostKeyRejected => "error.ssh.host_key_rejected",
        }
    }
}

/// `Handle` 含 `UnboundedReceiver` 不是 Sync，跨任务共享需走 Mutex
type SharedSession = Arc<TokioMutex<Handle<KnownHostsValidator>>>;

/// SSH 服务器公钥校验 Handler — 实现 known_hosts + TOFU
///
/// - 已信任且指纹匹配：静默通过
/// - 已信任但指纹不匹配：硬拒绝（`HostKeyMismatch`）
/// - 未信任：向前端发送 `ssh:tofu-request` 事件并等待用户决策
struct KnownHostsValidator {
    known_hosts: Arc<SshKnownHostsStore>,
    tofu_manager: Arc<SshTofuManager>,
    app_handle: tauri::AppHandle,
    connection_id: String,
    hop_index: usize,
    host: String,
    port: u16,
    /// 用于在 `connect_stream` 失败后将具体错误透传回调用方
    result: Arc<Mutex<Option<SshTunnelError>>>,
}

/// TOFU 请求事件载荷 — 前端据此展示确认弹窗
#[derive(Clone, serde::Serialize)]
struct TofuRequestPayload {
    connection_id: String,
    hop_index: usize,
    host: String,
    port: u16,
    fingerprint: String,
}

impl Handler for KnownHostsValidator {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        server_public_key: &ssh_key::PublicKey,
    ) -> Result<bool, Self::Error> {
        let fingerprint = server_public_key
            .fingerprint(ssh_key::HashAlg::Sha256)
            .to_string();

        match self.known_hosts.find(&self.host, self.port) {
            Ok(Some(stored)) if stored == fingerprint => Ok(true),
            Ok(Some(_)) => {
                log::warn!(
                    "SSH host key 不匹配：{}:{}（第 {} 跳）",
                    self.host,
                    self.port,
                    self.hop_index
                );
                if let Ok(mut r) = self.result.lock() {
                    *r = Some(SshTunnelError::HostKeyMismatch {
                        host: self.host.clone(),
                        port: self.port,
                    });
                }
                Ok(false)
            }
            Ok(None) => {
                // 未知主机：进入 TOFU 流程
                let rx = match self
                    .tofu_manager
                    .register(self.connection_id.clone(), self.hop_index)
                {
                    Ok(rx) => rx,
                    Err(e) => {
                        log::error!("注册 SSH TOFU 请求失败：{}", e);
                        if let Ok(mut r) = self.result.lock() {
                            *r = Some(SshTunnelError::HostKeyRejected);
                        }
                        return Ok(false);
                    }
                };

                let payload = TofuRequestPayload {
                    connection_id: self.connection_id.clone(),
                    hop_index: self.hop_index,
                    host: self.host.clone(),
                    port: self.port,
                    fingerprint: fingerprint.clone(),
                };
                if let Err(e) = self.app_handle.emit("ssh:tofu-request", &payload) {
                    log::error!("发送 ssh:tofu-request 事件失败：{}", e);
                    self.tofu_manager
                        .cleanup(&self.connection_id, self.hop_index);
                    if let Ok(mut r) = self.result.lock() {
                        *r = Some(SshTunnelError::HostKeyRejected);
                    }
                    return Ok(false);
                }

                match rx.await {
                    Ok(true) => {
                        self.tofu_manager
                            .cleanup(&self.connection_id, self.hop_index);
                        if let Err(e) = self.known_hosts.trust(&self.host, self.port, &fingerprint)
                        {
                            log::error!("保存 SSH known_hosts 失败：{}", e);
                            if let Ok(mut r) = self.result.lock() {
                                *r = Some(SshTunnelError::HostKeyRejected);
                            }
                            Ok(false)
                        } else {
                            Ok(true)
                        }
                    }
                    _ => {
                        self.tofu_manager
                            .cleanup(&self.connection_id, self.hop_index);
                        if let Ok(mut r) = self.result.lock() {
                            *r = Some(SshTunnelError::HostKeyRejected);
                        }
                        Ok(false)
                    }
                }
            }
            Err(e) => {
                log::error!("读取 SSH known_hosts 失败：{}", e);
                if let Ok(mut r) = self.result.lock() {
                    *r = Some(SshTunnelError::HostKeyRejected);
                }
                Ok(false)
            }
        }
    }
}

/// SSH 隧道句柄 — drop 时关闭本地 listener 与所有跳板 session
pub struct SshTunnel {
    local_addr: SocketAddr,
    accept_task: JoinHandle<()>,
    /// 持有所有跳板 session 引用直到 drop。中间跳板若提前 drop，
    /// 派生在其上的下一跳 channel stream 会失活，因此必须整链保活
    _sessions: Vec<SharedSession>,
}

impl SshTunnel {
    /// 隧道在本地绑定的 `127.0.0.1:port`，可直接喂给 Redis client 建连
    pub fn local_addr(&self) -> SocketAddr {
        self.local_addr
    }
}

impl Drop for SshTunnel {
    fn drop(&mut self) {
        self.accept_task.abort();
    }
}

/// 建立一条 N 跳 SSH 隧道并在本地 127.0.0.1 绑定随机端口；将所有入向
/// TCP 连接经过完整 SSH 链路桥接到 `target_host:target_port`
///
/// `ssh.hops` 顺序即链路顺序：
/// - hops\[0\]：本地直连的 SSH 主机（堡垒机或唯一跳板）
/// - hops\[1..N-1\]：中间跳板，每跳通过上一跳的 SSH 通道连接
/// - hops\[N-1\]：出口主机，在其上发起 direct-tcpip 到 Redis
pub async fn open(
    ssh: &SshConfig,
    target_host: &str,
    target_port: u16,
    context: &SshTunnelContext,
) -> Result<SshTunnel, SshTunnelError> {
    if !ssh.enabled || ssh.hops.is_empty() {
        return Err(SshTunnelError::NoHops);
    }

    let config = Arc::new(Config {
        inactivity_timeout: Some(TUNNEL_INACTIVITY),
        ..Default::default()
    });

    let mut sessions: Vec<SharedSession> = Vec::with_capacity(ssh.hops.len());

    // 第 1 跳：直接 TCP 连接到 SSH 主机
    let first = &ssh.hops[0];
    let result = Arc::new(Mutex::new(None));
    let handler = KnownHostsValidator {
        known_hosts: context.known_hosts.clone(),
        tofu_manager: context.tofu_manager.clone(),
        app_handle: context.app_handle.clone(),
        connection_id: context.connection_id.clone(),
        hop_index: 0,
        host: first.host.clone(),
        port: first.port,
        result: result.clone(),
    };
    let tcp = TcpStream::connect((first.host.as_str(), first.port))
        .await
        .map_err(|e| SshTunnelError::ConnectFailed(e.to_string()))?;
    let mut current = client::connect_stream(config.clone(), tcp, handler)
        .await
        .map_err(|e| {
            if let Ok(mut r) = result.lock() {
                if let Some(err) = r.take() {
                    return err;
                }
            }
            SshTunnelError::ConnectFailed(e.to_string())
        })?;
    authenticate_hop(&mut current, first).await?;
    sessions.push(Arc::new(TokioMutex::new(current)));

    // 第 2..N 跳：在前一跳的 session 上开 direct-tcpip 通道到下一跳 SSH 端口，
    // 把 channel stream 作为下一跳 session 的 transport（OpenSSH ProxyJump 等效）
    for (i, next_hop) in ssh.hops.iter().skip(1).enumerate() {
        let hop_index = i + 1;
        let prev = sessions.last().expect("已建立至少一个 session").clone();
        let result = Arc::new(Mutex::new(None));
        let handler = KnownHostsValidator {
            known_hosts: context.known_hosts.clone(),
            tofu_manager: context.tofu_manager.clone(),
            app_handle: context.app_handle.clone(),
            connection_id: context.connection_id.clone(),
            hop_index,
            host: next_hop.host.clone(),
            port: next_hop.port,
            result: result.clone(),
        };
        let channel = {
            let prev_guard = prev.lock().await;
            prev_guard
                .channel_open_direct_tcpip(
                    next_hop.host.as_str(),
                    next_hop.port as u32,
                    "127.0.0.1",
                    0,
                )
                .await
                .map_err(|e| SshTunnelError::ChannelOpenFailed(e.to_string()))?
        };
        let stream = channel.into_stream();
        let mut current = client::connect_stream(config.clone(), stream, handler)
            .await
            .map_err(|e| {
                if let Ok(mut r) = result.lock() {
                    if let Some(err) = r.take() {
                        return err;
                    }
                }
                SshTunnelError::ConnectFailed(e.to_string())
            })?;
        authenticate_hop(&mut current, next_hop).await?;
        sessions.push(Arc::new(TokioMutex::new(current)));
    }

    // 本地随机端口监听
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|_| SshTunnelError::LocalListenFailed)?;
    let local_addr = listener
        .local_addr()
        .map_err(|_| SshTunnelError::LocalListenFailed)?;

    let last_session = sessions.last().expect("已建立至少一个 session").clone();
    let sessions_for_task = sessions.clone();
    let target_host = target_host.to_string();

    let accept_task = tokio::spawn(async move {
        // 持有所有跳板 session 引用直到任务结束（含中间跳板）
        let _keep_alive = sessions_for_task;
        loop {
            let (mut socket, _peer) = match listener.accept().await {
                Ok(v) => v,
                Err(e) => {
                    log::warn!("SSH 隧道本地 accept 失败：{}", e);
                    continue;
                }
            };
            let last = last_session.clone();
            let target_host = target_host.clone();
            tokio::spawn(async move {
                let channel_res = {
                    let guard = last.lock().await;
                    guard
                        .channel_open_direct_tcpip(
                            target_host.as_str(),
                            target_port as u32,
                            "127.0.0.1",
                            0,
                        )
                        .await
                };
                let channel = match channel_res {
                    Ok(c) => c,
                    Err(e) => {
                        log::warn!("SSH 隧道开 Redis direct-tcpip 失败：{}", e);
                        return;
                    }
                };
                let mut stream = channel.into_stream();
                if let Err(e) = tokio::io::copy_bidirectional(&mut socket, &mut stream).await {
                    log::debug!("SSH 隧道桥接结束：{}", e);
                }
            });
        }
    });

    Ok(SshTunnel {
        local_addr,
        accept_task,
        _sessions: sessions,
    })
}

/// 对一个 SSH session 执行该跳的认证（密码 / 私钥）
async fn authenticate_hop<H: Handler>(
    session: &mut Handle<H>,
    hop: &SshHop,
) -> Result<(), SshTunnelError> {
    let result: AuthResult = match hop.auth_type.as_str() {
        "password" => {
            let pwd = hop.password.as_deref().unwrap_or("");
            session
                .authenticate_password(hop.username.clone(), pwd.to_string())
                .await
                .map_err(|_| SshTunnelError::AuthFailed)?
        }
        "privateKey" => {
            let path = hop
                .private_key_path
                .as_deref()
                .ok_or(SshTunnelError::KeyNotFound)?;
            if !Path::new(path).exists() {
                return Err(SshTunnelError::KeyNotFound);
            }
            let passphrase = hop.passphrase.as_deref().filter(|s| !s.is_empty());
            let key = load_secret_key(path, passphrase).map_err(|e| {
                let msg = e.to_string().to_lowercase();
                if msg.contains("passphrase")
                    || msg.contains("decrypt")
                    || msg.contains("incorrect password")
                {
                    SshTunnelError::InvalidPassphrase
                } else {
                    SshTunnelError::KeyNotFound
                }
            })?;
            // RSA 由服务端协商最合适的 hash 算法；非 RSA 自动忽略
            let hash_alg = match session.best_supported_rsa_hash().await {
                Ok(Some(alg)) => alg,
                _ => None,
            };
            let key_with_hash = PrivateKeyWithHashAlg::new(Arc::new(key), hash_alg);
            session
                .authenticate_publickey(hop.username.clone(), key_with_hash)
                .await
                .map_err(|_| SshTunnelError::AuthFailed)?
        }
        _ => return Err(SshTunnelError::InvalidAuthType),
    };

    if result.success() {
        Ok(())
    } else {
        Err(SshTunnelError::AuthFailed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn host_key_errors_map_to_i18n_keys() {
        assert_eq!(
            SshTunnelError::HostKeyMismatch {
                host: "h".into(),
                port: 22,
            }
            .i18n_key(),
            "error.ssh.host_key_mismatch"
        );
        assert_eq!(
            SshTunnelError::HostKeyRejected.i18n_key(),
            "error.ssh.host_key_rejected"
        );
    }
}
