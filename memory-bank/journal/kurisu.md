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

