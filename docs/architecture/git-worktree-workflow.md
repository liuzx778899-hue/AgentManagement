# GitHub Issue 与 Worktree 协作流程

本仓库从页面定稿基线开始，后续所有修改都必须先有 GitHub Issue，再建立独立分支和 worktree。目标是让不同 AI 工具、不同任务互不覆盖。

## 基本规则

- 一个需求、缺陷或页面调整对应一个 GitHub Issue。
- 一个 Issue 对应一个分支和一个 worktree。
- `main` 只保存稳定基线，不直接开发。
- 不同 AI 工具不要共用同一个 worktree。
- 提交信息和 PR 必须引用 Issue 编号，例如 `fix: adjust project detail layout (#123)`。

## 命名规范

- Issue 分支：`issue-<编号>-<简短描述>`
- Worktree 目录：`.worktrees/issue-<编号>-<简短描述>`
- PR 标题：`[#<编号>] <任务标题>`

## 新任务启动

```bash
git fetch origin
git worktree add .worktrees/issue-123-project-detail-layout -b issue-123-project-detail-layout main
cd .worktrees/issue-123-project-detail-layout
npm install
```

在 worktree 中开发、验证、提交：

```bash
npm --cache .npm-cache run build
git status --short
git add .
git commit -m "fix: adjust project detail layout (#123)"
git push -u origin issue-123-project-detail-layout
```

## PR 要求

- PR 必须关联 Issue：`Closes #123`。
- UI 页面调整必须说明已验证的页面和视口。
- 合并前至少执行 `npm --cache .npm-cache run build`。
- 如果任务涉及页面视觉，保留对照说明，不提交临时截图产物。

## Worktree 清理

PR 合并后再清理本地 worktree：

```bash
git worktree remove .worktrees/issue-123-project-detail-layout
git branch -d issue-123-project-detail-layout
```

