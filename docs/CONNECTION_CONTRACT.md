# 连接安全与密码 IPC 契约

事实来源：`get_backend_capabilities`、`commands/connection.rs`、`config/store.rs` 和 `redis/endpoint.rs`。

## 密码保留、更新与清空

`save_connection` 和 `test_connection` 使用相同的机密合并规则：

| 输入 | 行为 |
| --- | --- |
| 密码字段缺省或 `null`，且未显式清空 | 保留已有密码；新连接则为空 |
| 非空字符串 | 更新密码 |
| 空字符串 `""` | 清空密码 |
| `clearPassword: true` | 清空密码，即使同时提供了非空新值 |

该规则适用于连接级 `password`、SSH `hops[].password`、Sentinel `sentinelPassword`；对应层级的清空字段都叫 `clearPassword`。SSH 私钥口令使用 `passphrase` / `clearPassphrase`。SSH 旧机密按 host + port + username 匹配，不按数组索引匹配。

列表仅返回脱敏字段和 `hasPassword` / `hasPassphrase` / `hasSentinelPassword` 标记，不能把脱敏值当作待更新密码。清空标志是写入指令，不应作为已保存的清空状态回填；编辑表单空框且未勾选清空时应发缺省或 `null`，不要发 `""`。复制连接使用 `duplicate_connection`，由后端保留机密。

本分支保留此契约，不引入其他前端分支的整套表单改动。

## TLS 与 SSH

- 默认启用证书链、有效期、签名和主机名校验，可配置 CA 和客户端证书。
- SSH 本地转发的拨号地址与 Redis 证书主机名通常不同，当前仅跳过主机名校验，仍校验证书链、有效期和签名。不能据此声称验证了 Redis 主机名，建议使用专用 CA 缩小信任范围。
- redis-rs 的 `#insecure` 会关闭全部证书校验，仅允许用户显式勾选 `skipVerify` 时使用；SSH 本身不会启用它。
- Browser、CLI、Pub/Sub、MONITOR 均复用同一会话端点和 TLS 配置，不能绕过 SSH 或退回明文连接。

## 模式与会话边界

- Standalone 可叠加 SSH / TLS。Sentinel 在连接时解析 master，故障转移后需重新连接，不支持 SSH。
- Cluster 当前为 `unsupported`，拒绝数据连接，不能把种子节点当作完整集群。
- 每个 DB 使用固定数据库的独立连接；CLI 拒绝 RESET、SELECT、认证/协议、CLIENT、事务及订阅等会话状态命令。
- 懒建连必须校验原会话 generation；断开或重连后旧连接结果不能插入或返回为新会话连接。
