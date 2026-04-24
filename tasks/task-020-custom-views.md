# task-020-custom-views.md

## 目标

实现: 用户自定义视图（保存筛选条件）

必须包含:

- 支持用户保存当前 Issue 筛选条件为视图
- 支持查看用户已保存的视图列表
- 支持删除视图
- 支持通过视图获取 Issue 列表

明确不实现:

- 视图分享
- 团队级视图
- 复杂查询 DSL
- UI 交互设计

## 变更范围

修改模块:

- Issue API
- Issue Service
- View Service（新增）
- DB Access Layer

依赖模块:

- Auth 模块
- Issue 筛选能力

允许修改目录:

- /app/api/issues/**
- /lib/services/**
- /lib/db/**
- /lib/validators/**
- /specs/architecture.md
- /specs/progress.md

## 数据模型

新增实体:

SavedView

字段:

- id
- userId
- name
- filters (JSON)
- createdAt

约束:

- userId 必须存在
- name 不可为空
- filters 必须为合法筛选结构

## API

### 创建视图

POST /api/issues/views

输入:

{
  name: string,
  filters: object
}

输出:

{
  id: string,
  name: string
}

### 获取视图列表

GET /api/issues/views

输出:

{
  items: SavedView[],
  total: number
}

### 删除视图

DELETE /api/issues/views/:id

输出:

{
  success: true
}

### 使用视图查询 Issue

GET /api/issues/views/:id/issues

输出:

{
  items: Issue[],
  total: number
}

## 测试用例

### 创建视图

成功保存筛选条件

### 查询视图列表

仅返回当前用户视图

### 删除视图

成功删除自己的视图

### 权限控制

无法访问他人视图

### 使用视图查询

返回正确 Issue 列表

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] SavedView 数据模型
- [ ] 视图 CRUD API
- [ ] 查询集成
- [ ] 权限控制
- [ ] 测试用例
- [ ] 文档更新

完成条件:

- [ ] 功能闭环可用
- [ ] 权限正确
- [ ] 数据边界正确
- [ ] 无越界功能实现
- [ ] 所有逻辑可测试
- [ ] 所有单元测试全部通过

## 后续动作

更新 specs/architecture.md 与 specs/progress.md
