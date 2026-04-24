# task-021-optimistic-locking.md

## 目标

实现: Issue 乐观锁与并发控制

必须包含:

- 在 Issue 更新时引入 version 或 updatedAt 校验
- 检测并发修改冲突
- 冲突时返回 CONFLICT 错误

明确不实现:

- 分布式锁
- 悲观锁
- 跨服务事务

## 变更范围

修改模块:

- Issue Service
- Issue API
- DB Access Layer

依赖模块:

- 错误模型

允许修改目录:

- /app/api/issues/**
- /lib/services/**
- /lib/db/**
- /specs/architecture.md
- /specs/progress.md

## API

### 更新 Issue

PATCH /api/issues/:id

输入:

{
  id: string,
  expectedUpdatedAt: string
}

输入约束:

- expectedUpdatedAt 必须提供
- 必须与当前数据库记录一致

输出:

{
  success: true
}

错误:

- 若不一致返回 CONFLICT

## 测试用例

### 正常更新

updatedAt 匹配成功更新

### 并发冲突

updatedAt 不匹配返回 CONFLICT

### 边界

缺少 expectedUpdatedAt 返回 VALIDATION_ERROR

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] 乐观锁机制
- [ ] 冲突检测
- [ ] 错误返回
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
