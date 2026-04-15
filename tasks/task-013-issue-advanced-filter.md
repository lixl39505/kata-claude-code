# Issue 高级筛选

## 目标

实现: Issue 高级筛选能力

必须包含:

- 支持多条件组合筛选（AND 逻辑）
- 支持按 state / assignee / project 组合筛选
- 支持按创建时间排序（升序 / 降序）
- 支持分页（limit / offset）

明确不实现:

- OR 条件组合
- 保存筛选条件
- 全文搜索
- 复杂查询语法

## 变更范围

修改模块:

- Issue API
- Issue Service
- Issue Validator
- DB Access Layer

依赖模块:

- Auth 模块

允许修改目录:

- /app/api/issues/**
- /lib/services/**
- /lib/validators/**
- /lib/db/**

## API

### Issue 查询（增强版）

GET /api/issues

输入:

{
  projectId?: string,
  state?: "OPEN" | "CLOSED",
  assigneeId?: string,
  limit?: number,
  offset?: number,
  sortBy?: "createdAt",
  order?: "asc" | "desc"
}

默认值:

- limit 默认 20
- offset 默认 0
- order 默认 desc

输入约束:

- limit 必须在合理范围（如 1-100）
- offset >= 0
- sortBy 当前仅允许 createdAt

输出:

{
  items: Issue[],
  total: number
}

输出约束:

- 必须只返回当前用户有权限访问的数据

## 测试用例

### 多条件筛选

project + state + assignee 同时生效

### 排序

按 createdAt 正确排序

### 分页

limit / offset 正确生效

### 权限隔离

用户只能看到自己有权限的 Issue

### 边界参数

limit 超出范围必须报错

## 完成与交付标准

必须交付:

- 多条件筛选能力
- 排序能力
- 分页能力
- 校验逻辑
- 测试用例

完成条件:

- [ ] 功能闭环可用
- [ ] 权限正确
- [ ] 数据边界正确
- [ ] 所有逻辑可测试
- [ ] 测试全部通过
