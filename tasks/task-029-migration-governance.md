# task-029-migration-governance.md

## 目标

实现: 数据库迁移治理

必须包含:

- 建立统一的 migration 记录表
- 确保所有 migration 可重复执行
- 支持检查当前数据库 migration 版本
- 在启动或健康检查中复用 migration 状态校验能力
- 防止 migration 部分执行导致结构不一致

明确不实现:

- 自动回滚历史 migration
- 多数据库迁移
- 在线无锁迁移
- 外部 migration 工具接入
- 数据备份系统

## 变更范围

修改模块:

- DB Access Layer
- Migration 模块
- Health API
- Logger 模块

依赖模块:

- SQLite
- 运行时日志能力
- 健康检查能力
- 错误模型

允许修改目录:

- /lib/db/**
- /app/api/health/**
- /lib/logger/**
- /lib/errors/**
- /specs/architecture.md
- /specs/progress.md

## 数据模型

新增实体:

MigrationRecord

字段:

- version
- name
- appliedAt

约束:

- version 必须唯一
- name 不可为空
- appliedAt 必须记录执行完成时间

## API

### 健康检查中的 migration 状态

复用健康检查接口返回 migration 状态

GET /api/health

输入:

- 无

默认值:

- 无

输入约束:

- 不要求登录
- 不得返回内部 SQL、数据库路径或迁移脚本内容

输出:

{
  status: "ok" | "degraded" | "error",
  checks: {
    migrations: {
      status: "ok" | "error",
      currentVersion?: string,
      pendingCount?: number
    }
  },
  requestId: string,
  checkedAt: string
}

输出约束:

- migration 状态正常时 status = ok
- migration 记录缺失、版本异常或待执行 migration 存在时，必须返回明确状态
- 不得泄露内部实现细节

## 业务规则

migration 执行规则:

- 每个 migration 必须有唯一 version
- 已执行 migration 不得重复执行
- migration 执行成功后必须写入 MigrationRecord
- migration 脚本必须可重复执行
- migration 失败时不得写入成功记录
- migration 失败必须记录结构化日志

一致性规则:

- 单个 migration 的结构变更与 MigrationRecord 写入必须保持一致
- 多个 migration 按 version 顺序执行
- 不允许跳过中间 migration
- 不允许出现数据库结构已变更但 migration 记录缺失的情况

安全规则:

- migration 状态查询不得暴露 SQL 内容
- 健康检查只返回版本和状态，不返回脚本细节
- 不允许通过 API 触发执行 migration

## 测试用例

### 首次执行 migration

数据库为空时，按顺序执行全部 migration 并写入记录

### 重复执行 migration

已执行 migration 不重复执行，且不报错

### migration 失败回滚

migration 执行失败时，不写入成功记录

### 版本顺序

migration 必须按 version 顺序执行

### 版本缺失检测

migration 记录缺失或异常时，健康检查能返回 error

### 健康检查集成

/api/health 正确返回 currentVersion 与 pendingCount

### 敏感信息不泄露

migration 错误响应和健康检查响应不得包含 SQL、数据库路径或 stack trace

### 日志记录

migration 失败时记录结构化日志并包含 requestId 或运行上下文

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] MigrationRecord 数据模型
- [ ] migration 执行记录机制
- [ ] migration 重复执行保护
- [ ] migration 状态检查能力
- [ ] 健康检查集成
- [ ] migration 失败日志
- [ ] 测试用例补齐并通过
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

- 若新增 migration 记录表, 需要维护数据模型说明
- 若新增 migration 执行器或状态检查模块, 需要维护 DB 层结构说明
- 若健康检查依赖 migration 状态, 需要同步更新 Health API 说明

还需要更新 `specs/progress.md`, 维护项目开发进度.
