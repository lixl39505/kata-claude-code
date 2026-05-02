# task-023-db-index-optimization.md

## 目标

实现: 数据库索引优化（查询性能基础保障）

必须包含:

- 为 Issue 常用查询字段建立索引（projectId, state, assigneeId, createdAt）
- 为 Notification 查询建立索引（userId, isRead, createdAt）
- 为 AuditLog 查询建立索引（issueId, createdAt）
- 验证索引对查询路径的覆盖

明确不实现:

- 复杂查询优化器
- 分库分表
- 外部搜索引擎

## 变更范围

修改模块:

- DB Access Layer
- 数据迁移脚本

依赖模块:

- SQLite

允许修改目录:

- /lib/db/**
- /specs/architecture.md
- /specs/progress.md

## 数据规则

索引策略:

- Issue:
  - index(projectId)
  - index(state)
  - index(assigneeId)
  - index(createdAt)

- Notification:
  - index(userId, isRead)
  - index(createdAt)

- AuditLog:
  - index(issueId)
  - index(createdAt)

约束:

- 索引必须通过 migration 创建
- migration 必须可重复执行
- 不允许破坏已有数据

## 测试用例

### 查询正确性

索引添加后查询结果不变

### 性能验证

高数据量下查询仍可接受（基础验证）

### migration 可重复执行

重复执行不报错

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] 索引 migration
- [ ] DB 层适配
- [ ] 查询路径验证
- [ ] 测试用例
- [ ] 文档更新

完成条件:

- [ ] 功能闭环可用
- [ ] 数据边界正确
- [ ] migration 可重复执行
- [ ] 所有逻辑可测试
- [ ] 测试全部通过

## 后续动作

更新 specs/architecture.md 与 specs/progress.md
