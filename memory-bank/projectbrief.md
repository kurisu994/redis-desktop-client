# 项目简介 — Redis Desktop Client

## 核心愿景

一款**跨平台 Redis 桌面管理工具**，对标 Redis Desktop Manager (RESP.app)，主打**现代化技术栈、美观一致的 UI 体验、流畅的大数据量操作**。覆盖 macOS / Windows / Linux 三大平台，单一代码库交付桌面应用。

## 产品标识

| 项目                  | 值                                                       |
| --------------------- | -------------------------------------------------------- |
| 产品名（Product Name） | Redis Desktop Client                                     |
| 应用标识（Bundle ID）  | `com.redis-desktop-client`                               |
| 当前版本              | **0.2.8**（2026-05-23 发布）                              |
| 仓库地址              | https://github.com/kurisu994/redis-desktop-client        |
| License               | MIT                                                      |
| 作者                  | lucifer994@gmail.com                                     |

## 目标用户

- **后端 / 全栈开发者**：日常需要查看、调试 Redis 数据的开发者；偏好键值型工具但要求 UI 现代化。
- **运维 / SRE**：关注 INFO 指标、慢查询日志、实时监控、Pub/Sub 调试。
- **DBA / 数据迁移工程师**：需要 Key 批量导入/导出、跨环境数据搬运。

## 范围（What's In）

- **连接管理**：基础连接、SSL/TLS、Sentinel、Cluster、SSH（UI 已就绪，后端隧道待 `russh` 接入）、加密存储、导入导出。
- **数据浏览**：树形 / 平铺 Key 浏览器；7 种数据类型（String / Hash / List / Set / ZSet / Stream / RedisJSON）全量增删改查；TTL、内存、编码方式展示。
- **多格式值编辑器**：原生 textarea + JSON 高亮叠层 + Hex dump，支持 Text/JSON/XML/YAML/HTML/CSS/JS/TS/SQL/Markdown/Hex 切换。
- **CLI 控制台**：内置自定义终端，100+ 命令补全、多 Tab、命令历史。
- **监控**：服务器 INFO 分区展示、关键指标卡片、recharts 实时折线图、MONITOR 日志、慢查询日志。
- **发布订阅**：频道/模式订阅、消息列表（虚拟滚动）、发布消息、过滤。
- **数据导入导出**：JSON 格式 + 冲突策略（skip/overwrite/rename）+ 进度展示。
- **应用更新**：Tauri Updater + Ed25519 签名 + HTTP/HTTPS 代理配置 + 24h 自动检查。
- **用户体验**：中英双语、深浅主题、10 个全局快捷键、⌘K 命令面板、统一危险操作确认、错误边界。

## 范围（What's Out）

- ❌ macOS / Windows 代码签名（待证书）。
- ❌ SSH 隧道后端实现（仅 UI 表单，依赖外部隧道运行时）。
- ❌ 连接分组（文件夹拖拽组织）。
- ❌ 前端单元测试框架（仅 Rust 端 `cargo test`）。

## 交付物

- 桌面安装包：macOS `.dmg`（Apple Silicon）、Windows `.exe` / `.msi`、Linux `.AppImage` / `.deb` / `.rpm`。
- GitHub Releases 自动发布 + `latest.json` 更新清单（Tauri Updater 消费）。
- 文档：`README.md`、`AGENTS.md`、`CLAUDE.md`、`docs/REQUIREMENTS.md`、`docs/DEVELOPMENT_PLAN.md`、`CHANGELOG.md`。

## 关联文档

- 产品和业务背景 → [[productContext]]
- 架构约定和负向约束 → [[systemPatterns]]
- 依赖版本与构建命令 → [[techContext]]
- 版本演进与里程碑 → [[progress]]
- 当前会话动态 → [[activeContext]]
