# 架构与工程规范

本目录保存 AgentManagement 已确认的架构、工程流程、协同规则和技术决策。

## 当前必读

- [[baseline-branch-and-merge-rules|基线、分支与合并硬规则]]
- [[git-worktree-workflow|Git Worktree 协作流程]]
- [[document-management-standards|文档管理规范]]
- [[frontend-implementation-plan|前端实现计划]]
- [[design-review-operating-model|设计审查运行模型]]

## 使用规则

- 新需求开始前，先确认当前 `main` 是否已经包含最新基线。
- 旧分支合并前，必须按 [[baseline-branch-and-merge-rules|基线、分支与合并硬规则]] 检查是否会回退页面或流程。
- 文档、截图、mockup、运行时文件归档规则以 [[document-management-standards|文档管理规范]] 为准。
- 分支和 worktree 创建流程以 [[git-worktree-workflow|Git Worktree 协作流程]] 为准。

## 关联入口

- [[../00-导航|文档导航]]
- [[../handoff/handoff-next-tasks|下一步任务]]
- [[../handoff/latest-context|最新上下文]]
