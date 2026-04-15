# 改进点

## task1 生成项目基础框架

- [x] 部分依赖不是最新, 特别是跟 test / lint 相关的, 比如 jest / eslint / tailwind
- [x] CLaude.md 太冗余:
  - 很多内容在其它 specs 文档已明确
  - 要求阅读 task 多余

## task2 身份验证

- [x] task 中出现了"建议 xxx", "方案 A... 方案 B...", 太模糊
- [ ] 单元测试未添加
- [ ] 未创建 UI 界面

## task3 创建项目

- [x] task 描述有些啰嗦, 可以标准化一些

> 出于复杂度考虑, ai 没有编写测试和 UI, 这里暴露出一个 task 范围是否合理的判断问题.

## task4 创建 issues

- [x] task4 内容中提到了 task 002/003, 违反了 "单一事实源", 应该引用已有的领域模块

## task5 issue 状态

- [x] OPEN -> DONE 应该是被允许的
- [ ] 跟 requirements 不符, 没有 DONE, 应该是 RESOLVED 或 CLOSED

## task6 issue 审计日志

- [x] 一些约束重复出现, 比如不得引入新的 ORM 框架 / API 层不得实现业务... 应该提升到项目约束中去
- [ ] 审计日志是专为 issue 操作设置的, 通用或许更好

## task7 issue 添加评论

- [x] 任务过于简单

## task8 issue 分配

## task9 issue 筛选

- [x] 事实来源描述比较冗余, 出现了禁止引用历史 task 字样
- [x] v2 过于简洁, 缺少清晰的验证规则和目标约束(哪些做, 哪些不做)
- [x] 缺少分页功能
- [ ] 目前 task 没有加入性能和扩展性的考虑

## task10 issue 状态重构

- [ ] db 使用了物理外键, 应当只用逻辑外键

# 进化

- [x] cc 在需要 "确认" 时, 应该发出声音提示我
- [ ] 多模型协同, 让 Codex 负责架构和任务分配, cc 负责写, oc 负责测试
- [ ] 实现 vibe remote
- [ ] 总结一个权限白名单, 减少打扰
  - [ ] cc 权限配置部分没有生效, 比如 Bash(find:\*)
- [x] 需要一个 task 编写模板
  - [x] task 会引入新的业务约束, 需要反哺到 specs 中去
  - [x] 随着 task 推进, 不清楚完成了哪些 feature 和功能点, 最好跟踪一下, 维护 progress.md
- [ ] ?? 主 agent 作为治理者(理解, 任务编排, 验证), 一个子 agent 负责开发, 一个子 agent 负责测试
- [ ] 可以提炼一个术语表, 有助于精确描述(比如 Project, Issue)
- [ ] cc 写的代码太多了, 需要另外一个 agent 来审核, 告诉我结果
