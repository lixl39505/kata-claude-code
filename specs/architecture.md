# Architecture

本文件定义实现约束。  
业务规则见 requirements.md。

## 技术选型

### 版本约束

本文档记录各框架的主版本号。每次升级依赖后必须更新本节。

- **Next.js**: 16.x (App Router)
- **React**: 19.x
- **TypeScript**: 6.x
- **Jest**: 30.x
- **ESLint**: 10.x (flat config with @next/eslint-plugin-next)
- **Tailwind CSS**: 4.x (CSS-first configuration)
- **Zod**: 4.x
- **SQLite** (via better-sqlite3): 11.x

### 核心技术栈

- Next.js（App Router）
- TypeScript
- Zod
- SQLite
- Node.js

禁止引入未声明框架、数据库或验证库。

## 系统形态

- 单体应用
- 单组织
- 单数据库（SQLite）
- 不拆分微服务
- 不引入消息队列
- 不引入搜索引擎

## 分层结构

目录结构必须包含：

```bash
/app
    /api
/lib
    /db
    /services
    /validators
    /errors
    /auth
    /audit
```

分层规则：

- UI 层不得包含业务逻辑
- UI 不得访问数据库
- API 仅负责请求处理与调用 service. 禁止实现业务逻辑, 禁止直接访问数据库
- 业务逻辑必须在 services 层
- 仅 lib/db 可访问 SQLite
- 所有外部输入必须经过 Zod 校验. 禁止跳过 validator 直接处理原始输入
- Zod Schema 是输入结构唯一来源
- 校验必须在进入 service 前完成

## 权限模型

角色：

- Admin
- Member
- Viewer

规则：

- 权限策略为硬编码
- 所有写操作必须鉴权
- 最终权限校验必须在 services 层执行
- 所有认证逻辑必须复用已有认证能力（位于 `./lib/service/auth）
- 必须通过统一方法获取当前用户信息（如 `getCurrentUser`）. 禁止从 request 中手动解析用户信息

## Issue 状态机

状态：

OPEN  
IN_PROGRESS  
RESOLVED  
CLOSED

允许转换：

OPEN → IN_PROGRESS  
IN_PROGRESS → RESOLVED  
RESOLVED → CLOSED  
RESOLVED → IN_PROGRESS

规则：

- 状态变更必须通过统一状态机函数
- 禁止直接修改状态字段
- 非法转换必须抛出错误
- 状态变更必须原子执行

## 并发控制

- Issue 更新必须使用乐观锁（updatedAt 或 version）
- 发生冲突必须返回 CONFLICT 错误
- 禁止静默覆盖

## 审计日志

必须记录：

- 创建 Issue
- 状态变更
- 指派变更
- 标题或描述修改
- 删除评论
- 项目归档
- 角色变更

规则：

- 主写入与审计写入必须在同一事务; 主操作成功等于审计日志存在; 主操作失败不得写入审计日志
- 审计日志只允许追加
- 审计日志不得修改或删除
- 审计日志必须在 service 层写入; 禁止在 API 层拼接或写入审计数据

## 错误模型

所有 API 必须返回统一结构：

{
code: string,
message: string,
details?: object
}

必须包含以下错误类型：

- UNAUTHENTICATED
- FORBIDDEN
- VALIDATION_ERROR
- NOT_FOUND
- INVALID_STATE_TRANSITION
- CONFLICT
- INTERNAL

规则：

- 必须使用明确错误码
- 不得泄露内部实现细节
- 错误必须可预测、可测试

## 数据规则

- SQLite 是唯一数据源
- 所有数据库操作集中在 lib/db
- 禁止在 UI 或 API 中直接执行 SQL
- 数据迁移必须可重复执行
