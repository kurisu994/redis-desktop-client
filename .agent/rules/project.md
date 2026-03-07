---
trigger: always_on
---

# Redis Desktop Client — 项目规则

## 项目概述

跨平台 Redis 桌面客户端，基于 **Tauri 2 + Next.js 16 + shadcn/ui + Tailwind CSS v4** 构建。
前端为 React 19 客户端组件（`"use client"`），通过 `output: "export"` 静态导出后由 Tauri 加载。
后端为 Rust（Tokio 异步运行时 + redis-rs），通过 Tauri Command 暴露给前端。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Tauri | 2.x |
| 前端框架 | Next.js (Turbopack) | 16.x |
| UI 组件库 | shadcn/ui (Radix UI + CVA) | - |
| 样式 | Tailwind CSS | 4.x |
| 状态管理 | Zustand | 5.x |
| 国际化 | i18next + react-i18next | - |
| 图标 | lucide-react | - |
| 后端语言 | Rust (Edition 2021) | MSRV 1.77.2 |
| Redis 客户端 | redis-rs (tokio) | 0.29 |

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 根布局（Geist 字体、Metadata）
│   ├── page.tsx           # 主页面（TitleBar + Sidebar + TabBar + Main）
│   └── globals.css        # Tailwind v4 + shadcn/ui 主题变量（oklch 色彩空间）
├── components/
│   ├── providers.tsx      # 全局 Provider（NextThemes + TooltipProvider + Toaster + i18n）
│   ├── error-boundary.tsx # 错误边界组件
│   ├── confirm-danger-dialog.tsx # 敏感操作确认对话框
│   ├── ui/               # shadcn/ui 基础组件（button, dialog, input, table, tabs 等 17 个）
│   ├── layout/            # 布局组件
│   │   ├── title-bar.tsx       # 顶部标题栏（Logo + 主题切换 + 语言切换 + 设置 + GitHub）
│   │   ├── sidebar.tsx         # 左侧边栏（连接列表 + 底部导航按钮）
│   │   ├── tab-bar.tsx         # Tab 页签栏（切换/关闭 Tab）
│   │   ├── settings-page.tsx   # 设置页面
│   │   ├── welcome-page.tsx    # 欢迎页（空状态）
│   │   └── language-switcher.tsx # 语言切换组件
│   ├── browser/           # 数据浏览器（data-browser, key-list, key-tree, key-detail, value-viewer 等）
│   ├── cli/               # CLI 终端
│   ├── connection/        # 连接对话框
│   ├── monitor/           # 服务器监控（server-info, realtime-charts, slow-log, monitor-page）
│   └── pubsub/            # 发布订阅
├── hooks/                 # 自定义 Hooks
│   ├── use-global-shortcuts.ts  # 全局快捷键（⌘N/T/F/R/⌫/,）
│   └── use-connection-drag.ts   # 连接列表拖拽排序逻辑（HTML5 Drag and Drop）
├── lib/                   # 工具函数
│   ├── tauri-api.ts      # Tauri IPC 封装（含浏览器环境 mock 实现）
│   └── utils.ts          # 通用工具（cn 函数等）
├── stores/                # Zustand 状态仓库
│   ├── app-store.ts      # 应用 UI 状态（侧边栏折叠、Tab 页签管理、键分隔符）
│   ├── connection-store.ts # 连接配置与状态管理（含 SSH/TLS/Sentinel/Cluster 字段）
│   ├── browser-store.ts  # 数据浏览器状态（Key 列表、SCAN 游标、选中 Key、DB 切换）
│   ├── cli-store.ts      # CLI 控制台状态（多 Tab、命令历史、输出日志）
│   ├── monitor-store.ts  # 服务器监控状态（INFO 数据、实时图表、慢查询、刷新间隔）
│   └── pubsub-store.ts   # Pub/Sub 状态（订阅频道、消息列表、暂停/过滤）
└── i18n/
    ├── index.ts           # i18next 配置
    └── locales/           # 翻译文件 (en-US.json, zh-CN.json)

src-tauri/
├── src/
│   ├── lib.rs             # Tauri 入口（插件注册、Command 注册）
│   ├── main.rs            # 程序入口
│   ├── commands/          # Tauri Command 处理器
│   │   ├── connection.rs  # 连接管理（CRUD + connect/disconnect + test）
│   │   ├── keys.rs        # Key 浏览与管理（scan, delete, rename, ttl, copy）
│   │   ├── values.rs      # 值操作（全 7 种数据类型的读写，含 RedisJSON）
│   │   ├── cli.rs         # CLI 命令执行
│   │   ├── server.rs      # 服务器信息与慢查询
│   │   ├── pubsub.rs      # 发布/订阅
│   │   ├── data.rs        # Key 数据导入/导出
│   │   └── export.rs      # 连接配置导入/导出
│   ├── redis/
│   │   ├── client.rs      # RedisClientManager（HashMap<String, MultiplexedConnection> + Mutex）
│   │   └── types.rs       # 数据类型定义（RedisValueType, IpcResponse）
│   └── config/
│       ├── store.rs       # ConnectionStore（连接配置持久化，密码 AES-256-GCM 加密）
│       └── encryption.rs  # 加密工具（Master Key 自动生成并持久化）
├── Cargo.toml
└── tauri.conf.json        # 窗口配置 1280×800, 最小 960×600
```

## 关键约定

### shadcn/ui + Tailwind CSS v4 集成

项目使用 shadcn/ui 组件库，组件源码位于 `src/components/ui/` 目录。配置文件为 `components.json`（style: new-york, iconLibrary: lucide）。

添加新组件：`pnpm dlx shadcn@latest add <component>`

主题在 `globals.css` 中通过 CSS 变量定义（oklch 色彩空间），支持深色/浅色两套主题。主色调为紫色/紫罗兰色。

### Hydration 安全

`providers.tsx` 使用 `useHasMounted` hook（基于 `useSyncExternalStore`）延迟客户端渲染，避免 i18n LanguageDetector 导致的 Hydration Mismatch。新增 Provider 时必须保留此模式。

### 前端组件规范

- 所有页面组件使用 `"use client"` 指令
- UI 组件优先使用 shadcn/ui（`src/components/ui/`），不引入其他 UI 库
- 图标使用 `lucide-react`
- 样式使用 Tailwind CSS utility class，不写自定义 CSS
- 路径别名：`@/*` → `./src/*`
- 组件 PascalCase，文件 kebab-case，变量/函数 camelCase
- 中文注释；函数和复杂逻辑必须有注释

### 状态管理

- 使用 Zustand，按功能领域拆分 store（`stores/` 目录）
- Store 文件命名：`xxx-store.ts`
- 不使用 Redux、MobX 或 Context API 做全局状态

### IPC 封装

所有 Tauri 后端调用通过 `src/lib/tauri-api.ts` 封装。在浏览器环境（`just dev-web`）中自动走 mock 实现，Tauri 环境中调用真实后端。新增后端命令时需同步在此文件添加函数和 mock 实现。

### 国际化

- 所有用户可见文本通过 `useTranslation()` 的 `t()` 函数获取
- 翻译文件：`src/i18n/locales/{en-US,zh-CN}.json`
- key 使用点分层级命名，如 `connection.form.host`
- 新增翻译 key 后运行 `just i18n-check` 验证完整性

### Rust 后端规范

- Tauri Command 放在 `src-tauri/src/commands/` 下，按功能模块分文件
- 新 Command 必须在 `lib.rs` 的 `invoke_handler` 中注册
- 使用 Serde 序列化，数据结构加 `#[derive(Debug, Clone, Serialize, Deserialize)]`
- 异步操作使用 Tokio，Redis 操作用 `get_multiplexed_async_connection()`
- 错误统一转为 `Result<T, String>`，使用 `.map_err(|e| e.to_string())`
- 中文 `///` 文档注释

## 代码风格

### 前端 (TypeScript/React)
- TypeScript strict mode
- ESLint：Next.js core-web-vitals + typescript 规则集
- Prettier 格式化（`just fmt-web`）

### 后端 (Rust)
- Clippy 检查（`just lint-rust`）
- `cargo fmt` 格式化（`just fmt-rust`）

## 常用命令

```bash
just dev          # Tauri 开发模式（前后端热重载）
just dev-web      # 仅启动 Next.js 前端
just build        # 生产构建
just lint         # 完整 lint（前端 + 后端）
just fmt          # 格式化全部代码
just test-rust    # Rust 单元测试
just i18n-check   # 检查翻译 key 完整性
just install      # 安装所有依赖
just clean        # 清理构建产物
npx tsc --noEmit  # 快速类型检查
```

## 注意事项

1. Next.js 使用 `output: "export"` 静态导出，**不支持**服务端功能（API Routes、SSR、middleware）
2. 所有后端逻辑通过 Tauri Command 实现，前端通过 `@tauri-apps/api` 调用
3. 深色主题为默认主题，通过 `next-themes` 管理
4. 窗口标题栏为自定义组件（`title-bar.tsx`），不使用系统原生标题栏
5. 持久化存储使用 `tauri-plugin-store`，不使用 localStorage
