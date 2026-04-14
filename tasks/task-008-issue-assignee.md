# Task 008 · Issue 指派（Assignee）能力

## 目标

为 Issue 引入单一指派人能力，使 Issue 可以明确负责人。

本任务只实现：

- Issue assignee 字段
- 设置 / 变更 assignee
- 清空 assignee

本任务不得实现：

- 多指派人
- 成员系统
- 权限角色扩展
- 指派通知

## 本任务完成后必须具备的结果

- Issue 可以设置 assignee
- Issue 可以变更 assignee
- Issue 可以清空 assignee
- 只能操作当前用户 Project 下的 Issue
- 所有输入经过 Zod 校验
- 所有功能具备测试

## 数据结构变更

在 `issues` 表中新增字段：

assigneeId: string | null

约束：

- 可为空
- 必须指向 users.id

## 输入规则

{
  assigneeId: string | null
}

约束：

- 非 null 时必须为合法用户 id
- 允许传 null 表示清空

## 服务层

必须实现：

- updateIssueAssignee

行为：

- 必须已登录
- 必须属于当前用户 Project
- assigneeId 不存在用户时返回 NOT_FOUND
- 更新成功返回 Issue

## API

- PATCH /api/projects/[projectId]/issues/[issueId]/assignee

行为：

- 未登录 → UNAUTHENTICATED
- 非法输入 → VALIDATION_ERROR
- Issue 不存在 → NOT_FOUND
- Project 不属于用户 → NOT_FOUND
- assignee 不存在 → NOT_FOUND

## 验证规则

功能：

- 设置 assignee 成功
- 修改 assignee 成功
- 清空 assignee 成功

边界：

- 不存在用户 → 失败
- 跨 project → 失败
- 未登录 → 失败

架构：

- service 层实现逻辑
- API 不包含业务逻辑

质量：

- lint / typecheck / test 通过

## 单元测试

必须覆盖：

- 设置 assignee
- 修改 assignee
- 清空 assignee
- assignee 不存在
- 未登录
- 跨 project

## 完成定义

1. assignee 字段可用
2. 指派流程可控
3. 权限正确
4. 测试完整
