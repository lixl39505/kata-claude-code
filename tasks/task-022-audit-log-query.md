# task-022-audit-log-query.md

## 目标

实现: 审计日志查询能力

必须包含:

- 支持按 Issue 查询审计日志
- 返回操作类型、操作人、时间
- 支持分页

明确不实现:

- 全局日志检索
- 日志搜索（关键词）
- 日志导出

## 变更范围

修改模块:

- Audit API
- Audit Service
- DB Access Layer

依赖模块:

- Auth 模块
- Issue 权限模型

允许修改目录:

- /app/api/issues/**
- /lib/services/**
- /lib/db/**
- /specs/architecture.md
- /specs/progress.md

## API

### 获取 Issue 审计日志

GET /api/projects/[projectId]/issues/[issueId]/audit-logs

输入:

{
  limit?: number,
  offset?: number
}

默认值:

- limit = 20
- offset = 0

输入约束:

- 必须具备 Issue 所属 Project 访问权限

输出:

{
  items: Array<{
    id: string,
    action: string,
    actorId: string,
    createdAt: string
  }>,
  total: number
}

输出约束:

- 按时间倒序
- 仅返回当前用户可访问数据

## 测试用例

### 查询日志

返回 Issue 操作记录

### 分页

limit / offset 正确生效

### 权限控制

无权限用户无法访问日志

### 顺序正确

按时间倒序返回

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] 审计日志查询 API
- [ ] Service 查询逻辑
- [ ] 权限校验
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
