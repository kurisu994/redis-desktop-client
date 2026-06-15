# 系统架构与模式约定

## 架构总览

```
┌────────────────────────────────────────────────────────────────┐
│                       Tauri Window (1440×900)                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Next.js 16 Frontend (static export)          │   │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌─────────┐  │   │
│  │  │ Browser  │  │   CLI     │  │ Monitor  │  │ PubSub  │  │   │
│  │  └──────────┘  └───────────┘  └──────────┘  └─────────┘  │   │
│  │  Zustand × 6 | shadcn/ui | Tailwind 4 | i18next | sonner │   │
│  └────────────────────┬─────────────────────────────────────┘   │
│                       │  Tauri IPC `invoke` + Event             │
│  ┌────────────────────┴─────────────────────────────────────┐   │
│  │                Rust Backend (tokio + redis-rs 0.29)       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐ │   │
│  │  │  commands/ │  │   redis/   │  │      config/        │ │   │
│  │  │ 9 modules  │  │  client +  │  │  AES-256-GCM Store  │ │   │
│  │  │            │  │   types    │  │  + Master Key       │ │   │
│  │  └────────────┘  └────────────┘  └─────────────────────┘ │   │
│  │  Plugins: store, dialog, fs, opener, process, updater    │   │
│  └────────────────────┬─────────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                ┌─────────┴──────────────────────┐
                │  Redis Server(s) (Standalone / │
                │  Sentinel / Cluster / TLS)     │
                └────────────────────────────────┘
```

## 实际目录结构

```
redis-desktop-client/
├── src/                              # Next.js 前端
│   ├── app/                          # App Router（layout / page / globals.css / favicon）
│   ├── components/
│   │   ├── browser/                  # 数据浏览器
│   │   │   ├── data-browser.tsx      # 浏览器主入口
│   │   │   ├── key-list.tsx          # 平铺视图（virtuoso）
│   │   │   ├── key-tree.tsx          # 树形视图
│   │   │   ├── key-toolbar.tsx       # 工具栏（db / 过滤 / 视图切换 / 新建）
│   │   │   ├── key-detail.tsx        # 详情面板（KeyInfo + ValueViewer 路由）
│   │   │   ├── key-dialog.tsx        # 新建 Key
│   │   │   ├── ttl-dialog.tsx
│   │   │   ├── export-dialog.tsx     # Key 数据导出
│   │   │   ├── import-dialog.tsx     # Key 数据导入
│   │   │   └── viewers/              # 按类型拆分的值查看/编辑器
│   │   │       ├── value-viewer.tsx          # 路由入口（按类型分发，~110 行）
│   │   │       ├── string-viewer.tsx
│   │   │       ├── hash-viewer.tsx
│   │   │       ├── list-viewer.tsx
│   │   │       ├── set-viewer.tsx
│   │   │       ├── zset-viewer.tsx
│   │   │       ├── stream-viewer.tsx
│   │   │       ├── json-viewer.tsx           # RedisJSON
│   │   │       ├── table-view.tsx            # 表格通用组件
│   │   │       ├── value-format-editor.tsx   # 多格式编辑器
│   │   │       ├── json-highlight-editor.tsx # JSON 高亮叠层
│   │   │       ├── json-validation-error.tsx
│   │   │       ├── add-field-dialog.tsx
│   │   │       └── value-editor-utils.ts
│   │   ├── cli/                      # CLI 终端
│   │   │   ├── cli-console.tsx
│   │   │   ├── command-input.tsx
│   │   │   └── terminal-output.tsx
│   │   ├── connection/               # 连接管理
│   │   │   ├── connection-dialog.tsx
│   │   │   ├── export-connections-dialog.tsx
│   │   │   └── import-connections-dialog.tsx
│   │   ├── layout/                   # 布局
│   │   │   ├── title-bar.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── sidebar-nav-button.tsx
│   │   │   ├── connection-item.tsx
│   │   │   ├── tab-bar.tsx
│   │   │   ├── settings-page.tsx
│   │   │   ├── welcome-page.tsx
│   │   │   └── language-switcher.tsx
│   │   ├── monitor/                  # 服务器监控
│   │   │   ├── monitor-page.tsx
│   │   │   ├── server-info.tsx
│   │   │   ├── realtime-charts.tsx
│   │   │   ├── slow-log.tsx
│   │   │   └── log-panel.tsx         # MONITOR 日志
│   │   ├── pubsub/                   # 发布订阅
│   │   │   ├── pubsub-page.tsx
│   │   │   └── message-list.tsx
│   │   ├── ui/                       # shadcn/ui 基础组件（18 个）
│   │   ├── providers.tsx             # 主题 + Tooltip + Toast + i18n
│   │   ├── error-boundary.tsx
│   │   ├── command-palette.tsx       # ⌘K
│   │   ├── confirm-danger-dialog.tsx
│   │   └── update-dialog.tsx
│   ├── hooks/
│   │   ├── use-global-shortcuts.ts
│   │   ├── use-connection-drag.ts
│   │   └── use-update-checker.ts
│   ├── stores/                       # Zustand × 6
│   │   ├── app-store.ts              # Tab 管理 / 视图模式 / 主题 / 语言
│   │   ├── connection-store.ts       # 连接列表 / 当前连接 / dialog 状态
│   │   ├── browser-store.ts          # Key 列表 / 选中 / 收藏 / 过滤
│   │   ├── cli-store.ts              # CLI Tab 历史 / 输出
│   │   ├── monitor-store.ts          # INFO / 实时指标 / 慢查询
│   │   └── pubsub-store.ts           # 订阅列表 / 消息列表 / 暂停状态
│   ├── lib/
│   │   ├── tauri-api.ts              # Tauri IPC 封装（含浏览器 mock）
│   │   ├── update-settings.ts        # 更新代理配置
│   │   └── utils.ts                  # cn() 等
│   └── i18n/
│       ├── index.ts                  # i18next 配置 + LanguageDetector
│       └── locales/
│           ├── en-US.json
│           └── zh-CN.json
├── src-tauri/                        # Rust 后端
│   ├── src/
│   │   ├── main.rs                   # binary 入口
│   │   ├── lib.rs                    # 插件注册 + Command 注册
│   │   ├── commands/                 # 9 个 Tauri Command 模块
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs         # connect/disconnect/save/list/test
│   │   │   ├── keys.rs               # SCAN / 新建 / 重命名 / 复制 / 删除 / TTL
│   │   │   ├── values.rs             # 按类型读写
│   │   │   ├── cli.rs                # execute_command
│   │   │   ├── server.rs             # get_server_info / start_monitor / slowlog
│   │   │   ├── pubsub.rs             # subscribe/unsubscribe/publish
│   │   │   ├── data.rs               # Key 数据导入导出
│   │   │   └── export.rs             # 连接配置导入导出
│   │   ├── redis/
│   │   │   ├── mod.rs
│   │   │   ├── client.rs             # RedisClientManager 连接池
│   │   │   └── types.rs              # IpcResponse<T> / 数据类型
│   │   └── config/
│   │       ├── mod.rs
│   │       ├── store.rs              # ConnectionStore（connections.json）
│   │       └── encryption.rs         # AES-256-GCM
│   ├── capabilities/default.json     # Tauri 权限清单
│   ├── icons/                        # 应用图标
│   ├── Cargo.toml
│   └── tauri.conf.json
├── scripts/
│   ├── bump-version.js
│   ├── preinstall.js
│   └── verify-commit.js              # Conventional Commits 校验（Husky）
├── docs/
│   ├── REQUIREMENTS.md
│   └── DEVELOPMENT_PLAN.md
├── public/                           # 静态资源
├── out/                              # Next.js 静态导出产物（Tauri 加载源）
├── justfile                          # 统一命令入口
├── components.json                   # shadcn 配置
├── next.config.ts                    # output: 'export'
├── eslint.config.mjs
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

## 前端设计模式

- **Next.js 静态导出**：`next.config.ts` 设置 `output: 'export'`，构建产物落在 `out/`，由 Tauri 加载（不跑 Next Server）。
- **状态管理**：6 个 Zustand Store 按**功能域**拆分（app / connection / browser / cli / monitor / pubsub），每个 Store 内封装领域内的状态 + actions；跨域操作通过组件层调度，不在 Store 之间直接耦合。
- **IPC 封装层**：所有 Tauri IPC 调用统一走 `lib/tauri-api.ts`，提供 Mock 实现支持浏览器环境调试（`just dev-web`）。
- **组件拆分**：值查看器按数据类型拆分独立模块（`viewers/` 子目录），`value-viewer.tsx` 退化为路由分发（v0.2.3 重构，从 1783 行拆为 14 个文件）。
- **shadcn/ui + Tailwind 4**：组件用 `pnpm dlx shadcn add`，全部纳入 `components/ui/`；Tailwind 4 CSS-first 配置写在 `app/globals.css`。
- **国际化**：i18next + react-i18next，翻译资源按模块分 key（common / connection / browser / cli / monitor / pubsub / settings / update 等），LanguageDetector 自动持久化偏好。
- **错误边界**：根级 `ErrorBoundary` 捕获渲染异常 + 降级 UI；`ReleaseNotesMarkdown` 单独包错误边界，异常时降级为纯文本（v0.2.8）。
- **快捷键**：`use-global-shortcuts.ts` 统一注册；搜索框带 `data-search-input` 属性确保 ⌘F 聚焦正确。
- **虚拟滚动**：所有大列表（Key 列表 / Pub/Sub 消息）使用 `react-virtuoso`。
- **图表**：`recharts` 折线图，监控页 4 个核心指标。
- **Toast**：`sonner` 统一通知（连接成功 / 失败 / 操作结果）。

## 后端设计模式

- **统一响应结构**：所有 Tauri Command 返回 `IpcResponse<T>`，前端 IPC 封装层统一处理 ok/err。
- **错误信息走 i18n key**：Rust 端不返回语言文本，返回 i18n key 由前端翻译。
- **连接池**：`RedisClientManager` 用 `HashMap<connection_id, MultiplexedConnection> + Mutex` 管理多连接；Pub/Sub 使用**独立连接**（非复用），通过 `redis://pubsub` Event 向前端推送消息。
- **加密**：密码用 **AES-256-GCM** 加密；Master Key 在首次启动生成并持久化到独立 `master-key` 文件，不与 `connections.json` 混存。
- **异步**：所有 Redis 操作走 `tokio` 异步运行时；后台监控/订阅任务通过 `tauri::async_runtime::spawn`，注意任务句柄管理避免泄漏（v0.2.3 修复过 MONITOR 任务泄漏）。
- **TLS 切换**：`client.rs` 根据连接配置自动切换 `redis://` / `rediss://`。
- **Tauri Event 通道**：`redis://pubsub`（Pub/Sub 消息）、`redis://monitor`（实时指标）、`redis://import-progress` / `redis://export-progress`（导入导出进度）、`redis://update-progress`（更新下载进度）。

## 数据存储

- **连接配置**：`{AppData}/connections.json`（密码 AES-256-GCM 加密）。
- **Master Key**：`{AppData}/master-key`（独立文件，应用启动时自动生成）。
- **用户偏好**：`localStorage`（主题、语言、命名空间分隔符、自动更新开关、更新代理）。
- **Tauri Store**：`@tauri-apps/plugin-store` 用于其它需要持久化的状态。
- 数据库：**不使用本地数据库**；所有持久化都是 JSON 文件 + localStorage。

## ❌ 负向约束（不要做的事）

- ❌ **不要在 Store 之间直接互调**：跨域操作在组件层调度，避免循环依赖。
- ❌ **不要硬编码中文/英文文案**：所有 UI 文案必须走 i18n key；新增 key 必须同步 `en-US.json` 和 `zh-CN.json`，`just i18n-check` 校验通过。
- ❌ **不要在 Rust 后端返回语言文本**：错误信息返回 i18n key，前端负责翻译。
- ❌ **不要使用原生 `confirm()` / `alert()`**：危险操作统一走 `ConfirmDangerDialog`；FLUSH 类需输入确认文本。
- ❌ **不要在 Key 列表变更后触发整库重新扫描**：新增 / 复制 / 重命名 / 删除应**局部更新本地状态**（v0.2.4 改进）。
- ❌ **不要绕过签名校验做应用更新**：Tauri Updater 的 Ed25519 公钥写在 `tauri.conf.json`，不可移除。
- ❌ **不要让 Monaco / 大值组件共享同一 model**：用独立 `path` prop 隔离（v0.2.1 修复 Hex 切换数据丢失）。
- ❌ **不要在表格视图全量加载**：Hash/List/Set/ZSet/Stream 必须服务端分页（每页 200 条）。
- ❌ **不要扩展 Tauri capabilities 超过最小范围**：新增权限需在 PR 描述说明安全影响。
- ❌ **不要提交 .env、签名密钥、`master-key`**：已在 `.gitignore`；构建时通过 `set dotenv-load` 由 justfile 加载。
- ❌ **不要为前端写测试**：暂未配置前端测试框架，仅 Rust 端 `cargo test`；前端行为变更靠 `just lint` + `just dev` 手动验证。
- ❌ **不要在数据库设计中使用外键**：本项目无数据库，但全局规则同样适用——表关联由代码逻辑、索引和校验控制。
- ❌ **不要在输入框开启 autoCapitalize / autoCorrect / spellCheck**：全局关闭，避免改写 Key 名/值。
- ❌ **不要使用 `find` / `grep` / `cat` / `ls`**：开发协作中用 `fd` / `rg` / `bat` / `eza` 替代（CLAUDE.md 全局规则）。

## 关联记忆

- 业务上下文与用户流 → [[productContext]]
- 技术栈版本号 → [[techContext]]
- 架构演进历史 → [[progress]]
