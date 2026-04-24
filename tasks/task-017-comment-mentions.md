# Issue 评论 @ 提及

## 目标

实现: Issue 评论 @ 提及能力

必须包含:

- 支持在评论内容中识别被 @ 提及的用户
- 仅允许提及当前 Issue 所属 Project 的成员
- 在评论创建后保存提及结果，供后续通知能力复用
- 评论列表返回提及信息

明确不实现:

- 富文本编辑器
- 模糊匹配 / 自动补全
- 跨 Project 提及
- 邮件或站外通知发送
- 复杂 parser 或 markdown 扩展语法

## 变更范围

修改模块:

- Comment API
- Comment Service
- Comment Validator
- DB Access Layer
- Audit Service

依赖模块:

- Auth 模块
- Project 成员能力
- 错误模型
- SQLite 数据迁移

允许修改目录:

- /app/api/issues/**
- /lib/services/**
- /lib/validators/**
- /lib/db/**
- /lib/errors/**
- /lib/audit/**
- /specs/architecture.md
- /specs/progress.md

## 数据模型

新增实体:

CommentMention

字段:

- commentId
- issueId
- projectId
- mentionedUserId
- createdAt

约束:

- 同一 commentId + mentionedUserId 必须唯一
- mentionedUserId 必须属于对应 projectId 的成员
- Comment 删除后，其 mention 记录必须同步删除或不可见

## API

### 创建评论

创建 Issue 评论，并识别 @ 提及

POST /api/issues/:id/comments

输入:

{
  content: string
}

默认值:

- 无

输入约束:

- content 不可为空
- 提及语法为 `@用户标识`
- 当前任务要求用户标识使用系统唯一账号标识，例如 email 本地名或明确约定的 mentionKey
- 同一条评论中重复提及同一用户，只记录一次
- 被提及用户必须是当前 Project 成员
- 非法提及必须返回 VALIDATION_ERROR
- 必须先完成鉴权与 Project 访问权限校验

输出:

{
  id: string,
  issueId: string,
  content: string,
  authorId: string,
  mentions: Array<{
    userId: string,
    displayName: string
  }>,
  createdAt: string
}

输出约束:

- 返回去重后的提及结果
- 不得返回无权限 Project 的成员信息

### 获取评论列表

获取 Issue 评论列表及提及信息

GET /api/issues/:id/comments

输入:

- path: id

默认值:

- 无

输入约束:

- 必须具备该 Issue 所属 Project 的访问权限

输出:

{
  items: Array<{
    id: string,
    issueId: string,
    content: string,
    authorId: string,
    mentions: Array<{
      userId: string,
      displayName: string
    }>,
    createdAt: string
  }>,
  total: number
}

输出约束:

- 评论内容与提及信息必须保持一致
- 仅返回当前用户有权限访问的数据

## 业务规则

提及识别规则:

- 只在评论创建时解析提及
- 当前任务采用最小规则:
  - 以空格、行首、行尾或常见标点作为边界
  - 匹配 `@标识`
- 不要求支持昵称模糊匹配
- 不要求支持编辑评论后重新解析

成员约束:

- 只能提及当前 Project 成员
- 非成员、已移除成员、跨 Project 用户均不得被提及
- 若评论中包含一个或多个非法提及，整个请求失败

一致性规则:

- 评论主写入与 mention 记录写入必须在同一事务
- 评论创建成功等于 mention 结果已正确落库
- 评论创建失败不得残留 mention 记录

审计规则:

- 评论创建仍按既有规则写入审计日志
- 不单独为每个 mention 写一条审计日志
- 若系统已有评论删除审计，删除评论后 mention 数据也必须与读取结果保持一致

兼容规则:

- 未包含任何 mention 的评论，行为与当前评论功能一致
- 评论列表接口在旧评论上返回 mentions = []

## 测试用例

### 单用户提及成功

评论中包含一个合法 Project 成员提及，评论创建成功并返回 mentions

### 多用户提及成功

评论中包含多个合法成员提及，均被正确识别并保存

### 重复提及去重

同一评论多次提及同一用户，只保留一条 mention 记录

### 非成员提及拦截

提及非当前 Project 成员必须失败，并返回 VALIDATION_ERROR

### 跨 Project 提及拦截

提及其他 Project 成员必须失败

### 无提及兼容

普通评论不含提及时，创建与读取行为保持兼容

### 评论列表返回提及

评论列表接口正确返回每条评论的 mentions 信息

### 事务一致性

评论写入失败时，不得残留 mention 记录

### 权限隔离

无权限用户不得创建或读取该 Issue 评论与提及信息

## 完成与交付标准

前置:

修改前先输出变更计划, 用户确认后再执行.

必须交付:

- [ ] CommentMention 数据模型
- [ ] 评论创建时的 mention 解析逻辑
- [ ] mention 成员合法性校验
- [ ] 评论列表 mentions 返回能力
- [ ] 事务一致性处理
- [ ] 测试用例补齐并通过
- [ ] `specs/architecture.md` 更新
- [ ] `specs/progress.md` 更新

完成条件:

- [ ] 功能闭环可用
- [ ] 权限正确
- [ ] 数据边界正确
- [ ] 无越界功能实现
- [ ] 所有逻辑可测试
- [ ] 所有单元测试全部通过

## 后续动作

任务完成后, 根据实际情况更新 `specs/architecture.md`, 比如:

- 若新增了 CommentMention 实体, 需要维护架构图与数据模型
- 若评论模块新增提及解析流程, 需要同步更新 Service / DB 依赖关系
- 若修改了评论读取结构, 需要更新对应接口说明

还需要更新 `specs/progress.md`, 维护项目开发进度.
