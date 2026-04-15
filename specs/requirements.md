# Requirements

本系统为单组织 Issue 管理系统。

目标：

- 支持基础任务流转
- 支持固定角色权限
- 支持审计记录
- 范围可控，便于增量修改

不属于项目管理平台。

## 范围限制

仅支持：

- 单组织
- 固定 RBAC
- 基础状态流转
- 基础列表筛选

不支持：

- 多组织
- 邮件
- 实时协作
- 文件附件
- 富文本
- 搜索引擎
- 看板 / 甘特图
- Sprint / 敏捷统计
- 自定义权限

超出以上内容视为越界。

## 角色

Admin

- 管理用户
- 管理项目
- 查看所有 Issue
- 修改任意 Issue 状态

Member

- 创建 Issue
- 编辑自己创建的 Issue
- 指派负责人
- 修改自己负责的 Issue 状态
- 评论

Viewer

- 只读

## 核心实体

User

- email
- displayName
- role

Project

- name
- description
- archived

Issue

- title
- description
- state (OPEN/CLOSED)
- closeReason (COMPLETED/NOT_PLANNED/DUPLICATE)
- priority
- reporter
- assignee
- project

Comment

- content
- author
- issue

AuditLog

- 记录关键行为

## Issue 状态

状态模型采用 GitHub 风格的二态模型：

状态：

OPEN  
CLOSED

关闭原因：

COMPLETED  
NOT_PLANNED  
DUPLICATE

允许转换：

OPEN → CLOSED  
CLOSED → OPEN

规则：

- OPEN 状态下 closeReason 必须为空
- CLOSED 状态下 closeReason 必须有值
- 关闭 Issue 时未指定 closeReason，默认为 COMPLETED
- 重新打开 Issue 时，closeReason 自动清空

## 功能

认证

- 用户可登录
- 所有写操作必须登录

项目

- Admin 创建
- Admin 归档
- 所有人可查看列表

Issue

- Member / Admin 可创建
- 创建者或 Admin 可编辑
- 可指派负责人
- 状态变更必须合法（OPEN ↔ CLOSED）
- 可按 project / state / assignee 过滤

评论

- 用户可发表评论
- 可删除自己的评论
- Admin 可删除任意评论

审计  
必须记录：

- 创建 Issue
- 状态变更
- 指派变更
- 标题或描述修改
- 删除评论

## 验收流程

必须支持：

1. Admin 创建项目
2. Member 创建 Issue
3. 指派负责人
4. 状态变更（OPEN → CLOSED）
5. Admin 重新打开 Issue（CLOSED → OPEN）
6. 审计日志可追溯全部过程
