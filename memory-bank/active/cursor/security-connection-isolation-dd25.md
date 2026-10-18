# cursor/security-connection-isolation-dd25

## 目标

修复连接隔离、TLS、Sentinel/Cluster 假支持、Pub/Sub 与 MONITOR 绕过隧道、Sentinel 密码明文，并给出前端可对齐的 IPC 契约。

## 验收标准

- [x] 同一连接的不同 db 使用独立 `ConnectionManager`，命令路径不再 `SELECT`
- [x] Cluster 连接被拒绝；Sentinel 连接解析出的 master
- [x] Redis TLS 使用 rustls；Pub/Sub 与 MONITOR 复用会话端点
- [x] Sentinel 密码 AES-GCM 落盘，历史明文会迁移
- [x] `list_connections` 不返回明文密码；导出 v2 保留 SSH/TLS 元数据
- [x] `get_backend_capabilities` 标明 TLS / Sentinel / Cluster 状态
- [x] `cargo test` 50 项通过，`cargo clippy -D warnings` 通过，前端 `tsc --noEmit` 通过

## 备注

- Cluster 选择明确不支持，而不是半实现路由。
- SSH + TLS 使用 `#insecure`，因为拨号地址是本地转发端口。
- 前端导出警告、toast 和重命名确认由另一条本地分支处理，这里只加能力提示和复制连接命令。

## 阻塞

- 无
