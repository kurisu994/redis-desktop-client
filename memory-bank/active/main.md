# main

> 分支级活跃上下文：本次在做什么、验收标准、遗留。任务完成后把结论挪到 `archive/YYYY-MM/`。
> 高频流水账写 `journal/<dev>.md`，不要写在这里。

## 目标

把 `memory-bank/` 从旧版 6 枢纽结构迁移到四层结构（共识层 / 任务层 / 个人层 / 归档层）。

## 验收标准

- [x] 旧枢纽合并为 `00-project.md`，架构与技术事实按领域拆成 `1X`/`2X`/`3X-*.md`，每份 < 9,000 字符
- [x] 每份领域规范都带 `paths` frontmatter，且经 hook 模拟输入实测能命中
- [x] `README.md` 的路径映射表从各文件 frontmatter 实际抽取生成
- [x] 已安装 `.claude/hooks/inject-memory-bank.py` 并在 `settings.json` 挂上 PostToolUse
- [x] `.gitattributes` 配 `memory-bank/journal/*.md merge=union`
- [x] `migrate_legacy.py --verify` 通过，旧枢纽已清理

## 备注

- 迁移中发现旧文档两处与仓库事实冲突，已按 git tag / `CHANGELOG.md` 修正：
  - `projectbrief.md` 的当前版本停在 0.2.8，实际已发布 v0.2.9（2026-06-26）。
  - `progress.md` 把 SSH / TOFU 能力记作 0.3.0 / 0.3.1，实际以 **v0.2.9** 发布。
- 记忆银行迁移属文档层变更，不改版本号，无需新增 CHANGELOG 条目。
