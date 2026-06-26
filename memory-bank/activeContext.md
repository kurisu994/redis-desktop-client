# 活跃上下文

> 这是 Memory Bank 中最动态的文件，每次会话结束前由 AI 主动更新。

## 当前状态

- **项目版本**：v0.2.8（2026-05-23 发布）；v0.3.0 已合并到 main；v0.3.1 进行中。
- **当前分支**：`feat/ssh-known-hosts`（从 main 切出，实现 SSH known_hosts 校验 + TOFU）。
- **工作树**：有变更（known_hosts + TOFU 全链路实现完成，待 commit）。
- **最近 commits**（本分支尚未生成，预期分阶段提交）：
  - `feat(ssh): 新增 known_hosts 加密存储与 TOFU 决策管理器`
  - `feat(ssh): SSH 隧道接入 known_hosts 校验与 TOFU 事件`
  - `feat(ssh): 前端 SshTofuDialog 弹窗与监听 hook`
  - `feat(ui): 设置页新增 SSH 安全 Tab`
  - `tests(ssh): 补充 known_hosts / TOFU / 错误 key 单元测试`
  - `docs(memory-bank): 同步 known_hosts + TOFU 完成状态`

## 本会话工作

### SSH 隧道安全增强：known_hosts 校验 + TOFU（v0.3.1）

关闭 v0.3.0 中 `AcceptAllKeys` 信任所有服务器公钥的安全漏洞，实现与 OpenSSH 类似的 Trust on First Use 体验。

- **后端数据模型**：新增 `src-tauri/src/config/ssh_known_hosts.rs`：
  - `SshKnownHost { host, port, fingerprint, first_seen_at, last_used_at }`
  - `SshKnownHostsStore` 落盘到 `app_data_dir/ssh-known-hosts.json`，指纹字段走 AES-256-GCM 加密（复用 `master-key`）。
  - `SshTofuManager` 管理待决策的 `oneshot` 通道，支持注册/决策/清理。
- **后端校验流程**：`ssh_tunnel.rs` 中 `AcceptAllKeys` 替换为 `KnownHostsValidator`：
  - 已信任且指纹匹配 → 静默通过。
  - 已信任但指纹不匹配 → `HostKeyMismatch` 硬拒绝（不允许 UI 忽略）。
  - 未信任主机 → 通过 `tauri::Emitter` 发送 `ssh:tofu-request` 事件，等待前端 `ssh_tofu_decide` 命令回写决策；用户信任后保存指纹。
  - 新增 `SshTunnelError::HostKeyMismatch` / `HostKeyRejected` 及对应 `error.ssh.*` i18n key。
- **Tauri 状态与命令**：
  - `lib.rs` setup 中初始化 `SshKnownHostsStore` 与 `SshTofuManager`（均包 `Arc`）作为 managed state。
  - 新增 `commands::ssh` 模块：提供 `ssh_tofu_decide`、`list_ssh_known_hosts`、`remove_ssh_known_host`。
  - `connect_redis` / `test_connection` 命令现在把 known_hosts / tofu_manager / AppHandle 封装为 `SshTunnelContext` 传入隧道建立流程。
- **前端 TOFU 弹窗**：
  - `use-ssh-tofu-listener.ts` hook 监听 `ssh:tofu-request`，维护请求队列。
  - `SshTofuDialog` 组件显示 host:port + SHA-256 指纹，提供「信任并保存」/「拒绝」。
  - 在 `page.tsx` 全局挂载，多跳链路首次连接会依次弹窗。
- **设置页 SSH 安全 Tab**：
  - 列出所有已信任主机（host / port / fingerprint），支持单条删除。
  - 删除时使用 `ConfirmDangerDialog` 二次确认。
- **i18n**：新增 14 个 key（连接弹窗 6 + 错误 2 + 设置页 6），`just i18n-check` 通过。
- **单元测试**：
  - `ssh_known_hosts.rs`：5 个存储测试 + 3 个 TOFU 管理器测试。
  - `ssh_tunnel.rs`：新增 `HostKeyMismatch` / `HostKeyRejected` i18n key 映射测试。
  - 全量 28 个 Rust 单元测试通过；`cargo clippy -D warnings` 通过；`pnpm exec tsc --noEmit` 通过；`pnpm lint` 通过。

## 已做决策

- **已知主机存储独立加密 JSON**：不污染 `~/.ssh/known_hosts`，跨平台一致，与 `connections.json` 同机制。
- **指纹格式 OpenSSH 风格**：`SHA256:base64...`，用户肉眼对比方便。
- **指纹失配硬拒绝**：不在 UI 提供「强制更新」按钮，用户必须去设置页手动删除后重新 TOFU，降低钓鱼风险。
- **多跳每跳独立校验**：首次连接时逐跳弹窗；每跳独立注册/决策通道。
- **关闭弹窗 = 拒绝**：避免用户误触关闭导致连接挂起。
- **Cluster / Sentinel 不接 SSH**：保持 v0.3.0 决策，涉及多节点隧道协调，独立立项。

## 下一步

1. 将当前变更按功能分阶段 commit 到 `feat/ssh-known-hosts`。
2. 用户用真实 SSH 链路验证：首次连接 TOFU 弹窗 → 信任后再次连接静默通过 → 手动改指纹后连接硬拒绝 → 设置页删除后重新 TOFU。
3. 验证通过后将 `feat/ssh-known-hosts` 合并到 main。
4. `just version 0.3.1` + `just release v0.3.1` 发版。
5. 后续可选打磨（用户已同意暂缓）：cluster/sentinel + SSH、SSH session 复用池、TestResult 字段名统一 camelCase。

## 阻塞

无。

## 关联记忆

- 项目愿景 → [[projectbrief]]
- 业务上下文 → [[productContext]]
- 架构约定 → [[systemPatterns]]
- 技术栈事实 → [[techContext]]
- 版本历史 → [[progress]]
