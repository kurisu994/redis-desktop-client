# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 技术栈

Tauri 2 + Next.js 16（静态导出）+ React 19 + TypeScript + shadcn/ui + Tailwind CSS 4 + Zustand 5 + i18next，后端为 Rust（Tokio + redis-rs）。

## 常用命令

本项目使用 `just` 作为命令运行器，包管理器为 `pnpm`。

```bash
just dev          # 启动 Tauri 完整开发环境（前后端热重载）
just dev-web      # 仅启动 Next.js 前端（localhost:3000，含 mock 数据）
just lint         # ESLint + tsc --noEmit + cargo clippy
just lint-web     # pnpm lint + pnpm exec tsc --noEmit
just lint-rust    # cargo clippy --all-targets --all-features -- -D warnings
just fmt          # prettier + cargo fmt
just test-rust    # cargo test --all-features
just i18n-check   # 检查 en-US/zh-CN 翻译 key 完整性
just build        # 生产构建（桌面应用）
just clean        # 清理构建产物（out/ + .next/ + cargo clean）
```

## 架构概览

### 前端结构

应用为单页面（`src/app/page.tsx`），布局为：`TitleBar` + `Sidebar` + `TabBar` + 主内容区（`DataBrowser` / `CliConsole` / `MonitorPage` / `PubSubPage` / `SettingsPage` / `WelcomePage`），加上全局浮层 `ConnectionDialog`、`ErrorBoundary` 错误边界包裹主内容区。主内容区采用 Tab 页签管理（`browser` / `cli` / `monitor` / `pubsub` / `settings`），browser Tab 始终存在不可关闭，其余 Tab 可通过侧边栏按钮打开、通过 × 按钮关闭。设置入口在顶部 TitleBar 右侧，GitHub 仓库链接也在 TitleBar 中（通过 `tauri-plugin-opener` 打开外部链接）。

**State（`src/stores/`）**
- `app-store.ts`：全局 UI 状态（侧边栏折叠、Tab 页签管理 — tabs/activeTabId/openTab/closeTab/activateTab、键分隔符 keySeparator）
- `connection-store.ts`：连接配置列表（含 SSH/TLS/Sentinel/Cluster 字段）、活跃连接、连接状态、对话框状态
- `browser-store.ts`：数据浏览器状态（Key 列表、SCAN 游标、选中 Key、DB 切换、视图模式、刷新版本号）
- `cli-store.ts`：CLI 控制台状态（多 Tab 管理、命令历史、输出日志）
- `monitor-store.ts`：服务器监控状态（INFO 数据、实时图表快照、慢查询日志、刷新间隔）
- `pubsub-store.ts`：Pub/Sub 状态（订阅频道、消息列表、暂停/过滤）

**IPC 封装（`src/lib/tauri-api.ts`）**
所有 Tauri 后端调用都通过此文件封装。在浏览器（`just dev-web`）环境中自动走 mock 实现，Tauri 环境中调用真实后端。新增后端命令时需同步在此文件添加函数和 mock 实现。

**组件（`src/components/`）**
按功能模块组织：`browser/`（数据浏览器：add-field-dialog、data-browser、export-dialog、import-dialog、key-detail、key-dialog、key-list、key-toolbar、key-tree、ttl-dialog、value-viewer 等 11 个文件）、`cli/`（CLI 终端）、`connection/`（连接对话框）、`layout/`（布局组件：title-bar、sidebar、sidebar-nav-button、connection-item、tab-bar、settings-page、welcome-page、language-switcher）、`monitor/`（服务器监控：server-info、realtime-charts、slow-log、monitor-page）、`pubsub/`（发布订阅）、`ui/`（shadcn/ui 基础组件，17 个）。
全局组件：`providers.tsx`（NextThemes + TooltipProvider + Toaster）、`error-boundary.tsx`、`confirm-danger-dialog.tsx`。

**Hooks（`src/hooks/`）**
- `use-global-shortcuts.ts`：注册全局快捷键（⌘N/T/F/R/⌫/,）
- `use-connection-drag.ts`：连接列表拖拽排序逻辑（HTML5 Drag and Drop）

**国际化（`src/i18n/`）**
翻译文件：`src/i18n/locales/en-US.json` 和 `zh-CN.json`，按功能模块分 key（两层嵌套）。修改 UI 文案后运行 `just i18n-check` 确认 key 同步。

### Rust 后端结构（`src-tauri/src/`）

- `lib.rs`：Tauri 入口，注册所有 Tauri Commands 和全局状态（`ConnectionStore`、`RedisClientManager`）
- `commands/`：Tauri Command 处理器，按功能分文件（`connection.rs`、`keys.rs`、`values.rs`、`export.rs`、`cli.rs`、`server.rs`、`pubsub.rs`、`data.rs`）
- `redis/client.rs`：`RedisClientManager`，基于 `HashMap<String, MultiplexedConnection>` + `Mutex` 管理多连接生命周期，支持 TLS（`rediss://`）
- `redis/types.rs`：数据类型定义（`RedisValueType` 枚举、`IpcResponse<T>` 统一响应结构）
- `config/store.rs`：`ConnectionStore`，负责连接配置的持久化（`connections.json`），密码使用 AES-256-GCM 加密。`StoredConnection` 含 SSH/TLS/Sentinel/Cluster 高级连接字段
- `config/encryption.rs`：加密工具，Master Key 自动生成并持久化到 `app_data_dir/master-key`

### Next.js 静态导出说明

`next.config.ts` 配置了 `output: 'export'`，构建产物在 `out/` 目录，Tauri 从该目录加载前端资源。`Providers` 组件通过 `useHasMounted` 钩子规避 SSR/CSR Hydration 不一致问题（i18n LanguageDetector 依赖 `window`）。

## 开发进度

- Phase 1-4（基础框架、连接管理、数据浏览、CLI 控制台）✅ 已完成
- Phase 5（高级功能：服务器监控、慢查询、Pub/Sub、数据导入导出）✅ 已完成
- Phase 6（高级连接 & 完善：SSH/TLS/Sentinel/Cluster UI、连接导入导出、设置页、快捷键、错误边界）✅ 已完成
  - 🔲 待办：SSH 隧道后端（Rust russh 库）、自动更新集成、macOS/Windows 签名

详见 `docs/DEVELOPMENT_PLAN.md`。
