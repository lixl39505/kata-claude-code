# Issue Management System

单组织 Issue 管理系统 - 基于 Next.js + TypeScript + SQLite

## 项目结构

```
app/
  api/          # API 路由层
lib/
  db/           # 数据库访问层
  services/     # 业务逻辑层
  validators/   # Zod 输入校验
  errors/       # 统一错误模型
  auth/         # 认证逻辑
  audit/        # 审计日志
__tests__/      # 测试文件
```

## 技术栈

- **Next.js** - App Router
- **TypeScript** - 类型安全
- **Zod** - 输入校验
- **SQLite** - 数据库 (better-sqlite3)
- **Jest** - 测试框架

## 开发约束

⚠️ **重要**: 修改代码前必须阅读 `CLAUDE.md` 和 `specs/architecture.md`

核心约束：
- UI 层不得包含业务逻辑
- API 层不得直接访问数据库
- 只有 `lib/db` 可访问 SQLite
- 所有外部输入必须经过 Zod 校验
- 业务逻辑必须在 `lib/services` 层

## 质量门禁

所有代码必须通过：

```bash
npm run lint       # ESLint 检查
npm run typecheck  # TypeScript 类型检查
npm run test       # Jest 测试
```

## 开发命令

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器
npm run build      # 构建生产版本
npm run start      # 启动生产服务器
```

## 项目状态

✅ Task 001: 项目脚手架已完成

详见 `tasks/` 目录。
