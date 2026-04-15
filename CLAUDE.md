# Claude Code

## 目录结构

- `specs`: 存放项目描述文档, 作为单一事实来源
- `app`: 用于存放路由和前端代码
- `lib`: 用于存放后端服务代码
- `__tests__`: 用于存放测试代码

## 前置要求

在修改任何代码前，必须：

1. 阅读 `specs/requirements.md` —— 了解业务需求
1. 阅读 `specs/architecture.md` —— 掌握系统技术架构
1. 阅读 `specs/roadmap.md` —— 了解项目整体开发计划
1. 阅读 `specs/progress.md` —— 获取项目进度

## 质量控制

- 不得实现未定义功能
- 不得进行与当前任务无关的重构
- 所有修改必须具备单元测试, 必须覆盖：
  - 正常路径
  - 关键失败路径
- 所有修改都必须通过以下测试命令, 禁止跳过测试直接提交：
  - lint
  - typecheck
  - test
