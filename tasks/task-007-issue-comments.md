# Task 007 · Issue 评论系统（基础版）

## 目标

为 Issue 引入最小评论能力，使用户可以对 Issue 进行讨论。

本任务只实现：

- 评论数据结构
- 创建评论
- 获取 Issue 下评论列表

本任务不得实现：

- 评论编辑
- 评论删除
- 富文本
- @ 提及
- 通知
- 评论审计日志

## 本任务完成后必须具备的结果

- 存在评论持久化结构
- 已登录用户可以在自己 Project 的 Issue 下创建评论
- 已登录用户可以查看评论列表
- 不能访问他人 Project 下的评论
- 所有功能具备测试

## 数据结构

必须创建 `issue_comments` 表：

```ts
IssueComment {
  id: string
  issueId: string
  projectId: string
  authorId: string
  content: string
  createdAt: string
}
```

约束：

- content 长度 1~5000
- 不允许空字符串

## 输入规则

```ts
{
  content: string
}
```

## 服务层

必须实现：

- createComment
- listCommentsForIssue

## API

- POST /api/projects/[projectId]/issues/[issueId]/comments
- GET /api/projects/[projectId]/issues/[issueId]/comments

## 验证规则

- 创建成功
- 空内容失败
- 跨 project 失败
- 未登录失败

## 测试

必须覆盖：

- service
- API

## 完成定义

1. 评论可创建
2. 评论可读取
3. 权限正确
4. 测试完整
