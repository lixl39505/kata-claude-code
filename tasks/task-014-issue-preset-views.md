# Issue 预设视图

## 目标

实现: Issue 预设视图能力

必须包含:

- 支持内置预设视图:
  - My Issues
  - Open Issues
  - Closed Issues
- 预设视图基于现有筛选能力组合生成结果
- 统一返回视图标识、视图名称和对应 Issue 列表
- 保持与当前权限模型一致

明确不实现:

- 用户自定义保存视图
- 视图分享
- 看板视图
- 复杂统计面板
- 新的查询 DSL

## 变更范围

修改模块:

- Issue API
- Issue Service
- Issue Validator

依赖模块:

- Auth 模块
- 现有 Issue 筛选能力
- DB Access Layer

允许修改目录:

- /app/api/issues/**
- /lib/services/**
- /lib/validators/**
- /lib/db/**
- /specs/architecture.md
- /specs/progress.md

## API

### 获取预设视图列表

获取系统内置的 Issue 预设视图定义

GET /api/issues/views

输入:

- 无

默认值:

- 无

输入约束:

- 必须已登录

输出:

{
  items: Array<{
    key: "MY_ISSUES" | "OPEN_ISSUES" | "CLOSED_ISSUES",
    name: string,
    description: string
  }>
}

输出约束:

- 仅返回系统内置视图
- 不返回用户自定义视图

### 获取预设视图结果

根据视图 key 获取对应的 Issue 列表

GET /api/issues/views/:key

输入:

{
  key: "MY_ISSUES" | "OPEN_ISSUES" | "CLOSED_ISSUES",
  limit?: number,
  offset?: number
}

默认值:

- limit 默认 20
- offset 默认 0

输入约束:

- key 必须为合法视图标识
- limit 必须在合理范围内
- offset 必须大于等于 0

输出:

{
  view: {
    key: "MY_ISSUES" | "OPEN_ISSUES" | "CLOSED_ISSUES",
    name: string
  },
  items: Issue[],
  total: number
}

输出约束:

- 结果必须基于当前用户可访问的数据
- My Issues 仅返回 assignee = 当前用户 的 Issue
- Open Issues 仅返回 state = OPEN 的可见 Issue
- Closed Issues 仅返回 state = CLOSED 的可见 Issue

## 业务规则

预设视图规则:

- 预设视图本质上是对现有筛选条件的命名封装
- 不新增独立存储表
- 不新增视图持久化逻辑
- 视图结果必须复用现有 Issue 查询与权限校验逻辑

权限规则:

- 所有预设视图都必须只返回当前用户有权限访问的 Issue
- 不允许通过视图绕过 Project 成员边界
- 未登录用户不得访问视图接口

一致性规则:

- 预设视图与普通 Issue 查询结果必须保持一致
- 同一筛选条件下, 视图接口与普通查询接口返回的数据边界必须相同

## 测试用例

### 获取视图定义

登录用户可获取内置视图列表

### My Issues 结果正确

仅返回 assignee 为当前用户且当前用户有权限访问的 Issue

### Open Issues 结果正确

仅返回 state = OPEN 的可见 Issue

### Closed Issues 结果正确

仅返回 state = CLOSED 的可见 Issue

### 分页正确

limit / offset 在视图接口中正确生效

### 权限隔离

用户无法通过视图接口看到无权限 Project 下的 Issue

### 非法视图标识

传入未知 key 必须返回 VALIDATION_ERROR 或 NOT_FOUND

### 查询一致性

预设视图结果与等价普通筛选查询结果一致

## 完成与交付标准

必须交付:

- [ ] 预设视图列表接口
- [ ] 预设视图结果接口
- [ ] 视图 key 校验逻辑
- [ ] 与现有筛选逻辑的复用集成
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

- 若新增了预设视图接口, 需要维护 API / Service 结构说明
- 若复用了筛选模块, 需要在架构说明中体现依赖关系

还需要更新 `specs/progress.md`, 维护项目开发进度.
