# Issue 批量操作

## 目标

实现: Issue 批量操作能力

必须包含:

- 支持批量修改 Issue 状态（OPEN / CLOSED）
- 支持批量修改 assignee
- 支持基于筛选结果执行批量操作

明确不实现:

- 批量删除 Issue
- 复杂条件批处理（如脚本/规则引擎）

## 变更范围

修改模块:

- Issue API
- Issue Service
- Issue Validator
- Assignee Service
- Audit Service

依赖模块:

- DB Access Layer
- Auth 模块

允许修改目录:

- /app/api/issues/**
- /lib/services/**
- /lib/validators/**
- /lib/db/**
- /lib/audit/**

## API

### 批量更新 Issue

PATCH /api/issues/batch

输入:

{
  issueIds: string[],
  state?: "OPEN" | "CLOSED",
  assigneeId?: string
}

输入约束:

- issueIds 不可为空
- 至少提供一个更新字段（state 或 assigneeId）
- state 与 assigneeId 可同时存在
- 必须保证权限校验

输出:

{
  success: true,
  updatedCount: number
}

## 测试用例

### 批量关闭 Issue

多个 OPEN Issue 成功变为 CLOSED

### 批量指派

多个 Issue 成功更新 assignee

### 混合更新

同时更新 state 与 assignee 成功

### 权限控制

无权限 Issue 不得被更新

### 部分失败

部分 Issue 无法更新时，必须返回错误（不允许静默成功）

## 完成与交付标准

必须交付:

- 批量操作 API
- Service 层批量逻辑
- 权限与校验
- 审计日志支持
- 测试用例

完成条件:

- [ ] 功能闭环可用
- [ ] 权限正确
- [ ] 数据边界正确
- [ ] 所有逻辑可测试
- [ ] 测试全部通过
