# Issue 关闭原因统计

## 目标

实现: Issue 关闭原因统计能力

必须包含:

- 按 closeReason 统计 CLOSED Issue 数量
- 支持按 project 维度统计
- 支持返回总体统计（不区分 project）

明确不实现:

- 时间区间统计
- 趋势分析（如折线图）
- 导出报表

## 变更范围

修改模块:

- Issue API
- Issue Service
- DB Access Layer

依赖模块:

- Auth 模块

允许修改目录:

- /app/api/issues/**
- /lib/services/**
- /lib/db/**
- /specs/architecture.md
- /specs/progress.md

## API

### 获取关闭原因统计

获取 Issue 关闭原因分布

GET /api/issues/stats/close-reason

输入:

{
  projectId?: string
}

默认值:

- 不传 projectId 时, 返回全局统计

输入约束:

- projectId 必须为有效 ID（如提供）
- 必须具备访问对应 Project 的权限

输出:

{
  items: Array<{
    closeReason: "COMPLETED" | "NOT_PLANNED" | "DUPLICATE" | "OTHER",
    count: number
  }>,
  total: number
}

输出约束:

- 仅统计 state = CLOSED 的 Issue
- 未关闭 Issue 不参与统计
- 必须只统计当前用户有权限访问的数据

## 测试用例

### 全局统计

返回所有 CLOSED Issue 的 closeReason 分布

### 按 project 统计

仅统计指定 project 下的 CLOSED Issue

### 权限控制

用户无法统计无权限 Project 的数据

### 空数据

无 CLOSED Issue 时返回空数组或 count = 0

### 数据准确性

统计结果与数据库实际数据一致

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] 关闭原因统计 API
- [ ] Service 层统计逻辑
- [ ] 权限校验
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

任务完成后, 更新 `specs/architecture.md` 与 `specs/progress.md`
