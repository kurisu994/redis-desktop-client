# cursor/security-connection-isolation-dd25

## 目标

在 PR #3 的既有连接隔离基线 `8f9e02e` 上修复 review C1 / C2 / C3 / L1；保持密码 IPC 契约，不合并其他分支。

## 验收标准

- [x] CLI 拒绝 RESET 及改变认证、协议、事务、回复/订阅等共享会话状态的命令；常见读命令保持可用。
- [x] SSH + TLS 仅跳过本地转发地址的主机名校验，仍验证证书链、有效期和签名；仅显式 `skipVerify` 使用整链 insecure。
- [x] 懒建连在同锁内快照 endpoint + generation，插入前同锁校验；断开或重连后旧结果丢弃。
- [x] 中英文 README 与 Cluster `unsupported`、Sentinel 需重连的真实能力一致。
- [x] Redis / SSH / Sentinel 的 null/缺省保留、空字符串或 `clearPassword: true` 清空契约通过 IPC 反序列化和合并回归；文档见 `docs/CONNECTION_CONTRACT.md`。
- [x] `just test-rust` 62 项通过（含真实 rustls 握手及可控时序重连测试）。
- [x] `just lint-rust` 严格 clippy 通过，`just lint-web`、`just build-web`、`just i18n-check` 和 `just fmt` 通过；独立代码复核 PASS。

## 备注

- 具体 TLS、generation 和密码契约已同步 `20-backend.md`；TLS 测试的 `rcgen` 仅为开发依赖，私钥在内存中生成，不进入仓库或磁盘。
- UI 已接入 SSH 主机名校验限制和“跳过全部校验”文案；建议使用专用 CA 缩小信任范围，不宣称校验了 Redis 主机名。`just dev` 成功启动并打开新建连接/TLS 页；原生自动化开关点击会退出弹窗，未完成完整交互验收，不影响已通过的真实 TLS 握手回归。
- 阿雅前端分支仅只读核对 tip `8bdd464`；本分支未引入其清除勾选表单，也未改变既有 `clearPassword` 字段及行为。
- 交付仅允许提交并推送 `origin/cursor/security-connection-isolation-dd25` 更新 PR #3，不合并 main；最终 SHA 与推送结果以 Git / PR head 为准。

## 阻塞

- 无代码阻塞。原有 `russh 0.54.5` future-incompat 提示仍存在，未扩大范围升级依赖。
