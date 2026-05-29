# Phase 2 工程层蓝图

更新：2026-05-29

> 本文档汇总所有 Phase 2 待实现范围。Phase 1 只做前端 MVP+fixtures，Phase 2 接真实后端/本地工程层。

---

## 2026-05-29 启动结论

Phase 1 页面定稿基线已经提交并推送到 GitHub，当前可以进入 Phase 2 工程层开发。

启动依据：

- `main` 分支为当前稳定基线。
- 当前远程仓库：`https://github.com/liuzx778899-hue/AgentManagement.git`
- Phase 1 页面范围已按 `docs/HANDOFF_NEXT_TASKS.md` 顶部“页面定稿基线 / Git 初始快照”归档。
- 构建验证通过：`npm --cache .npm-cache run build`
- 测试验证通过：`npm --cache .npm-cache test`，14 个测试文件、109 个测试通过。
- 后续任务必须按 Issue / branch / worktree 拆分，避免多个 AI 工具互相覆盖。

Phase 2 启动原则：

- 不再把页面视觉微调作为主线任务，除非它阻塞工程层能力落地。
- 所有真实工程能力先做只读、可观测、可回滚，再做写入和自动执行。
- 每个功能必须保留 mock/fixture fallback，避免真实本地能力不可用时页面崩溃。
- 本地命令执行必须有白名单、超时、日志截断和错误态展示。
- GitHub 插件/CLI 不稳定时，Issue 可先在 GitHub 网页手动创建，开发仍按 Issue 编号建分支和 worktree。

---

## Phase 2 技术选型定稿

### 语言与运行时

- 前端继续使用 `TypeScript + React + Vite`，不切换框架。
- 本地工程层优先使用 `Node.js + TypeScript`，与现有前端工程共享类型、校验和构建链路。
- 本地命令、Git、worktree、文件系统和 CLI Runner 进程管理使用 Node.js `child_process` / `fs` / `path` 等标准能力封装。
- 暂不引入 Python、Go、Rust、Java 或独立后端语言，除非后续某个 Runner 生态明确需要。
- 暂不做数据库；Phase 2 数据先以 `.agentmanagement/` 下的 JSON / JSONL / MD 文件持久化。

### 应用架构

采用“前端 UI + 本地工程服务层 + 文件系统状态”的本地优先架构：

```text
React UI
  ↓
UseCase / Service API
  ↓
Adapters
  ├─ GitAdapter
  ├─ WorktreeAdapter
  ├─ ProcessRunnerAdapter
  ├─ FileStoreAdapter
  ├─ GitHubAdapter
  └─ LlmAdapter
  ↓
Local workspace / CLI / GitHub / LLM
```

核心原则：

- UI 组件只调用 UseCase，不直接执行 shell、读写文件或访问 GitHub。
- UseCase 负责业务编排，例如创建 Issue worktree、启动 Runner、保存流程、写入记忆。
- Adapter 负责外部能力边界，例如 Git 命令、文件读写、CLI 子进程、GitHub API、LLM API。
- 所有 Adapter 都必须提供 mock fallback，方便纯前端预览和失败降级。
- 本地优先，远程同步只是增强能力，不把 GitHub 或云服务作为页面可用性的前置条件。

### 设计模式

- `Adapter Pattern`：隔离 Git、文件系统、进程、GitHub、LLM 等外部能力。
- `UseCase / Application Service`：把业务流程从 React 组件中拿出来，保持页面只负责展示和交互。
- `Repository Pattern`：封装项目配置、流程、角色、记忆、运行记录等本地文件读写。
- `Command Pattern`：把危险操作建模成可审计命令，例如删除 worktree、push、启动 Runner。
- `Event Log`：运行事件追加写入 JSONL，支持恢复、审计和 UI 日志流。
- `State Machine`：AgentRun、WorkflowRun、Gate 状态按明确状态迁移处理，避免按钮状态散落在组件里。
- `Strategy Pattern`：不同 Runner、模型供应商、GitHub/手动 Issue 来源走可替换策略。

### 目录建议

Phase 2 不直接把工程层逻辑塞进页面组件，建议逐步新增：

```text
src/
  services/
    local/
      adapters/
      useCases/
      repositories/
      schemas/
      events/
  types/
    localEngineering.ts
```

后续如果需要独立本地服务或桌面壳，再把 `src/services/local` 平滑迁移到独立 package；Phase 2 MVP 先保持单仓库、低迁移成本。

### 不采用的方案

- 暂不做 Electron / Tauri 桌面客户端，先把 Web 本地工程能力跑通。
- 暂不做 SaaS 后端和多用户权限。
- 暂不引入数据库，避免 Phase 2 过早增加部署和迁移成本。
- 暂不把所有能力做成插件系统，先用清晰 Adapter 边界，等真实能力稳定后再抽插件化。

---

## Phase 2 开发里程碑

| 里程碑 | 名称 | 目标 | 验收结果 |
|--------|------|------|----------|
| P2-01 | 本地工程服务骨架 | 建立前端调用本地工程能力的统一接口层 | UI 可通过 adapter 调用本地能力，失败可降级 |
| P2-02 | Git 与 worktree 只读接入 | 读取真实仓库、分支、状态、worktree 列表 | 项目管理/工作台显示真实 Git 状态 |
| P2-03 | Issue 驱动 worktree 创建 | 根据 Issue 编号创建 branch + worktree | `.worktrees/issue-xxx-*` 可创建、打开、清理 |
| P2-04 | CLI Runner 进程管理 | 启动、停止、监控 CLI agent 子进程 | 工作台可看到真实 stdout/stderr 日志流 |
| P2-05 | Workflow 执行引擎 MVP | 按流程步骤调度角色、Runner、模型和 Gate | 单个流程可从步骤 1 跑到 Gate 或结束 |
| P2-06 | 文件系统持久化 | 项目配置、记忆、Role MD、Project MD、Workflow MD 落盘 | 刷新页面后关键数据不丢失 |
| P2-07 | GitHub 同步恢复 | Issue/PR/CI 从真实 GitHub 拉取 | 项目管理中 GitHub 状态替换 fixtures |
| P2-08 | LLM/API 接入 | 模型配置真实验证，AI 助手调用真实模型 | AI 助手可基于配置模型完成一次真实回答 |
| P2-09 | 安全与审计 | 命令审计、执行确认、敏感配置保护 | 高风险命令必须人工确认，日志可追溯 |
| P2-10 | Phase 2 演示闭环 | 从 Issue 到 worktree、Runner、日志、记忆、PR 的端到端演示 | 可录制完整本地工程执行流程 |

---

## Phase 2 功能列表

### 1. 本地工程服务骨架

- 新增本地工程能力 adapter，统一封装 Git、文件系统、进程、配置读取。
- 前端组件不直接调用 shell 命令，只调用受控 adapter。
- 定义统一返回结构：`ok / data / error / diagnostics`。
- 提供 mock fallback，便于浏览器纯前端模式继续运行。
- 建立错误态 UI：权限不足、命令不存在、目录不存在、超时、退出码非 0。

### 2. Git 与 Worktree 管理

- 读取真实 `git status --short`、当前分支、remote、最近提交。
- 读取 `git worktree list --porcelain`。
- 根据 Issue 编号创建分支：`issue-<number>-<slug>`。
- 创建 worktree：`.worktrees/issue-<number>-<slug>`。
- 清理已合并 worktree，防止误删非本项目目录。
- 在项目管理和工作台显示当前 worktree、分支、dirty 状态和最近提交。

### 3. GitHub / Issue / PR 同步

- 支持 GitHub CLI 或 GitHub API token 两种路径。
- 拉取当前仓库 Issue、PR、CI 状态。
- 建立 Issue 与本地 worktree 的绑定关系。
- 提交信息和 PR 描述自动引用 Issue。
- GitHub 插件不可用时，允许用户手动输入 Issue 编号继续本地流程。

### 4. CLI Runner 进程管理

- 支持 Runner 配置：Codex CLI、Claude Code CLI、Cursor CLI、Gemini CLI、Local Shell。
- 启动进程时注入 worktree、环境变量、角色上下文和步骤上下文。
- 实时采集 stdout/stderr，写入 UI 日志流。
- 支持停止进程、失败重试、超时终止。
- 每个 AgentRun 记录开始时间、结束时间、退出码、日志位置、关联步骤。

### 5. Workflow 执行引擎

- 将流程模板中的步骤、角色、Runner、模型、能力授权转成可执行计划。
- 支持 `gateMode=auto` 自动继续。
- 支持 `gateMode=manual` 进入人工 Gate 决策。
- 上一步产物路径传递给下一步。
- 运行状态回写工作台：运行中、等待 Gate、失败、完成。
- 支持暂停、恢复、重跑单步。

### 6. 文件系统持久化

- 项目配置落盘：`.agentmanagement/project.json`。
- 角色 MD：`.agentmanagement/roles/*.md`。
- 流程 MD/JSON：`.agentmanagement/workflows/*.json` 与 `.md`。
- 记忆：`.agentmanagement/memory/*.json` 或 `.md`。
- AI 对话历史：`.agentmanagement/conversations/*.jsonl`。
- 所有写入都先备份，再覆盖，避免损坏用户文件。

### 7. 真实 AI / LLM 接入

- 设置中心支持 API Key 检测和模型列表拉取。
- AI 助手从关键词模拟升级为真实模型调用。
- AI 建项、AI 流程设计、AI 记忆提炼都走统一模型调用接口。
- 对每次 AI 调用记录模型、输入摘要、输出摘要、耗时和错误。
- 敏感信息不写入普通日志。

### 8. 记忆与知识资产落地

- 工作台、项目详情、AI 助手产生的记忆写入本地文件。
- 记忆支持来源追溯：项目、角色、任务、对话、文件、commit。
- 记忆管理页面从文件读取，而不是只读 fixtures。
- 支持提炼、确认、废弃、过期标记。
- 支持跨项目复用建议。

### 9. 安全、权限和审计

- 命令白名单：Git、npm、测试、构建、指定 Runner。
- 高风险命令必须二次确认，例如删除 worktree、push、执行任意 shell。
- 日志分级：用户可见日志、调试日志、敏感字段脱敏。
- 所有自动写文件操作都记录审计事件。
- 默认禁止跨出当前项目根目录写文件，除非用户明确授权。

### 10. 验证与质量门槛

- 每个 Phase 2 任务必须至少跑 `npm --cache .npm-cache run build`。
- 涉及 reducer/state 的任务跑 `npm --cache .npm-cache test`。
- 涉及页面交互的任务做浏览器截图或手动走查记录。
- 涉及本地命令的任务必须覆盖成功、失败、超时、命令不存在四类情况。

---

## 推荐开发顺序

1. P2-01 本地工程服务骨架
2. P2-02 Git 与 worktree 只读接入
3. P2-03 Issue 驱动 worktree 创建
4. P2-04 CLI Runner 进程管理
5. P2-06 文件系统持久化
6. P2-05 Workflow 执行引擎 MVP
7. P2-07 GitHub 同步恢复
8. P2-08 LLM/API 接入
9. P2-09 安全与审计
10. P2-10 Phase 2 演示闭环

第一批建议只开 3 个 Issue：

- `P2-01 本地工程服务骨架`
- `P2-02 真实 Git 状态读取`
- `P2-03 Issue worktree 创建流程`

---

## Phase 2 总体目标

从"前端模拟"升级为"真实工程执行"：
- 本地 CLI agent 真正启动/管理进程
- worktree 管理
- Git 真实操作
- 步骤间自动流转触发

---

## 按任务汇总

### P4-WS → Phase 2

| Phase 1（当前） | Phase 2 |
|-----------------|---------|
| 进度看板用 fixtures 数据 | 真实 Agent 运行状态驱动进度 |
| TODO 列表静态 | Agent 完成步骤后自动更新 |
| 记忆面板模拟保存 | 记忆写入 `.claude/memory/` 目录持久化 |
| 项目指令 MD 手动写 | Agent 根据项目上下文自动生成/更新 Project MD |

### P5 (MD体系) → Phase 2

| Phase 1 | Phase 2 |
|---------|---------|
| AgentRole.roleMarkdown 手动编辑 | Agent 根据角色定义自动生成 Role MD |
| WorkflowStep.stepMarkdown 手动编辑 | Agent 根据步骤输入输出自动生成 Step MD |
| 项目 MD 手动编辑 | Agent 根据 git log/代码变更自动更新项目摘要 |

### P6 (AI助手) → Phase 2

| Phase 1 | Phase 2 |
|---------|---------|
| 意图识别用关键词匹配 | 接真实 LLM API 理解意图 |
| 动作执行用本地模板模拟 | 真实生成 MD / 检查配置 / 修改工作流 |
| 对话用 mock messages | 接 `data.aiAssistantModel` 配置的模型 |
| 浮动面板无持久化 | 对话历史持久化到本地 |

### P6-7 (AI助手模型配置) → Phase 2

| Phase 1 | Phase 2 |
|---------|---------|
| 供应商下拉本地 state | API Key 真实验证 + 测试连接 |
| 模型列表 fixtures | 调用供应商 API 拉取可用模型列表 |

### P7 (Git同步协作) → Phase 2

| Phase 1 | Phase 2 |
|---------|---------|
| Issues/PR/CI fixtures 模拟 | 通过 credential token 调用 GitHub/GitLab/Gitee API 真实拉取 |
| 同步按钮本地模拟 | 真实 git fetch + API 轮询 + Webhook 接收 |
| Git 状态卡片 fixtures | 真实 `git status` / `git branch` / `git log` 命令 |
| 分支列表 + commit 历史 fixtures | 真实 git 命令输出 |

### P8 (CLI Runner选择) → Phase 2

| Phase 1 | Phase 2 |
|---------|---------|
| Runner 下拉选择 + 数据模型 | 真实 CLI 启动：根据 RunnerKind 调用对应可执行文件 |
| AgentRun 状态本地模拟 | 进程管理：启动/监控/终止 Agent 子进程 |
| 日志用 mock 数组 | 日志流：stdout/stderr 实时管道传输 |
| 环境变量配置字段 | 环境隔离：每个 Runner 独立的 env/worktree |

---

## 跨越所有任务的 Phase 2 系统级能力

### 真实 Runner 集成

| 能力 | 说明 | 涉及任务 |
|------|------|----------|
| **CLI 进程管理** | 启动/监控/终止 Claude Code、Codex CLI、Cursor CLI 子进程 | P8 |
| **日志流** | stdout/stderr 实时捕获+流式传输到 UI | P8, P4-WS |
| **worktree 管理** | `git worktree add/remove` 为每个 Agent 创建隔离工作区 | P7 |
| **命令执行** | 真实运行 install/test/build/preview 命令 | P4-WS |

### Agent 流转引擎

| 能力 | 说明 | 涉及任务 |
|------|------|----------|
| **步骤完成检测** | 监听 Agent 进程退出码/产物文件判断步骤是否完成 | P8 |
| **自动流转** | 步骤完成 → 读取 workflow 配置 → 自动启动下一个角色的 Agent | P8, P4-WS |
| **Gate 自动判断** | `gateMode=auto` 自动继续 / `gateMode=manual` 弹出决策面板 | P4-WS |
| **上下文传递** | 上一步产物路径/worktree 上下文传递给下一步 Agent | P8 |

### Git 真实集成

| 能力 | 说明 | 涉及任务 |
|------|------|----------|
| **API 同步** | GitHub/GitLab/Gitee API 拉取 Issues/PR/CI | P7 |
| **Webhook 接收** | 接收 push/PR/issue 事件自动刷新 | P7 |
| **Agent commit→push** | Agent 完成代码 → 自动 commit + push + 创建 PR | P7 |
| **分支管理** | Agent 在 worktree 中创建分支 | P7 |
| **git status/log/branch** | 真实命令输出替代 fixtures | P7 |

### 数据持久化

| 能力 | 说明 | 涉及任务 |
|------|------|----------|
| **项目记忆落盘** | Memory 写入 `.claude/memory/` 目录（JSON/MD） | P4-WS |
| **MD 文件持久化** | Role MD / Project MD / Workflow MD 写入项目目录 | P5 |
| **对话历史** | AI 助手对话历史本地持久化 | P6 |
| **配置持久化** | Settings 写入配置文件（JSON/YAML） | P6-7 |

---

## 不做（留给 Phase 3+）

| 能力 | 说明 |
|------|------|
| 多用户/团队权限 | 登录、成员、角色权限 |
| 分布式 Agent 调度 | 多机器、多 Agent 协调 |
| Electron/Tauri 桌面壳 | 复用 Web UI 封装桌面客户端 |
| 数据库 | 所有数据先文件系统持久化，不做 DB |
| 云端 API | 不写后端 server，不做 SaaS |

---

## Phase 1 → Phase 2 判定条件

| # | 条件 | 状态 |
|---|------|------|
| 1 | BUILD FIX 全通过 | ✅ |
| 2 | P4-WS 项目工作区 V2 完成 | ✅ |
| 3 | P5 MD 体系完整 | ✅ |
| 4 | P6 AI 助手功能完整 | ✅ |
| 5 | P7 Git 同步协作完成 | ✅ |
| 6 | P8 CLI Runner 选择完成 | ✅ |
| 7 | 产品流程可走通演示 | ✅ |

结论：Phase 2 可以启动。后续缺口不再作为 Phase 1 页面任务处理，而是作为 Phase 2 真实工程能力任务拆分。
