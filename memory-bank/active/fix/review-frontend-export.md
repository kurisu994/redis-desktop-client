# fix/review-frontend-export

> 审查前端/导出侧配合项。后端云端 agent（白厄 bc-91fb1cf1）仍在跑，连接模型未定稿；等其 PR 给出字段/文案/能力标志后再跟模型适配。

## 目标

配合修审查问题中**可独立落地**的前端项；依赖后端钩子的先列缺口、不开推 main。

## 验收标准

- [x] 测试连接失败有 toast（保留原有内联结果条）
- [x] 含密导出勾选后加强警告；导出成功/失败 toast
- [x] RENAME 覆盖前明确确认对话框；失败 toast
- [ ] 密码勿进前端明文（等后端 `list_connections` 脱敏 / `hasPassword` 等契约）
- [ ] 导出 v2 保留 SSH/TLS/Sentinel/Cluster 元数据（等后端 `ExportedConnection` 扩字段 + version bump）
- [ ] Sentinel/Cluster/TLS 能力标志与文案跟白厄连接模型对齐（现有 SSH-standalone-only 文案已占位）

## 备注

- 分支基于 `origin/main` @ `277bf4f`（比白厄云端基线 `746a435` 新，中间为 AppImage/发布文档）
- 不推 main；未推远端除非开拓者确认
- 审查无单独报告文件，清单来自昔涟任务描述 + 代码对照

## 阻塞

- 等白厄 PR：连接模型字段、密码脱敏 IPC、export v2 schema、能力标志
