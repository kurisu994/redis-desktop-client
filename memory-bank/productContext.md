# 产品上下文 — 业务、用户流与交互约束

## 业务背景

Redis 是后端服务最广泛使用的内存数据库，但官方未提供 GUI 客户端。社区主流方案（RedisInsight、RDM、AnotherRedisDesktopManager）存在**界面陈旧 / 收费 / 性能差 / 跨平台不一致**等痛点。本项目以 Tauri 2 + Next.js 16 + shadcn/ui 现代化技术栈，打造**轻量、高性能、开源**的 GUI 工具，重点解决：

1. **大数据量浏览卡顿**：百万级 Key、大 String、长 Hash/List 的查看性能。
2. **多格式值查看**：JSON / XML / Hex 等格式切换无缝。
3. **运维侧能力**：INFO 监控、慢查询、Pub/Sub、MONITOR 等场景集成。
4. **跨平台一致性**：三平台同一份代码同一份体验。

## 特殊约束

| 约束维度       | 要求                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| 安全 — 密码    | 连接密码本地 **AES-256-GCM 加密**存储；Master Key 自动生成并保存到独立 `master-key` 文件。SSH 私钥只存路径不存内容。 |
| 安全 — 操作    | 删除 Key、批量删除、FLUSHDB / FLUSHALL 等危险操作必须经过统一 `ConfirmDangerDialog` 二次确认；FLUSH 类需输入确认文本。 |
| 安全 — 更新    | 应用更新包必须经 Ed25519 签名校验（公钥已硬编码到 `tauri.conf.json`），更新源固定为 GitHub Releases `latest.json`。   |
| 性能 — 浏览   | Key 列表必须使用 SCAN 分页 + react-virtuoso 虚拟滚动；Hash/List/Set/ZSet/Stream 表格服务端分页（每页 200 条）。       |
| 性能 — 大值   | String > 1MB 必须先预览前 1KB 再按需完整加载；Hex dump 最大 256KB 后截断提示；Monaco Editor 大值禁用高开销特性。       |
| 跨平台 — 快捷键 | 必须使用 ⌘/Ctrl 兼容写法（`Cmd/Ctrl + X`），Tauri API 统一抽象平台差异。                                            |
| 国际化         | 所有 UI 文案必须走 i18n key，禁止硬编码中文/英文；新增 key 需同步 `en-US.json` 和 `zh-CN.json`，`just i18n-check` 校验。 |
| CSP            | 严格 CSP：`script-src 'self'`、`connect-src 'self'`，禁止远程脚本和远程图片（仅允许 data: / blob:）。                |
| 错误信息       | Rust 后端错误信息返回 **i18n key**（而非语言文本），由前端翻译展示。                                                  |

## 核心用户流

### 流程 1：首次连接 Redis

```
启动应用
    │
    ▼
[空状态欢迎页] ─── 提示创建连接
    │ 点击「新建连接」 / ⌘N
    ▼
[连接对话框 Tabs]
    ├── General: host/port/password/db/alias
    ├── SSH Tunnel: ssh host/port/auth (UI 就绪)
    └── Advanced: TLS / Sentinel / Cluster
    │
    ▼ 点击「测试」── PING 验证 + 延迟反馈
    │
    ▼ 点击「保存」── 密码 AES-256-GCM 加密 → connections.json
    │
    ▼ 连接列表展示，状态指示器（绿/灰/黄）
    │ 双击连接 / 右键「连接」
    ▼
建立 MultiplexedConnection（连接池） → 跳转 Browser 视图
```

### 流程 2：浏览与编辑数据

```
Browser 视图
    │
    ├── 顶部：db 选择器（db0~db15 + Key 数量）+ 模式过滤 + 视图切换（树/平铺）+ 新建 Key
    ▼
SCAN 分页加载 Key 列表 ── 虚拟滚动渲染
    │ 点击 Key
    ▼
右侧详情面板
    ├── KeyInfo 头部：类型 / TTL（倒计时） / 内存占用 / 编码方式
    ├── ValueViewer 路由（按类型分发）
    │   ├── string-viewer → 多格式编辑器
    │   ├── hash-viewer → 表格 + 增删改 field
    │   ├── list-viewer → 索引列表 + 头/尾插入
    │   ├── set-viewer → 成员列表
    │   ├── zset-viewer → 带分数表格
    │   ├── stream-viewer → 消息列表
    │   └── json-viewer → 树形 / 原始 JSON
    └── 操作按钮：保存 / 重命名 / 复制 / 删除 / TTL / Diff
```

### 流程 3：监控服务器

```
侧边栏点击 Monitor ── 新增 monitor Tab
    │
    ▼
Monitor 页面 Tabs
    ├── 服务器信息：INFO 分区（Server/Clients/Memory/Stats/Replication/Keyspace）+ 关键指标卡片
    ├── 实时图表：recharts 折线图（ops/sec、内存、连接数、命中率），1s/2s/5s/10s 可调
    ├── 慢查询：SLOWLOG GET 列表 + 阈值设置 + 清空
    └── MONITOR 日志：实时 MONITOR 命令输出
```

### 流程 4：应用更新

```
启动后延迟 5 秒检查（24h 内不重复）
    │
    ▼
发现新版本 ── 弹出 UpdateDialog
    ├── 版本号 + Release Notes（Markdown，含错误边界降级为纯文本）
    ├── 「立即下载」── Progress 进度 + 已下载/总大小
    ├── 下载失败 ── 错误信息 + 重试（进度从 0% 重新计算）
    └── 下载完成 ── 「立即重启」── relaunchApp
```

## 交互逻辑

- **Tab 模式**：Browser Tab 始终存在不可关闭；CLI/Monitor/PubSub/Settings Tab 可创建/关闭；断开连接时自动关闭所有可关闭 Tab 并回到 Browser。
- **断开连接的状态清理**：断开时清空 browser store（key 列表、keyInfo）、重置 CLI/Monitor/PubSub Store，避免脏数据残留。
- **DB 切换**：点击侧边栏 db 子项触发 `resetBrowser()`；**点击当前已激活的同一 db 不做任何操作**（v0.2.3 修复，避免数据消失）。
- **Key 列表局部更新**：新增 / 复制 / 重命名 / 删除 Key 后**只更新本地状态**，不触发整库重新扫描，避免列表区域闪烁（v0.2.4 引入）。
- **过滤交互（v0.2.7 改版）**：Key 过滤默认改为**前端过滤**——回车后只在已加载列表内匹配，不再请求后端 SCAN；扫描期间禁用过滤输入。
- **危险操作**：所有删除 / 批量删除 / FLUSH 类操作走 `ConfirmDangerDialog`；FLUSHDB / FLUSHALL 要求输入确认文本。
- **输入框**：全局关闭 autoCapitalize / autoCorrect / spellCheck，避免 Key 名/值被系统输入辅助改写。
- **TTL 倒计时**：归零时**自动标记 Key 已过期**，UI 切换到过期提示状态（v0.2.3 修复，不再停在 "0s"）。
- **快捷键（10 个）**：⌘N 新建连接 / ⌘T 新 CLI Tab / ⌘F 聚焦搜索 / ⌘R 刷新视图 / ⌘K 命令面板 / ⌘D 删除选中 Key / ⌘S 保存编辑 / ⌘, 设置 / F5 刷新 Key 列表 / Delete 或 Backspace 删除选中。
- **主题与语言**：跟随系统 + 手动切换；偏好 localStorage 持久化；JSON 高亮和编辑器样式跟随主题切换。

## 数据安全约束

- 不记录密码、Master Key、私钥内容到日志。
- `.env`、签名密钥、`master-key` 文件不进入版本控制（`.gitignore` 已配置）。
- 修改更新、文件系统、进程调用、Redis 连接逻辑时，PR 描述必须说明安全影响（AGENTS.md 要求）。
- Tauri capabilities 最小权限：仅 `default.json` 中已批准的权限可用，新增需保持最小范围。
