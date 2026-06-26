# 活跃上下文

> 这是 Memory Bank 中最动态的文件，每次会话结束前由 AI 主动更新。

## 当前状态

- **项目版本**：v0.2.8（2026-05-23 发布）；v0.3.0 工作中。
- **当前分支**：`feat/ssh-tunnel-v03`（基于 `main`）。
- **工作树**：本次会话变更已分阶段提交在分支上，工作树干净。
- **最近 commits**（本分支）：
  - `feat(ssh): 重构 SSH 配置为 N 跳模型并兼容老数据`
  - `feat(ssh): 新增 russh 隧道模块支持 N 跳串联`
  - `feat(ssh): RedisClientManager 集成 SSH 隧道连接`
  - `feat(ssh): 连接对话框 SSH Tab 改为 N 跳列表`

## 本会话工作

实现 SSH 隧道后端，对齐用户脚本 `~/develop/login_server/redis`（OpenSSH `ssh -NL ... -J seelog@116.63.141.212 root@192.168.0.35` 等效能力）；落地方案 B（任意 N 跳一步到位）。

分阶段提交：

1. **后端数据模型**：`SshConfig` 由单跳扁平字段重构为 `{ enabled, hops: Vec<SshHop> }`；自定义 `Deserialize` 用 `untagged` 兼容老格式，老数据下次保存自动迁移。`ConnectionStore` 同步扩展每跳的 SSH `password` / `passphrase` 走 AES-256-GCM 加密。前端 `SshConfig` 类型同步。
2. **`ssh_tunnel.rs` 模块**：基于 `russh = "0.54"` 实现 N 跳隧道；第 1 跳 TCP 直连，第 2..N 跳在前一跳 session 上 `channel_open_direct_tcpip(next_hop, 22)` 取得 channel，`channel.into_stream()` 作为下一跳 `connect_stream` 的 transport，递归到最后一跳；最后一跳监听本地随机端口，`copy_bidirectional` 桥接到 Redis。`SshTunnelError` 每变体对应稳定 i18n key。
3. **`RedisClientManager` 接入**：新增 `tunnels` HashMap 与 `clients` 共生命周期；`connect_with_config` 检测 standalone + `ssh.enabled` 时先建隧道，再用本地端口建 Redis 连接；`disconnect` 同步释放隧道。`test_connection` 的 standalone 分支同步建临时隧道再 PING。
4. **前端 SSH Tab UI 改造**：新增 `SshHopList` + `HopCard`，每个跳板独立卡片含完整字段，支持上下移、删除；底部「添加下一跳」按钮；角色标签自动判断（入口 / 中转 / 出口）。新增 i18n key 共 19 个（含 `error.ssh.*` 命名空间），`just i18n-check` 通过。

## 活跃文件

- `src-tauri/src/config/store.rs`：`SshConfig` / `SshHop` 数据结构；`ConnectionStore` 加解密扩展。
- `src-tauri/src/redis/ssh_tunnel.rs`：新增模块，N 跳 SSH 隧道实现。
- `src-tauri/src/redis/client.rs`：`RedisClientManager` 加 `tunnels` 字段，新增 `open_ssh_tunnel_if_needed` 公共函数。
- `src-tauri/src/commands/connection.rs`：`validate_connection_config` 加 SSH 校验；`test_connection` standalone 走隧道。
- `src/stores/connection-store.ts`：`SshConfig` / `SshHop` 类型。
- `src/components/connection/connection-dialog.tsx`：SSH Tab 重构为跳板列表 UI；`SshHopList` + `HopCard` 组件。
- `src/i18n/locales/en-US.json` / `zh-CN.json`：跳板 UI 文案 + `error.ssh.*` 命名空间。

## 已做决策

- **方案 B（一步到位 N 跳）**：原本规划 v0.3 走方案 A 单跳，但与用户对齐「SSH 跳」准确定义后发现单跳模型表达不了 jump + endpoint（用户脚本就是 1 jump + 1 endpoint），最少需要 2 个 SSH 节点；扩展到任意 N 跳与 1+1 协议层实现没有本质差异，故一步到位。
- **认证策略**：当前阶段 `check_server_key` 信任所有服务器公钥；TODO 引入 `known_hosts` 校验与 TOFU 提示。
- **Cluster / Sentinel 不接 SSH**：涉及多节点隧道协调（每节点单独隧道、客户端拿到的内网 IP 还需做映射），工作量大，独立立项；阶段 3 仅 standalone 接入，cluster/sentinel + SSH 直接返回 `error.ssh.unsupported_for_cluster_sentinel`。
- **跳板 session 整链保活**：中间跳板 session 若提前 drop，派生其上的 channel stream 会失活；故所有 `Arc<Mutex<Handle>>` 都保存在 `SshTunnel` 结构内。
- **密码同等加密**：每跳 SSH `password` 与 `passphrase` 与 Redis 密码同走 AES-256-GCM；不向日志写明文。
- **i18n 错误命名空间**：所有 SSH 错误经稳定 i18n key（`error.ssh.*`）返回前端，不向前端泄露后端语言文本。

## 下一步

- 端到端测试：用真实链路（`116.63.141.212` → `192.168.0.35` → Redis）跑通 standalone + SSH 多跳 PING；交叉验证 macOS + Windows。
- 加 Rust 单元测试覆盖 `SshConfig::Deserialize` 兼容老格式 + `validate_connection_config` SSH 校验。
- 验收通过后 `just version 0.3.0` 升版本号 + `just release` 触发 CI。

## 阻塞

无；待用户在本机或目标服务器上跑端到端验证。

## 关联记忆

- 项目愿景 → [[projectbrief]]
- 业务上下文 → [[productContext]]
- 架构约定 → [[systemPatterns]]
- 技术栈事实 → [[techContext]]
- 版本历史 → [[progress]]
