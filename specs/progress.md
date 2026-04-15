# 开发进度（Progress）

## 当前阶段

- Phase: Core Foundation

## 已完成能力

- 用户认证（register / login / session）
- Project 基础能力（创建 / 列表 / 访问控制）
- Issue 基础能力（创建 / 列表 / 详情）
- Issue 状态流转（GitHub 风格二态模型 + 关闭原因）
- Issue 审计日志（创建 / 状态变更记录）
- Issue 评论（创建 / 列表）
- Issue 指派（assignee）

## 当前任务

- Issue 状态模型重构（task-010-issue-state-github-style）- 已完成

## 近期待办候选

- Issue 批量操作（状态 / 指派）
- Project 成员管理（最小协作能力）
- 通知基础（是否需要待定）

## 当前决策

- 使用 SQLite 作为唯一数据源
- 使用 Zod 做输入校验
- 不使用 ORM
- task 必须为功能闭环
- 通用约束统一维护在 AGENT.md
- task 禁止引用历史 task 编号

## 风险与待决问题

- 是否需要多用户协作（成员系统）
- 是否需要权限模型（RBAC 或简化版）
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
