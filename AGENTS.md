# Repository Guidelines

## 项目结构与模块组织

本项目是基于 Tauri 2 和 Next.js 16 的 Redis 桌面客户端。前端源码位于 `src/`：`app/` 存放 App Router 入口，`components/` 存放功能组件和 shadcn/ui 组件（18 个），`hooks/` 存放通用 React Hooks（全局快捷键、拖拽排序、更新检查），`stores/` 存放 Zustand 状态（6 个领域 Store），`lib/` 存放工具函数、Tauri API 封装与更新代理配置，`i18n/` 存放国际化配置。Rust 后端位于 `src-tauri/src/`，按 `commands/`、`redis/`、`config/` 分层。静态资源在 `public/`，项目文档在 `docs/`。

前端组件按功能模块组织：`browser/`（数据浏览器，含 `viewers/` 子目录存放按类型拆分的值查看/编辑器：string-viewer、hash-viewer、list-viewer、set-viewer、zset-viewer、stream-viewer、json-viewer、table-view、value-viewer 路由入口、value-format-editor 多格式编辑器及 JSON 辅助组件）、`cli/`（CLI 终端）、`connection/`（连接对话框含导入导出）、`layout/`（布局组件）、`monitor/`（服务器监控含 MONITOR 日志）、`pubsub/`（发布订阅）、`ui/`（shadcn/ui 基础组件）。全局组件包括 `providers.tsx`、`error-boundary.tsx`、`confirm-danger-dialog.tsx`（删除/批量删除/FLUSHDB 等危险操作确认）、`command-palette.tsx`（⌘K 命令面板）、`update-dialog.tsx`（应用更新弹窗）。

## 构建、测试与开发命令

统一使用 `just` 作为命令入口。

- `just install`：安装 pnpm 依赖并拉取 Cargo crates。
- `just dev`：启动完整 Tauri 开发环境，支持前后端热重载。
- `just dev-web`：仅启动 Next.js 前端开发服务。
- `just build`：构建生产版桌面应用。
- `just build-web`：仅构建 Next.js 前端。
- `just lint`：运行 ESLint、TypeScript 类型检查和 Rust Clippy。
- `just fmt`：使用 Prettier 和 `cargo fmt` 格式化代码。
- `just test-rust`：运行 Rust 测试。
- `just i18n-check`：检查 `en-US` 与 `zh-CN` 翻译 key 是否一致。

## 编码风格与命名约定

前端使用 TypeScript 与 React 函数组件，文件名使用 `kebab-case`，例如 `connection-dialog.tsx`。共享 UI 组件放在 `src/components/ui/`，业务组件放在对应功能目录。Zustand store 按领域命名，例如 `connection-store.ts`。Rust 模块使用 `snake_case` 文件名，并按命令、Redis 访问或配置职责分组。提交前运行 `just fmt`。

## 测试指南

当前仓库通过 Cargo 管理 Rust 测试，暂未配置前端测试框架。Rust 单元测试应靠近被测代码，并通过 `just test-rust` 运行。涉及前端行为变更时，至少执行 `just lint`，并通过 `just dev` 进行手动验证。

## 提交与 Pull Request 规范

历史提交采用简洁的 Conventional Commit 风格，常搭配 gitmoji，例如 `🐛 fix(qa): 修复 QA 测试发现的 UI/UX 问题`。提交应聚焦单一变更，并说明用户可感知的功能、修复或维护内容。PR 应包含变更摘要、已执行的验证命令、相关 issue；涉及 UI 变更时附截图或录屏。

## 安全与配置提示

不要提交密钥、签名文件或本地 `.env` 内容。Tauri 权限位于 `src-tauri/capabilities/`，新增权限应保持最小范围。修改更新、文件系统、进程调用或 Redis 连接逻辑时，需要在 PR 中说明安全影响。
