# AppImage Linux 兼容性与国际化

## 目标与根因

- 修复收录测试 Ubuntu 22.04 上 v0.2.10 的 GLIBC_2.38 / 2.39 依赖失败；`.DirIcon` 在该次测试已通过。
- 修复首选 en-GB、备选 zh-CN 时错误选择中文，以及 HTML 语言写死为中文。
- 默认 README 使用英文，原中文保留并添加互链。

## 实现与验收

- CI / Release Linux 构建统一固定 Ubuntu 22.04；AppImage 启动检查隔离 HOME/XDG，检查 20 秒存活、窗口并保存 en_US/de_DE/zh_CN 截图。
- 检测到的语言逐项归一化：中文映射 zh-CN，其余 en-US；已保存偏好优先，HTML lang 同步界面语言。
- 本地已通过 just fmt、just lint（ESLint/tsc/Clippy）、just i18n-check、6 项 AppImage 元数据回归、shell 语法和 diff 检查。
- 待完成：实际页面语言验证、Ubuntu 22.04 构建/启动与截图检查、其余平台 CI。

## 发布边界

- 本阶段准备并验证代码修复；不创建新 release/tag，不改已发布 v0.2.10。
- 下一次正式发布后，收录 PR #5338 才能验证新的公开下载包。
