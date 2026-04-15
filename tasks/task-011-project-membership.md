# Project 成员管理（最小协作能力）

## 目标

实现: Project 成员管理

必须包含:

- 支持将用户加入 Project
- 支持将用户从 Project 移除
- 支持查看 Project 成员列表
- 将 Project 访问边界从“全员可见”收敛为“成员可见”
- 限制 Issue assignee 只能是当前 Project 成员

明确不实现:

- 邀请邮件
- 自助申请加入
- 细粒度自定义权限
- 多组织能力
- owner / member 之外的复杂项目角色模型

## 变更范围

修改模块:

- Project API
- Project Service
- Project Validator
- Issue Service
- Assignee Service
- DB Access Layer
- Audit Service

依赖模块:

- Auth 模块
- 错误模型
- SQLite 数据迁移

允许修改目录:

- /app/api/projects/**
- /app/api/issues/**
- /lib/services/**
- /lib/validators/**
- /lib/db/**
- /lib/errors/**
- /lib/audit/**
- /specs/architecture.md
- /specs/progress.md

## 数据模型

新增实体:

ProjectMember

字段:

- projectId
- userId
- role

约束:

- 同一 projectId + userId 必须唯一
- role 当前仅允许:
  - OWNER
  - MEMBER

规则:

- Project 创建者自动成为该 Project 的 OWNER
- 每个 Project 至少保留一名 OWNER
- 被移除成员不得继续访问该 Project 下数据
- 非成员不得被指派为该 Project 的 Issue assignee

## API

### 添加 Project 成员

向指定 Project 添加成员

POST /api/projects/:id/members

输入:

{
  userId: string,
  role?: "MEMBER"
}

默认值:

- role 默认值为 MEMBER

输入约束:

- userId 必须为有效用户 ID
- 用户不得重复加入同一 Project
- 仅 Project OWNER 或系统 Admin 可操作
- 当前任务不支持通过接口新增 OWNER

输出:

{
  projectId: string,
  userId: string,
  role: "OWNER" | "MEMBER"
}

输出约束:

- 返回新增后的真实成员记录

### 移除 Project 成员

从指定 Project 移除成员

DELETE /api/projects/:id/members/:userId

输入:

- path: id, userId

输入约束:

- 目标成员必须存在
- 仅 Project OWNER 或系统 Admin 可操作
- 不允许移除最后一名 OWNER
- 若被移除成员当前仍被指派 Issue, 必须有明确处理策略

输出:

{
  success: true
}

输出约束:

- 删除成功后返回统一成功结构

### 获取 Project 成员列表

获取指定 Project 的成员列表

GET /api/projects/:id/members

输入:

- path: id

输入约束:

- 仅 Project 成员或系统 Admin 可查看

输出:

{
  items: Array<{
    userId: string,
    displayName: string,
    email: string,
    role: "OWNER" | "MEMBER"
  }>,
  total: number
}

输出约束:

- 仅返回当前 Project 的成员

## 业务规则

Project 访问规则:

- Project 创建者与成员可访问该 Project
- 系统 Admin 可访问所有 Project
- 非成员且非 Admin 不可查看 Project 详情
- 非成员且非 Admin 不可查看该 Project 下的 Issue 列表与详情
- 非成员且非 Admin 不可在该 Project 下创建 Issue、评论或修改状态

Assignee 规则:

- assignee 必须为当前 Project 成员
- 若 assignee 不属于该 Project, 必须返回 VALIDATION_ERROR 或 FORBIDDEN
- 成员被移除后, 其历史 assignee 数据需要有兼容策略

成员移除策略:

- 若成员被移除前仍有未关闭 Issue 指派给该成员, 本任务采用最小方案:
  - 禁止直接移除
  - 返回明确错误, 提示先处理该成员名下未关闭 Issue
- 已关闭 Issue 的历史 assignee 数据允许保留

审计规则:

- 添加成员必须写入审计日志
- 移除成员必须写入审计日志
- 主写入与审计写入必须保持同一事务

## 测试用例

### 创建 Project 自动成为 Owner

创建 Project 后, 创建者自动出现在成员列表中, 角色为 OWNER

### 添加成员成功

OWNER 或 Admin 可将用户加入 Project, 默认角色为 MEMBER

### 重复添加拦截

重复添加同一用户到同一 Project 必须失败

### 非 Owner 添加拦截

普通成员不得添加 Project 成员

### 获取成员列表权限

成员与 Admin 可查看成员列表, 非成员不可查看

### 成员访问边界

非成员访问 Project 详情与该 Project 下 Issue 列表必须失败

### assignee 边界

将非 Project 成员设置为 assignee 必须失败

### 移除成员成功

成员无未关闭 Issue 指派时可被成功移除

### 移除最后 Owner 拦截

移除最后一名 OWNER 必须失败

### 移除仍有未关闭 Issue 的成员

若目标成员仍有未关闭 Issue 指派, 移除必须失败

### 审计一致性

添加成员与移除成员均正确写入审计日志, 且与主写入在同一事务中完成

## 完成与交付标准

必须交付:

- [ ] Project 成员数据模型
- [ ] 成员添加接口
- [ ] 成员移除接口
- [ ] 成员列表接口
- [ ] Project 访问边界收敛
- [ ] assignee 成员约束
- [ ] 审计日志补齐
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

- 若新增 ProjectMember 实体, 需要维护架构图与数据模型
- 若 Project 访问规则发生变化, 需要同步更新权限与服务层约束

还需要更新 `specs/progress.md`, 维护项目开发进度.
