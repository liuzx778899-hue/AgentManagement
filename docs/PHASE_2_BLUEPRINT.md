# Phase 2 工程层蓝图

更新：2026-05-16

> 本文档汇总所有 Phase 2 待实现范围。Phase 1 只做前端 MVP+fixtures，Phase 2 接真实后端/本地工程层。

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
| 2 | P4-WS 项目工作区 V2 完成 | ⬜ |
| 3 | P5 MD 体系完整 | ⬜ |
| 4 | P6 AI 助手功能完整 | ⬜ |
| 5 | P7 Git 同步协作完成 | ⬜ |
| 6 | P8 CLI Runner 选择完成 | ⬜ |
| 7 | 产品流程可走通演示 | ⬜ |
