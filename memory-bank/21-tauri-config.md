---
name: 21-tauri-config
description: Tauri 运行时配置事实：窗口、CSP、打包目标、更新签名与 capabilities 最小权限
paths:
  - "src-tauri/tauri.conf.json"
  - "src-tauri/capabilities/**"
---

# 21-tauri-config — Tauri 配置与权限

## `src-tauri/tauri.conf.json`

| 字段                            | 值                                                                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `productName`                   | `Redis Desktop Client`                                                                                                                                                                 |
| `identifier`                    | `com.redis-desktop-client`                                                                                                                                                             |
| `version`                       | `0.2.10`                                                                                                                                                                               |
| `build.frontendDist`            | `../out`                                                                                                                                                                               |
| `build.devUrl`                  | `http://localhost:3000`                                                                                                                                                                |
| `build.beforeDevCommand`        | `pnpm dev`                                                                                                                                                                             |
| `build.beforeBuildCommand`      | `pnpm build`                                                                                                                                                                           |
| 窗口尺寸                        | 默认 1440×900，最小 960×600，居中启动，不全屏，禁用 dragDrop                                                                                                                           |
| CSP                             | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none';` |
| `bundle.createUpdaterArtifacts` | `true`（构建时自动生成更新产物 + 签名）                                                                                                                                                |
| `bundle.targets`                | `all`（三平台全打包）                                                                                                                                                                  |
| 更新源                          | `https://github.com/kurisu994/redis-desktop-client/releases/latest/download/latest.json`                                                                                               |
| 更新签名公钥                    | 硬编码 Ed25519 公钥（minisign 格式），Base64 编码                                                                                                                                      |
| Windows 安装模式                | `passive`（带进度条静默安装）                                                                                                                                                          |

## 权限（`src-tauri/capabilities/`）

- 当前只有 `default.json` 一份能力清单，Tauri 权限按**最小范围**声明。
- ❌ **不要扩展 Tauri capabilities 超过最小范围**：新增权限需在 PR 描述说明安全影响。
- ❌ **不要绕过签名校验做应用更新**：Tauri Updater 的 Ed25519 公钥写在 `tauri.conf.json`，不可移除。
- 涉及文件系统、进程调用、更新、SSH 隧道、Redis 连接的改动，必须在 PR 中说明安全影响。

## 插件清单

`tauri-plugin-log`、`tauri-plugin-store`、`tauri-plugin-dialog`、`tauri-plugin-fs`、`tauri-plugin-opener`、`tauri-plugin-process`、`tauri-plugin-updater`。
