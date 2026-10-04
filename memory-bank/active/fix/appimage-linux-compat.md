# AppImage Linux 兼容性与国际化

## 目标与根因

- 修复收录测试 Ubuntu 22.04 上 v0.2.10 的 GLIBC_2.38 / 2.39 依赖失败；`.DirIcon` 在该次测试已通过。
- 修复首选 en-GB、备选 zh-CN 时错误选择中文，以及 HTML 语言写死为中文。
- 默认 README 使用英文，原中文保留并添加互链。

## 实现与验收

- CI / Release Linux 构建统一固定 Ubuntu 22.04；AppImage 启动检查隔离 HOME/XDG，检查 20 秒存活、窗口并保存 en_US/de_DE/zh_CN 截图。
- 检测到的语言逐项归一化：中文映射 zh-CN，其余 en-US；已保存偏好优先，HTML lang 同步界面语言。
- 本地已通过 just fmt、just lint（ESLint/tsc/Clippy）、just i18n-check、6 项 AppImage 元数据回归、shell 语法和 diff 检查。
- 8 种语言输入的实际配置检查通过：en-US、en-GB + zh-CN、de-DE + zh-CN、C、zh-CN、zh-TW、zh-Hans、空偏好；浏览器中中英切换、HTML lang 与重载保持手动选择已验证。
- 初次 CI 37180963395 复用旧 aws-lc 缓存导致 __isoc23_sscanf 链接失败；已隔离缓存。
- PR #2 的 CI 37181318391（代码 b86cc38）确认 Linux 无旧缓存，构建、图标校验及三种 locale 启动全部通过；已查看真实 AppImage 截图，en_US/de_DE 显示英文、zh_CN 显示中文，窗口渲染正常。
- 本轮 CI 全部 6 个 job 成功：Lint、Rust 31 项测试、Linux、macOS ARM、macOS Intel、Windows 构建。
- 截图和日志：[appimage-smoke-ubuntu-22.04](https://github.com/kurisu994/redis-desktop-client/actions/runs/37181318391/artifacts/11295705991)，有效期至 2026-10-18。最后的文档提交不改变已验证的程序或构建配置。
- 为 CI/Release 打包任务按 matrix.os + target 隔离 Rust 缓存，避免跨 Ubuntu 版本复用已编译依赖。

## 后续状态

- 2026-10-04 用户已明确授权合并全部分支并发新版；PR #2 精确 head d866f4d 六项 CI 全通过，以 merge commit 161bd427 合入 main。
- v0.2.11 发布验收转至 memory-bank/active/main.md；不修改已发布 v0.2.10。新公开包发布后，收录 PR #5338 才能验证本次修复。
