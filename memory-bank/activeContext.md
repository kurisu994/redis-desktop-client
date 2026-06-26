# 活跃上下文

> 这是 Memory Bank 中最动态的文件，每次会话结束前由 AI 主动更新。

## 当前状态

- **当前分支**：`main`，已与 `origin/main` 对齐。
- **工作树**：有本轮发布前修复与文档同步变更，涉及 SSH 连接契约、TOFU 超时、私钥路径展开、SSH tunnel 生命周期、连接弹窗 UI、i18n、README、CHANGELOG、docs 与 memory-bank。
- **版本位置**：最新 Git tag 是 `v0.2.8`（`d09b1b4`）；当前 `main` 位于 `v0.2.8-25-gc0c45d9`，已有 25 个 tag 后提交。
- **本轮目标**：已根据 `v0.2.8..HEAD` 发布前审查结果逐项修复，并补充 SSH 密码/密钥密码输入框显示隐藏按钮。

## 本会话工作

### 发布前审查问题修复与文档同步

- **SSH + Cluster/Sentinel 契约**：`validate_connection_config` 现在拒绝非 standalone 启用 SSH，返回 `error.ssh.unsupported_for_cluster_sentinel`；连接弹窗切换到 Sentinel/Cluster 时关闭 SSH，构建配置时也只在 standalone 下带 `config.ssh`。
- **TOFU 等待超时**：未知 host key 发出 `ssh:tofu-request` 后，用 120 秒 timeout 包裹 `oneshot` 等待；超时、拒绝或发送失败都会 cleanup pending 并返回拒绝类错误。
- **私钥路径展开**：Rust 端新增 `expand_home_path`，支持 `~`、`~/...` 和 `~\...`，避免 UI placeholder `~/.ssh/id_rsa` 与后端能力不一致。
- **SSH tunnel 生命周期**：`RedisClientManager` 新增 `replace_tunnel`，同一连接重连且新配置无 tunnel 时会移除旧 tunnel。
- **SSH 密码体验**：SSH hop 的密码认证输入框和私钥 passphrase 输入框复用 `PasswordInput`，增加 `Eye/EyeOff` 显示隐藏按钮。
- **测试覆盖**：Rust 单测新增到 31 个，覆盖 SSH+Cluster/Sentinel 校验拒绝、旧 tunnel 清理、`~` 路径展开。
- **文档同步**：已检查项目内 11 个 Markdown 文档，更新 README、CHANGELOG、AGENTS、需求/开发计划和 memory-bank 中的 SSH 后端、TOFU、known_hosts、Standalone-only、目录结构与已删除协作文件的索引清理事实。

## 已做决策

- 当前阶段仍不实现 Cluster/Sentinel over SSH，只在 UI 和后端保存/测试层明确拒绝，避免发布前扩大范围。
- TOFU 超时复用现有 `error.ssh.host_key_rejected` 展示路径，暂不新增独立 timeout 翻译 key。
- `~` 路径展开不引入新依赖，使用标准环境变量解析 home 目录。

## 下一步

1. 如需继续发布流程，可进入版本 bump / release 检查。
2. 如后续要支持 Cluster/Sentinel over SSH，需要单独设计多节点隧道协调，不与本次发布前修复混在一起。

## 阻塞

- 无。

## 关联记忆

- 项目愿景 → [[projectbrief]]
- 业务上下文 → [[productContext]]
- 架构约定 → [[systemPatterns]]
- 技术栈事实 → [[techContext]]
- 版本历史 → [[progress]]
