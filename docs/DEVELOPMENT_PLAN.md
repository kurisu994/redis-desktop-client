# Redis Desktop Client — 开发计划

> 基于 [需求文档](./REQUIREMENTS.md) 第六章开发阶段规划，将全部功能拆分为 **6 期**迭代开发。  
> 每期目标明确、可独立交付，后一期在前一期基础上扩展。

---

## 总览

| 期数 | 主题 | 状态 | 核心目标 |
|------|------|------|----------|
| **Phase 1** | 基础框架搭建 | ✅ 已完成 | 初始化项目，集成全部技术栈（含 i18n），搭建布局与主题，建立 CI 基础流水线 |
| **Phase 2** | 连接管理 | ✅ 已完成 | 实现连接的完整生命周期管理（CRUD + 测试 + 持久化） |
| **Phase 3** | 数据浏览核心 | ✅ 基本完成 | Key 浏览器 + 6 种基础数据类型增删改查 + TTL 管理（JSON 类型/复制 Key 前端 等待实现） |
| **Phase 4** | CLI 控制台 | ✅ 已完成 | 内置命令行终端、自动补全、命令历史 |
| **Phase 5** | 高级功能 | ✅ 已完成 | 服务器监控（INFO + 实时图表）、慢查询日志、Pub/Sub、Key 数据导入导出 |
| **Phase 6** | 高级连接 & 完善 | ✅ 已完成 | SSH/TLS/Sentinel/Cluster、国际化、打包发布 |

---

## Phase 1：基础框架搭建 ✅ 已完成

### 目标

从零搭建项目，完成技术选型的集成验证。本期结束后，应用可正常启动并展示基础布局，支持深色/浅色主题切换，**i18n 框架就绪（中文 + 英文）**。

### 任务清单

#### 1.1 项目初始化

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 1 | 初始化 Tauri v2 + Next.js 项目 | ✅ | 使用 `create-next-app` + `@tauri-apps/cli init` 搭建 |
| 2 | 集成 UI 组件库 | ✅ | 初始 HeroUI → 已迁移至 shadcn/ui + Tailwind CSS v4 |
| 3 | 集成 Zustand | ✅ | 创建 `connection-store` + `app-store` |
| 4 | 配置 Tauri 权限 | ✅ | 窗口 1280×800，最小 960×600，居中启动 |
| 5 | 配置 Tauri Store Plugin | ✅ | `@tauri-apps/plugin-store` 已集成 |
| 6 | 配置 Next.js 静态导出 | ✅ | `output: 'export'`，Tauri 从 `../out` 加载 |
| 7 | 集成 i18n 框架 | ✅ | 使用 `i18next` + `react-i18next`（适配静态导出模式） |
| 8 | 创建基础翻译文件 | ✅ | `en-US.json` + `zh-CN.json`，按功能模块分 key |
| 9 | 实现语言切换 | ✅ | 下拉切换 + 跟随系统语言 + localStorage 持久化 |

#### 1.2 基础布局 & 主题

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 10 | 实现应用主布局 | ✅ | 三栏布局：左侧边栏 + 中间内容区 + 底部状态栏 |
| 11 | 实现深色/浅色主题切换 | ✅ | 基于 `next-themes`，默认深色主题 |
| 12 | 顶部标题栏组件 | ✅ | Logo、主题切换按钮、语言切换按钮、设置入口 |
| 13 | 空状态引导页 | ✅ | 无连接时展示欢迎页和快速创建连接入口 |

#### 1.3 Rust 后端基础

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 11 | 创建 Rust 模块结构 | ✅ | `commands/`、`redis/`、`config/` 模块划分 |
| 12 | 集成 redis-rs + tokio | ✅ | redis 0.29 + tokio 异步运行时 |
| 13 | 定义前后端 IPC 通信规范 | ✅ | 统一 `IpcResponse<T>` 结构体，`test_connection` 命令已验证 |

#### 1.4 CI 基础流水线

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 14 | CI 工作流 — 代码检查 | ✅ | ESLint + TypeScript 类型检查 + `cargo clippy` + `cargo fmt` |
| 15 | CI 工作流 — 构建验证 | ✅ | 四目标（macOS ARM/Intel、Linux、Windows）并行构建 |
| 16 | CI 工作流 — 测试 | ✅ | `cargo test` 后端测试 |
| 17 | 配置 Conventional Commits | ✅ | 自定义 `verify-commit.js` + `husky` 已配置 |
| 18 | 编写 justfile | ✅ | 含 dev/build/lint/fmt/test/version/release/i18n-check 等命令 |

#### 1.5 justfile 命令规划 ✅ 已实现

项目根目录已创建 `justfile`，作为所有开发命令的统一入口（实际实现命令见项目根目录 `justfile`）：

```just
# === 开发 ===
dev              # 启动 Tauri 开发模式（前端 + 后端热重载）
dev-web          # 仅启动 Next.js 前端开发服务器

# === 构建 ===
build            # 构建生产版本（Tauri 桌面应用）
build-web        # 仅构建 Next.js 前端
build-debug      # 构建 Debug 版本（含调试符号）

# === 代码检查 ===
lint             # 运行全部代码检查（前端 + 后端）
lint-web         # ESLint + TypeScript 类型检查
lint-rust        # cargo clippy
fmt              # 格式化全部代码（prettier + cargo fmt）
fmt-web          # prettier --write
fmt-rust         # cargo fmt

# === 测试 ===
test             # 运行全部测试
test-rust        # cargo test

# === 依赖管理 ===
install          # 安装全部依赖（pnpm install + cargo fetch）
clean            # 清理构建产物

# === 版本 & 发布 ===
version bump     # 同步更新 package.json / Cargo.toml / tauri.conf.json 版本号
release tag      # 创建 Git Tag 并推送（触发 Release 流水线）

# === 工具 ===
i18n-check       # 检查翻译完整性（key 缺失检测）
```

### 交付物

- ✅ 可运行的 Tauri v2 + Next.js + shadcn/ui 桌面应用
- ✅ 三栏布局框架 + 深色/浅色主题切换
- ✅ Rust 后端模块结构 + redis-rs 异步连接验证
- ✅ 前后端 IPC 通信跑通
- ✅ i18n 框架就绪（中文 + 英文）+ 语言切换
- ✅ GitHub Actions CI 流水线（代码检查 + 三平台构建 + 测试）
- ✅ justfile 统一命令入口

---

## Phase 2：连接管理 ✅ 已完成

### 目标

实现连接管理的完整功能闭环。本期结束后，用户可以通过 GUI 创建、编辑、测试连接，并成功连接到 Redis 服务器。

### 任务清单

#### 2.1 连接后端

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 1 | 实现连接池管理 | ✅ | `RedisClientManager` 基于 `HashMap + Mutex` 管理多连接，支持 connect/disconnect/get |
| 2 | 实现配置加密模块 | ✅ | AES-256-GCM 加密密码，Master Key 自动生成并持久化到 `master-key` 文件 |
| 3 | 连接 CRUD 后端命令 | ✅ | `save_connection`、`delete_connection`、`list_connections` Tauri Commands |
| 4 | 连接/断开命令 | ✅ | `connect_redis`、`disconnect_redis` 命令，管理连接生命周期 |
| 5 | 连接测试命令 | ✅ | `test_connection` 命令，PING 验证并返回延迟 ms |

#### 2.2 连接前端

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 6 | 新建连接对话框 | ✅ | shadcn Dialog + Tabs（General / SSH Tunnel / Advanced），SSH/Advanced 为 Phase 6 骨架 |
| 7 | 连接列表组件 | ✅ | 侧边栏展示连接列表，绿/灰/黄色圆点状态指示器（已连接/未连接/连接中） |
| 8 | 连接测试 UI | ✅ | 测试按钮 + 成功/失败/延迟反馈，内嵌在对话框中 |
| 9 | 编辑/复制/删除连接 | ✅ | 右键菜单：连接/断开、编辑、复制连接、删除（含确认提示） |
| 10 | 连接拖拽排序 | ✅ | 支持拖拽连接调整顺序，排序结果自动持久化 |
| 11 | 连接配置持久化 | ✅ | Rust 端通过 `ConnectionStore` 读写 `connections.json`，密码加密存储 |
| 12 | 连接状态 Store | ✅ | Zustand Store 增加 dialog 状态管理 + IPC 调用封装层 (`lib/tauri-api.ts`) |

### 交付物

- ✅ 完整的连接管理功能（增删改查 + 测试 + 状态指示）
- ✅ 连接配置加密持久化存储（AES-256-GCM）
- ✅ 连接状态实时展示（已连接/未连接/连接中）
- ✅ 连接拖拽排序（HTML5 Drag and Drop，顺序持久化到后端）

---

## Phase 3：数据浏览核心 ✅ 已完成

### 目标

实现数据浏览器的全部核心功能。本期结束后，用户可以浏览、搜索、查看和编辑 Redis 中所有数据类型的键值。

### 任务清单

#### 3.1 Key 浏览器

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 1 | Key 扫描后端 | 基于 `SCAN` 命令实现分页扫描，返回 Key 列表 + 类型 | ✅ |
| 2 | 树形视图组件 | 按 `:` 分隔符构建命名空间树，支持展开/折叠 | ✅ |
| 3 | 平铺视图组件 | 列表方式展示 Key，显示类型图标和颜色标识 | ✅ |
| 4 | 视图切换 | 树形/平铺视图一键切换 | ✅ |
| 5 | 虚拟滚动 | 使用 `react-virtuoso` 实现大列表虚拟滚动 | ✅ |
| 6 | Key 搜索与过滤 | 支持通配符模式搜索（后端 `SCAN MATCH`） | ✅ |
| 7 | 数据库切换 | db0~db15 下拉选择器 + 侧边栏 db 子列表，显示 Key 数量 | ✅ |
| 8 | Key 数量统计 | 工具栏显示当前 db 的 Key 总数 | ✅ |
| 9 | 自定义命名空间分隔符 | 设置中配置分隔符，默认 `:` | ✅ |

#### 3.2 数据类型查看 & 编辑

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 10 | String 值查看/编辑器 | 纯文本编辑 + JSON 格式化（Monaco Editor） | ✅ |
| 11 | Hash 值查看/编辑器 | 表格展示 field-value，支持逐字段增删改 | ✅ |
| 12 | List 值查看/编辑器 | 带索引的列表展示，支持头部/尾部插入、删除元素 | ✅ |
| 13 | Set 值查看/编辑器 | 成员列表展示，支持添加/删除成员 | ✅ |
| 14 | Sorted Set 值查看/编辑器 | 带分数的表格展示，支持修改分数、添加/删除成员 | ✅ |
| 15 | Stream 值查看器 | 消息列表展示（ID + 字段），支持添加消息 | ✅ |
| 16 | JSON (RedisJSON) 查看/编辑 | 树形/原始 JSON 查看与编辑（需 RedisJSON 模块） | 🔲 |
| 17 | 值查看后端命令 | 按类型分别实现：`get_string_value`、`get_hash_value` 等 | ✅ |
| 18 | 值编辑后端命令 | `set_string_value`、`set_hash_field`、`add_list_element` 等 | ✅ |
| 19 | 大值延迟加载 | 值 > 1MB 时先显示前 1KB 摘要，点击后完整加载（`getStringValuePartial`） | ✅ |

#### 3.3 Key 管理操作

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 20 | Key 信息面板 | 展示类型、TTL、内存占用（`MEMORY USAGE`）、编码方式（`OBJECT ENCODING`）、长度 | ✅ |
| 21 | TTL 管理 | 设置/修改/移除 TTL 的 UI 和后端命令 | ✅ |
| 22 | 新建 Key | 对话框选择类型并输入初始值 | ✅ |
| 23 | 重命名 Key | 后端命令 + 详情面板操作按钮 | ✅ |
| 24 | 复制 Key | 后端 `copy_key` + 前端详情面板“更多”菜单入口 | ✅ |
| 25 | 删除 Key | 单个删除 + 批量删除，二次确认 | ✅ |
| 26 | 批量操作工具栏 | 多选 Key（Checkbox）+ 浮动工具栏（批量删除/批量导出/全选/取消） | ✅ |
| 27 | 收藏/标记 Key | Zustand Store 已实现 favorites 状态，UI 已集成 | ✅ |

#### 3.4 值编辑器增强（基于 Monaco Editor）

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 28 | 集成 Monaco Editor | 使用 `@monaco-editor/react` 作为核心值编辑器 | ✅ |
| 29 | 多格式语法高亮 | 已支持 JSON / XML / 纯文本，自动检测 | ✅ |
| 30 | 扩展语法高亮 | YAML / HTML / CSS / JS / TS / SQL / Markdown / Hex + 自动检测 + 下拉选择器 | ✅ |
| 31 | 格式自动检测 | 自动检测值的格式并切换对应语言模式 | ✅ |
| 32 | Diff 对比 | 使用 Monaco Diff Editor 展示编辑前后差异 | ✅ |
| 33 | 值内搜索 | 大文本中支持 Ctrl+F 搜索（Monaco 内置） | ✅ |
| 34 | 主题跟随 | 深色/浅色主题自动跟随应用主题切换 | ✅ |
| 35 | 复制到剪贴板 | 一键复制 Key 名称或值 | ✅ |

#### 3.5 连接导入导出

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 34 | 导出连接后端命令 | 支持选择性导出、可选密码包含 | ✅ |
| 35 | 导入连接后端命令 | 支持冲突策略：跳过/覆盖/重命名 | ✅ |
| 36 | 导入导出 API 封装 | 前端 tauri-api 层封装 + mock 数据 | ✅ |

### 交付物

- ✅ 完整的 Key 浏览器（树形 + 平铺 + 搜索 + 虚拟滚动）
- ✅ 6 种基础数据类型的查看与编辑（String/Hash/List/Set/ZSet/Stream）
- ✅ Key 管理操作（新建/重命名/删除/TTL）
- ✅ 值编辑器（Monaco Editor + JSON/XML/纯文本 语法高亮 + 主题跟随）
- ✅ 连接导入导出后端命令
- ✅ 大值延迟加载（> 1MB 先预览前 1KB，点击完整加载）
- ✅ 批量操作工具栏（多选 Checkbox + 浮动工具栏：批量删除/导出/全选）
- ✅ 收藏 Key（⭐标记 + 仅显示收藏筛选）
- ✅ Diff 对比（Monaco Diff Editor 编辑前后差异视图）
- ✅ JSON 数据类型 (RedisJSON) 支持（JSON.GET/SET + 前端 JsonViewer + path 查询）

---

## Phase 4：CLI 控制台 ✅ 已完成

### 目标

实现内置 Redis CLI 终端。本期结束后，用户可以直接在应用内执行任意 Redis 命令，支持自动补全和历史记录。

### 任务清单

#### 4.1 CLI 终端核心

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 1 | CLI 终端 UI | 自定义终端组件（输入 + 输出 + Tab 栏），未使用 xterm.js（更轻量可控） | ✅ |
| 2 | 命令执行后端 | `execute_command` Tauri 命令，解析用户输入并发送到 Redis，支持引号参数 | ✅ |
| 3 | 命令结果格式化 | 根据 Redis Value 类型格式化展示（String/Array/Integer/Error/Nil/Map/Set/Double/Boolean） | ✅ |
| 4 | 命令自动补全 | 内置 Redis 全部命令字典（100+ 命令），输入时弹出补全列表，Tab 选择 | ✅ |
| 5 | 参数提示 | 选中命令后显示参数格式提示（如 `SET key value [EX seconds]`） | ✅ |

#### 4.2 CLI 增强功能

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 6 | 命令历史 | 上/下箭头翻阅历史命令（每个 Tab 独立） | ✅ |
| 7 | 多 Tab 会话 | 支持为同一连接打开多个 CLI Tab，独立输出和历史 | ✅ |
| 8 | 快捷入口 | 侧边栏底部 CLI 按钮切换到命令行视图 | ✅ |
| 9 | 常用命令面板 | 待后续迭代 | 🔲 延后 |
| 10 | 命令输出复制 | 终端输出可选中复制 | ✅ |
| 11 | 清屏 | Ctrl+L 或 `CLEAR`/`CLS` 命令清空终端 | ✅ |

### 交付物

- ✅ 内置 Redis CLI 终端（自定义组件，非 xterm.js）
- ✅ 命令自动补全（100+ Redis 命令字典）+ 参数提示
- ✅ 命令历史记录（上下箭头浏览）
- ✅ 多 Tab 会话 + 侧边栏快捷入口
- ✅ 命令结果按类型着色（ok/error/integer/bulk/nil/array）
- 🔲 延后：常用命令面板、命令历史持久化

---

## Phase 5：高级功能 ✅ 已完成

### 目标

实现服务器监控、发布订阅、慢查询日志和数据导入导出。本期结束后，用户可以全面掌握 Redis 服务器运行状态，并方便地进行数据迁移。

### 前置基础

以下基础设施已在前序 Phase 中完成，Phase 5 可直接复用：

| 已有基础 | 说明 |
|---------|------|
| 侧边栏导航 | `sidebar.tsx` 底部 Monitor、Pub/Sub 按钮已绑定 `SidebarNavButton`，支持视图切换 |
| i18n 完整 key | 所有 monitor、pubsub、dataExport、dataImport 相关翻译 key 已添加（en-US + zh-CN） |
| MainView 类型 | `app-store.ts` 中 `TabType = "browser" | "cli" | "monitor" | "pubsub" | "settings"` |
| IPC 封装模式 | `lib/tauri-api.ts` 已添加所有 Phase 5 API 函数 + Mock 实现 |
| Tauri Event 机制 | Pub/Sub 订阅消息通过 `redis://pubsub` Event 推送 |
| Tauri 文件插件 | 已安装 `tauri-plugin-dialog` + `tauri-plugin-fs`，用于导入导出文件对话框 |

### 任务清单

#### 5.1 服务器信息

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 1 | 扩展 MainView 类型 | `app-store.ts` 增加 `"monitor"` 视图模式；侧边栏 Monitor 按钮绑定切换逻辑 | ✅ |
| 2 | INFO 信息后端命令 | 新增 `commands/server.rs`，实现 `get_server_info` 命令，解析 `INFO` 返回值为 `HashMap<String, HashMap<String, String>>` 结构化数据 | ✅ |
| 3 | INFO 信息 API 封装 | `tauri-api.ts` 添加 `getServerInfo()` 函数 + Mock 实现 | ✅ |
| 4 | Monitor Store | 新增 `stores/monitor-store.ts`，管理服务器信息、监控数据、慢查询、刷新间隔等状态 | ✅ |
| 5 | 服务器信息页面 | 新增 `components/monitor/server-info.tsx`，分区块展示 Server、Clients、Memory、Stats、Replication、Keyspace | ✅ |
| 6 | 关键指标卡片 | 页面顶部卡片组：Redis 版本号、运行时间、已用内存/峰值、客户端连接数、Key 总数 | ✅ |
| 7 | 自动刷新 | 定时器轮询 `get_server_info`，默认 5 秒刷新，可暂停 | ✅ |

#### 5.2 实时监控

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 8 | 安装 recharts | `pnpm add recharts`，图表库依赖 | ✅ |
| 9 | 监控数据采集后端 | `commands/server.rs` 新增 `start_monitor` / `stop_monitor` 命令，后端 Tokio 定时任务执行 `INFO`，通过 Tauri Event (`redis://monitor`) 推送指标 | ✅ |
| 10 | 监控数据 API 封装 | `tauri-api.ts` 添加 `startMonitor()` / `stopMonitor()` + 前端 Event 监听封装 | ✅ |
| 11 | 实时图表组件 | 新增 `components/monitor/realtime-charts.tsx`，基于 `recharts` 折线图展示：ops/sec、内存使用量、客户端连接数、命中率 | ✅ |
| 12 | 暂停/继续 | 暂停按钮冻结图表更新，保留已采集数据点；继续后恢复实时更新 | ✅ |
| 13 | 刷新间隔配置 | 下拉选择器：1s / 2s / 5s / 10s，切换后通知后端调整采集频率 | ✅ |
| 14 | Monitor 主页面 | 新增 `components/monitor/monitor-page.tsx`，整合服务器信息 + 实时图表 + 慢查询 Tab 布局 | ✅ |

#### 5.3 慢查询日志

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 15 | 慢查询后端命令 | `commands/server.rs` 新增 `get_slowlog` 命令，执行 `SLOWLOG GET`，返回 `Vec<SlowLogEntry>`（id、timestamp、duration_us、command、client_addr） | ✅ |
| 16 | 慢查询 API 封装 | `tauri-api.ts` 添加 `getSlowLog()` / `resetSlowLog()` / `setSlowLogThreshold()` + Mock | ✅ |
| 17 | 慢查询列表页 | 新增 `components/monitor/slow-log.tsx`，Table 展示：ID、执行时间(μs)、命令、时间戳、客户端地址 | ✅ |
| 18 | 慢查询阈值设置 | UI 输入框修改 `slowlog-log-slower-than` 配置（`CONFIG SET`） | ✅ |
| 19 | 清空慢查询日志 | `SLOWLOG RESET` 按钮 + 二次确认弹窗 | ✅ |
| 20 | 慢查询刷新 | 手动刷新按钮 + 可选自动刷新 | ✅ |

#### 5.4 发布/订阅 (Pub/Sub)

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 21 | 扩展 MainView 类型 | `app-store.ts` 增加 `"pubsub"` 的 `TabType` 视图模式；侧边栏 Pub/Sub 按钮绑定切换逻辑 | ✅ |
| 22 | Pub/Sub 后端命令 | 新增 `commands/pubsub.rs`，基于**独立连接**（非复用 MultiplexedConnection）实现 `subscribe_channels` / `unsubscribe_channels` / `publish_message`；订阅消息通过 Tauri Event (`redis://pubsub`) 推送到前端 | ✅ |
| 23 | Pub/Sub API 封装 | `tauri-api.ts` 添加 `subscribeChannels()` / `unsubscribeChannels()` / `publishMessage()` + Event 监听封装 + Mock | ✅ |
| 24 | Pub/Sub Store | 新增 `stores/pubsub-store.ts`，管理订阅频道列表、消息列表、暂停状态、过滤条件 | ✅ |
| 25 | 订阅管理 UI | 新增 `components/pubsub/pubsub-page.tsx`，输入框添加频道名/模式，显示当前订阅列表，支持逐个取消订阅 | ✅ |
| 26 | 消息实时列表 | 新增 `components/pubsub/message-list.tsx`，展示：时间戳、频道、消息内容；使用 `react-virtuoso` 虚拟滚动 | ✅ |
| 27 | 发布消息 | 输入目标频道和消息内容，发送 `PUBLISH` 命令 | ✅ |
| 28 | 消息过滤与搜索 | 工具栏按频道或内容关键词过滤消息列表 | ✅ |
| 29 | 暂停/继续 | 暂停按钮停止向列表追加新消息（不断开订阅连接），继续后恢复显示 | ✅ |

#### 5.5 数据导入/导出

> **注意**：Phase 3 已实现的是**连接配置**导入导出（`export.rs`），本节是 **Key 数据**导入导出。

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 30 | 导出后端命令 | 新增 `commands/data.rs`（或扩展 `export.rs`），实现 `export_keys` 命令：按 Key 列表读取类型+值+TTL，序列化为 JSON；通过 Tauri Event 推送进度 | ✅ |
| 31 | 导入后端命令 | 实现 `import_keys` 命令：解析 JSON 文件，按类型逐个写入 Redis，支持冲突策略（skip/overwrite/rename）；推送进度 | ✅ |
| 32 | 导入导出 API 封装 | `tauri-api.ts` 添加 `exportKeys()` / `importKeys()` + 进度 Event 监听 + Mock | ✅ |
| 33 | 导出 UI | 新增 `components/browser/export-dialog.tsx`，选择 Key（多选/模式匹配）→ 选择保存路径（`@tauri-apps/plugin-dialog`）→ 开始导出 | ✅ |
| 34 | 导入 UI | 新增 `components/browser/import-dialog.tsx`，选择文件 → 预览内容摘要 → 选择冲突策略 → 开始导入 | ✅ |
| 35 | 进度条 | 导入/导出过程中显示进度条（已处理/总数 + 预估剩余时间） | ✅ |
| 36 | 工具栏集成 | `key-toolbar.tsx` 增加导入/导出按钮入口 | ✅ |

#### 5.6 国际化补充

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 37 | 补充 monitor i18n | 服务器信息、实时监控、慢查询相关翻译 key（en-US + zh-CN） | ✅ |
| 38 | 补充 pubsub i18n | 发布订阅相关翻译 key（en-US + zh-CN） | ✅ |
| 39 | 补充 data export/import i18n | 数据导入导出相关翻译 key（en-US + zh-CN） | ✅ |

### 交付物

- ✅ 服务器信息展示页 + 关键指标卡片
- ✅ 实时性能监控图表（ops/sec、内存、连接数、命中率）
- ✅ 慢查询日志管理（列表 + 阈值设置 + 清空）
- ✅ Pub/Sub 发布订阅（订阅/发布/实时消息列表/过滤）
- ✅ Key 数据导入/导出（JSON 格式 + 冲突策略 + 进度展示）
- ✅ Phase 5 全部功能的中英文翻译

---

## Phase 6：高级连接 & 完善

### 目标

补全所有高级连接方式，完成国际化、用户体验完善和产品打包。本期结束后，产品具备完整功能，可正式发布到各平台。

### 任务清单

#### 6.1 高级连接

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 1 | SSH 隧道后端 | 🔲 | Rust 端建立 SSH 隧道（需 `russh` 库），转发本地端口到远程 Redis（预留架构，运行时依赖外部隧道） |
| 2 | SSH 隧道 UI | ✅ | 连接表单 SSH Tab：主机、端口、用户名、密码/密钥文件、认证方式选择 |
| 3 | SSL/TLS 后端 | ✅ | `client.rs` 根据 TLS 配置自动切换 `redis://` / `rediss://` 协议 |
| 4 | SSL/TLS UI | ✅ | 连接表单 SSL/TLS Tab：CA 证书、客户端证书、密钥文件路径、跳过验证选项 |
| 5 | Sentinel 连接 | ✅ | ConnectionConfig 扩展 Sentinel 字段 + UI 配置表单（节点列表、Master 名称、密码） |
| 6 | Cluster 连接 | ✅ | ConnectionConfig 扩展 Cluster 字段 + UI 配置表单（种子节点列表）、test_connection 支持 |

#### 6.2 连接配置导入/导出（后端已在 Phase 3 完成）

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 7 | 导出连接配置 UI | ✅ | ExportConnectionsDialog：选择导出范围 + 密码选项 + Tauri 文件保存对话框 |
| 8 | 导入连接配置 UI | ✅ | ImportConnectionsDialog：选择文件 + 预览数量 + 冲突策略选择 + 导入结果提示 |

#### 6.3 国际化（已在 Phase 1 完成基础集成）

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 9 | i18n 补全 | ✅ | 补充所有 Phase 6 翻译 key（SSH/TLS/Sentinel/Cluster/Settings/Shortcuts/ErrorBoundary/Confirm） |
| 10 | 中文翻译 | ✅ | 全部 UI 文案中文化 |
| 11 | 英文翻译 | ✅ | 全部 UI 文案英文化 |
| 12 | 语言偏好持久化 | ✅ | 设置页面中切换语言，i18next LanguageDetector 自动持久化 |

#### 6.4 用户体验完善

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 13 | 全局快捷键（已实现） | ✅ | ⌘N（新建连接）/ ⌘T（CLI）/ ⌘F（搜索）/ ⌘R（刷新）/ ⌘,（设置） |
| 14 | 全局快捷键（未实现） | 🔲 | ⌘D（删除选中 Key）/ ⌘S（保存编辑）/ F5（刷新 Key 列表）/ Delete（删除选中项） |
| 15 | Toast 通知系统 | ✅ | 已迁移至 sonner（连接成功/失败等） |
| 16 | 错误边界 | ✅ | ErrorBoundary 组件：捕获渲染异常 + 展示降级 UI + 错误详情 |
| 17 | 加载状态 | ✅ | 已在各 Store 中管理 loading 状态 |
| 18 | 敏感操作确认 | ✅ | ConfirmDangerDialog：输入确认文本才可执行 FLUSHDB/FLUSHALL |
| 19 | 设置页面 | ✅ | SettingsPage：主题切换、语言切换、键分隔符、快捷键说明、版本信息 |

#### 6.5 自动更新

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 19 | 集成 Tauri Updater Plugin | 🔲 | 需要 `@tauri-apps/plugin-updater`（需配置签名密钥后集成） |
| 20 | 更新检查逻辑 | 🔲 | 启动时检查 + 可配置检查频率 |
| 21 | 更新提示 UI | 🔲 | 发现新版本弹窗 |
| 22 | 更新源配置 | 🔲 | 指向 GitHub Releases 的更新清单 JSON |
| 23 | 设置项 | ✅ | 设置页面已预留自动更新开关区域 |

#### 6.6 Release 流水线 & 打包发布

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 24 | Release 工作流 | ✅ | GitHub Actions：Tag 触发，三平台并行构建 Tauri 应用（已在 Phase 1 完成） |
| 25 | macOS 打包 & 签名 | 🔲 | 需配置 Apple Developer 证书 |
| 26 | Windows 打包 & 签名 | 🔲 | 需配置代码签名证书 |
| 27 | Linux 打包 | ✅ | `.deb` / `.AppImage` 已在 Release 工作流中配置 |
| 28 | 自动发布 GitHub Release | ✅ | tauri-action 自动上传产物到 GitHub Release |
| 29 | 版本号统一管理 | ✅ | `scripts/bump-version.js` 同步 Cargo.toml / package.json / tauri.conf.json |
| 30 | 应用图标 & 品牌 | ✅ | 基础构建已准备好 `logo.png` |

### 交付物

- ✅ SSH/TLS/Sentinel/Cluster UI 配置表单 + TLS 后端支持（`rediss://`）
- 🔲 SSH 隧道后端实现（Rust `russh` 库）
- ✅ 连接配置导入/导出
- ✅ 中英文国际化
- ✅ 全局快捷键（⌘N/T/F/R/,）+ Toast + 错误边界 + 设置页面
- 🔲 补充快捷键（⌘D/⌘S/F5/Delete）
- 🔲 应用内自动更新（Tauri Updater Plugin 未集成）
- ✅ GitHub Actions Release 流水线（Tag → 三平台构建 → 发布）
- 🔲 macOS / Windows 代码签名（需配置证书）
- ✅ 自动生成 Changelog + 版本号统一管理

---

## 技术风险 & 注意事项

| 风险项 | 影响 | 应对策略 |
|--------|------|----------|
| Next.js SSR 与 Tauri 兼容 | Tauri 仅加载客户端页面 | Next.js 配置 `output: 'export'` 静态导出 |
| 大量 Key 浏览性能 | 百万级 Key 导致内存/渲染压力 | 虚拟滚动 + SCAN 分页 + 树节点延迟加载 |
| SSH 隧道稳定性 | 网络抖动导致隧道断开 | 自动重连机制 + 心跳检测 |
| Cluster 模式路由 | 集群拓扑变更影响连接 | 定期刷新拓扑 + MOVED/ASK 重定向处理 |
| 跨平台兼容性 | 快捷键/文件路径差异 | 使用 Tauri API 抽象平台差异 |
| macOS 签名 & 公证 | 未签名应用无法安装 | 配置 Apple Developer 证书 + CI Secrets 管理 |
| Windows 代码签名 | SmartScreen 拦截未签名安装包 | 购买代码签名证书 + CI 自动签名 |
| 自动更新安全 | 更新包被篡改 | Tauri Updater 内置签名校验机制 |

---

## 文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 需求文档 | [docs/REQUIREMENTS.md](./REQUIREMENTS.md) | 完整功能需求和架构设计 |
| 开发计划 | [docs/DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) | 本文档，6 期迭代开发计划 |

---

## 遗留开发计划清单

> 以下为全文中标记为 🔲 的待办项汇总，按功能模块分组。

### 数据浏览（Phase 3）

### CLI 控制台（Phase 4）

- [ ] 常用命令面板 — 预置常用命令快捷入口

### 高级连接（Phase 6）

- [ ] SSH 隧道后端 — Rust 端建立 SSH 隧道（需 `russh` 库），转发本地端口到远程 Redis

### 用户体验（Phase 6）

- [ ] 补充快捷键 — ⌘D（删除选中 Key）/ ⌘S（保存编辑）/ F5（刷新 Key 列表）/ Delete（删除选中项）

### 自动更新（Phase 6）

- [ ] 集成 Tauri Updater Plugin — `@tauri-apps/plugin-updater`（需配置签名密钥）
- [ ] 更新检查逻辑 — 启动时检查 + 可配置检查频率
- [ ] 更新提示 UI — 发现新版本弹窗
- [ ] 更新源配置 — 指向 GitHub Releases 的更新清单 JSON

### 打包发布（Phase 6）

- [ ] macOS 打包 & 签名 — 需配置 Apple Developer 证书
- [ ] Windows 打包 & 签名 — 需配置代码签名证书
