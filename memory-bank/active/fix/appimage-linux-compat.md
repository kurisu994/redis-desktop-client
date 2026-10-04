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
- 草稿 PR #2，初次 CI 37180963395 的 Lint / Rust 31 项测试通过；Linux 命中旧缓存后在链接阶段报 __isoc23_sscanf 未定义（旧 glibc 头文件编译的 aws-lc 依赖），尚未执行启动检查。下一轮验证缓存隔离与真实产物。
- 为 CI/Release 打包任务按 matrix.os + target 隔离 Rust 缓存，避免跨 Ubuntu 版本复用已编译依赖。

## 发布边界

- 本阶段准备并验证代码修复；不创建新 release/tag，不改已发布 v0.2.10。
- 下一次正式发布后，收录 PR #5338 才能验证新的公开下载包。
