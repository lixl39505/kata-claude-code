# task-024-api-error-consistency.md

## 目标

实现: API 统一错误处理与错误响应一致性

必须包含:

- 所有 API 返回统一错误结构
- 将业务错误映射为稳定错误码
- 避免泄露内部异常细节
- 为常见错误类型补齐测试

明确不实现:

- 国际化错误消息
- 前端错误展示组件
- 错误监控平台
- 日志聚合系统

## 变更范围

修改模块:

- Error 模块
- API 层错误处理
- Service 层业务错误
- Validator 错误映射

依赖模块:

- Zod Validator
- Auth 模块
- 现有 Service 层

允许修改目录:

- /app/api/**
- /lib/errors/**
- /lib/services/**
- /lib/validators/**
- /specs/architecture.md
- /specs/progress.md

## API

### 统一错误响应

所有 API 在失败时返回统一结构

任意 API endpoint

输入:

- 无新增输入

默认值:

- 无

输入约束:

- 所有外部输入仍必须先经过 Zod 校验
- Service 层必须抛出可识别业务错误
- API 层负责转换为 HTTP 响应

输出:

{
  code: string,
  message: string,
  details?: object
}

输出约束:

- VALIDATION_ERROR 对应输入校验失败
- UNAUTHENTICATED 对应未登录
- FORBIDDEN 对应权限不足
- NOT_FOUND 对应资源不存在
- INVALID_STATE_TRANSITION 对应非法状态流转
- CONFLICT 对应并发冲突
- INTERNAL 对应未预期错误
- INTERNAL 不得返回 stack trace 或数据库错误细节

## 测试用例

### 校验错误

非法输入返回 VALIDATION_ERROR，且包含可测试的 details

### 未登录错误

未登录访问受保护接口返回 UNAUTHENTICATED

### 权限错误

访问无权限资源返回 FORBIDDEN

### 资源不存在

访问不存在资源返回 NOT_FOUND

### 状态流转错误

非法 Issue 状态变更返回 INVALID_STATE_TRANSITION

### 并发冲突错误

乐观锁冲突返回 CONFLICT

### 内部错误脱敏

未预期异常返回 INTERNAL，且不泄露 stack trace / SQL / 原始异常信息

### 响应结构一致

所有错误响应均符合统一结构

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] 统一错误类型定义
- [ ] 统一错误响应转换函数
- [ ] API 层错误处理收敛
- [ ] Service 层业务错误规范化
- [ ] Validator 错误映射
- [ ] 错误响应测试用例
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

- 若新增错误处理工具函数, 需要维护错误模型说明
- 若修改错误码集合, 需要同步更新 API 错误约束
- 若收敛 API 层处理方式, 需要更新分层规则说明

还需要更新 `specs/progress.md`, 维护项目开发进度.
