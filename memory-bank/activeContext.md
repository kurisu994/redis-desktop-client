# 活跃上下文

> 这是 Memory Bank 中最动态的文件，每次会话结束前由 AI 主动更新。

## 当前状态

- **项目版本**：v0.2.8（2026-05-23 发布）
- **当前分支**：`main`
- **工作树**：clean（无未提交变更）
- **最近 commits**：
  - `45c50cb` feat(codex): 添加 gstack 前置工具使用检查钩子
  - `9a9e1af` chore(tauri): 更新应用版本至 v0.2.8 并移除过时的 gstack 文档
  - `d09b1b4` 🔖 release: v0.2.8
  - `3908217` fix(更新): 修复下载进度状态与异常记录
  - `ccbc5f8` docs: 更新 ReleaseNotesMarkdown 错误边界变更日志

## 本会话工作

- 用户请求 `给项目生成记忆银行`。
- 按 `~/develop/Agent/rules/memory-bank.md` 的方法论生成完整 `/memory-bank/` 6 文件结构。
- 信息来源：`README.md`、`AGENTS.md`、`package.json`、`Cargo.toml`、`tauri.conf.json`、`CHANGELOG.md`、`docs/REQUIREMENTS.md`、`docs/DEVELOPMENT_PLAN.md`、`justfile`、实际目录结构、git log。

## 活跃文件

（本会话仅创建 Memory Bank，未修改业务代码）

- `memory-bank/projectbrief.md` ✨ 新建
- `memory-bank/productContext.md` ✨ 新建
- `memory-bank/systemPatterns.md` ✨ 新建
- `memory-bank/techContext.md` ✨ 新建
- `memory-bank/progress.md` ✨ 新建
- `memory-bank/activeContext.md` ✨ 新建（本文件）

## 已做决策

- 6 文件全部使用中文撰写，符合用户全局协作规则（CLAUDE.md「默认使用中文交流」）。
- 文档不重复 `AGENTS.md` 的编码规范，专注于「项目记忆」（架构、负向约束、历史决策、版本演进）。
- `systemPatterns.md` 的目录树以实际 `eza -T` 输出为准，不照搬文档描述（README.md 中 viewers/ 列表已落后于实际 14 个文件）。
- 版本号、依赖版本严格从 `package.json` / `Cargo.toml` / `tauri.conf.json` 提取，不猜测。

## 下一步

无具体下一步任务。Memory Bank 已就绪，后续：

- 新会话开始时自动加载 `activeContext.md`；其它 5 个文件按场景按需读取。
- 会话结束前更新本文件（活跃文件、决策、下一步、阻塞）。
- 若出现里程碑或重大架构变更，同步更新 `progress.md`。

## 阻塞

无。

## 关联记忆

- 项目愿景 → [[projectbrief]]
- 业务上下文 → [[productContext]]
- 架构约定 → [[systemPatterns]]
- 技术栈事实 → [[techContext]]
- 版本历史 → [[progress]]
