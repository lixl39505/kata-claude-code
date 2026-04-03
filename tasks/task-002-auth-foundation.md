# Task 002 · 认证基础能力与当前用户上下文

## 目标
实现最小认证闭环与当前用户上下文能力，为后续 Project / Issue 功能提供身份基础。
本任务范围是确定的，不允许扩展到 RBAC、组织、多租户或第三方登录。

## 本任务完成后必须具备的结果
- 存在用户持久化结构
- 登录 / 登出 / 当前用户接口可用
- 服务层可以稳定获取当前用户
- API 可以识别未登录请求
- 所有输入经过 Zod 校验
- 所有认证相关逻辑具备单元测试

## 变更范围
- app/api/**
- lib/auth/**
- lib/services/**
- lib/validators/**
- lib/errors/**
- lib/db/**
- tests/** 或 __tests__/**
- 数据库初始化或迁移文件

## 强制约束
- 不得引入新的后端框架、ORM 或认证服务
- API 层不得实现业务逻辑
- API 层不得直接访问数据库
- 数据库访问只能在 lib/db
- 所有输入必须通过 Zod 校验
- 不得实现 RBAC / 组织 / OAuth / 验证码 / 设备管理

## 用户数据结构
User:
- id: string
- email: string (唯一)
- passwordHash: string
- name: string
- createdAt: string
- updatedAt: string

## 必须实现能力
- register
- login
- logout
- getCurrentUser
- requireAuthenticatedUser

## API
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

## 登录态
必须为真实可用机制（cookie/session），不可 mock

## 验证规则
- 注册成功
- 登录成功/失败路径正确
- me 接口正确区分登录态
- logout 后失效

## 测试
必须覆盖：
- service
- validator
- API

## 完成定义
1. 存在真实认证闭环
2. 当前用户可获取
3. 所有路径可控
4. 测试完整
