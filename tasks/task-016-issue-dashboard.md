# Issue 简单统计面板

## 目标

实现: Issue 简单统计面板（Dashboard API）

必须包含:

- 返回 Issue 总数
- 返回 OPEN / CLOSED 数量分布
- 返回 closeReason 分布（复用已有统计能力）
- 支持按 project 维度统计

明确不实现:

- 前端 UI
- 图表渲染
- 时间趋势分析
- 复杂聚合查询

## 变更范围

修改模块:

- Issue API
- Issue Service
- DB Access Layer

依赖模块:

- Auth 模块
- 关闭原因统计能力

允许修改目录:

- /app/api/issues/\*\*
- /lib/services/\*\*
- /lib/db/\*\*
- /specs/architecture.md
- /specs/progress.md

## API

### 获取 Dashboard 数据

GET /api/issues/stats/dashboard

输入:

{
projectId?: string
}

默认值:

- 不传 projectId 返回全局统计

输入约束:

- projectId 必须为有效 ID（如提供）
- 必须具备访问权限

输出:

{
total: number,
openCount: number,
closedCount: number,
closeReasonStats: Array<{
closeReason: "COMPLETED" | "NOT_PLANNED" | "DUPLICATE" | "OTHER",
count: number
}>
}

输出约束:

- 数据必须一致
- 必须只返回当前用户可访问的数据

## 测试用例

### 全局统计

返回全部 Issue 的总数与分布

### project 统计

仅返回指定 project 的统计数据

### 权限控制

无权限 project 不可访问

### 数据一致性

total = openCount + closedCount

### 空数据

无数据时返回 0

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] Dashboard API
- [ ] Service 聚合逻辑
- [ ] 权限校验
- [ ] 测试用例
- [ ] 文档更新

完成条件:

- [ ] 功能闭环可用
- [ ] 权限正确
- [ ] 数据边界正确
- [ ] 所有逻辑可测试
- [ ] 测试全部通过

## 后续动作

更新 specs/architecture.md 与 specs/progress.md
