# Task 005 · Issue 状态流转（最小状态机）

## 目标

为 Issue 引入受控的状态流转能力，避免状态随意修改。

本任务只实现：

- Issue 状态字段扩展
- 状态流转规则
- 更新 Issue 状态接口

本任务不得实现：

- 指派
- 评论
- 审计日志（只需预留，不写入）
- 权限体系扩展

## 状态定义（强制）

Issue.status 必须为以下枚举：

- OPEN
- IN_PROGRESS
- DONE

不得新增其他状态

## 状态流转规则（强制）

只允许以下流转：

- OPEN → IN_PROGRESS
- OPEN → DONE
- IN_PROGRESS → DONE
- IN_PROGRESS → OPEN
- DONE → OPEN

禁止：

- DONE → IN_PROGRESS

违反规则必须返回：INVALID_STATE_TRANSITION

## 必须实现的数据变更

更新 issues 表：

- status: string（枚举值）
- 默认值：OPEN

## 输入规则

更新状态输入：

```ts
{
  status: "OPEN" | "IN_PROGRESS" | "DONE"
}
```

必须使用 Zod 校验

## 服务层函数

必须实现：

- updateIssueStatus

行为：

- 必须已登录
- 必须属于当前用户 Project
- 必须符合状态流转规则
- 更新 updatedAt
- 返回更新后的 Issue

## API

- PATCH /api/projects/[projectId]/issues/[issueId]/status

行为：

- 未登录 → UNAUTHENTICATED
- 非法输入 → VALIDATION_ERROR
- 不存在 → NOT_FOUND
- 非法流转 → INVALID_STATE_TRANSITION

## 验证规则

### 功能

- OPEN → IN_PROGRESS 成功
- IN_PROGRESS → DONE 成功
- IN_PROGRESS → OPEN 成功
- DONE → OPEN 成功
- OPEN → DONE 成功
- DONE → IN_PROGRESS 失败

### 权限

- 不能操作他人 Project Issue

### 架构

- service 层实现规则
- API 不写逻辑

### 质量

- lint / typecheck / test 通过

## 单元测试

必须覆盖：

- 所有合法流转
- 所有非法流转
- 未登录
- 跨 Project

## 完成定义

1. 状态机规则生效
2. 非法流转被阻止
3. 所有路径有测试
