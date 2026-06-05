# AgentManagement 文档中心

这里是产品规划、架构设计、页面设计、协同交接和评审资料的统一入口。

如果用 Obsidian 阅读，建议先打开 [[00-导航|文档导航]]，再从导航页进入各类资料。

## 优先阅读

当前开发优先阅读这些文件：

1. [[00-导航|文档导航]]
2. [[product/phase-2-blueprint|Phase 2 蓝图]]
3. [[product/roadmap-and-architecture|产品路线与架构]]
4. [[architecture/git-worktree-workflow|Git Worktree 协作流程]]
5. [[architecture/document-management-standards|文档管理规范]]
6. [[architecture/frontend-implementation-plan|前端实现计划]]
7. [[handoff/latest-context|最新上下文]]
8. [[handoff/handoff-next-tasks|下一步任务]]
9. [[design/README|设计目录说明]]

## 目录规则

- `product/`：已经确认的产品规划、需求、路线图和阶段范围。
- `architecture/`：已经确认的系统架构、工程流程、代码约束和技术决策。
- `design/`：已经确认的 UI 设计规范、设计变量、mockup、截图和视觉参考。
- `api/`：API 契约和 OpenAPI 文档。
- `handoff/`：当前协同状态、下一步任务、项目状态和审查请求。
- `reviews/`：PR、Issue 和代码审查记录。
- `generated/`：AI、Skill 或其他工具生成的草稿和过程文档，默认不是最终依据。
- `archive/`：历史资料、备份、日志、旧会话和旧版 mockup。

## 文档提升规则

`generated/` 中的文档默认都是草稿。只有当某份生成文档被确认采用后，才把确认后的内容整理或移动到 `product/`、`architecture/`、`design/` 或 `handoff/`。

后续 Agent 不应把 `generated/` 或 `archive/` 当作当前唯一依据，除非当前交接文档明确引用了其中的内容。

## 根目录约束

后续不要在仓库根目录生成临时文档、截图、mockup、一次性脚本或测试产物。具体规则见 [[architecture/document-management-standards|文档管理规范]]。
