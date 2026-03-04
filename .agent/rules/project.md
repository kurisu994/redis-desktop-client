---
trigger: always_on
---

# Redis Desktop Client — 项目规则

## 项目概述

跨平台 Redis 桌面客户端，基于 **Tauri 2 + Next.js 16 + HeroUI + Tailwind CSS v4** 构建。
前端为 React 19 客户端组件（`"use client"`），通过 `output: "export"` 静态导出后由 Tauri 加载。
后端为 Rust（Tokio 异步运行时 + redis-rs），通过 Tauri Command 暴露给前端。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Tauri | 2.x |
| 前端框架 | Next.js (Turbopack) | 16.x |
| UI 组件库 | HeroUI (@heroui/react) | 2.8.x |
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
│   ├── page.tsx           # 主页面（TitleBar + Sidebar + Main + StatusBar）
│   ├── globals.css        # Tailwind v4 + HeroUI 插件入口
│   └── hero.ts            # HeroUI Tailwind v4 插件导出
├── components/
│   ├── providers.tsx      # 全局 Provider（HeroUI + 主题 + i18n）
│   └── layout/            # 布局组件
│       ├── title-bar.tsx       # 顶部标题栏（Logo + 主题切换 + 语言切换 + 设置）
│       ├── sidebar.tsx         # 左侧边栏（连接列表）
│       ├── status-bar.tsx      # 底部状态栏
│       ├── welcome-page.tsx    # 欢迎页（空状态）
│       └── language-switcher.tsx # 语言切换组件
├── stores/                # Zustand 状态仓库
│   ├── app-store.ts      # 应用 UI 状态（侧边栏折叠等）
│   └── connection-store.ts # Redis 连接管理
└── i18n/
    ├── index.ts           # i18next 配置
    └── locales/           # 翻译文件 (en-US.json, zh-CN.json)

src-tauri/
├── src/
│   ├── lib.rs             # Tauri 入口（插件注册、Command 注册）
│   ├── main.rs            # 程序入口
│   ├── commands/          # Tauri Command 处理器
│   ├── redis/             # Redis 客户端封装
│   └── config/            # 配置管理（tauri-plugin-store）
├── Cargo.toml
└── tauri.conf.json        # 窗口配置 1280×800, 最小 960×600
```

## 关键约定

### HeroUI + Tailwind CSS v4 集成

HeroUI 在 Tailwind v4 下**不能**直接用 `@plugin "@heroui/theme/plugin"`，
也**不要**用 `@config` 引入 tailwind.config.ts。

正确做法：
1. `src/app/hero.ts` 通过 `import { heroui } from "@heroui/react"` 导出插件
2. `globals.css` 中用 `@plugin "./hero.ts"` 引入
3. `@source` 指令扫描 HeroUI 组件类名

```css
@import "tailwindcss";
@plugin "./hero.ts";
@source "../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}";
@custom-variant dark (&:is(.dark *));
```

### pnpm + HeroUI 依赖

`@heroui/theme` 必须作为直接依赖安装（`pnpm add @heroui/theme`），否则 `@plugin` 指令无法解析。

### Hydration 安全

`providers.tsx` 使用 `useSyncExternalStore` 延迟客户端渲染，避免 i18n LanguageDetector 导致的 Hydration Mismatch。新增 Provider 时必须保留此模式。

### 前端组件规范

- 所有页面组件使用 `"use client"` 指令
- UI 组件优先使用 HeroUI（`@heroui/react`），不引入其他 UI 库
- 图标使用 `lucide-react`
- 样式使用 Tailwind CSS utility class，不写自定义 CSS
- 路径别名：`@/*` → `./src/*`
- 组件 PascalCase，文件 kebab-case，变量/函数 camelCase
- 中文注释；函数和复杂逻辑必须有注释

### 状态管理

- 使用 Zustand，按功能领域拆分 store（`stores/` 目录）
- Store 文件命名：`xxx-store.ts`
- 不使用 Redux、MobX 或 Context API 做全局状态

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
