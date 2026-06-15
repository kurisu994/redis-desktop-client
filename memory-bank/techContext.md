# 技术栈与配置事实

## 前端依赖版本矩阵

来源：`package.json`（v0.2.8）

### 运行时依赖

| 包                                       | 版本         | 用途                                |
| ---------------------------------------- | ------------ | ----------------------------------- |
| **next**                                 | 16.1.6       | Next.js 框架（Turbopack）           |
| **react** / **react-dom**                | 19.2.3       | React 19                            |
| **typescript**                           | ^5           | 类型系统                            |
| **@tauri-apps/api**                      | ^2.10.1      | Tauri JS API                        |
| **@tauri-apps/plugin-dialog**            | ^2.6.0       | 文件对话框                          |
| **@tauri-apps/plugin-fs**                | ^2.4.5       | 文件系统访问                        |
| **@tauri-apps/plugin-opener**            | ^2.5.3       | 打开外部链接                        |
| **@tauri-apps/plugin-process**           | ^2.3.1       | 重启应用（更新后）                  |
| **@tauri-apps/plugin-store**             | ^2.4.2       | 本地持久化存储                      |
| **@tauri-apps/plugin-updater**           | ^2.10.1      | 应用自动更新                        |
| **zustand**                              | ^5.0.11      | 状态管理                            |
| **radix-ui**                             | ^1.4.3       | shadcn/ui 底层（Headless 组件）     |
| **lucide-react**                         | ^0.576.0     | 图标库                              |
| **react-virtuoso**                       | ^4.18.3      | 虚拟滚动（Key 列表、消息列表）      |
| **recharts**                             | ^3.7.0       | 监控折线图                          |
| **cmdk**                                 | ^1.1.1       | ⌘K 命令面板（shadcn Command）       |
| **sonner**                               | ^2.0.7       | Toast 通知                          |
| **i18next**                              | ^25.8.13     | 国际化框架                          |
| **i18next-browser-languagedetector**     | ^8.2.1       | 语言检测                            |
| **react-i18next**                        | ^16.5.4      | React 国际化绑定                    |
| **next-themes**                          | ^0.4.6       | 深浅主题切换                        |
| **class-variance-authority**             | ^0.7.1       | shadcn 样式变体                     |
| **clsx**                                 | ^2.1.1       | className 合并                      |
| **tailwind-merge**                       | ^3.5.0       | Tailwind 类名去重                   |

### 开发依赖

| 包                            | 版本     | 用途                            |
| ----------------------------- | -------- | ------------------------------- |
| **@tauri-apps/cli**           | ^2.10.0  | Tauri CLI                       |
| **tailwindcss**               | ^4       | Tailwind CSS 4（CSS-first）     |
| **@tailwindcss/postcss**      | ^4       | PostCSS 插件                    |
| **tw-animate-css**            | ^1.4.0   | Tailwind 动画类                 |
| **shadcn**                    | ^3.8.5   | shadcn CLI                      |
| **eslint**                    | ^9       | ESLint 9                        |
| **eslint-config-next**        | 16.1.6   | Next.js ESLint 配置             |
| **prettier**                  | ^3.8.1   | 代码格式化                      |
| **husky**                     | ^9.1.7   | Git Hook（Conventional Commits） |
| **@types/node**               | ^20      | Node 类型                       |
| **@types/react** / **react-dom** | ^19    | React 类型                      |

## 后端依赖版本矩阵

来源：`src-tauri/Cargo.toml`（v0.2.8）

| Crate                       | 版本      | 用途                                              |
| --------------------------- | --------- | ------------------------------------------------- |
| **Rust Edition**            | 2021      | —                                                 |
| **Rust MSRV**               | 1.77.2    | 最低支持版本                                      |
| **tauri**                   | 2.10.0    | 桌面框架核心                                      |
| **tauri-build**             | 2.5.4     | 构建脚本                                          |
| **tauri-plugin-log**        | 2         | 日志                                              |
| **tauri-plugin-store**      | 2         | 本地持久化                                        |
| **tauri-plugin-dialog**     | 2         | 文件对话框                                        |
| **tauri-plugin-fs**         | 2         | 文件系统                                          |
| **tauri-plugin-opener**     | 2.5.3     | 外部链接                                          |
| **tauri-plugin-process**    | 2         | 重启进程                                          |
| **tauri-plugin-updater**    | 2         | 应用更新（Ed25519 签名校验）                      |
| **redis**                   | 0.29      | Redis 客户端（tokio-comp + aio + connection-manager） |
| **tokio**                   | 1（full） | 异步运行时                                        |
| **serde** / **serde_json**  | 1.0       | 序列化（含 derive）                               |
| **thiserror**               | 2         | 错误类型派生                                      |
| **aes-gcm**                 | 0.10      | AES-256-GCM 加密                                  |
| **rand**                    | 0.8       | 随机数（Master Key 生成）                         |
| **base64**                  | 0.22      | Base64 编解码                                     |
| **uuid**                    | 1（v4）   | 连接 ID                                           |
| **chrono**                  | 0.4       | 时间处理（serde）                                 |
| **futures-util**            | 0.3       | Stream/Sink 工具                                  |
| **url**                     | 2.5       | URL 解析                                          |
| **regex**                   | 1         | 正则                                              |
| **log**                     | 0.4       | 日志门面                                          |

## Tauri 配置（`src-tauri/tauri.conf.json`）

| 字段                          | 值                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `productName`                 | `Redis Desktop Client`                                                                          |
| `identifier`                  | `com.redis-desktop-client`                                                                      |
| `version`                     | `0.2.8`                                                                                         |
| `build.frontendDist`          | `../out`                                                                                        |
| `build.devUrl`                | `http://localhost:3000`                                                                         |
| `build.beforeDevCommand`      | `pnpm dev`                                                                                      |
| `build.beforeBuildCommand`    | `pnpm build`                                                                                    |
| 窗口尺寸                      | 默认 1440×900，最小 960×600，居中启动，不全屏，禁用 dragDrop                                    |
| CSP                           | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none';` |
| `bundle.createUpdaterArtifacts` | `true`（构建时自动生成更新产物 + 签名）                                                       |
| `bundle.targets`              | `all`（三平台全打包）                                                                           |
| 更新源                        | `https://github.com/kurisu994/redis-desktop-client/releases/latest/download/latest.json`        |
| 更新签名公钥                  | 硬编码 Ed25519 公钥（minisign 格式），Base64 编码                                              |
| Windows 安装模式              | `passive`（带进度条静默安装）                                                                  |

## 数据持久化

- **数据库**：无（本项目不使用数据库）
- **连接配置**：`{AppData}/connections.json`（密码 AES-256-GCM 加密）
- **加密 Master Key**：`{AppData}/master-key`（独立文件，启动时生成）
- **用户偏好**：`localStorage`（主题、语言、命名空间分隔符、自动更新开关、更新代理地址）
- **Tauri Store Plugin**：用于其它持久化场景

## 构建命令（`justfile`）

| 命令                  | 说明                                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| `just install`        | `pnpm install` + `cargo fetch`                                              |
| `just dev`            | `pnpm tauri dev`（完整开发环境，前后端热重载）                              |
| `just dev-web`        | `pnpm dev`（仅 Next.js，localhost:3000，可在浏览器调试）                    |
| `just build`          | `pnpm tauri build`（生产构建，自动加载 `.env` 生成带签名的更新包）          |
| `just build-web`      | `pnpm build`（仅前端静态导出到 `out/`）                                     |
| `just build-debug`    | `pnpm tauri build --debug`                                                  |
| `just lint`           | `lint-web` + `lint-rust`                                                    |
| `just lint-web`       | `pnpm lint` + `pnpm exec tsc --noEmit`                                      |
| `just lint-rust`      | `cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings`  |
| `just fmt`            | `fmt-web` + `fmt-rust`                                                      |
| `just fmt-web`        | `prettier --write "src/**/*.{ts,tsx,css,json}"`                             |
| `just fmt-rust`       | `cd src-tauri && cargo fmt --all`                                           |
| `just test`           | `test-rust`（无前端测试）                                                   |
| `just test-rust`      | `cd src-tauri && cargo test --all-features`                                 |
| `just clean`          | `rm -rf out .next && cargo clean`                                           |
| `just i18n-check`     | 对比 `en-US.json` 和 `zh-CN.json` 的 key，输出缺失项                        |
| `just version <ver>`  | 同步更新 `package.json` / `Cargo.toml` / `tauri.conf.json` 版本号           |
| `just release <tag>`  | 一键发布：更新版本 → 自动改写 CHANGELOG `[Unreleased]` → Commit → 推主干 → 打 Tag → 推 Tag |

## Next.js 配置（`next.config.ts`）

- 静态导出模式（`output: 'export'`），构建产物在 `out/`，Tauri 加载。
- Turbopack 开发模式（`next dev --turbopack`）。

## shadcn 配置（`components.json`）

- 组件加入路径：`src/components/ui`
- Hooks 路径：`src/hooks`
- Tailwind 配置：CSS-first（`globals.css`）

## CI/CD 工作流

- **CI 流水线**（每次 Push / PR 触发）：
  - 前端：ESLint + TypeScript 类型检查
  - 后端：`cargo clippy --all-targets --all-features -- -D warnings` + `cargo test`
  - 跨平台构建验证（macOS ARM/Intel、Linux、Windows）
- **Release 流水线**（Tag 触发）：
  - 三平台并行 Tauri 构建
  - 自动生成 `latest.json` 更新清单
  - 自动创建 GitHub Release 并上传产物
- **Conventional Commits**：`scripts/verify-commit.js` 通过 Husky `commit-msg` Hook 校验。

## 国际化资源

- 文件：`src/i18n/locales/en-US.json` 和 `src/i18n/locales/zh-CN.json`
- 语言检测：`i18next-browser-languagedetector`（系统语言 + localStorage 持久化）
- 模块分 key：`common` / `connection` / `browser` / `cli` / `monitor` / `pubsub` / `settings` / `update` / `shortcuts` / `errorBoundary` / `confirm` / `dataExport` / `dataImport`
- 一致性校验：`just i18n-check`

## 关联记忆

- 架构与目录约定 → [[systemPatterns]]
- 业务约束（CSP / 安全 / 性能） → [[productContext]]
- 版本演进历史 → [[progress]]
