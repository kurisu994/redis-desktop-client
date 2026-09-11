# memory-bank 迁移到四层结构

- **时间**：2026-09-11
- **提交**：`619904d` 📝 docs(memory-bank): 迁移到四层结构并接入路径注入 hook

## 目标

把 `memory-bank/` 从旧版 6 枢纽结构（`projectbrief` / `productContext` / `systemPatterns` / `techContext` / `activeContext` / `progress`）迁移到四层结构，降低多人协作的冲突面。

## 方案与结果

用 `migrate_legacy.py --plan/--apply` 做机械搬运，再手工完成脚本做不了的语义合并与按领域拆分：

| 新文件 | 来源 | 命中路径 |
| --- | --- | --- |
| `00-project.md` | projectbrief + productContext | 无（开局必读） |
| `10-frontend.md` | systemPatterns 前端部分 + 架构总览 | `src/**` |
| `20-backend.md` | systemPatterns 后端部分 + 数据存储 | `src-tauri/src/**` |
| `21-tauri-config.md` | techContext 的 Tauri 配置与权限 | `src-tauri/tauri.conf.json`、`src-tauri/capabilities/**` |
| `30-deps.md` | 前后端依赖版本矩阵 | `package.json`、`src-tauri/Cargo.toml`、`pnpm-lock.yaml` |
| `31-build-tools.md` | justfile、Next/shadcn 配置、终端工具约定 | `justfile`、`next.config.ts`、`components.json` 等 |
| `32-ci-release.md` | CI/CD、发布流程、提交规范 | `.github/workflows/**`、`scripts/**`、`CHANGELOG.md` 等 |

## 验收结果

- `migrate_legacy.py --verify`：193 个技术标识符全部保留，`.legacy/` 已删除。
- 20 个代表性路径的 hook 模拟注入全部命中且一一对应。
- 单份规范最大 6,887 字符（`00-project.md`），全部 < 9,000。
- `.claude/hooks/inject-memory-bank.py` 已装，原 gstack `PreToolUse` 保留完好；`.gitattributes` 已配 `merge=union`。
- 全项目无指向旧枢纽的悬空引用；`AGENTS.md` 会话收尾段落改为指向新结构。

## 迁移中发现的文档失真（已修正）

- 旧 `projectbrief.md` 当前版本停在 **0.2.8**，实际 git tag 已到 **v0.2.9**（2026-06-26）。
- 旧 `progress.md` 把 SSH known_hosts / TOFU 记成 **0.3.0 / 0.3.1**，实际这两项以 **v0.2.9** 发布。修正依据为 git tag 与 `CHANGELOG.md`。

## 已知限制

Pi 平台不支持路径触发注入（工具事件无法回传上下文），只装了 Claude Code 的 hook；Pi 下按 `memory-bank/README.md` 的映射表人工查阅。
