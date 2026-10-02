# main

> 分支级活跃上下文：本次在做什么、验收标准、遗留。任务完成后把结论挪到 `archive/YYYY-MM/`。
> 高频流水账写 `journal/<dev>.md`，不要写在这里。

## 目标

发布 v0.2.10，交付已合并的 AppImage 图标链接修复及此前 main 中的 DB 下拉范围修复。用户已明确授权提交、推送、打新标签和 GitHub Release；不得覆盖旧版本附件。

## 验收标准

- 最新 main 为 `42cf36d`，对应 CI #109 六项任务全绿；远端最新标签和 Release 均为 v0.2.9，v0.2.10 可用。
- `just version 0.2.10` 同步三份配置，并同步 Cargo.lock 根包版本；发布说明保留两项已合入修复。
- 本地格式、前端检查、AppImage 回归及版本一致性检查通过后，按 `just release v0.2.10` 的版本、说明、提交、推主干和推标签步骤分步执行。
- 跟进 Release 到终态，核对各平台附件、更新清单及公开 AppImage 的相对 `.DirIcon`；最终结果以 v0.2.10 Release、对应 Actions 与本机发布报告为准。

## 备注

- AppImage 修复 PR #1 已合并，PR/main CI 均通过；本机旧检出未修改，当前使用任务目录的干净 main。
- 本机只能只读解析 Linux AppImage；完整 Linux 打包由 GitHub Actions 执行。GUI 启动、AppImage catalog 完整测试需另行验证，向目录维护方留言不在本轮授权内。
- 已知遗留（非本分支任务）：macOS / Windows 代码签名、Cluster/Sentinel over SSH、连接分组、前端测试框架
