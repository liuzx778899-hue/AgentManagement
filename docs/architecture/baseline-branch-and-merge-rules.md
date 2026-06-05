# 基线、分支与合并硬规则

本文定义 AgentManagement 后续多 Agent 协同时的主线保护规则。目标是避免旧分支、旧 mockup 或旧 UI 实现把已经定稿的页面和流程改回去。

## 核心原则

- `main` 只代表当前已经接受的产品基线。
- 所有新需求必须先有 GitHub Issue，再从最新 `origin/main` 拉分支。
- 禁止长期旧分支不更新就直接合并回 `main`。
- 禁止把 SDK / Agent Service 分支、主线流程编排分支、UI 定稿分支混在一起。
- 涉及页面、流程、工作台、项目详情的 PR，必须确认没有回退已定稿交互。

## 当前冻结规则

在用户确认“当前页面状态可以接受”并提交基线前：

1. 暂停合并 #26、#28、#30 以及任何会改动主线 UI / 流程编排的 PR。
2. 不允许开发者基于旧分支继续直接修 UI。
3. 可以继续做代码审查、记录问题、整理文档，但不要把旧实现合进 `main`。
4. 等当前可接受状态形成基线 commit 后，所有进行中的分支必须重新基于最新 `origin/main` 处理。

## 新需求启动硬规则

每个新需求必须按以下流程启动：

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -b issue-<number>-<short-slug>
```

如果使用 worktree：

```bash
git fetch origin
git worktree add .worktrees/issue-<number>-<short-slug> -b issue-<number>-<short-slug> origin/main
```

要求：

- 分支名必须包含 Issue 编号。
- PR 标题和 commit message 必须引用 Issue 编号。
- 一个 Issue 对应一个主分支；需要并行时先拆 Issue。
- 开发前必须阅读 [[../handoff/latest-context|最新上下文]] 和 [[../handoff/handoff-next-tasks|下一步任务]]。

## 旧分支处理硬规则

如果某个分支创建时间早于当前基线，不能直接合并。必须二选一：

### 方案 A：rebase 到最新 main

```bash
git fetch origin
git checkout <feature-branch>
git rebase origin/main
```

适合分支比较干净、冲突少、没有混入其他需求的情况。

### 方案 B：从最新 main 新建分支后 cherry-pick

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -b issue-<number>-<short-slug>-v2
git cherry-pick <needed-commit>
```

适合旧分支混入太多、改动范围不清、已经影响 UI 定稿文件的情况。

## PR 合并前检查

合并前必须检查：

- PR 是否基于最新 `origin/main`。
- PR 是否只解决对应 Issue。
- PR 是否混入 `.agentmanagement/` 运行时数据、缓存、截图、mockup、临时脚本。
- PR 是否修改了不属于该 Issue 的页面或样式文件。
- UI PR 是否提供截图或说明验证过的页面和视口。
- 涉及流程、工作台、项目详情的 PR 是否明确说明没有回退已定稿交互。

重点保护文件包括：

- `src/components/ProjectDetailPage.tsx`
- `src/components/WorkbenchHome.tsx`
- `src/components/ProjectManagementPage.tsx`
- `src/components/WorkflowManagementPage.tsx`
- `src/styles/project-detail.css`
- `src/styles/project-management.css`
- `src/styles/workbench.css`
- `src/styles/workflow*.css`
- `docs/handoff/`
- `docs/design/`

如果 PR 修改上述文件，但 Issue 目标不是对应页面或设计调整，默认退回要求拆分。

## 分支边界

### main 主线

`main` 表示管理平台产品主线：

- 项目管理
- 流程管理
- 工作台
- Runner 编排
- WorkflowEvent 通知流转
- 页面与交互定稿

### SDK / Agent Service 分支

SDK / Agent Service 是能力抽象线，只能包含：

- Agent Service 领域模型
- API / OpenAPI
- SDK client
- 服务端路由
- middleware
- 对应测试

不得混入：

- 工作台 UI 重构
- 流程管理 UI 调整
- 项目详情页面调整
- #26 / #27 / #28 / #30 的主线流程编排实现

### UI 定稿分支

UI 定稿分支只处理页面布局、交互、样式和验收截图，不应混入领域模型、SDK 或服务端大改。

## 防回退规则

以下情况视为高风险回退，必须停止合并并重新审查：

- PR 删除或覆盖用户已经确认的页面交互。
- PR 把当前页面改回旧 mockup 或旧截图状态。
- PR 使用历史 `docs/archive/`、`docs/generated/` 内容覆盖当前 `docs/design/` 或 `docs/handoff/`。
- PR 中出现大量格式化改动，导致真实业务改动难以审查。
- PR 修改了多个独立页面，却只关联一个 Issue。

## 推荐 PR 描述模板

```markdown
## 关联 Issue

Closes #<number>

## 改动范围

- 

## 基线确认

- [ ] 本分支基于最新 origin/main
- [ ] 未回退已定稿 UI / 交互
- [ ] 未混入 SDK / 主线 / UI 之外的其他需求
- [ ] 未提交运行时文件、缓存、临时截图或临时脚本

## 验证

- [ ] npm run build
- [ ] npm test 或相关测试
- [ ] UI 页面截图 / 手工验证说明
```

## 当前执行建议

当前阶段先让用户继续调整页面到可接受状态。用户确认后，先提交一个“当前定稿基线” commit，再要求 #26、#28、#30 等进行中的主线需求全部基于这个基线重放修改。
