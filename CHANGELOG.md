# Changelog

本文件记录 Redis Desktop Client 的所有版本变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/)，遵循[语义化版本](https://semver.org/)。

---

## [Unreleased]

> 🔄 集成应用内自动更新机制。

### ✨ 新功能

#### 应用自动更新（Tauri Updater Plugin）
- 集成 `@tauri-apps/plugin-updater`（Rust + JS），支持应用内检查/下载/安装更新
- 集成 `@tauri-apps/plugin-process`，更新完成后支持自动重启应用
- 配置 Ed25519 签名密钥，构建时自动签名更新包（`.sig` 文件）
- 更新源指向 GitHub Releases 的 `latest.json`（由 `tauri-action` 自动生成）
- 前端 API 封装：`checkUpdate()` / `downloadAndInstallUpdate()` / `relaunchApp()`
- Windows 更新安装模式配置为 `passive`（带进度条静默安装）
- `tauri.conf.json` 配置 `createUpdaterArtifacts: true`，构建时自动生成更新产物
- Capabilities 添加 `updater:default` + `process:default` 权限

---

## [0.3.0] — 2026-03-26

> 🔧 值编辑器交互重构 + 性能优化，提升大值场景下的用户体验。

### ✨ 新功能

#### 值编辑器表格交互重构
- Hash/List/Set/ZSet 表格行值截断为单行显示，超出部分以 `...` 省略
- 鼠标悬浮显示完整值（Tooltip）
- 单击表格行展开/收起完整值
- 双击表格行打开编辑弹窗
- Stream 表格行同样支持单击展开（不可编辑）

#### Monaco Editor 自定义右键菜单
- 禁用 Monaco Editor 默认右键菜单（所有实例）
- JSON 模式下新增"格式化 JSON"自定义右键菜单项
- 支持 StringViewer（动态检测当前格式）和 JsonViewer（始终启用）

### 🔧 改进

#### 性能优化
- Hex dump 使用 `useMemo` 缓存计算结果，避免格式切换时重复计算
- Hex dump 增加最大字节限制（256KB），超出部分截断并提示
- 大字符串（>50KB）自动优化 Monaco Editor 选项（禁用 wordWrap、folding、occurrencesHighlight 等高开销功能）
- Hex/主编辑器使用独立 `path` prop，避免 Monaco model 冲突

#### Hex 切换数据还原修复
- 修复 Hex 模式切回 JSON 等格式时数据丢失的问题
- 根因：Monaco Editor 条件渲染时不同编辑器共享同一 model
- 解决：为 Hex 视图和主编辑器分配不同的 `path`，确保 model 隔离

#### 树形视图缩进优化
- Key 树形视图每层缩进改为固定值（~1 字符宽度），不再随深度线性增长
- 减少深层 Key 的水平空间占用

#### 表格行操作简化
- 移除 Hash/List/Set/ZSet 表格行的编辑图标按钮
- 编辑操作统一通过双击行触发，保留删除按钮

#### 表格分页加载
- Hash/List/Set/ZSet/Stream 表格支持服务端分页，每页 200 条
- List/ZSet 使用索引分页（LRANGE/ZRANGE），支持任意跳页
- Hash/Set 使用 SCAN 游标分页，后端循环迭代确保每页数据量达标
- Stream 使用 ID 边界分页（XRANGE 排他起始 ID）
- 分页控件显示"第 X-Y 条 / 共 N 条"及上一页/下一页按钮
- 解决大数据量场景（List/ZSet 全量加载、Set/Hash 单次 SCAN）导致的界面卡顿

## [0.2.0] — 2026-03-09

> 🎯 新增常用命令面板和补充快捷键，提升操作效率。

### ✨ 新功能

#### 常用命令面板
- ⌘K 打开命令面板，可快速搜索并执行常用操作
- 预置 4 类命令：连接管理、浏览器操作、页面导航、通用设置
- 支持模糊搜索匹配，显示对应快捷键提示
- 基于 shadcn/ui Command 组件（cmdk）实现

#### 补充快捷键
- ⌘D — 删除选中 Key（含确认对话框）
- ⌘S — 保存当前编辑（String / RedisJSON 类型）
- F5 — 刷新 Key 列表（无需修饰键）
- Delete/Backspace — 删除选中 Key（非输入框焦点时触发，含确认对话框）

### 🔧 改进

- 设置页快捷键列表更新，展示全部 10 个快捷键
- 搜索框添加 `data-search-input` 属性，确保 ⌘F 聚焦正确

## [0.1.0] — 2026-03-05

> 🎉 首个开发版本，完成全部核心功能（Phase 1 ~ Phase 6）。

### ✨ 新功能

#### 连接管理
- 支持创建、编辑、复制、删除 Redis 连接配置
- 支持连接测试（PING 验证 + 延迟展示）
- 连接状态实时指示（已连接 / 未连接 / 连接中）
- 连接配置加密持久化存储（AES-256-GCM）
- 右键上下文菜单（连接/断开/编辑/复制/删除）
- SSL/TLS 连接支持（`rediss://` 协议自动切换）
- SSH 隧道 / Sentinel / Cluster 连接 UI 配置表单
- 连接配置导入/导出（JSON 格式，支持冲突策略：跳过/覆盖/重命名）

#### 数据浏览器
- Key 浏览器：树形视图（按 `:` 分隔符命名空间分组）+ 平铺视图，一键切换
- 支持全部 7 种 Redis 数据类型的查看与编辑：String、Hash、List、Set、Sorted Set、Stream、RedisJSON（JSON.GET/SET + JSONPath 子路径查询）
- 基于 SCAN 的分页 Key 扫描 + 通配符模式搜索
- 虚拟滚动（react-virtuoso），支持大量 Key 流畅浏览
- 数据库切换（db0 ~ db15），显示各 db 的 Key 数量
- 支持自定义命名空间分隔符（默认 `:`）
- Key 管理操作：新建 / 重命名 / 复制 / 删除（含批量） / TTL 设置与移除
- Key 信息面板：类型、TTL、大小、编码方式
- Monaco Editor 值编辑器：11 种语法高亮（JSON / XML / YAML / HTML / CSS / JS / TS / SQL / Markdown / Hex / 纯文本），自动格式检测，主题跟随
- 一键复制 Key 名称或值到剪贴板
- Key 数据导入/导出（JSON 格式，含冲突策略 + 进度条）
- 大值延迟加载：String 值 > 1MB 时先预览前 1KB，按需完整加载
- 批量操作工具栏：多选 Key（checkbox）后显示浮动操作栏（批量删除 / 批量导出 / 全选）
- 收藏/标记 Key：⭐标记常用 Key，支持"仅显示收藏"筛选，收藏数据按连接持久化
- Diff 对比视图：Monaco Diff Editor 展示编辑前后差异，值有修改时可一键切换

#### CLI 控制台
- 内置 Redis CLI 终端（自定义轻量组件）
- 命令自动补全（100+ Redis 命令字典）+ 参数格式提示
- 命令历史记录（上/下箭头翻阅，每个 Tab 独立）
- 多 Tab 会话支持
- 命令结果按类型着色（ok / error / integer / bulk / nil / array）
- 清屏（Ctrl+L 或 `CLEAR`/`CLS` 命令）

#### 服务器监控
- INFO 命令结构化展示（Server、Clients、Memory、Stats、Replication、Keyspace）
- 关键指标卡片（Redis 版本、运行时间、内存使用、客户端数、Key 总数）
- 实时性能图表（recharts）：ops/sec、内存使用、连接数、命中率
- 可配置刷新间隔（1s / 2s / 5s / 10s）+ 暂停/继续
- 慢查询日志管理：列表查看、阈值设置（`CONFIG SET`）、清空（`SLOWLOG RESET`）

#### 发布/订阅 (Pub/Sub)
- 频道/模式订阅与取消订阅
- 消息实时列表（虚拟滚动），展示时间戳 + 频道 + 内容
- 发布消息到指定频道
- 消息过滤与搜索（按频道或内容关键词）
- 暂停/继续接收消息（不断开订阅连接）

#### 用户体验
- 深色/浅色主题切换（默认深色，oklch 色彩空间紫色/紫罗兰主色调）
- 中英文国际化（i18next，跟随系统语言 + 手动切换 + 持久化）
- 全局快捷键：⌘N（新建连接）/ ⌘T（CLI）/ ⌘F（搜索）/ ⌘R（刷新）/ ⌘⌫（删除 Key）/ ⌘,（设置）
- Tab 页签式主内容区管理（Browser 始终存在，其余可创建/关闭）
- Toast 通知（sonner）
- 错误边界（渲染异常降级 UI + 错误详情）
- 敏感操作确认对话框（FLUSHDB / FLUSHALL 需输入确认文本）
- 设置页面：主题切换、语言切换、快捷键说明、版本信息

### 🏗️ 基础设施

- **桌面框架**：Tauri 2.x（Rust 后端 + Next.js 前端）
- **前端**：Next.js 16 (Turbopack) + React 19 + TypeScript + shadcn/ui + Tailwind CSS 4
- **状态管理**：Zustand 5（6 个功能域 Store）
- **后端**：Rust (Edition 2021) + Tokio 异步运行时 + redis-rs 0.29
- **代码编辑器**：Monaco Editor（@monaco-editor/react）
- **CI/CD**：GitHub Actions（ESLint + tsc + Clippy + 三平台构建 + Release 流水线）
- **代码规范**：ESLint + Prettier + Clippy + Conventional Commits（Husky）
- **命令入口**：justfile 统一管理（dev / build / lint / fmt / test / i18n-check）
- **版本管理**：bump-version.js 同步 package.json / Cargo.toml / tauri.conf.json

### 🔲 已知待办

- SSH 隧道后端实现（Rust `russh` 库）
- 更新检查逻辑（启动时检查 + 可配置检查频率）+ 更新提示 UI（发现新版本弹窗）
- macOS / Windows 代码签名
- 连接分组（文件夹拖拽排序）
