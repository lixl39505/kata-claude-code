# Task 001 · 项目脚手架与约束落地

## 目标

建立一个可持续增量开发的最小项目骨架，把当前需求与架构里的硬约束先固化下来，避免后续 Claude Code 一边写功能一边把边界写烂。先把地基钉死，人类总喜欢在泥地上盖楼，然后惊讶它会塌。

本任务只做基础设施，不实现业务功能。

## 本任务完成后应具备的结果

- 已存在符合架构约束的目录结构
- 已完成 Next.js + TypeScript + Zod + SQLite 的基础接入
- 已建立统一错误模型的基础文件
- 已建立基础测试框架
- 已建立 lint / typecheck / test 命令
- README 或 AGENT 文档中写明本项目的开发约束

## 变更范围

允许新增或修改以下内容：

- 项目初始化文件
- `app/`
- `lib/db/`
- `lib/services/`
- `lib/validators/`
- `lib/errors/`
- `lib/auth/`
- `lib/audit/`
- `tests/` 或 `__tests__/`
- `package.json`
- `tsconfig.json`
- `eslint` 配置
- 测试配置文件
- `README.md` 或 `AGENT.md`
- 基础数据库初始化文件

## 必须遵守的约束

- 只能使用 architecture.md 中已批准技术栈
- 不得引入额外后端框架、ORM、数据库或验证库
- UI 层不得写业务逻辑
- API 层不得直接访问数据库
- 所有业务逻辑未来必须放在 `lib/services`
- 所有外部输入未来必须经过 Zod
- SQLite 必须是唯一数据源
- 当前任务不实现 RBAC、Issue 流转、审计写入等具体业务能力
- 当前任务不做无关样式、美化、页面装修

## 建议执行步骤

### 1. 初始化项目

完成一个可运行的 Next.js + TypeScript 项目。

要求：

- 使用 App Router
- Node.js 环境可运行
- 安装并配置 Zod
- 安装并配置 SQLite 驱动
- 安装并配置测试工具

### 2. 建立目录骨架

至少创建以下目录：

```txt
app/api
lib/db
lib/services
lib/validators
lib/errors
lib/auth
lib/audit
```

如需测试目录，可增加：

```txt
tests
```

### 3. 建立基础数据库接入层

完成最小可用的 SQLite 连接模块。

要求：

- 数据库访问代码只能放在 `lib/db`
- 暂不需要完整表结构
- 至少提供一个基础连接或执行 SQL 的封装入口
- 为后续迁移预留位置

### 4. 建立统一错误模型

创建统一错误结构与基础错误类型。

最少包含这些错误码常量或等价实现：

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `INVALID_STATE_TRANSITION`
- `CONFLICT`
- `INTERNAL`

返回结构目标：

```ts
{
  code: string
  message: string
  details?: object
}
```

### 5. 建立测试与质量门禁

要求：

- `lint`
- `typecheck`
- `test`

都能在本地执行。

### 6. 写约束文档

在 `CLAUDE.md` 中明确写出：

- 分层约束
- 禁止越界实现
- 修改前需阅读 `requirements.md` 与 `architecture.md`

## 验证规则

完成任务后，必须逐条自检：

### 结构验证

- [ ] 存在 `app/api`
- [ ] 存在 `lib/db`
- [ ] 存在 `lib/services`
- [ ] 存在 `lib/validators`
- [ ] 存在 `lib/errors`
- [ ] 存在 `lib/auth`
- [ ] 存在 `lib/audit`

### 依赖验证

- [ ] 项目使用 Next.js
- [ ] 项目使用 TypeScript
- [ ] 项目已接入 Zod
- [ ] 项目已接入 SQLite
- [ ] 未引入未批准技术栈

### 质量门禁验证

- [ ] `npm run lint` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run test` 通过

### 架构验证

- [ ] 没有在 UI 层写业务逻辑
- [ ] 没有在 API 层直接写 SQL
- [ ] 数据库访问入口仅位于 `lib/db`
- [ ] 已建立统一错误模型基础代码
- [ ] 已有测试框架可用于后续单元测试

### 文档验证

- [ ] `README.md` 或 `AGENT.md` 已说明开发约束
- [ ] 文档中已注明后续功能开发必须附带测试

## 交付物

完成本任务后，至少应能展示：

- 项目目录树
- `package.json` 关键脚本
- SQLite 基础接入文件
- 统一错误模型文件
- 测试配置文件
- 约束文档
- `lint / typecheck / test` 通过结果

## 单元测试要求

本任务不要求业务单元测试覆盖具体领域逻辑。

但必须满足：

- 已搭建测试运行环境
- 至少有 1 个基础 smoke test 或示例测试，证明测试框架可运行

## 完成定义

当且仅当以下条件全部成立，任务才算完成：

1. 项目可以本地启动或至少完成基础构建
2. 质量门禁命令全部通过
3. 目录结构符合 architecture.md
4. 没有实现超出需求范围的业务功能
5. 已为下一步实现认证 / 项目 / Issue 能力做好基础承载

## 下一任务的进入条件

只有在本任务完成并验证通过后，才进入下一个 task。
