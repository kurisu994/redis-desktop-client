---
name: 10-frontend
description: 前端架构、目录组织、组件拆分、状态管理、IPC 封装与国际化约定
paths:
  - "src/**"
---

# 10-frontend — 前端架构与约定

## 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Window (1440×900)                   │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         Next.js 16 Frontend (static export)           │    │
│  │  Browser | CLI | Monitor | PubSub | Settings          │    │
│  │  Zustand × 6 | shadcn/ui | Tailwind 4 | i18next       │    │
│  └───────────────────┬──────────────────────────────────┘    │
│                      │  Tauri IPC `invoke` + Event            │
│  ┌───────────────────┴──────────────────────────────────┐    │
│  │        Rust Backend (tokio + redis-rs 0.29)           │    │
│  │  commands/ | redis/ | config/（AES-256-GCM Store）      │    │
│  │  Plugins: store, dialog, fs, opener, process, updater │    │
│  └───────────────────┬──────────────────────────────────┘    │
└──────────────────────┼──────────────────────────────────────┘
                       │
         Redis Server(s)（Standalone / Sentinel / Cluster / TLS）
```

后端分层细节见 `memory-bank/20-backend.md`，运行时配置见 `memory-bank/21-tauri-config.md`。

## 技术形态

- **Next.js 16 静态导出**：`next.config.ts` 设置 `output: 'export'`，构建产物落在 `out/`，由 Tauri 加载（不跑 Next Server）。开发用 `next dev --turbopack`。
- **React 19 + TypeScript 5**，函数组件 + Hooks，不写 class 组件。
- **shadcn/ui + Tailwind 4**：组件用 `pnpm dlx shadcn add` 加入，全部落在 `components/ui/`；Tailwind 4 是 CSS-first 配置，写在 `app/globals.css`。

## 目录组织

```
src/
├── app/                              # App Router（layout.tsx / page.tsx / globals.css）
├── components/
│   ├── browser/                      # 数据浏览器
│   │   ├── data-browser.tsx          # 浏览器主入口
│   │   ├── key-list.tsx              # 平铺视图（react-virtuoso）
│   │   ├── key-tree.tsx              # 树形视图
│   │   ├── key-toolbar.tsx           # 工具栏（db / 过滤 / 视图切换 / 新建）
│   │   ├── key-detail.tsx            # 详情面板（KeyInfo + ValueViewer 路由）
│   │   ├── key-dialog.tsx / ttl-dialog.tsx
│   │   ├── export-dialog.tsx / import-dialog.tsx
│   │   └── viewers/                  # 按类型的值查看/编辑器
│   │       ├── value-viewer.tsx      # 路由入口（按类型分发）
│   │       ├── string-viewer.tsx / hash-viewer.tsx / list-viewer.tsx
│   │       ├── set-viewer.tsx / zset-viewer.tsx / stream-viewer.tsx
│   │       ├── json-viewer.tsx       # RedisJSON
│   │       ├── table-view.tsx        # 表格通用组件
│   │       ├── value-format-editor.tsx / json-highlight-editor.tsx
│   │       └── json-validation-error.tsx / add-field-dialog.tsx / value-editor-utils.ts
│   ├── cli/                          # cli-console / command-input / terminal-output
│   ├── connection/                   # connection-dialog + 连接导入导出对话框
│   ├── layout/                       # title-bar / sidebar / tab-bar / settings-page / welcome-page 等
│   ├── monitor/                      # monitor-page / server-info / realtime-charts / slow-log / log-panel
│   ├── pubsub/                       # pubsub-page / message-list
│   ├── ui/                           # shadcn/ui 基础组件（18 个）
│   ├── providers.tsx                 # 主题 + Tooltip + Toast + i18n
│   ├── error-boundary.tsx
│   ├── command-palette.tsx           # ⌘K
│   ├── confirm-danger-dialog.tsx
│   ├── update-dialog.tsx
│   └── ssh-tofu-dialog.tsx           # SSH 首次连接指纹确认
├── hooks/                            # use-global-shortcuts / use-connection-drag
│                                     # use-update-checker / use-ssh-tofu-listener
├── stores/                           # Zustand × 6（见下）
├── lib/                              # tauri-api.ts（IPC 封装）/ update-settings.ts / utils.ts
└── i18n/                             # index.ts + locales/{en-US,zh-CN}.json
```

## 状态管理（Zustand × 6）

按**功能域**拆分，每个 Store 内封装本域状态 + actions；跨域操作通过组件层调度，不在 Store 之间直接耦合。

| Store                | 职责                                     |
| -------------------- | ---------------------------------------- |
| `app-store.ts`       | Tab 管理 / 视图模式 / 主题 / 语言        |
| `connection-store.ts`| 连接列表 / 当前连接 / dialog 状态        |
| `browser-store.ts`   | Key 列表 / 选中 / 收藏 / 过滤            |
| `cli-store.ts`       | CLI Tab 历史 / 输出                      |
| `monitor-store.ts`   | INFO / 实时指标 / 慢查询                 |
| `pubsub-store.ts`    | 订阅列表 / 消息列表 / 暂停状态           |

## 前端设计模式

- **IPC 封装层**：所有 Tauri IPC 调用统一走 `lib/tauri-api.ts`（底层是 Tauri `invoke`），提供 Mock 实现支持浏览器环境调试（`just dev-web`）。后端推送走 Event 通道。
- **组件拆分**：值查看器按数据类型拆分独立模块（`viewers/`），`value-viewer.tsx` 退化为路由分发（v0.2.3 重构，从 1783 行拆为 14 个文件）。
- **国际化**：i18next + react-i18next，翻译资源按模块分 key（common / connection / browser / cli / monitor / pubsub / settings / update / shortcuts / errorBoundary / confirm / dataExport / dataImport），LanguageDetector 自动持久化偏好。
- **错误边界**：根级 `ErrorBoundary` 捕获渲染异常 + 降级 UI；`ReleaseNotesMarkdown` 单独包错误边界，异常时降级为纯文本（v0.2.8）。
- **快捷键**：`use-global-shortcuts.ts` 统一注册；搜索框带 `data-search-input` 属性确保 ⌘F 聚焦正确。
- **虚拟滚动**：所有大列表（Key 列表 / Pub/Sub 消息）使用 `react-virtuoso`。
- **图表**：`recharts` 折线图，监控页 4 个核心指标。
- **Toast**：`sonner` 统一通知（连接成功 / 失败 / 操作结果）。
- **主题**：`next-themes`，偏好写 `localStorage`。

## 前端负向约束

- ❌ **不要在 Store 之间直接互调**：跨域操作在组件层调度，避免循环依赖。
- ❌ **不要硬编码中文/英文文案**：所有 UI 文案走 i18n key；新增 key 必须同步 `en-US.json` 和 `zh-CN.json`，`just i18n-check` 校验通过。
- ❌ **不要使用原生 `confirm()` / `alert()`**：危险操作统一走 `ConfirmDangerDialog`；FLUSH 类需输入确认文本。
- ❌ **不要在 Key 列表变更后触发整库重新扫描**：新增 / 复制 / 重命名 / 删除应局部更新本地状态（v0.2.4 改进）。
- ❌ **不要让 Monaco / 大值组件共享同一 model**：用独立 `path` prop 隔离（v0.2.1 修复 Hex 切换数据丢失）。
- ❌ **不要在表格视图全量加载**：Hash/List/Set/ZSet/Stream 必须服务端分页（每页 200 条）。
- ❌ **不要在输入框开启 autoCapitalize / autoCorrect / spellCheck**：全局关闭，避免改写 Key 名/值。
- ❌ **不要为前端写测试**：暂未配置前端测试框架，前端行为变更靠 `just lint` + `just dev` 手动验证。

## 国际化资源

- 文件：`src/i18n/locales/en-US.json` 和 `src/i18n/locales/zh-CN.json`
- 语言检测：`i18next-browser-languagedetector`（系统语言 + localStorage 持久化）
- 一致性校验：`just i18n-check`
