# 基础通知能力（基于 mention 与 assignee）

## 目标

实现: 基础通知能力

必须包含:

- 在用户被 @ 提及时生成通知
- 在 Issue assignee 变更时生成通知
- 支持用户查询自己的通知列表
- 支持标记通知为已读

明确不实现:

- 邮件通知
- 推送通知
- 实时 websocket
- 通知分组 / 聚合
- 用户自定义通知规则

## 变更范围

修改模块:

- Notification API
- Notification Service
- Comment Service
- Assignee Service
- DB Access Layer

依赖模块:

- Auth 模块
- Comment mention 能力
- Issue assignee 能力

允许修改目录:

- /app/api/**
- /lib/services/**
- /lib/db/**
- /lib/validators/**
- /specs/architecture.md
- /specs/progress.md

## 数据模型

新增实体:

Notification

字段:

- id
- userId
- type ("MENTION" | "ASSIGNEE_CHANGED")
- issueId
- commentId?
- isRead
- createdAt

约束:

- userId 必须存在
- type 必须为合法类型
- commentId 仅在 mention 时存在

## API

### 获取通知列表

GET /api/notifications

输入:

{
  limit?: number,
  offset?: number,
  isRead?: boolean
}

默认值:

- limit = 20
- offset = 0

输出:

{
  items: Notification[],
  total: number
}

### 标记为已读

PATCH /api/notifications/:id/read

输出:

{
  success: true
}

## 业务规则

通知触发:

- mention: 每个被提及用户生成一条通知
- assignee:
  - 被指派人收到通知
  - 变更为同一人时不重复发送

权限:

- 用户只能访问自己的通知
- 不允许访问他人通知

一致性:

- 主操作与通知写入必须在同一事务

## 测试用例

### mention 触发通知

被 @ 的用户收到通知

### assignee 触发通知

被指派用户收到通知

### 查询通知

返回当前用户通知列表

### 已读标记

通知可被标记为已读

### 权限控制

无法访问他人通知

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] Notification 数据模型
- [ ] 通知触发逻辑
- [ ] 通知查询 API
- [ ] 已读能力
- [ ] 测试用例
- [ ] 文档更新

完成条件:

- [ ] 功能闭环可用
- [ ] 权限正确
- [ ] 数据边界正确
- [ ] 所有逻辑可测试
- [ ] 所有单元测试全部通过

## 后续动作

更新 specs/architecture.md 与 specs/progress.md
