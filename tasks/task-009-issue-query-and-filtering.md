# Issue 查询与筛选能力

## 目标

实现: Issue 查询与筛选

必须包含:

- 按 project / status / assignee 过滤 Issue
- 支持组合筛选（多个条件同时生效）
- 分页功能 (offset/limit)

明确不实现:

- 全文搜索
- 高级排序（如权重 / 相关性）

## 变更范围

修改模块:

- Issue API
- Issue Service
- Issue Validator

依赖模块:

- DB Access Layer
- Auth 模块

允许修改目录:

- /app/api/issue/**
- /lib/services/**
- /lib/validators/**
- /lib/db/**

## API

### Issue 列表查询

获取 Issue 列表（支持筛选）

GET /api/issues

输入:

{
  projectId?: string,
  status?: string,
  assigneeId?: string
}

默认值:

- 无筛选条件时返回全部可见 Issue

输入约束:

- status 必须为合法状态值
- projectId / assigneeId 必须为有效 ID

输出:

{
  items: Issue[],
  total: number
}

输出约束:

- 仅返回当前用户有权限访问的数据

## 测试用例

### 按 project 过滤

只返回指定 project 下的 Issue

### 按 status 过滤

只返回指定状态的 Issue

### 按 assignee 过滤

只返回指定负责人的 Issue

### 多条件组合

project + status 同时生效

### 权限控制

用户无法看到无权限的 Issue

### 分页功能

支持传递页码, 最终返回 issues 列表以及总条数, 当前页码, 总页数, 分页大小, 是否有上一页和下一页

## 完成与交付标准

必须交付:

- Issue 查询 API
- Service 层筛选逻辑
- Zod 输入校验
- 基础测试用例

完成条件:

- [ ] 功能闭环可用
- [ ] 权限正确
- [ ] 数据边界正确
- [ ] 无越界功能实现
- [ ] 所有逻辑可测试
- [ ] 测试全部通过

## 后续动作

任务完成后, 根据实际情况更新 `specs/architecture.md`
