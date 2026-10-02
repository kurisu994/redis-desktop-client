---
name: 31-build-tools
description: justfile 命令入口、构建产物体检、Next.js/shadcn 配置与终端工具约定
paths:
  - "justfile"
  - "next.config.ts"
  - "components.json"
  - "postcss.config.mjs"
  - "eslint.config.mjs"
  - "tsconfig.json"
---

# 31-build-tools — 构建、检查与工具约定

## 命令入口（`justfile`）

统一用 `just` 作为入口，不直接记 pnpm/cargo 长命令。

| 命令                 | 说明                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `just install`       | `pnpm install` + `cargo fetch`                                                             |
| `just dev`           | `pnpm tauri dev`（完整开发环境，前后端热重载）                                             |
| `just dev-web`       | `pnpm dev`（仅 Next.js，localhost:3000，可在浏览器调试）                                   |
| `just build`         | `pnpm tauri build`（生产构建，自动加载 `.env` 生成带签名的更新包）                         |
| `just build-web`     | `pnpm build`（仅前端静态导出到 `out/`）                                                    |
| `just build-debug`   | `pnpm tauri build --debug`                                                                 |
| `just lint`          | `lint-web` + `lint-rust`                                                                   |
| `just lint-web`      | `pnpm lint` + `pnpm exec tsc --noEmit`                                                     |
| `just lint-rust`     | `cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings`                 |
| `just fmt`           | `fmt-web` + `fmt-rust`                                                                     |
| `just fmt-web`       | `prettier --write "src/**/*.{ts,tsx,css,json}"`                                            |
| `just fmt-rust`      | `cd src-tauri && cargo fmt --all`                                                          |
| `just test`          | `test-rust`（无前端测试）                                                                  |
| `just test-rust`     | `cd src-tauri && cargo test --all-features`                                                |
| `just test-appimage` | Node 原生测试：AppDir 搬迁、绝对/悬空/越界链接和图标元数据                                 |
| `just check-appimage <path>` | Linux 解包检查 AppImage；也可跨平台检查已解包的 AppDir                           |
| `just clean`         | `rm -rf out .next && cargo clean`                                                          |
| `just i18n-check`    | 对比 `en-US.json` 和 `zh-CN.json` 的 key，输出缺失项                                       |
| `just version <ver>` | 同步更新 `package.json` / `Cargo.toml` / `tauri.conf.json` 版本号                          |
| `just release <tag>` | 一键发布：更新版本 → 自动改写 CHANGELOG `[Unreleased]` → Commit → 推主干 → 打 Tag → 推 Tag |

`justfile` 顶部 `set dotenv-load`：构建时自动加载 `.env`（**不提交**）。

## 配置事实

- **`next.config.ts`**：静态导出模式（`output: 'export'`），产物在 `out/`，由 Tauri 加载；开发用 `next dev --turbopack`。
- **`components.json`**：shadcn 组件加入路径 `src/components/ui`，Hooks 路径 `src/hooks`，Tailwind 为 CSS-first（配置写在 `globals.css`）。
- **`postcss.config.mjs`**：只挂 `@tailwindcss/postcss`。
- **`eslint.config.mjs`**：ESLint 9 flat config，继承 `eslint-config-next/core-web-vitals` 与 `eslint-config-next/typescript`，额外排除 `**/demo/**` 与 `src-tauri/**`。
- **`tsconfig.json`**：路径别名 `@/*` → `src/*`。

## 提交前自检

- 改前端：`just fmt-web` + `just lint-web`；动到用户可见行为时跑 `just dev-web` 手动确认。
- 改后端：`just fmt-rust` + `just lint-rust`；逻辑变更补单元测试后跑 `just test-rust`。
- 改文案：`just i18n-check` 必须通过。
- 一组改动完成后优先做类型检查/编译，不默认跑全量测试。

## 终端工具约定

开发协作统一使用现代化替代工具，**不要用 `find` / `grep` / `cat` / `ls`**（除非替代工具不可用或项目脚本要求）：

| 用途     | 工具  | 常见用法                                  |
| -------- | ----- | ----------------------------------------- |
| 查找文件 | `fd`  | `fd -e ts`, `fd -H -I`, `fd -u`           |
| 内容搜索 | `rg`  | `rg -F`（纯文本）, `rg -uu`（放宽忽略）   |
| 查看文件 | `bat` | `bat --paging=never <file>`               |
| 列目录   | `eza` | `eza -la --icons --git`, `eza -T -L 2`    |
