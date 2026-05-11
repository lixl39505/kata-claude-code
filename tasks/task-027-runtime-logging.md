# task-027-runtime-logging.md

## 目标

实现: 运行时日志与基础可观测性

必须包含:

- 为 API 请求建立基础日志记录
- 为业务错误与未预期错误建立结构化日志
- 为关键写操作记录操作上下文
- 确保日志不泄露敏感信息
- 为错误排查提供 requestId / traceId

明确不实现:

- 外部日志平台接入
- APM 监控系统
- 分布式 tracing
- 实时告警
- 指标看板

## 变更范围

修改模块:

- API 层
- Error 模块
- Logger 模块（新增）
- Service 层关键写操作

依赖模块:

- Auth 模块
- 统一错误模型
- 事务一致性能力

允许修改目录:

- /app/api/**
- /lib/errors/**
- /lib/services/**
- /lib/logger/**
- /lib/auth/**
- /specs/architecture.md
- /specs/progress.md

## API

### 请求日志上下文

所有 API 请求应生成并传递 requestId

任意 API endpoint

输入:

- 无新增输入

默认值:

- 若请求头中不存在 requestId, 服务端生成新的 requestId

输入约束:

- 不得信任客户端传入的敏感字段
- requestId 仅作为排查标识, 不参与权限判断

输出:

- 正常响应结构保持不变
- 错误响应中可包含 requestId

错误输出示例:

{
  code: string,
  message: string,
  details?: object,
  requestId?: string
}

输出约束:

- requestId 可用于排查错误
- 不得输出 stack trace / SQL / passwordHash / session token

## 日志规则

必须记录:

- 请求方法
- 请求路径
- requestId
- 当前用户 ID（如已登录）
- 响应状态码
- 错误码（如失败）
- 关键写操作类型
- 关键资源 ID（如 projectId / issueId / commentId）

不得记录:

- password
- passwordHash
- session token
- cookie 原文
- 原始 SQL
- stack trace（仅允许在开发环境按安全方式输出）

## 关键写操作覆盖范围

必须覆盖:

- 用户登录 / 登出
- Project 创建 / 归档
- Project 成员添加 / 移除
- Issue 创建 / 更新 / 状态变更 / 批量操作
- assignee 变更
- 评论创建 / 删除
- mention 解析结果
- 通知生成 / 标记已读
- SavedView 创建 / 删除

## 测试用例

### requestId 生成

未传 requestId 时, 服务端生成 requestId 并贯穿错误响应

### requestId 透传

传入合法 requestId 时, 日志上下文复用该 requestId

### 错误日志记录

业务错误与未预期错误均记录结构化日志

### 敏感信息脱敏

日志不得包含 password / token / cookie / passwordHash

### 写操作上下文

关键写操作日志包含操作类型与资源 ID

### 权限错误日志

FORBIDDEN / UNAUTHENTICATED 错误被记录, 但不泄露敏感信息

### 正常请求日志

成功请求记录方法、路径、状态码与 requestId

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] Logger 模块
- [ ] requestId 生成与传递机制
- [ ] API 请求日志
- [ ] 错误日志
- [ ] 关键写操作日志
- [ ] 敏感信息脱敏策略
- [ ] 日志相关测试用例
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

- 若新增 Logger 模块, 需要维护架构图与分层说明
- 若错误响应增加 requestId, 需要同步更新错误模型
- 若日志脱敏策略成为通用约束, 需要补充到安全与错误处理部分

还需要更新 `specs/progress.md`, 维护项目开发进度.
