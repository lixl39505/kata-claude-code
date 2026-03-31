# Claude Code 开发约束

本文件定义 AI 协助开发时必须遵守的硬约束。

## 前置要求

在修改任何代码前，必须：
1. 阅读 `specs/requirements.md` - 了解业务需求
2. 阅读 `specs/architecture.md` - 了解技术约束
3. 阅读相关 task 文件 - 了解当前任务目标

## 技术栈（禁止未经批准引入新技术）

- Next.js (App Router)
- TypeScript
- Zod
- SQLite (better-sqlite3)
- Node.js
- Jest (测试)

## 分层架构约束

### 目录结构

```
/app
  /api         # API 路由，仅处理请求/响应
/lib
  /db          # 数据库访问层（唯一可直接访问 SQLite 的地方）
  /services    # 业务逻辑层
  /validators  # Zod schemas
  /errors      # 统一错误模型
  /auth        # 认证逻辑
  /audit       # 审计日志
```

### 分层规则

1. **UI 层 (app/)**
   - 不得包含业务逻辑
   - 不得直接访问数据库
   - 仅负责展示和用户交互

2. **API 层 (app/api/)**
   - 仅负责请求处理与响应
   - 调用 services 层执行业务逻辑
   - 不得直接写 SQL 或访问数据库
   - 不得直接操作 SQLite

3. **Services 层 (lib/services/)**
   - 所有业务逻辑必须在此层实现
   - 调用 db 层访问数据
   - 执行权限校验
   - 管理事务

4. **DB 层 (lib/db/)**
   - **唯一可访问 SQLite 的地方**
   - 提供 SQL 执行封装
   - 不得包含业务逻辑

5. **Validators 层 (lib/validators/)**
   - 所有外部输入必须经过 Zod 校验
   - Zod Schema 是输入结构的唯一来源

6. **Auth 层 (lib/auth/)**
   - 认证相关逻辑
   - 用户身份验证

7. **Audit 层 (lib/audit/)**
   - 审计日志记录
   - 追踪关键操作

8. **Errors 层 (lib/errors/)**
   - 统一错误定义
   - 错误码常量

## 数据访问约束

- SQLite 是唯一数据源
- 禁止在 UI 或 API 层直接执行 SQL
- 数据迁移必须可重复执行
- 使用 better-sqlite3 驱动

## 错误处理约束

所有 API 必须返回统一结构：

```typescript
{
  code: string,      // 错误码（见 lib/errors/index.ts）
  message: string,   // 用户可读的错误信息
  details?: object   // 可选的详细信息
}
```

错误码定义：
- `UNAUTHENTICATED` - 未认证
- `FORBIDDEN` - 无权限
- `VALIDATION_ERROR` - 输入校验失败
- `NOT_FOUND` - 资源不存在
- `INVALID_STATE_TRANSITION` - 非法状态转换
- `CONFLICT` - 并发冲突
- `INTERNAL` - 内部错误

## 权限模型

角色（硬编码）：
- Admin - 管理员
- Member - 普通成员
- Viewer - 只读用户

规则：
- 所有写操作必须鉴权
- 最终权限校验必须在 services 层执行

## Issue 状态机约束

状态：OPEN → IN_PROGRESS → RESOLVED → CLOSED

允许转换：
- OPEN → IN_PROGRESS
- IN_PROGRESS → RESOLVED
- RESOLVED → CLOSED
- RESOLVED → IN_PROGRESS

禁止：
- 跳跃转换
- 直接修改状态字段

必须通过统一状态机函数执行状态转换。

## 并发控制约束

- Issue 更新必须使用乐观锁（updatedAt 或 version）
- 发生冲突必须返回 CONFLICT 错误
- 禁止静默覆盖数据

## 审计日志约束

必须记录：
- 创建 Issue
- 状态变更
- 指派变更
- 标题或描述修改
- 删除评论
- 项目归档
- 角色变更

规则：
- 主写入与审计写入必须在同一事务
- 审计日志只允许追加
- 审计日志不得修改或删除

## 质量门禁

修改代码前必须确保：
- `npm run lint` 通过
- `npm run typecheck` 通过
- `npm run test` 通过

禁止通过禁用规则绕过检查。

## 功能开发规则

1. 所有变更必须附带测试
2. 禁止实现超出 `requirements.md` 范围的功能
3. 禁止无关重构
4. 禁止引入未批准的技术
5. 禁止跨层耦合

## 变更流程

修改代码前必须输出变更计划：

1. 修改目标
2. 变更文件列表
3. 影响范围
4. 回滚方案

## 当前项目状态

- ✅ 项目脚手架已完成
- ✅ 错误模型已建立
- ✅ 数据库接入层已创建
- ✅ 测试框架已配置
- ✅ 质量门禁已建立

下一步任务参考 `tasks/` 目录。
