# Task 003 · Project 实体与项目创建 / 列表能力

## 目标

实现 Project 实体及其最小可用能力，为后续 Issue 功能提供归属容器。

本任务只实现：

- Project 数据结构
- 创建 Project
- 获取当前用户的 Project 列表
- 获取单个 Project 详情

本任务不得实现：

- Project 成员管理
- Project 权限矩阵
- Project 设置页
- Project 删除 / 归档
- Issue 相关能力

## 本任务完成后必须具备的结果

- 存在 Project 持久化结构
- 已登录用户可以创建 Project
- 已登录用户可以查看自己的 Project 列表
- 已登录用户可以查看自己拥有的单个 Project
- 未登录请求会被拒绝
- 非拥有者不能读取他人的 Project
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
- 当前任务不得实现：
  - Project 成员表
  - 多角色权限
  - 邀请机制
  - 删除 / 归档
  - 搜索
  - 分页
  - 排序配置
  - Issue 表及任何 Issue 接口

## 必须实现的数据结构

必须创建 `projects` 表（SQLite），包含以下字段：

```ts
Project {
  id: string
  ownerId: string
  name: string
  key: string
  description: string | null
  createdAt: string
  updatedAt: string
}
```

约束：

- `id` 为字符串主键
- `ownerId` 关联用户
- `name` 为必填
- `key` 为必填
- `description` 可为空
- `(ownerId, key)` 必须唯一
- 当前阶段不要求 `key` 全局唯一，只要求在 owner 维度唯一

## 必须实现的输入规则

### 创建 Project 输入

必须定义 Zod schema，字段如下：

```ts
{
  name: string
  key: string
  description?: string
}
```

约束：

- `name` 去除首尾空白后长度必须在 1 到 100 之间
- `key` 去除首尾空白后必须匹配 `^[A-Z][A-Z0-9_]{1,19}$`
- `key` 必须在写入前转为大写
- `description` 如存在，去除首尾空白后长度不得超过 500；空字符串需转为 `null`

### Project 路径参数

如接口需要 `projectId`，必须校验为非空字符串

## 必须实现的服务层函数

必须实现以下函数：

- `createProject`
- `listProjectsForCurrentUser`
- `getProjectByIdForCurrentUser`

行为要求：

### createProject

- 仅允许已登录用户调用
- 创建时写入 `ownerId`
- 同一用户下 `key` 重复时返回 `CONFLICT`
- 返回新建 Project

### listProjectsForCurrentUser

- 仅允许已登录用户调用
- 只返回当前用户拥有的 Project
- 返回数组

### getProjectByIdForCurrentUser

- 仅允许已登录用户调用
- 只能读取当前用户拥有的 Project
- 不存在或无权访问时统一返回 `NOT_FOUND`

## 必须实现的 API 接口

必须实现以下接口：

- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/[projectId]`

行为要求：

### POST /api/projects

- 未登录返回 `UNAUTHENTICATED`
- 非法输入返回 `VALIDATION_ERROR`
- 创建成功返回 Project 数据
- 同一用户下重复 `key` 返回 `CONFLICT`

### GET /api/projects

- 未登录返回 `UNAUTHENTICATED`
- 返回当前用户的 Project 列表

### GET /api/projects/[projectId]`

- 未登录返回 `UNAUTHENTICATED`
- 读取不存在项目返回 `NOT_FOUND`
- 读取他人项目返回 `NOT_FOUND`
- 读取成功返回 Project 数据

## 返回数据要求

Project 返回结构必须至少包含：

```ts
{
  id: string
  ownerId: string
  name: string
  key: string
  description: string | null
  createdAt: string
  updatedAt: string
}
```

不得返回任何无关内部字段。

## 错误处理要求

必须覆盖以下错误：

- 未登录
- 输入校验失败
- 同一用户下 project key 冲突
- 项目不存在
- 访问他人项目

必须使用 Task 001 中定义的统一错误结构。

## 验证规则

完成任务后必须逐条满足：

### 数据层验证

- [ ] 存在 `projects` 表
- [ ] `ownerId` 字段存在
- [ ] `(ownerId, key)` 唯一约束生效
- [ ] Project 数据访问代码仅位于 `lib/db`

### 输入验证

- [ ] 创建 Project 输入经过 Zod 校验
- [ ] `name` 空字符串会被拦截
- [ ] `key` 非法格式会被拦截
- [ ] `key` 写入前会转为大写
- [ ] 空 description 会被转为 `null`

### 功能验证

- [ ] 已登录用户可以创建 Project
- [ ] 同一用户重复 key 创建失败
- [ ] 不同用户可以使用相同 key
- [ ] 已登录用户只能看到自己的 Project 列表
- [ ] 已登录用户可以读取自己的 Project
- [ ] 已登录用户不能读取他人的 Project
- [ ] 未登录用户不能访问上述接口

### 架构验证

- [ ] API 层无业务逻辑
- [ ] API 层无数据库访问
- [ ] service 层负责 Project 业务逻辑
- [ ] 认证判断复用 Task 002 能力
- [ ] 使用统一错误模型

### 质量门禁

- [ ] `npm run lint` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run test` 通过

## 单元测试要求

必须实现以下测试：

### Validator 测试

- [ ] 合法输入可通过校验
- [ ] name 为空失败
- [ ] key 小写输入会被标准化为大写
- [ ] key 非法格式失败
- [ ] description 空字符串转换为 `null`
- [ ] description 超长失败

### Service 测试

- [ ] createProject 成功
- [ ] createProject 在未登录时失败
- [ ] createProject 在重复 key 时失败
- [ ] listProjectsForCurrentUser 仅返回当前用户项目
- [ ] getProjectByIdForCurrentUser 可读取本人项目
- [ ] getProjectByIdForCurrentUser 读取他人项目返回 `NOT_FOUND`
- [ ] getProjectByIdForCurrentUser 读取不存在项目返回 `NOT_FOUND`

### API 测试

- [ ] `POST /api/projects` 成功路径
- [ ] `POST /api/projects` 未登录路径
- [ ] `POST /api/projects` 重复 key 路径
- [ ] `GET /api/projects` 仅返回当前用户项目
- [ ] `GET /api/projects/[projectId]` 成功路径
- [ ] `GET /api/projects/[projectId]` 他人项目路径
- [ ] `GET /api/projects/[projectId]` 未登录路径

## 交付物

- `projects` 表定义或迁移文件
- Project validator
- Project service
- Project API
- 对应测试
- 可运行验证结果

## 完成定义

满足以下条件才算完成：

1. Project 实体已可持久化
2. 当前用户可创建并读取自己的 Project
3. 他人 Project 不可读取
4. 所有新增功能具备测试
5. 没有越界实现成员、权限或 Issue 能力

## 下一任务进入条件

本任务全部验证通过后，才进入下一个 task
