# AgentManagement

AgentManagement 是一个面向多 Agent 协同的软件项目管理系统。当前仓库用于保存产品主线、流程编排、工作台、Runner 集成、通知流转、SDK 化探索以及相关文档规范。

## 当前文档入口

后续开发和审查请优先阅读：

- 文档中心：[docs/README.md](docs/README.md)
- 当前协同上下文：[docs/handoff/latest-context.md](docs/handoff/latest-context.md)
- 下一步任务：[docs/handoff/handoff-next-tasks.md](docs/handoff/handoff-next-tasks.md)
- 项目状态：[docs/handoff/project-status.md](docs/handoff/project-status.md)
- 文档与产物归档规范：[docs/architecture/document-management-standards.md](docs/architecture/document-management-standards.md)
- Git worktree 协作规范：[docs/architecture/git-worktree-workflow.md](docs/architecture/git-worktree-workflow.md)
- 设计入口：[docs/design/README.md](docs/design/README.md)
- 设计总览：[docs/design/design-overview.md](docs/design/design-overview.md)
- 页面规格：[docs/design/page-spec.md](docs/design/page-spec.md)
- 前端实施计划：[docs/architecture/frontend-implementation-plan.md](docs/architecture/frontend-implementation-plan.md)

## 开发命令

```bash
npm install
npm run dev
npm --cache .npm-cache run build
```

## 协作规则

- 后续所有功能修改必须先有 GitHub Issue。
- 每个 Issue 使用独立分支和独立 worktree。
- 不要直接在 `main` 上开发功能。
- 文档整理、业务功能、测试修复应尽量拆成独立提交。
- 不要在仓库根目录生成临时文档、截图、mockup 或一次性脚本。
- Skill / AI 生成的过程文档统一放入 `docs/generated/`，默认不是最终依据。
- 当前设计稿只参考 `docs/design/mockups/current/` 和 `docs/design/assets/current/`。
- `.codegraph/` 是 Codegraph 工程服务数据与索引，禁止清理、归档或删除。

详细规则见：[docs/architecture/document-management-standards.md](docs/architecture/document-management-standards.md)

## 本地预览

```text
http://127.0.0.1:5173/
```
