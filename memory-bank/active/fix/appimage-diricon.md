# fix/appimage-diricon

## 目标

修复 AppImage/appimage.github.io #5338 对 v0.2.9 的 `.DirIcon` 检查失败。用户已批准提交、推送修复分支、向 main 开草稿 PR，并跟进普通 CI；不合并、发版、部署或向目录维护方留言。

## 验收标准

- [x] 下载原始 AppImage 并核对 GitHub SHA-256，直接读取 SquashFS 确认根因。
- [x] CLI 从 2.10.0 固定升级到包含上游 #15596 的 2.12.0；package.json 与 lockfile 一致，其余依赖条目不变。
- [x] 增加 CI 产物检查与 `just test-appimage` / `just check-appimage`。
- [x] 6 项元数据回归测试、ESLint、TypeScript、格式与 diff 检查通过。
- [ ] Linux 实际重建 AppImage 并通过提取后的元数据检查。
- [ ] 用户批准后发布修复版本，再由目录维护方重跑收录测试。

## 备注与阻塞

- 基于 main `746a435f473f387e23e08cc2d4da6650af059acf` 的独立克隆；本机旧检出停在 2024 年，未修改。
- 原始包的 `.DirIcon` 是指向 `/home/runner/work/.../Redis Desktop Client.png` 的绝对软链接；PNG 实际存在。原包元数据检查按预期失败，复制后仅替换相对链接的对照实验通过；后者不是实际重建。
- 当前 Mac 没有可用的 Linux 容器/VM；本地未运行完整 Tauri/Linux 构建、AppImage 启动/截图或目录端完整测试，使用获准的远端普通 CI 验证。
- 普通 CI 已存在且不发版，无手动触发入口。用户已批准推送 `fix/appimage-diricon`、向 `main` 开草稿 PR，等待 Lint/Test/Build (ubuntu-latest) 及新增产物检查；不要推送 `v*` tag。
- 本机默认 pnpm 12 会自动转换依赖布局；本次使用与 CI 同 major 的 pnpm 10.34.6 安装和验证。
