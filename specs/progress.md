# 开发进度（Progress）

## 当前阶段

- Phase: Collaboration（协作能力）

## 已完成能力

- 用户认证（register / login / session）
- Project 基础能力（创建 / 列表 / 访问控制）
- Issue 基础能力（创建 / 列表 / 详情）
- Issue 状态流转（GitHub 风格二态模型 + 关闭原因）
- Issue 审计日志（创建 / 状态变更记录 / 分页查询）
- Issue 评论（创建 / 列表）
- Issue 评论 @ 提及（识别 / 验证 / 保存）
- Issue 指派（assignee）
- Project 成员管理（添加 / 移除 / 列表）
- Project 访问边界（成员可见 / 非成员不可访问）
- Issue assignee 约束（必须是 Project 成员）
- Issue 批量操作（状态 / 指派）
- Issue 预设视图（My Issues / Open Issues / Closed Issues）
- Issue 关闭原因统计（按 closeReason 统计 CLOSED Issue 数量）
- Issue Dashboard 统计（总数 / 状态分布 / 关闭原因统计）
- 基础通知能力（mention / assignee 变更通知 / 已读标记）
- 通知未读计数与批量已读（未读数量查询 / 批量标记已读 / 全部标记已读）
- 用户自定义视图（保存筛选条件 / 创建视图 / 列表视图 / 删除视图 / 使用视图查询 Issue）
- 数据库索引优化（Issue 查询索引 / Notification 查询索引 / AuditLog 查询索引 / 查询路径验证）
- API 统一错误处理（统一错误响应结构 / 错误码映射 / 错误信息脱敏 / 完整测试覆盖）

## 当前任务

- API 统一错误处理（task-024-api-error-consistency）- 已完成
- 数据库索引优化（task-023-db-index-optimization）- 已完成
- 审计日志查询（task-022-audit-log-query）- 已完成
- 用户自定义视图（task-020-custom-views）- 已完成
- Issue 乐观锁（task-021-optimistic-locking）- 已完成

## 近期待办候选

- Issue 批量删除（是否需要待定）

## 当前决策

- 使用 SQLite 作为唯一数据源
- 使用 Zod 做输入校验
- 不使用 ORM
- task 必须为功能闭环
- 通用约束统一维护在 AGENT.md
- task 禁止引用历史 task 编号

## 风险与待决问题

- 是否需要多用户协作（成员系统）✅ 已实现
- 是否需要权限模型（RBAC 或简化版）✅ 基础版本已实现
- 是否需要通知系统

## 完成判断（MVP）

当满足以下条件时，视为 MVP 完成：

- 用户可以注册 / 登录
- 用户可以创建 Project
- 用户可以创建 / 查看 / 更新 Issue
- 用户可以评论 Issue
- 用户可以指派 Issue
- 用户可以筛选 Issue
- 用户可以查看操作记录（审计日志）
- 用户可以管理 Project 成员 ✅
- 用户可以批量操作 Issue ✅
- 用户可以使用预设视图查看 Issue ✅
- 用户可以保存和使用自定义视图 ✅
- 用户可以查看操作记录（审计日志）
