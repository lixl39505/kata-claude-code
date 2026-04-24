# 通知未读计数与批量已读

## 目标

实现: 通知未读计数与批量已读能力

必须包含:

- 返回当前用户未读通知数量
- 支持一键将全部通知标记为已读
- 支持批量标记指定通知为已读

明确不实现:

- 通知分类统计
- 通知优先级
- 推送/邮件扩展

## 变更范围

修改模块:

- Notification API
- Notification Service
- DB Access Layer

依赖模块:

- Auth 模块

允许修改目录:

- /app/api/notifications/**
- /lib/services/**
- /lib/db/**
- /lib/validators/**
- /specs/architecture.md
- /specs/progress.md

## API

### 获取未读数量

GET /api/notifications/unread-count

输出:

{
  count: number
}

约束:

- 仅返回当前用户数据

### 批量标记已读

PATCH /api/notifications/read

输入:

{
  ids?: string[]
}

默认值:

- ids 为空时表示“全部标记已读”

输出:

{
  success: true,
  updatedCount: number
}

约束:

- 仅允许操作当前用户通知
- 不允许修改他人数据

## 测试用例

### 未读计数正确

返回当前用户未读数量

### 全部已读

不传 ids 时全部标记为已读

### 批量已读

指定 ids 正确更新

### 权限隔离

无法操作他人通知

### 幂等性

重复标记已读不报错

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] 未读计数 API
- [ ] 批量已读 API
- [ ] Service 逻辑
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
