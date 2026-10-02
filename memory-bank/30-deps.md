---
name: 30-deps
description: 前端与后端依赖版本矩阵（package.json / Cargo.toml 事实来源）
paths:
  - "package.json"
  - "pnpm-lock.yaml"
  - "src-tauri/Cargo.toml"
---

# 30-deps — 依赖版本矩阵

来源：`package.json` 与 `src-tauri/Cargo.toml`（当前版本 0.2.9）。**升级依赖时同步本文件。**

## 前端运行时依赖

| 包                                   | 版本     | 用途                            |
| ------------------------------------ | -------- | ------------------------------- |
| **next**                             | 16.1.6   | Next.js 框架（Turbopack）       |
| **react** / **react-dom**            | 19.2.3   | React 19                        |
| **typescript**                       | ^5       | 类型系统                        |
| **@tauri-apps/api**                  | ^2.10.1  | Tauri JS API                    |
| **@tauri-apps/plugin-dialog**        | ^2.6.0   | 文件对话框                      |
| **@tauri-apps/plugin-fs**            | ^2.4.5   | 文件系统访问                    |
| **@tauri-apps/plugin-opener**        | ^2.5.3   | 打开外部链接                    |
| **@tauri-apps/plugin-process**       | ^2.3.1   | 重启应用（更新后）              |
| **@tauri-apps/plugin-store**         | ^2.4.2   | 本地持久化存储                  |
| **@tauri-apps/plugin-updater**       | ^2.10.1  | 应用自动更新                    |
| **zustand**                          | ^5.0.11  | 状态管理                        |
| **radix-ui**                         | ^1.4.3   | shadcn/ui 底层（Headless 组件） |
| **lucide-react**                     | ^0.576.0 | 图标库                          |
| **react-virtuoso**                   | ^4.18.3  | 虚拟滚动（Key 列表、消息列表）  |
| **recharts**                         | ^3.7.0   | 监控折线图                      |
| **cmdk**                             | ^1.1.1   | ⌘K 命令面板（shadcn Command）   |
| **sonner**                           | ^2.0.7   | Toast 通知                      |
| **i18next**                          | ^25.8.13 | 国际化框架                      |
| **i18next-browser-languagedetector** | ^8.2.1   | 语言检测                        |
| **react-i18next**                    | ^16.5.4  | React 国际化绑定                |
| **next-themes**                      | ^0.4.6   | 深浅主题切换                    |
| **class-variance-authority**         | ^0.7.1   | shadcn 样式变体                 |
| **clsx**                             | ^2.1.1   | className 合并                  |
| **tailwind-merge**                   | ^3.5.0   | Tailwind 类名去重               |

## 前端开发依赖

| 包                               | 版本    | 用途                             |
| -------------------------------- | ------- | -------------------------------- |
| **@tauri-apps/cli**              | 2.12.0  | Tauri CLI；修复 AppImage 绝对图标链接，固定打包器版本 |
| **tailwindcss**                  | ^4      | Tailwind CSS 4（CSS-first）      |
| **@tailwindcss/postcss**         | ^4      | PostCSS 插件                     |
| **tw-animate-css**               | ^1.4.0  | Tailwind 动画类                  |
| **shadcn**                       | ^3.8.5  | shadcn CLI                       |
| **eslint**                       | ^9      | ESLint 9                         |
| **eslint-config-next**           | 16.1.6  | Next.js ESLint 配置              |
| **prettier**                     | ^3.8.1  | 代码格式化                       |
| **husky**                        | ^9.1.7  | Git Hook（Conventional Commits） |
| **@types/node**                  | ^20     | Node 类型                        |
| **@types/react** / **react-dom** | ^19     | React 类型                       |

## 后端依赖（`src-tauri/Cargo.toml`）

| Crate                      | 版本      | 用途                                                  |
| -------------------------- | --------- | ----------------------------------------------------- |
| **Rust Edition**           | 2021      | —                                                     |
| **Rust MSRV**              | 1.77.2    | 最低支持版本                                          |
| **tauri**                  | 2.10.0    | 桌面框架核心                                          |
| **tauri-build**            | 2.5.4     | 构建脚本                                              |
| **tauri-plugin-log**       | 2         | 日志                                                  |
| **tauri-plugin-store**     | 2         | 本地持久化                                            |
| **tauri-plugin-dialog**    | 2         | 文件对话框                                            |
| **tauri-plugin-fs**        | 2         | 文件系统                                              |
| **tauri-plugin-opener**    | 2.5.3     | 外部链接                                              |
| **tauri-plugin-process**   | 2         | 重启进程                                              |
| **tauri-plugin-updater**   | 2         | 应用更新（Ed25519 签名校验）                          |
| **redis**                  | 0.29      | Redis 客户端（tokio-comp + aio + connection-manager） |
| **tokio**                  | 1（full） | 异步运行时                                            |
| **serde** / **serde_json** | 1.0       | 序列化（含 derive）                                   |
| **thiserror**              | 2         | 错误类型派生                                          |
| **aes-gcm**                | 0.10      | AES-256-GCM 加密                                      |
| **rand**                   | 0.8       | 随机数（Master Key 生成）                             |
| **base64**                 | 0.22      | Base64 编解码                                         |
| **uuid**                   | 1（v4）   | 连接 ID                                               |
| **chrono**                 | 0.4       | 时间处理（serde）                                     |
| **futures-util**           | 0.3       | Stream/Sink 工具                                      |
| **url**                    | 2.5       | URL 解析                                              |
| **regex**                  | 1         | 正则                                                  |
| **log**                    | 0.4       | 日志门面                                              |
| **russh**                  | 0.54      | SSH 隧道、N 跳串联与主机公钥校验                      |
