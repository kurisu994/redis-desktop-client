# Data Browser DB 下拉收敛（v0.2.9 之后）

- **时间**：2026-06-26
- **提交**：`4d2ecae` 🐛 fix(browser): 收敛 DB 下拉显示范围
- **来源**：旧版 `memory-bank/activeContext.md`（迁移前的快照 git describe 为 `v0.2.9-1-g7ecf28e-dirty`，迁移时为 `v0.2.9-2-g4d2ecae`）

## 目标

修复经跳板机 / SSH 连接后，目标 Redis 配置 `databases=256` 导致 Data Browser 顶部 DB 下拉展开到 `db0` ~ `db255` 的问题。

## 根因

`get_db_info` 后端返回 Redis `CONFIG GET databases` 的真实配置值，前端工具栏直接用 `dbCount` 渲染所有下拉选项；当目标 Redis 配置为 256 个逻辑库时会展示大量空库。

## 方案

`KeyToolbar` 新增可见 DB 计算逻辑，默认展示前 16 个库（`db0` ~ `db15`）；`db16+` 只有在 `INFO keyspace` 中有 key，或当前已被选中时才进入下拉。

## 已做决策

- 不把后端 `db_count` 强行改成 16，避免破坏真实 Redis 配置语义；后端 `db_count` 仍表示 Redis 配置值，不改 IPC 返回结构。
- UI 默认只展示 `db0` ~ `db15`，同时保留有数据的高位 DB，避免隐藏真实存在的 `db16+` 数据。
- 判定这不是长期架构变化，当时不更新 `memory-bank/progress.md`。

## 验证

`pnpm exec prettier --write src/components/browser/key-toolbar.tsx`、`just lint-web` 均通过；`CHANGELOG.md` 的 `Unreleased` 已记录这次用户可见修复。

## 后续（当时遗留）

1. 如需更强验证，可用配置 `databases=256` 且仅 `db0` ~ `db15` 有数据的 Redis 实例手动检查下拉。
2. 若后续需要显式访问空的 `db16+`，再设计「显示全部数据库」开关或搜索式 DB 跳转。
