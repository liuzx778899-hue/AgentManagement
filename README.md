# AgentDevelop

AgentDevelop 是一个个人本地优先的 AI 软件项目管理系统。当前仓库用于保存页面定稿基线、后续 issue 驱动开发，以及多 AI 工具通过 worktree 并行协作的工程记录。

## 当前基线

- 页面定稿记录：[docs/HANDOFF_NEXT_TASKS.md](docs/HANDOFF_NEXT_TASKS.md)
- 项目状态：[docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)
- 最新上下文：[docs/LATEST_CONTEXT.md](docs/LATEST_CONTEXT.md)
- 设计总览：[docs/design/DESIGN_OVERVIEW.md](docs/design/DESIGN_OVERVIEW.md)
- 页面规格：[docs/design/PAGE_SPEC.md](docs/design/PAGE_SPEC.md)
- 前端实施计划：[docs/frontend/FRONTEND_IMPLEMENTATION_PLAN.md](docs/frontend/FRONTEND_IMPLEMENTATION_PLAN.md)

## 开发命令

```bash
npm install
npm run dev
npm --cache .npm-cache run build
```

## 协作流程

后续所有修改必须先创建 GitHub Issue，再基于 Issue 建立独立分支和 worktree。详见：

- [docs/GIT_WORKTREE_WORKFLOW.md](docs/GIT_WORKTREE_WORKFLOW.md)

## 本地预览

- 应用：`http://127.0.0.1:5173/`

