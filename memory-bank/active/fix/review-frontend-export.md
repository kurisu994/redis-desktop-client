# fix/review-frontend-export

> 审查前端/导出侧配合项。已对齐白厄 PR #3（`cursor/security-connection-isolation-dd25` @ `8f9e02e`）。

## 目标

配合修审查问题中的前端项；密码脱敏 / 导出 v2 / 能力标志已随白厄分支合入本地；补齐「清除密码」方案 1。

## 验收标准

- [x] 测试连接失败有 toast（保留原有内联结果条）
- [x] 含密导出勾选后加强警告；导出成功/失败 toast
- [x] RENAME 覆盖前明确确认对话框；失败 toast
- [x] 对齐白厄契约：list 脱敏、export v2、get_backend_capabilities（来自 PR #3）
- [x] 方案 1：空框=保留密码；编辑且 hasPassword 时显示「清除密码」，勾选发 clearPassword:true
- [x] 推远端 fix/review-frontend-export
- [ ] 合入 main（仍等开拓者另确认；勿自行合 PR #3）

## 备注

- 分支 tip 在白厄 `8f9e02e` 之上叠本侧提交
- 不推 main；合 PR #3 进 main 由开拓者另确认

## 阻塞

- 无前端阻塞；等开拓者确认推远端 / 合 PR
