# task-028-health-check.md

## 目标

实现: 服务健康检查与基础运行状态检查

必须包含:

- 提供健康检查 API
- 检查应用运行状态
- 检查 SQLite 连接状态
- 检查数据库迁移状态
- 返回可用于部署与排查的基础状态信息

明确不实现:

- 外部监控平台接入
- 实时告警
- 指标采集系统
- 性能 profiling
- 管理后台页面

## 变更范围

修改模块:

- Health API（新增）
- DB Access Layer
- Migration 模块
- Logger 模块

依赖模块:

- SQLite
- 运行时日志能力
- 错误模型

允许修改目录:

- /app/api/health/**
- /lib/db/**
- /lib/logger/**
- /lib/errors/**
- /specs/architecture.md
- /specs/progress.md

## API

### 健康检查

获取服务健康状态

GET /api/health

输入:

- 无

默认值:

- 无

输入约束:

- 不要求登录
- 不得返回敏感信息
- 不得暴露数据库路径、SQL 语句、环境变量或内部堆栈

输出:

{
  status: "ok" | "degraded" | "error",
  checks: {
    app: {
      status: "ok" | "error"
    },
    database: {
      status: "ok" | "error"
    },
    migrations: {
      status: "ok" | "error",
      currentVersion?: string
    }
  },
  requestId: string,
  checkedAt: string
}

输出约束:

- 所有检查通过时 status = ok
- 非关键检查失败时可返回 degraded
- 数据库不可用或迁移异常时返回 error
- 响应中不得包含敏感信息

## 业务规则

健康检查规则:

- app 检查用于确认 API 进程可响应
- database 检查必须执行最小化读操作，例如 SELECT 1
- migrations 检查必须确认当前数据库结构处于已知版本
- 健康检查失败时必须记录结构化日志
- 健康检查不得修改业务数据

安全规则:

- 健康检查接口不要求认证
- 返回信息必须保持最小化
- 不允许暴露用户数量、Issue 数量、通知数量等业务数据
- 不允许返回数据库文件路径或内部错误原文

错误处理规则:

- 已知检查失败返回结构化状态
- 未预期错误返回统一错误结构
- 错误响应中可包含 requestId

## 测试用例

### 健康状态正常

数据库可连接且迁移状态正常时，返回 status = ok

### 数据库异常

数据库连接失败时，返回 status = error

### 迁移异常

迁移状态不一致时，返回 status = error

### 不要求登录

未登录用户可以访问健康检查接口

### 敏感信息不泄露

响应中不得包含数据库路径、SQL、环境变量、stack trace 或用户数据

### 日志记录

健康检查失败时记录结构化日志，并包含 requestId

### 响应结构一致

健康检查响应符合固定结构，便于部署系统解析

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] 健康检查 API
- [ ] SQLite 连接检查
- [ ] 数据库迁移状态检查
- [ ] 健康检查日志
- [ ] 敏感信息脱敏处理
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

- 若新增 Health API, 需要维护架构图或 API 说明
- 若新增迁移状态检查机制, 需要补充到数据迁移约束
- 若健康检查响应结构成为部署约定, 需要记录到运行维护相关说明

还需要更新 `specs/progress.md`, 维护项目开发进度.
