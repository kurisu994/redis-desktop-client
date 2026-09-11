# Memory Bank

项目长期记忆：约定怎么写代码、当前在做什么、为什么当初那么决定。

**AI 入口**：先读 `00-project.md`（项目定位与业务约束），再按下表在读写对应代码路径时查阅领域规范。

## 四层结构

| 层 | 文件 | 内容 | 归属 | 写法 |
| --- | --- | --- | --- | --- |
| 共识层 | `00-project.md`、`1X`/`2X`/`3X-*.md` | 项目定位、编码约定、技术事实 | 团队 | **改写**，走 PR review |
| 任务层 | `active/<branch>.md` | 本次做什么、验收标准、遗留 | 单分支 | 随便改，一分支一人动 |
| 个人层 | `journal/<dev>.md` | 会话流水、踩过的坑 | 个人 | **只追加，禁改历史**；每段结尾留空行 |
| 归档层 | `archive/YYYY-MM/<slug>.md` | 已完成任务的决策记录 | 团队 | 写完不再动，只新增 |

`active/` 与 `journal/` 是高频写入区，不要往仓库里放「当前活跃任务一览」这类派生汇总表。

## 路径映射表

由各文件 frontmatter 的 `paths` 自动注入（读/写命中的源码时注入对应规范，每份每会话一次）。

| 文件 | 说明 | 命中路径 |
| --- | --- | --- |
| `10-frontend.md` | 前端架构、目录组织、组件拆分、状态管理、IPC 封装与国际化约定 | `src/**` |
| `20-backend.md` | Rust 后端分层、Tauri Command 约定、连接池、加密存储与数据落地位置 | `src-tauri/src/**` |
| `21-tauri-config.md` | Tauri 运行时配置事实：窗口、CSP、打包目标、更新签名与 capabilities 最小权限 | `src-tauri/tauri.conf.json` `src-tauri/capabilities/**` |
| `30-deps.md` | 前端与后端依赖版本矩阵（package.json / Cargo.toml 事实来源） | `package.json` `pnpm-lock.yaml` `src-tauri/Cargo.toml` |
| `31-build-tools.md` | justfile 命令入口、构建产物体检、Next.js/shadcn 配置与终端工具约定 | `justfile` `next.config.ts` `components.json` `postcss.config.mjs` `eslint.config.mjs` `tsconfig.json` |
| `32-ci-release.md` | CI/CD 流水线、发布流程、提交信息规范与文档维护约定 | `.github/workflows/**` `scripts/**` `.husky/**` `CHANGELOG.md` `docs/**` |

`00-project.md` 不带 `paths`，作为开局必读。

## 平台支持

路径触发注入依赖平台 hook 机制：

| 平台 | 支持 | 机制 |
| --- | --- | --- |
| Claude Code | ✅ | `.claude/settings.json` + PostToolUse，事后注入不打断操作 |
| Codex | ✅ | `.codex/hooks.json` + PreToolUse，先拒一次再放行 |
| OpenCode | ✅ | `.opencode/plugins/*.js` 调同一个 Python 引擎 |
| Pi | ❌ | 扩展工具事件无法回传上下文，按上表人工查阅 |

本项目已安装 Claude Code hook（`.claude/hooks/inject-memory-bank.py`）。其它平台缺失时**不要从别处拷文件**，先确认该平台是否支持对应事件。

## 写作约定

- 事实优先：版本号、命令、配置值必须从真实文件提取；文档与代码冲突时以代码为准。
- `paths` 要精准指向规范真正约束的代码位置，写前用 `fd`/`rg` 确认 glob 有真实对应文件。
- 单份规范用 `wc -m` 核对，**不超过 9,000 字符**（超了按领域拆，不要靠截断）。
- `journal/*.md` 只追加、每段结尾留空行，配合 `.gitattributes` 的 `merge=union` 自动合并。
