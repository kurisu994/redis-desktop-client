# Changelog

本文件记录 Redis Desktop Client 的所有版本变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/)，遵循[语义化版本](https://semver.org/)。

---

## [0.1.0] — 2026-03-05

> 🎉 首个开发版本，完成全部核心功能（Phase 1 ~ Phase 6）。

### ✨ 新功能

#### 连接管理
- 支持创建、编辑、复制、删除 Redis 连接配置
- 支持连接测试（PING 验证 + 延迟展示）
- 连接状态实时指示（已连接 / 未连接 / 连接中）
- 连接配置加密持久化存储（AES-256-GCM）
- 右键上下文菜单（连接/断开/编辑/复制/删除）
- SSL/TLS 连接支持（`rediss://` 协议自动切换）
- SSH 隧道 / Sentinel / Cluster 连接 UI 配置表单
- 连接配置导入/导出（JSON 格式，支持冲突策略：跳过/覆盖/重命名）

#### 数据浏览器
- Key 浏览器：树形视图（按 `:` 分隔符命名空间分组）+ 平铺视图，一键切换
- 支持全部 6 种 Redis 数据类型的查看与编辑：String、Hash、List、Set、Sorted Set、Stream
- 基于 SCAN 的分页 Key 扫描 + 通配符模式搜索
- 虚拟滚动（react-virtuoso），支持大量 Key 流畅浏览
- 数据库切换（db0 ~ db15），显示各 db 的 Key 数量
- Key 管理操作：新建 / 重命名 / 复制 / 删除（含批量） / TTL 设置与移除
- Key 信息面板：类型、TTL、大小、编码方式
- Monaco Editor 值编辑器：JSON / XML / 纯文本语法高亮，自动格式检测，主题跟随
- 一键复制 Key 名称或值到剪贴板
- Key 数据导入/导出（JSON 格式，含冲突策略 + 进度条）

#### CLI 控制台
- 内置 Redis CLI 终端（自定义轻量组件）
- 命令自动补全（100+ Redis 命令字典）+ 参数格式提示
- 命令历史记录（上/下箭头翻阅，每个 Tab 独立）
- 多 Tab 会话支持
- 命令结果按类型着色（ok / error / integer / bulk / nil / array）
- 清屏（Ctrl+L 或 `CLEAR`/`CLS` 命令）

#### 服务器监控
- INFO 命令结构化展示（Server、Clients、Memory、Stats、Replication、Keyspace）
- 关键指标卡片（Redis 版本、运行时间、内存使用、客户端数、Key 总数）
- 实时性能图表（recharts）：ops/sec、内存使用、连接数、命中率
- 可配置刷新间隔（1s / 2s / 5s / 10s）+ 暂停/继续
- 慢查询日志管理：列表查看、阈值设置（`CONFIG SET`）、清空（`SLOWLOG RESET`）

#### 发布/订阅 (Pub/Sub)
- 频道/模式订阅与取消订阅
- 消息实时列表（虚拟滚动），展示时间戳 + 频道 + 内容
- 发布消息到指定频道
- 消息过滤与搜索（按频道或内容关键词）
- 暂停/继续接收消息（不断开订阅连接）

#### 用户体验
- 深色/浅色主题切换（默认深色，oklch 色彩空间紫色/紫罗兰主色调）
- 中英文国际化（i18next，跟随系统语言 + 手动切换 + 持久化）
- 全局快捷键：⌘N（新建连接）/ ⌘T（CLI）/ ⌘F（搜索）/ ⌘R（刷新）/ ⌘,（设置）
- Tab 页签式主内容区管理（Browser 始终存在，其余可创建/关闭）
- Toast 通知（sonner）
- 错误边界（渲染异常降级 UI + 错误详情）
- 敏感操作确认对话框（FLUSHDB / FLUSHALL 需输入确认文本）
- 设置页面：主题切换、语言切换、快捷键说明、版本信息

### 🏗️ 基础设施

- **桌面框架**：Tauri 2.x（Rust 后端 + Next.js 前端）
- **前端**：Next.js 16 (Turbopack) + React 19 + TypeScript + shadcn/ui + Tailwind CSS 4
- **状态管理**：Zustand 5（6 个功能域 Store）
- **后端**：Rust (Edition 2021) + Tokio 异步运行时 + redis-rs 0.29
- **代码编辑器**：Monaco Editor（@monaco-editor/react）
- **CI/CD**：GitHub Actions（ESLint + tsc + Clippy + 三平台构建 + Release 流水线）
- **代码规范**：ESLint + Prettier + Clippy + Conventional Commits（Husky）
- **命令入口**：justfile 统一管理（dev / build / lint / fmt / test / i18n-check）
- **版本管理**：bump-version.js 同步 package.json / Cargo.toml / tauri.conf.json

### 🔲 已知待办

- SSH 隧道后端实现（Rust `russh` 库）
- 自动更新集成（Tauri Updater Plugin）
- macOS / Windows 代码签名
- 自定义命名空间分隔符
- 大值延迟加载（> 1MB）
- 批量操作工具栏
- 收藏/标记 Key
- Monaco Diff 对比
- 常用命令面板
- 连接分组（文件夹拖拽排序）
