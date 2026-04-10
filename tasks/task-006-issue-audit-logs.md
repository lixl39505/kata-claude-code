# Task 006 · Issue 审计日志与操作记录

## 目标

为 Issue 关键操作建立可查询的审计日志，确保系统可以追踪谁在什么时间做了什么变更。

本任务只实现：

- 审计日志数据结构
- 在 Issue 创建时写入审计日志
- 在 Issue 状态变更时写入审计日志
- 获取指定 Issue 的审计日志列表

本任务不得实现：

- 评论
- Webhook
- 通知
- 撤销操作
- 差异可视化
- 全局审计搜索
- Project 级审计聚合页

## 本任务完成后必须具备的结果

- 存在审计日志持久化结构
- 创建 Issue 时会写入一条审计日志
- 更新 Issue 状态时会写入一条审计日志
- 已登录用户可以读取自己 Project 下指定 Issue 的审计日志
- 无法读取他人 Project 下的审计日志
- 所有输入经过 Zod 校验
- 所有功能具备对应单元测试

## 变更范围

允许新增或修改以下内容：

- `app/api/**`
- `lib/services/**`
- `lib/validators/**`
- `lib/errors/**`
- `lib/db/**`
- `lib/audit/**`
- `tests/**` 或 `__tests__/**`
- 数据库初始化或迁移文件

## 强制约束

- 不得引入新的后端框架、ORM、数据库或验证库
- API 层不得直接访问数据库
- API 层不得实现业务逻辑
- 所有数据库访问只能在 `lib/db`
- 所有输入必须通过 Zod 校验
- 所有认证判断必须复用 Task 002 的认证上下文能力
- 所有 Project / Issue 访问边界必须复用 Task 003 与 Task 004 已有能力
- 审计日志写入必须在 service 层完成，不得在 API 层拼接
- 当前任务不得实现：
  - 评论日志
  - 删除日志
  - 批量操作日志
  - 全局检索
  - 导出
  - 撤销

## 必须实现的数据结构

必须创建 `issue_audit_logs` 表（SQLite），包含以下字段：

```ts
IssueAuditLog {
  id: string
  issueId: string
  projectId: string
  actorId: string
  action: "ISSUE_CREATED" | "ISSUE_STATUS_CHANGED"
  fromStatus: "OPEN" | "IN_PROGRESS" | "DONE" | null
  toStatus: "OPEN" | "IN_PROGRESS" | "DONE" | null
  createdAt: string
}
```

约束：

- `id` 为字符串主键
- `issueId` 必须关联 `issues.id`
- `projectId` 必须关联 `projects.id`
- `actorId` 必须关联 `users.id`
- `action` 仅允许 `ISSUE_CREATED` 与 `ISSUE_STATUS_CHANGED`
- `ISSUE_CREATED` 时：
  - `fromStatus` 必须为 `null`
  - `toStatus` 必须为 `OPEN`
- `ISSUE_STATUS_CHANGED` 时：
  - `fromStatus` 与 `toStatus` 都必须有值
  - `fromStatus` 与 `toStatus` 不得相同

## 必须实现的输入规则

### 路径参数

以下参数必须校验为非空字符串：

- `projectId`
- `issueId`

本任务没有新的 body 输入结构。

## 必须实现的服务层函数

必须实现以下函数：

- `recordIssueCreatedAuditLog`
- `recordIssueStatusChangedAuditLog`
- `listAuditLogsForIssue`

行为要求：

### recordIssueCreatedAuditLog

- 只能在 Issue 创建成功后调用
- 写入：
  - `action = ISSUE_CREATED`
  - `fromStatus = null`
  - `toStatus = OPEN`

### recordIssueStatusChangedAuditLog

- 只能在合法状态流转成功后调用
- 写入：
  - `action = ISSUE_STATUS_CHANGED`
  - `fromStatus = 变更前状态`
  - `toStatus = 变更后状态`

### listAuditLogsForIssue

- 仅允许已登录用户调用
- 仅允许读取当前用户拥有的 Project 下的 Issue
- 返回该 Issue 的全部审计日志
- 必须按 `createdAt` 升序返回

## 必须修改的既有能力

### 1. Issue 创建流程

必须在 Task 004 的 Issue 创建成功后，写入一条 `ISSUE_CREATED` 审计日志。

### 2. Issue 状态流转流程

必须在 Task 005 的状态流转成功后，写入一条 `ISSUE_STATUS_CHANGED` 审计日志。

要求：

- 审计写入与主操作必须保持一致性
- 不允许出现 Issue 已创建但无创建日志
- 不允许出现状态已更新但无状态变更日志

如当前技术实现允许，必须保证同一事务内完成；若尚未封装事务，则必须在数据库访问层补足事务支持后再实现该任务。

## 必须实现的 API 接口

必须实现以下接口：

- `GET /api/projects/[projectId]/issues/[issueId]/audit-logs`

行为要求：

- 未登录返回 `UNAUTHENTICATED`
- Project 不存在或非拥有者返回 `NOT_FOUND`
- Issue 不存在返回 `NOT_FOUND`
- Issue 不属于该 Project 返回 `NOT_FOUND`
- 读取成功返回审计日志数组

## 返回数据要求

审计日志返回结构必须至少包含：

```ts
{
  id: string
  issueId: string
  projectId: string
  actorId: string
  action: "ISSUE_CREATED" | "ISSUE_STATUS_CHANGED"
  fromStatus: "OPEN" | "IN_PROGRESS" | "DONE" | null
  toStatus: "OPEN" | "IN_PROGRESS" | "DONE" | null
  createdAt: string
}
```

不得返回任何无关内部字段。

## 错误处理要求

必须覆盖以下错误：

- 未登录
- Project 不存在
- 无权访问 Project
- Issue 不存在
- Issue 不属于指定 Project

必须使用 Task 001 中定义的统一错误结构。

## 验证规则

完成任务后必须逐条满足：

### 数据层验证

- [ ] 存在 `issue_audit_logs` 表
- [ ] `issueId` 字段存在
- [ ] `projectId` 字段存在
- [ ] `actorId` 字段存在
- [ ] 审计日志访问代码仅位于 `lib/db`

### 写入验证

- [ ] 创建 Issue 后会写入一条 `ISSUE_CREATED` 日志
- [ ] `ISSUE_CREATED` 日志的 `fromStatus = null`
- [ ] `ISSUE_CREATED` 日志的 `toStatus = OPEN`
- [ ] 状态变更成功后会写入一条 `ISSUE_STATUS_CHANGED` 日志
- [ ] 状态变更日志正确记录 `fromStatus`
- [ ] 状态变更日志正确记录 `toStatus`
- [ ] 不会写入 `fromStatus === toStatus` 的状态变更日志

### 读取验证

- [ ] 已登录用户可以读取自己 Project 下指定 Issue 的审计日志
- [ ] 返回结果按 `createdAt` 升序排列
- [ ] 已登录用户不能读取他人 Project 下的审计日志
- [ ] Issue 不属于指定 Project 时返回 `NOT_FOUND`
- [ ] 未登录用户不能访问该接口

### 架构验证

- [ ] API 层无业务逻辑
- [ ] API 层无数据库访问
- [ ] 审计写入逻辑位于 service 层
- [ ] 认证判断复用 Task 002 能力
- [ ] Project / Issue 访问边界复用 Task 003 与 Task 004 能力
- [ ] 使用统一错误模型
- [ ] 主操作与审计写入保持一致性

### 质量门禁

- [ ] `npm run lint` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run test` 通过

## 单元测试要求

必须实现以下测试：

### Service 测试

- [ ] 创建 Issue 时成功写入 `ISSUE_CREATED` 日志
- [ ] 状态变更成功时成功写入 `ISSUE_STATUS_CHANGED` 日志
- [ ] 状态变更日志正确记录 `fromStatus` 与 `toStatus`
- [ ] listAuditLogsForIssue 按升序返回
- [ ] listAuditLogsForIssue 读取他人 Project 返回 `NOT_FOUND`
- [ ] listAuditLogsForIssue 读取不存在 Issue 返回 `NOT_FOUND`
- [ ] 审计写入失败时主操作整体失败或回滚

### API 测试

- [ ] `GET /api/projects/[projectId]/issues/[issueId]/audit-logs` 成功路径
- [ ] `GET /api/projects/[projectId]/issues/[issueId]/audit-logs` 未登录路径
- [ ] `GET /api/projects/[projectId]/issues/[issueId]/audit-logs` 他人 Project 路径
- [ ] `GET /api/projects/[projectId]/issues/[issueId]/audit-logs` 不存在 Issue 路径

## 交付物

- `issue_audit_logs` 表定义或迁移文件
- 审计日志 service
- 审计日志 API
- 对 Issue 创建与状态流转流程的改造
- 对应测试
- 可运行验证结果

## 完成定义

满足以下条件才算完成：

1. Issue 创建与状态变更都可留下审计记录
2. 审计记录可按 Issue 维度查询
3. 他人 Project 下的审计记录不可读取
4. 所有新增功能具备测试
5. 主操作与审计记录保持一致性

## 下一任务进入条件

本任务全部验证通过后，才进入下一个 task
