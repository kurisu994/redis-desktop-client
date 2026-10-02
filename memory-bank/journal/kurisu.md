# journal — kurisu

> 只追加，不修改历史条目。每段结尾保留一个空行（`merge=union` 依赖它分隔条目）。

## 2026-09-11 memory-bank 迁移到四层结构

- 项目原为旧版 6 枢纽结构，按 `~/develop/Agent/rules/memory-bank.md` 迁移到共识层 / 任务层 / 个人层 / 归档层。
- 用 `migrate_legacy.py --plan/--apply` 做机械搬运，AI 负责语义合并与按领域拆分。
- 拆分结果：`00-project.md`（无 paths）+ `10-frontend` / `20-backend` / `21-tauri-config` / `30-deps` / `31-build-tools` / `32-ci-release`，全部 < 9,000 字符。
- 坑一：`techContext.md` 里版本号停在 `0.2.8`，`progress.md` 把 SSH/TOFU 记成 `0.3.0` / `0.3.1`，而 git tag 只有 `v0.2.9`。以仓库事实为准修正，未盲信旧文档。
- 坑二：Pi 平台不支持路径触发注入（工具事件无法回传上下文），所以只有 Claude Code / Codex / OpenCode 装了 hook；Pi 下按 README 的路径映射表人工查阅。

## 2026-10-02 AppImage 目录收录修复

- 检查 #5338 与 Actions 36363211761，PR 未合并、Test 仍失败。原始 v0.2.9 AppImage 校验和匹配 GitHub；直接读取 SquashFS 发现 `.DirIcon` 指向构建机绝对路径，图标文件本身正常。
- 对照 Tauri CLI 2.10.0 源码及上游 #15596，固定升级 CLI 为首个含修复的 2.12.0；lockfile 只更新 CLI 与对应平台包，其余依赖不变。
- 加入独立临时目录解包后的元数据检查，以及 6 项跨平台回归测试；在普通 CI 的 Linux 构建后执行。ESLint、TypeScript、格式检查通过，旧包元数据按预期失败，相对链接对照实验通过。
- 本机旧检出停留在 2024 年，保留不动；修复位于任务目录的最新源码独立克隆 `fix/appimage-diricon`。默认 pnpm 12 曾自动重新解析安装布局并遇到网络限制，停止后改用已缓存 pnpm 10.34.6，离线 frozen-lockfile 安装成功。
- 尚无 Linux 环境进行完整 AppImage 重建/启动/收录测试。下一步为获准后推送分支、向 main 开 PR 运行不发版的普通 CI；当前未提交、推送、发布或通知第三方。

## 2026-10-02 继续远端 CI 验证

- 用户在得知需要推送分支、开草稿 PR 才能触发普通 Linux CI 后批准「继续」。本轮授权覆盖提交、推送、草稿 PR 和范围内 CI 修复，不包含合并或发布。
- GitHub 连接确认为 kurisu994，具有项目 push 权限；将核实 PR head 与实际 CI 提交，并以真实 Linux 构建和最终包解包结果作为验收。

## 2026-10-02 AppImage 真实 Linux CI 验收通过

- GPG 签名提交 `7804e917099d9f2d1fb09407866efa89026c0630` 已推送，草稿 PR：https://github.com/kurisu994/redis-desktop-client/pull/1 。GitHub 确认签名有效，PR head 与 CI head SHA 一致。
- CI #107 / run 36960317566 completed/success，6 个 job 全绿：Lint、Test、Linux、macOS ARM/Intel、Windows。Rust 31/31，AppImage 元数据回归 6/6。
- Linux job 110693361147 使用 CLI 2.12.0 实际生成 AppImage；最终包解包检查输出 `AppImage metadata OK`，验证了 .DirIcon 修复，无需追加代码修复。
- PR 保持 draft/open，未合并、发布或部署；已发布 v0.2.9 未改变，GUI/目录完整收录测试仍需后续进行。
- 该验收结果已写入 PR 描述与任务报告；这次收尾的 active/journal 追加保留本地，未追加会再次触发完整 CI 的文档提交。

## 2026-10-02 补齐验收记录并处理 PR

- 用户要求「提交和推送代码，然后把 pr 处理了」，授权补齐本任务文档并合并 PR #1；不授权 release、发布标签或部署。
- 审查两份本地记录，均为 AGENTS.md 要求的任务验收历史，不含密钥或无关改动，纳入本次文档提交。
- 检查 PR 无评论或 review 阻塞、没有冲突。确认只有 CI 与按 `v*` 标签触发的 Release；main 合并仅触发普通 CI。
- 补充文档提交后按新 head 等待 CI，通过后将草稿转为就绪并合并；以合并后的 main CI 作为最终验证，不沿用旧 SHA 的检查结论。最新结果记录在 PR/Actions 和本机任务报告中。

## 2026-10-02 发布 v0.2.10

- 用户在得知 PR #1 合并、main CI 全绿但尚未发布后明确要求「发布新版本吧」，授权本次修复版的版本更新、提交推送及正常发布流程。
- 确认 Mac 已连接，工作区干净；main 为 `42cf36da14af96c832535d9a8ff3cd9b1b44a766`，CI #109 六项任务全绿。远端 tags/releases 最新均为 v0.2.9，选择下一补丁版本 v0.2.10。
- 对比 v0.2.9：仅有此前已合入的 DB 下拉修复、AppImage 修复及文档/工具调整；无新增未验证应用改动。发布说明保留两项用户可见修复。
- 通过 `just version` 同步配置，并同步 Cargo.lock 根包版本及记忆银行版本事实；保持依赖、Updater 公钥与签名流程不变。按 `just release v0.2.10` 的步骤分步执行，在确认发布提交成功后才推标签，触发现有四目标 Release 工作流，后续核对公开附件和 `.DirIcon`，不覆盖旧版本，不向目录维护方发消息。
- 最终发布 SHA、构建和公开产物验收结果记录在 v0.2.10 Release、对应 Actions 与本机发布报告中。
