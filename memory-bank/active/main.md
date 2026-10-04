# main — v0.2.11 发布

## 目标与授权

用户于 2026-10-04 明确要求处理 PR、将全部分支合并到 main 并发布新版本。发布 v0.2.11，交付 Ubuntu 22.04 AppImage 兼容性、语言回退及默认英文 README。

## 分支与已验证基线

- 远端仅 main、fix/appimage-diricon、fix/appimage-linux-compat 三个分支；本机原仓库也无额外未合入分支或未提交修改。
- 图标分支 6e79f70 已是原 main 62f31cd 的祖先。PR #2 以完整 merge 合并为 161bd427，两条修复分支均已包含在 main 历史中。
- PR 精确 head d866f4d 的 CI 37182066218 六项检查全部成功，包含图标与 en_US/de_DE/zh_CN 三种 AppImage 实际窗口启动。

## 发布验收

- 用 just version 0.2.11 同步三份配置，并同步 Cargo.lock 根包版本；只将 Unreleased 的现有修复归入 v0.2.11。
- 执行 just release 的等价分步流程：版本和说明 → 本地检查 → 签名提交 → 推 main → 验证该提交 CI → 新建并推 v0.2.11 标签。避免脚本吞掉提交失败后继续打标签。
- 跟进 Release 四平台到终态，核对公开附件、latest.json、AppImage SHA256/图标/GLIBC 与 updater 签名；不覆盖旧版本资产。
- 最终发布结果以 v0.2.11 Release、对应 Actions 与本机 release-v0.2.11-report.md 为准。

## 剩余事项

- 发布完成后，AppImage 收录 PR #5338 需要针对新公开包重跑；本次不自动向第三方留言。
