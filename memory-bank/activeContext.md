# 活跃上下文

> 这是 Memory Bank 中最动态的文件，每次会话结束前由 AI 主动更新。

## 当前状态

- **当前分支**：`main`。
- **工作树**：有本轮 DB 下拉修复与记录变更，涉及 `src/components/browser/key-toolbar.tsx`、`CHANGELOG.md`、`memory-bank/activeContext.md`。
- **版本位置**：当前工作区位于 `v0.2.9-1-g7ecf28e-dirty`。
- **本轮目标**：修复跳板机/SSH 连接后 Redis 配置 `databases=256` 导致 Data Browser 顶部 DB 下拉展示 `db0` ~ `db255` 的问题。

## 本会话工作

### Data Browser DB 下拉收敛

- **根因**：`get_db_info` 后端返回 Redis `CONFIG GET databases` 的真实配置值，前端工具栏直接用 `dbCount` 渲染所有下拉选项；当目标 Redis 配置为 256 个逻辑库时会展示大量空库。
- **修复**：`KeyToolbar` 新增可见 DB 计算逻辑，默认展示前 16 个库；`db16+` 只有在 `INFO keyspace` 中有 key，或当前已被选中时才进入下拉。
- **保留契约**：后端 `db_count` 仍表示 Redis 配置值，不改 IPC 返回结构；修复只收敛顶部下拉展示。
- **验证**：`pnpm exec prettier --write src/components/browser/key-toolbar.tsx`、`just lint-web` 均通过。
- **文档**：`CHANGELOG.md` 的 `Unreleased` 已记录这次用户可见修复。

## 已做决策

- 不把后端 `db_count` 强行改成 16，避免破坏真实 Redis 配置语义。
- UI 默认只展示 `db0` ~ `db15`，同时保留有数据的高位 DB，避免隐藏真实存在的 `db16+` 数据。
- 这次不是长期架构变化，不更新 `memory-bank/progress.md`。

## 下一步

1. 如需更强验证，可用配置 `databases=256` 且仅 `db0` ~ `db15` 有数据的 Redis 实例手动检查下拉。
2. 若后续需要显式访问空的 `db16+`，再设计“显示全部数据库”开关或搜索式 DB 跳转。

## 阻塞

- 无。

## 关联记忆

- 项目愿景 → [[projectbrief]]
- 业务上下文 → [[productContext]]
- 架构约定 → [[systemPatterns]]
- 技术栈事实 → [[techContext]]
- 版本历史 → [[progress]]
