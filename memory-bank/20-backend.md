---
name: 20-backend
description: Rust 后端分层、Tauri Command 约定、连接池、加密存储与数据落地位置
paths:
  - "src-tauri/src/**"
---

# 20-backend — Rust 后端架构与约定

## 目录组织

```
src-tauri/src/
├── main.rs                   # binary 入口
├── lib.rs                    # 插件注册 + Command 注册
├── commands/                 # 9 个 Tauri Command 模块（+ mod.rs）
│   ├── connection.rs         # connect/disconnect/save/list/test
│   ├── keys.rs               # SCAN / 新建 / 重命名 / 复制 / 删除 / TTL
│   ├── values.rs             # 按类型读写
│   ├── cli.rs                # execute_command
│   ├── server.rs             # get_server_info / start_monitor / slowlog
│   ├── pubsub.rs             # subscribe / unsubscribe / publish
│   ├── data.rs               # Key 数据导入导出
│   ├── export.rs             # 连接配置导入导出
│   └── ssh.rs                # TOFU 决策 + known_hosts 管理
├── redis/
│   ├── client.rs             # RedisClientManager 连接池
│   ├── ssh_tunnel.rs         # russh N 跳隧道 + known_hosts 校验
│   └── types.rs              # IpcResponse<T> / 数据类型
└── config/
    ├── store.rs              # ConnectionStore（connections.json）
    ├── encryption.rs         # AES-256-GCM
    └── ssh_known_hosts.rs    # 加密指纹存储 + TOFU pending 管理
```

## 后端设计模式

- **统一响应结构**：所有 Tauri Command 返回 `IpcResponse<T>`，前端 IPC 封装层统一处理 ok/err。
- **错误信息走 i18n key**：Rust 端不返回语言文本，返回 i18n key 由前端翻译。
- **IPC 字段命名**：结构体统一 `rename_all = camelCase` + 老字段 `alias`，保证前后端字段名一致；磁盘上的 snake_case 老数据经 `serde(default)` + `alias` 自动迁移。
- **连接池**：`RedisClientManager` 按 `(connection_id, db)` 保存 `ConnectionManager`。数据库写进连接 URL，命令路径不再 `SELECT`，避免 Browser/CLI 抢同一条多路复用连接。每次会话使用独立 generation 令牌，懒建连在同锁内快照端点与令牌、完成后校验令牌再插入；断开或重连后的旧结果直接丢弃。CLI 禁止 RESET、AUTH/HELLO、CLIENT、事务等共享会话状态命令。Pub/Sub 与 MONITOR 使用会话里已经解析好的端点（SSH 本地端口 + rustls），禁止绕过隧道直连。
- **TLS**：Redis 连接使用 `tokio-rustls-comp` + webpki roots。自定义 CA / 客户端证书从 `TlsConfig` 路径读取。仅用户显式启用 `skipVerify` 时追加 `#insecure`，关闭证书链与主机名等全部校验。SSH 隧道使用 redis-rs 的 `set_danger_accept_invalid_hostnames`，仅放宽本地转发地址的主机名校验，仍验证证书链、有效期和签名；建议配置专用 CA。此标志必须在 `build_with_tls` 加载 CA / mTLS 参数后设置，避免被覆盖。
- **Sentinel / Cluster**：Sentinel 会向哨兵查询当前 master 再连接数据节点，不支持实时故障转移，也不支持 SSH。Cluster 明确拒绝连接，不再把种子节点当成单机。能力由 `get_backend_capabilities` 返回 `supported` / `degraded` / `unsupported`。
- **加密**：Redis 密码、SSH 密码 / passphrase、Sentinel 密码都用 **AES-256-GCM**。历史明文 Sentinel 密码在下次加载时迁移。Master Key 只存在独立 `master-key` 文件（Unix 权限 `0600`），不读环境变量，不写进 `connections.json`。列表 IPC 不返回这些明文。Redis / SSH / Sentinel 的密码写入契约为 null/缺省保留、空字符串或 `clearPassword: true` 清空；清空标志优先于新密码，详见 `docs/CONNECTION_CONTRACT.md`。
- **SSH 隧道**：`redis/ssh_tunnel.rs` 基于 `russh` 建立 N 跳隧道；当前仅 Standalone 连接可启用 SSH，Sentinel / Cluster over SSH 后续独立设计。同一连接从 SSH 改为非 SSH 后重连会清理旧隧道。
- **SSH 主机信任**：`config/ssh_known_hosts.rs` 独立管理加密指纹和 TOFU pending 请求；未知主机通过 `ssh:tofu-request` 事件让前端确认，指纹失配硬拒绝；pending 有超时清理，避免连接流程永久挂起。
- **异步**：所有 Redis 操作走 `tokio` 异步运行时；后台监控/订阅任务通过 `tauri::async_runtime::spawn`，注意任务句柄管理避免泄漏（v0.2.3 修复过 MONITOR 任务泄漏）。
- **TLS 切换**：`redis/endpoint.rs` 在启用 TLS 时用 rustls 打开 `rediss://`，并加载 CA / 客户端证书。
- **Tauri Event 通道**：`redis://pubsub`（Pub/Sub 消息）、`redis://monitor`（实时指标）、`redis://import-progress` / `redis://export-progress`（导入导出进度）、`redis://update-progress`（更新下载进度）、`ssh:tofu-request`（SSH 首次连接指纹确认）。

## 数据存储

- **连接配置**：`{AppData}/connections.json`（Redis 密码、SSH 机密、Sentinel 密码均为 AES-256-GCM）。
- **SSH known_hosts**：`{AppData}/ssh-known-hosts.json`（指纹 AES-256-GCM 加密）。
- **Master Key**：`{AppData}/master-key`（独立文件，应用启动时自动生成）。
- **用户偏好**：`localStorage`（主题、语言、命名空间分隔符、自动更新开关、更新代理）。
- **Tauri Store**：`@tauri-apps/plugin-store` 用于其它需要持久化的状态。
- 数据库：**不使用本地数据库**；所有持久化都是 JSON 文件 + localStorage。

## 后端负向约束

- ❌ **不要在 Rust 后端返回语言文本**：错误信息返回 i18n key，前端负责翻译。
- ❌ **不要让 Sentinel / Cluster 连接启用 SSH**：当前只支持 Standalone over SSH，多节点隧道协调需单独立项。
- ❌ **不要提交 .env、签名密钥、`master-key`**：已在 `.gitignore`；构建时通过 `set dotenv-load` 由 justfile 加载。
- ❌ **不要在数据库设计中使用外键**：本项目无数据库，但全局规则同样适用——表关联由代码逻辑、索引和校验控制。
- ❌ **不要忘记测试**：新增/修改后端逻辑用 `cargo test`，单元测试靠近被测代码。
