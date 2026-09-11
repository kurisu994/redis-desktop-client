---
name: 32-ci-release
description: CI/CD 流水线、发布流程、提交信息规范与文档维护约定
paths:
  - ".github/workflows/**"
  - "scripts/**"
  - ".husky/**"
  - "CHANGELOG.md"
  - "docs/**"
---

# 32-ci-release — CI/CD、发布与文档

## CI 流水线（`.github/workflows/ci.yml`，Push / PR 触发）

- 前端：ESLint + TypeScript 类型检查。
- 后端：`cargo clippy --all-targets --all-features -- -D warnings` + `cargo test`。
- 跨平台构建验证：macOS ARM / Intel、Linux、Windows。

## Release 流水线（`.github/workflows/release.yml`，Tag 触发）

- 三平台并行 Tauri 构建。
- 自动生成 `latest.json` 更新清单。
- 自动创建 GitHub Release 并上传产物。

## 版本与发布流程

- 版本号分散在 `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`，由 `just version <ver>`（`scripts/bump-version.js`）统一改写，**不要手改单处**。
- 发布走 `just release <tag>`：同步版本 → 把 `[Unreleased]` 自动改写成新版本段落 → Commit → 推主干 → 打 Tag → 推 Tag 触发 CI 构建。
- `CHANGELOG.md` 遵循 [Keep a Changelog](https://keepachangelog.com/) + [语义化版本](https://semver.org/)。日常改动写进 `[Unreleased]`，按 `### ✨ 新增 / 🐛 修复 / 🔧 变更` 分组，条目要描述**用户可感知**的变化。

## 提交规范

- **Conventional Commits**：`scripts/verify-commit.js` 通过 Husky `commit-msg` Hook 校验。
- Commit message 用中文，格式 `[可选 emoji] 类型(可选范围): 动词开头的主题`，主题 ≤ 50 字；不加署名行。
- 常用类型：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `tests` / `chore` / `workflow` / `build` / `CI` / `typos` / `types` / `wip` / `release` / `dep` / `locale`。
- 提交应聚焦单一变更；PR 需含变更摘要、已执行验证命令、相关 issue；UI 变更附截图或录屏。

## 文档维护

- 项目文档：`README.md`、`AGENTS.md`、`docs/REQUIREMENTS.md`、`docs/DEVELOPMENT_PLAN.md`、`CHANGELOG.md`、`memory-bank/`。
- 用户可见变更必须进 `CHANGELOG.md`；`docs/` 下的需求与计划文档在范围变化时同步。
- 会话收尾：有代码变更 / 重要决策 / 阻塞或下一步时，更新 `memory-bank/active/<branch>.md`；里程碑、架构或长期约定变化时补 `memory-bank/` 共识层文件，并检查 `CHANGELOG.md`。
