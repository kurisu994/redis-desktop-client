# journal — kurisu

> 只追加，不修改历史条目。每段结尾保留一个空行（`merge=union` 依赖它分隔条目）。

## 2026-09-11 memory-bank 迁移到四层结构

- 项目原为旧版 6 枢纽结构，按 `~/develop/Agent/rules/memory-bank.md` 迁移到共识层 / 任务层 / 个人层 / 归档层。
- 用 `migrate_legacy.py --plan/--apply` 做机械搬运，AI 负责语义合并与按领域拆分。
- 拆分结果：`00-project.md`（无 paths）+ `10-frontend` / `20-backend` / `21-tauri-config` / `30-deps` / `31-build-tools` / `32-ci-release`，全部 < 9,000 字符。
- 坑一：`techContext.md` 里版本号停在 `0.2.8`，`progress.md` 把 SSH/TOFU 记成 `0.3.0` / `0.3.1`，而 git tag 只有 `v0.2.9`。以仓库事实为准修正，未盲信旧文档。
- 坑二：Pi 平台不支持路径触发注入（工具事件无法回传上下文），所以只有 Claude Code / Codex / OpenCode 装了 hook；Pi 下按 README 的路径映射表人工查阅。

