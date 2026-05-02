# task-025-security-hardening.md

## 目标

实现: 基础安全加固

必须包含:

- 统一检查所有写操作的认证与权限校验
- 确认所有外部输入都经过 Zod 校验
- 防止越权访问 Project / Issue / Comment / Notification / SavedView
- 检查敏感字段不被 API 意外返回
- 补齐安全相关测试用例

明确不实现:

- OAuth / SSO
- 双因素认证
- 高级风控
- WAF / 外部安全网关
- 加密审计系统

## 变更范围

修改模块:

- Auth 模块
- API 层
- Service 层
- Validator 层
- Error 模块

依赖模块:

- Zod Validator
- 统一错误模型
- Project 成员模型
- Notification 模型
- SavedView 模型

允许修改目录:

- /app/api/**
- /lib/auth/**
- /lib/services/**
- /lib/validators/**
- /lib/errors/**
- /specs/architecture.md
- /specs/progress.md

## API

### 安全约束检查

所有 API endpoint 均需要满足统一安全约束

任意 API endpoint

输入:

- 无新增输入

默认值:

- 无

输入约束:

- 所有外部输入必须经过 Zod 校验
- 所有写操作必须要求登录
- 所有资源访问必须在 Service 层完成最终权限校验
- API 层不得直接信任 request 中的 userId / role / projectId
- 禁止在 API 层直接访问数据库

输出:

- 无新增输出结构

输出约束:

- 未登录返回 UNAUTHENTICATED
- 权限不足返回 FORBIDDEN
- 非法输入返回 VALIDATION_ERROR
- 不得返回 passwordHash / session token / 内部错误细节 / SQL 细节

## 安全检查范围

必须覆盖:

- Auth API
- Project API
- Project Member API
- Issue API
- Issue Batch API
- Issue View API
- Comment API
- Mention API
- Notification API
- AuditLog API
- Dashboard / Stats API

重点检查:

- 非成员访问 Project 数据
- 非成员访问 Issue 数据
- 用户访问他人通知
- 用户访问他人 SavedView
- 批量操作绕过单项权限校验
- 统计接口绕过 Project 权限
- 审计日志接口泄露无权限数据

## 测试用例

### 写操作必须登录

未登录用户执行任意写操作必须返回 UNAUTHENTICATED

### Project 越权访问

非成员访问 Project 详情必须返回 FORBIDDEN 或 NOT_FOUND

### Issue 越权访问

非成员访问 Issue 详情、评论、审计日志必须失败

### Notification 越权访问

用户不得读取或标记他人的通知

### SavedView 越权访问

用户不得读取、使用或删除他人的视图

### 批量操作权限

批量操作中包含无权限 Issue 时必须整体失败，不允许部分静默成功

### 统计接口权限

统计接口不得返回无权限 Project 的聚合数据

### 输入校验覆盖

非法 query / body / path 参数必须返回 VALIDATION_ERROR

### 敏感字段脱敏

API 响应不得包含 passwordHash、session token、内部 SQL 或 stack trace

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] API 安全约束检查
- [ ] Service 层权限校验补齐
- [ ] Validator 覆盖补齐
- [ ] 敏感字段脱敏检查
- [ ] 越权访问测试用例
- [ ] 输入校验测试用例
- [ ] `specs/architecture.md` 更新
- [ ] `specs/progress.md` 更新

完成条件:

- [ ] 功能闭环可用
- [ ] 权限正确
- [ ] 数据边界正确
- [ ] 无越界功能实现
- [ ] 所有逻辑可测试
- [ ] 测试全部通过

## 后续动作

任务完成后, 根据实际情况更新 `specs/architecture.md`, 比如:

- 若安全约束发生变化, 需要同步更新权限模型与分层规则
- 若新增通用鉴权工具, 需要维护 Auth 模块说明
- 若新增统一响应脱敏策略, 需要补充到 API 输出约束

还需要更新 `specs/progress.md`, 维护项目开发进度.
