# Issue 状态模型重构（GitHub 风格）

## 目标

实现: 将 Issue 状态模型重构为 GitHub 风格的二态状态 + 关闭原因模型

必须包含:

- 将 Issue 主状态统一为 OPEN / CLOSED
- 引入 closeReason: COMPLETED / NOT_PLANNED / DUPLICATE
- 修复已有 Issue 模块中与状态相关的校验、流转、持久化、返回值和审计记录
- 修改已有 Issue 模块中的单元测试
- 更新 `specs/requirements.md` 中的状态设计与相关验收描述
- 更新 `specs/architecture.md` 中的状态模型、状态规则和相关架构约束描述

明确不实现:

- 引入 workflowStatus 或其他进度字段
- 扩展自定义状态流转配置
- 新增通知、看板或统计能力

## 变更范围

修改模块:

- Issue API
- Issue Service
- Issue Validator
- DB Access Layer
- Audit Service
- Requirements 文档
- Architecture 文档

依赖模块:

- Auth 模块
- 错误模型
- SQLite 数据迁移

允许修改目录:

- /app/api/issues/**
- /lib/services/**
- /lib/validators/**
- /lib/db/**
- /lib/errors/**
- /lib/audit/**
- /specs/requirements.md
- /specs/architecture.md
- /specs/progress.md

## API

### Issue 状态更新

更新指定 Issue 的主状态与关闭原因

PATCH /api/issues/:id/state

输入:

{
  state: "OPEN" | "CLOSED",
  closeReason?: "COMPLETED" | "NOT_PLANNED" | "DUPLICATE"
}

默认值:

- state 为 OPEN 时, closeReason 默认为空
- state 为 CLOSED 时, 若未显式提供 closeReason, 默认使用 COMPLETED

输入约束:

- state 必须为合法状态值
- closeReason 仅允许在 state = CLOSED 时写入
- state = OPEN 时不得传入 closeReason
- CLOSED → OPEN 视为 reopen
- 不允许继续使用 IN_PROGRESS / RESOLVED / DONE 作为合法状态值
- 必须先完成鉴权与权限校验
- 必须通过统一状态变更入口执行, 禁止直接修改状态字段

输出:

{
  id: string,
  state: "OPEN" | "CLOSED",
  closeReason: "COMPLETED" | "NOT_PLANNED" | "DUPLICATE" | null
}

输出约束:

- 返回更新后的真实状态与关闭原因
- 错误必须使用统一错误结构
- 不得泄露内部实现细节

## 数据规则

必须满足:

- Issue 主状态仅允许 OPEN / CLOSED
- closeReason 仅允许 COMPLETED / NOT_PLANNED / DUPLICATE
- OPEN → CLOSED 合法
- CLOSED → OPEN 合法
- OPEN 状态下 closeReason 必须为空
- CLOSED 状态下 closeReason 必须有值
- 不得保留 IN_PROGRESS / RESOLVED / DONE 为运行时合法状态

迁移规则:

- 现有 OPEN 保持为 OPEN
- 现有 IN_PROGRESS 迁移为 OPEN
- 现有 RESOLVED 迁移为 OPEN
- 现有 DONE 迁移为 CLOSED, closeReason = COMPLETED
- 若历史中存在 CLOSED 且无关闭原因, 迁移后补为 COMPLETED
- 迁移必须可重复执行
- 迁移后系统中不得再产生旧状态值

说明:

- 本次任务只收敛生命周期状态
- 不引入进度表达字段
- 若未来确实需要进度跟踪, 再单独设计 workflowStatus

## 文档修订要求

### Requirements 文档

必须更新:

- Issue 状态定义
- 状态流转规则
- 功能描述中与状态变更相关的表述
- 验收流程中与“推进至 RESOLVED / 关闭”相关的描述

修订方向:

- 不再使用 OPEN / IN_PROGRESS / RESOLVED / CLOSED 四态模型
- 改为 OPEN / CLOSED + closeReason
- 明确当前版本不承载进度表达

### Architecture 文档

必须更新:

- Issue 状态机定义
- 校验与持久化约束
- 审计日志中与状态变更相关的描述
- 若存在旧状态枚举示意, 需要同步修正

修订方向:

- 去除四态状态机描述
- 改为二态状态流转:
  - OPEN → CLOSED
  - CLOSED → OPEN
- 明确 closeReason 的数据约束与服务层校验责任

## 测试用例

### 主状态枚举校验

传入 IN_PROGRESS / RESOLVED / DONE 必须返回 VALIDATION_ERROR

### 关闭工单

OPEN → CLOSED 成功, 并正确写入 closeReason

### 重新打开工单

CLOSED → OPEN 成功, 且 closeReason 被清空

### 关闭原因约束

OPEN 状态下传入 closeReason 必须失败

### 默认关闭原因

关闭工单时未传 closeReason, 默认写入 COMPLETED

### 历史数据迁移

历史 IN_PROGRESS / RESOLVED 正确迁移为 OPEN  
历史 DONE 正确迁移为 CLOSED + COMPLETED

### 审计一致性

状态变更与关闭原因写入审计日志, 且与主写入保持同一事务

### 兼容读取

迁移完成后, Issue 列表与详情接口不再返回旧状态值

## 完成与交付标准

必须交付:

- [ ] Issue 主状态枚举重构为 OPEN / CLOSED
- [ ] closeReason 字段与校验规则落地
- [ ] 状态更新 API 修复
- [ ] Service 层状态变更逻辑修复
- [ ] 数据迁移脚本
- [ ] 审计日志兼容修复
- [ ] `specs/requirements.md` 更新
- [ ] `specs/architecture.md` 更新
- [ ] `specs/progress.md` 更新
- [ ] 测试用例补齐并通过

完成条件:

- [ ] 功能闭环可用
- [ ] 权限正确
- [ ] 数据边界正确
- [ ] 无越界功能实现
- [ ] 所有逻辑可测试
- [ ] 测试全部通过

## 后续动作

任务完成后:

- 更新 `specs/progress.md`, 记录状态模型已重构为 GitHub 风格
