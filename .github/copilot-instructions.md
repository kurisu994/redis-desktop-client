# Redis Desktop Client — AI 助手规则

## 项目概述

跨平台 Redis 桌面客户端，基于 **Tauri 2 + Next.js 16 + shadcn/ui + Tailwind CSS v4** 构建。
前端为 React 19 客户端组件（`"use client"`），通过 `output: "export"` 静态导出后由 Tauri 加载。
后端为 Rust（Tokio 异步运行时 + redis-rs），通过 Tauri Command 暴露给前端。

## 技术栈

| 层级         | 技术                    | 版本        |
| ------------ | ----------------------- | ----------- |
| 桌面框架     | Tauri                   | 2.x         |
| 前端框架     | Next.js (Turbopack)     | 16.x        |
| UI 组件库    | shadcn/ui               | -           |
| 样式         | Tailwind CSS            | 4.x         |
| 状态管理     | Zustand                 | 5.x         |
| 国际化       | i18next + react-i18next | -           |
| 后端语言     | Rust (Edition 2021)     | MSRV 1.77.2 |
| Redis 客户端 | redis-rs (tokio)        | 0.29        |

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 根布局（字体、Metadata）
│   ├── page.tsx           # 主页面（TitleBar + Sidebar + Main）
│   ├── globals.css        # Tailwind v4 + shadcn/ui 主题变量
├── components/
│   ├── providers.tsx      # 全局 Provider（TooltipProvider + 主题 + i18n）
│   ├── ui/               # shadcn/ui 组件（button, dialog, input 等）
│   └── layout/            # 布局组件（sidebar, titlebar, welcome-page, language-switcher）
├── stores/                # Zustand 状态仓库
│   ├── app-store.ts      # 应用 UI 状态（侧边栏折叠等）
│   └── connection-store.ts # Redis 连接管理
└── i18n/
    ├── index.ts           # i18next 配置
    └── locales/           # 翻译文件 (en-US.json, zh-CN.json)

src-tauri/
├── src/
│   ├── lib.rs             # Tauri 入口（插件注册、Command 注册）
│   ├── commands/          # Tauri Command 处理器
│   ├── redis/             # Redis 客户端封装
│   └── config/            # 配置管理（tauri-plugin-store）
├── Cargo.toml
└── tauri.conf.json        # 窗口配置 1280×800, 最小 960×600
```

## 关键约定

### shadcn/ui + Tailwind CSS v4 集成

项目使用 shadcn/ui 组件库，组件源码位于 `src/components/ui/` 目录。通过 `components.json` 配置，使用 `pnpm dlx shadcn@latest add <component>` 添加新组件。

主题在 `globals.css` 中通过 CSS 变量定义（oklch 色彩空间），主色调为紫色/紫罗兰色。

### 打开外部链接

使用 `tauri-plugin-opener` 在 Tauri 环境中打开外部 URL。参考 `title-bar.tsx` 中的 `openExternal()` 函数。

### Hydration 安全

由于 i18next 的 LanguageDetector 在 SSR/CSR 间产生不一致，`providers.tsx` 使用
`useSyncExternalStore` 延迟客户端渲染，避免 Hydration Mismatch：

```ts
const hasMounted = useSyncExternalStore(
  emptySubscribe,
  () => true,
  () => false,
);
```

新增 Provider 或全局包裹组件时必须保留此模式。

### 前端组件规范

- 所有页面组件使用 `"use client"` 指令（Next.js static export 模式）
- UI 组件优先使用 shadcn/ui（`src/components/ui/`），不要引入其他 UI 库
- 样式使用 Tailwind CSS utility class，不写自定义 CSS
- 路径别名：`@/*` 对应 `./src/*`
- 图标：使用 `lucide-react`（注意 `Github` 图标已废弃，使用自定义 SVG 替代）

### 状态管理

- 使用 Zustand，按功能领域拆分 store（`stores/` 目录）
- Store 文件命名：`xxx-store.ts`
- 不使用 Redux、MobX 或 Context API 做全局状态

### 国际化

- 所有用户可见文本必须通过 `useTranslation()` 的 `t()` 函数获取
- 翻译文件：`src/i18n/locales/{en-US,zh-CN}.json`
- 新增翻译 key 后运行 `just i18n-check` 验证两种语言的完整性
- key 使用点分层级命名，如 `connection.form.host`

### Rust 后端规范

- Tauri Command 放在 `src-tauri/src/commands/` 下，按功能模块分文件
- 新 Command 必须在 `lib.rs` 的 `invoke_handler` 中注册
- 使用 Serde 序列化/反序列化，数据结构加 `#[derive(Debug, Clone, Serialize, Deserialize)]`
- 异步操作使用 Tokio，Redis 操作用 `get_multiplexed_async_connection()`
- 错误统一转为 `Result<T, String>`，使用 `.map_err(|e| e.to_string())`
- 中文注释说明函数用途（`/// 测试连接命令 — 验证 Redis 连接是否可用`）

## 代码风格

### 前端 (TypeScript/React)

- **严格模式**：TypeScript strict mode 已开启
- **ESLint**：Next.js core-web-vitals + typescript 规则集
- **格式化**：Prettier（通过 `just fmt-web` 运行）
- **命名**：组件 PascalCase，文件 kebab-case，变量/函数 camelCase
- **注释**：中文注释；函数和复杂逻辑必须有注释

### 后端 (Rust)

- **Clippy**：通过 `just lint-rust` 运行
- **格式化**：`cargo fmt`（通过 `just fmt-rust` 运行）
- **注释**：使用 `///` 文档注释，中文

## 常用命令

```bash
# 开发
just dev          # 启动 Tauri 开发环境（前后端热重载）
just dev-web      # 仅启动 Next.js 前端（localhost:3000）

# 构建
just build        # 生产构建
just build-web    # 仅构建前端

# 代码质量
just lint         # 完整 lint（前端 ESLint + TypeScript 检查 + Rust Clippy）
just fmt          # 格式化全部代码

# 类型检查（快速验证）
npx tsc --noEmit

# 测试
just test-rust    # Rust 单元测试

# 国际化
just i18n-check   # 检查翻译 key 完整性

# 依赖
just install      # 安装所有依赖（pnpm + cargo）
just clean        # 清理构建产物
```

## 设计参考

`docs/` 目录包含项目文档：

- `REQUIREMENTS.md` — 产品需求文档
- `DEVELOPMENT_PLAN.md` — 开发计划
- [Next.js](https://nextjs.org/docs) — Next.js 框架文档
- [shadcn/ui](https://ui.shadcn.com/docs) — shadcn/ui 组件库文档
- [shadcn/ui LLM](https://ui.shadcn.com/llms.txt) — shadcn/ui 组件库 LLM 文档
- [Lucide](https://lucide.dev/) — Lucide 图标库文档
- [Tauri](https://v2.tauri.app/start/) — Tauri 桌面框架文档

实现新功能时应参考以上文档。

## 注意事项

1. Next.js 使用 `output: "export"` 静态导出，**不支持**服务端功能（API Routes、SSR、middleware）
2. 所有后端逻辑通过 Tauri Command 实现，前端通过 `@tauri-apps/api` 调用
3. 深色主题为默认主题，通过 `next-themes` 管理
4. 窗口标题栏为自定义组件（`title-bar.tsx`），不使用系统原生标题栏
5. 持久化存储使用 `tauri-plugin-store`，不使用 localStorage（Tauri 环境下不可靠）
