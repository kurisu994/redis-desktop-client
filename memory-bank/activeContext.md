# 活跃上下文

> 这是 Memory Bank 中最动态的文件，每次会话结束前由 AI 主动更新。

## 当前状态

- **项目版本**：v0.2.8（2026-05-23 发布）
- **当前分支**：`main`
- **工作树**：存在本会话未提交变更：Key 扫描批大小调整为 500。
- **最近 commits**：
  - `45c50cb` feat(codex): 添加 gstack 前置工具使用检查钩子
  - `9a9e1af` chore(tauri): 更新应用版本至 v0.2.8 并移除过时的 gstack 文档
  - `d09b1b4` 🔖 release: v0.2.8
  - `3908217` fix(更新): 修复下载进度状态与异常记录
  - `ccbc5f8` docs: 更新 ReleaseNotesMarkdown 错误边界变更日志

## 本会话工作

- 审查 Key 加载链路：前端以 cursor 串行调用 Tauri `scan_keys`，后端执行 `SCAN` 后通过 pipeline 批量获取 `TYPE`。
- 将前端单次 Key 扫描批大小从 200 调整为 500，覆盖初始扫描、自动续扫和兜底续扫。
- 已执行 `just lint-web`，ESLint 与 TypeScript 类型检查通过。

## 活跃文件

- `src/components/browser/data-browser.tsx`：新增 `KEY_SCAN_BATCH_SIZE = 500`，替换 3 处调用参数。
- `memory-bank/activeContext.md`：记录本轮决策与验证结果。

## 已做决策

- 不通过多线程并发遍历单个 DB 的 `SCAN`：下一 cursor 依赖上一响应，并发会导致重复扫描或放大 Redis 负载。
- 先将批大小增至 500 以降低 IPC/网络往返次数；保留当前自动扫描至完成、最多 100,000 个 Key 的行为。

## 下一步

- 如需进一步改善首次进入 DB 的体感，应改为首批立即展示、再按滚动或“加载更多”继续 cursor 扫描；这会改变当前完整预加载交互，需单独确认。

## 阻塞

无。

## 关联记忆

- 项目愿景 → [[projectbrief]]
- 业务上下文 → [[productContext]]
- 架构约定 → [[systemPatterns]]
- 技术栈事实 → [[techContext]]
- 版本历史 → [[progress]]
