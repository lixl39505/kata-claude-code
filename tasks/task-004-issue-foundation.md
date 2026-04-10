# Task 004 · Issue 实体与 Issue 创建 / 列表 / 详情能力

## 目标

实现 Issue 实体的最小可用能力，为后续状态流转、评论、审计与筛选功能提供基础。

本任务只实现：

- Issue 数据结构
- 在 Project 下创建 Issue
- 获取指定 Project 下的 Issue 列表
- 获取单个 Issue 详情

本任务不得实现：

- Issue 状态流转
- Issue 指派
- Issue 评论
- Issue 审计日志
- Issue 搜索 / 筛选 / 分页
- Project 成员权限体系

## 本任务完成后必须具备的结果

- 存在 Issue 持久化结构
- 已登录用户可以在自己的 Project 下创建 Issue
- 已登录用户可以查看自己 Project 下的 Issue 列表
- 已登录用户可以查看自己 Project 下的单个 Issue
- 不能向他人的 Project 创建 Issue
- 不能读取他人 Project 下的 Issue
- 所有输入经过 Zod 校验
- 所有功能具备对应单元测试

## 变更范围

允许新增或修改以下内容：

- `app/api/**`
- `lib/services/**`
- `lib/validators/**`
- `lib/errors/**`
- `lib/db/**`
- `tests/**` 或 `__tests__/**`
- 数据库初始化或迁移文件

## 强制约束

- 不得引入新的后端框架、ORM、数据库或验证库
- API 层不得直接访问数据库
- API 层不得实现业务逻辑
- 所有数据库访问只能在 `lib/db`
- 所有输入必须通过 Zod 校验
- 所有认证判断必须复用 Task 002 的认证上下文能力
- 所有 Project 归属判断必须复用 Task 003 的 Project 访问边界
- 当前任务不得实现：
  - Issue 状态流转
  - Issue 指派
  - 评论
  - 附件
  - 标签
  - 搜索 / 筛选 / 排序配置
  - 分页
  - 审计日志写入
  - 软删除
  - Project 成员与角色

## 必须实现的数据结构

必须创建 `issues` 表（SQLite），包含以下字段：

```ts
Issue {
  id: string
  projectId: string
  title: string
  description: string | null
  status: "OPEN"
  createdById: string
  createdAt: string
  updatedAt: string
}
```

约束：

- `id` 为字符串主键
- `projectId` 必须关联 `projects.id`
- `createdById` 必须关联 `users.id`
- `title` 为必填
- `description` 可为空
- `status` 在本任务中必须固定为 `OPEN`
- 不得在本任务引入 `assigneeId`
- 不得在本任务引入复杂状态字段

## 必须实现的输入规则

### 创建 Issue 输入

必须定义 Zod schema，字段如下：

```ts
{
  title: string
  description?: string
}
```

约束：

- `title` 去除首尾空白后长度必须在 1 到 200 之间
- `description` 如存在，去除首尾空白后长度不得超过 5000
- `description` 空字符串必须转换为 `null`

### 路径参数

以下参数必须校验为非空字符串：

- `projectId`
- `issueId`

## 必须实现的服务层函数

必须实现以下函数：

- `createIssueInProject`
- `listIssuesForProject`
- `getIssueByIdForProject`

行为要求：

### createIssueInProject

- 仅允许已登录用户调用
- 仅允许在当前用户拥有的 Project 下创建
- 创建时写入 `projectId`
- 创建时写入 `createdById`
- 创建时 `status` 固定为 `OPEN`
- 返回新建 Issue

### listIssuesForProject

- 仅允许已登录用户调用
- 仅允许读取当前用户拥有的 Project
- 只返回该 Project 下的 Issue
- 返回数组

### getIssueByIdForProject

- 仅允许已登录用户调用
- 仅允许读取当前用户拥有的 Project 下的 Issue
- Issue 不存在时返回 `NOT_FOUND`
- Issue 不属于该 Project 时返回 `NOT_FOUND`
- Project 不存在或无权访问时返回 `NOT_FOUND`

## 必须实现的 API 接口

必须实现以下接口：

- `POST /api/projects/[projectId]/issues`
- `GET /api/projects/[projectId]/issues`
- `GET /api/projects/[projectId]/issues/[issueId]`

行为要求：

### POST /api/projects/[projectId]/issues

- 未登录返回 `UNAUTHENTICATED`
- 非法输入返回 `VALIDATION_ERROR`
- Project 不存在或非拥有者返回 `NOT_FOUND`
- 创建成功返回 Issue 数据

### GET /api/projects/[projectId]/issues

- 未登录返回 `UNAUTHENTICATED`
- Project 不存在或非拥有者返回 `NOT_FOUND`
- 返回该 Project 下的 Issue 列表

### GET /api/projects/[projectId]/issues/[issueId]

- 未登录返回 `UNAUTHENTICATED`
- Project 不存在或非拥有者返回 `NOT_FOUND`
- Issue 不存在返回 `NOT_FOUND`
- Issue 不属于该 Project 返回 `NOT_FOUND`
- 读取成功返回 Issue 数据

## 返回数据要求

Issue 返回结构必须至少包含：

```ts
{
  id: string
  projectId: string
  title: string
  description: string | null
  status: "OPEN"
  createdById: string
  createdAt: string
  updatedAt: string
}
```

不得返回任何无关内部字段。

## 错误处理要求

必须覆盖以下错误：

- 未登录
- 输入校验失败
- Project 不存在
- 无权访问 Project
- Issue 不存在
- Issue 不属于指定 Project

必须使用 Task 001 中定义的统一错误结构。

## 验证规则

完成任务后必须逐条满足：

### 数据层验证

- [ ] 存在 `issues` 表
- [ ] `projectId` 字段存在
- [ ] `createdById` 字段存在
- [ ] `status` 默认或写入值为 `OPEN`
- [ ] Issue 数据访问代码仅位于 `lib/db`

### 输入验证

- [ ] 创建 Issue 输入经过 Zod 校验
- [ ] `title` 空字符串会被拦截
- [ ] `title` 超长会被拦截
- [ ] `description` 空字符串会被转为 `null`
- [ ] `description` 超长会被拦截
- [ ] `projectId` 与 `issueId` 路径参数已校验

### 功能验证

- [ ] 已登录用户可以在自己的 Project 下创建 Issue
- [ ] 创建 Issue 后 `status` 为 `OPEN`
- [ ] 已登录用户只能看到自己 Project 下的 Issue 列表
- [ ] 已登录用户可以读取自己 Project 下的单个 Issue
- [ ] 已登录用户不能向他人 Project 创建 Issue
- [ ] 已登录用户不能读取他人 Project 下的 Issue
- [ ] Issue 不属于指定 Project 时返回 `NOT_FOUND`
- [ ] 未登录用户不能访问上述接口

### 架构验证

- [ ] API 层无业务逻辑
- [ ] API 层无数据库访问
- [ ] service 层负责 Issue 业务逻辑
- [ ] 认证判断复用 Task 002 能力
- [ ] Project 归属判断复用 Task 003 能力
- [ ] 使用统一错误模型

### 质量门禁

- [ ] `npm run lint` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run test` 通过

## 单元测试要求

必须实现以下测试：

### Validator 测试

- [ ] 合法输入可通过校验
- [ ] title 为空失败
- [ ] title 超长失败
- [ ] description 空字符串转换为 `null`
- [ ] description 超长失败
- [ ] projectId 非法输入失败
- [ ] issueId 非法输入失败

### Service 测试

- [ ] createIssueInProject 成功
- [ ] createIssueInProject 在未登录时失败
- [ ] createIssueInProject 在他人 Project 下失败
- [ ] createIssueInProject 写入固定 status=OPEN
- [ ] listIssuesForProject 仅返回指定 Project 且属于当前用户的数据
- [ ] listIssuesForProject 读取他人 Project 返回 `NOT_FOUND`
- [ ] getIssueByIdForProject 可读取本人 Project 下的 Issue
- [ ] getIssueByIdForProject 读取不存在 Issue 返回 `NOT_FOUND`
- [ ] getIssueByIdForProject 读取不属于该 Project 的 Issue 返回 `NOT_FOUND`
- [ ] getIssueByIdForProject 读取他人 Project 返回 `NOT_FOUND`

### API 测试

- [ ] `POST /api/projects/[projectId]/issues` 成功路径
- [ ] `POST /api/projects/[projectId]/issues` 未登录路径
- [ ] `POST /api/projects/[projectId]/issues` 他人 Project 路径
- [ ] `GET /api/projects/[projectId]/issues` 成功路径
- [ ] `GET /api/projects/[projectId]/issues` 他人 Project 路径
- [ ] `GET /api/projects/[projectId]/issues/[issueId]` 成功路径
- [ ] `GET /api/projects/[projectId]/issues/[issueId]` 不存在路径
- [ ] `GET /api/projects/[projectId]/issues/[issueId]` 跨 Project 路径
- [ ] `GET /api/projects/[projectId]/issues/[issueId]` 未登录路径

## 交付物

- `issues` 表定义或迁移文件
- Issue validator
- Issue service
- Issue API
- 对应测试
- 可运行验证结果

## 完成定义

满足以下条件才算完成：

1. Issue 实体已可持久化
2. 当前用户可在自己的 Project 下创建并读取 Issue
3. 他人 Project 下的 Issue 不可创建、不可读取
4. 所有新增功能具备测试
5. 没有越界实现状态流转、评论、审计或权限体系

## 下一任务进入条件

本任务全部验证通过后，才进入下一个 task
