import type {
  ManualGate,
  WorkbenchData,
  McpServerCapability,
  SkillCapability,
  PluginCapability,
  AgentCapability,
  ImAdapter,
  ProjectImBinding,
  GitCredential,
  GitStatus,
  RepoIssue,
  RepoPullRequest,
  CiPipeline,
  RepoCommit,
  GitBranch,
  RunnerProfile,
} from "../domain/workbench";

export function activeGate(data: WorkbenchData): ManualGate | undefined {
  return data.manualGates.find((g) => g.status === "waiting");
}

export const workbenchData: WorkbenchData = {
  activeProjectId: "proj-001",
  activeView: "workbench",

  projects: [
    {
      id: "proj-001",
      name: "AgentManagement",
      repoPath: "D:/work/vibecode/AgentManagement",
      defaultBranch: "main",
      worktreeRoot: ".claude/worktrees",
      scope: "personal",
      desktopIntegrationStatus: "deferred",
      permissions: {
        permissionLevel: "owner",
      },
      settings: {
        installCommand: "npm install",
        testCommand: "npm test",
        buildCommand: "npm run build",
        previewCommand: "npm run dev",
        detectedStack: "Vite + React + TypeScript",
        riskSummary: "个人本地 MVP，暂不接入后端、真实 runner、团队权限或桌面客户端。",
      },
      workflowTemplateId: "software-dev-v1",
      remoteRepo: {
        platform: "github",
        credentialId: "git-gh-personal",
        repoOwner: "anthropics",
        repoName: "claude-code",
        defaultBranch: "main",
        syncEnabled: true,
        syncStatus: "idle",
        lastSyncAt: "2026-05-15T10:30:00.000Z",
      },
      sourceType: "claude-code" as const,
      phase: "Phase 1 Web MVP",
      healthScore: 76,
      riskLevel: "medium" as const,
      currentMilestone: "Phase 1 Web MVP 收尾",
      nextCheckpoint: "浏览器全流程验收",
      lastCheckAt: "2026-05-17T08:00:00.000Z",
      discoveryChanges: 5,
      runStatus: "running",
      projectMarkdown: `# AgentManagement 项目背景

## 项目概述
AI 软件项目经理工作台，第一版是个人本地 Web MVP。

## 技术栈
- 前端：Vite + React + TypeScript
- 设计：CSS Variables + 暗色主题
- 后端：暂不接入（MVP 阶段）

## 约束
1. 仅使用前端本地状态和 fixtures 数据
2. 不接入真实 runner、多 Agent 调度、团队权限或桌面客户端
3. 所有页面完成产品闭环验证即可`,
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "proj-002",
      name: "智能客服平台",
      repoPath: "D:/work/vibecode/SmartCS",
      defaultBranch: "develop",
      worktreeRoot: ".claude/worktrees",
      scope: "team",
      desktopIntegrationStatus: "deferred",
      permissions: {
        permissionLevel: "admin",
      },
      settings: {
        installCommand: "pnpm install",
        testCommand: "pnpm test",
        buildCommand: "pnpm build",
        previewCommand: "pnpm dev",
        detectedStack: "Next.js + tRPC + Prisma",
        riskSummary: "团队项目，涉及后端 API 和数据库，需要团队权限和 CI/CD 配置。",
      },
      workflowTemplateId: "software-dev-v1",
      remoteRepo: {
        platform: "github",
        credentialId: "git-gh-company",
        repoOwner: "company",
        repoName: "smart-cs-platform",
        defaultBranch: "main",
        syncEnabled: true,
        syncStatus: "syncing",
        lastSyncAt: "2026-05-17T09:15:00.000Z",
      },
      sourceType: "generic" as const,
      phase: "Phase 2 核心功能",
      healthScore: 62,
      riskLevel: "high" as const,
      currentMilestone: "API 网关联调",
      nextCheckpoint: "端到端集成测试",
      lastCheckAt: "2026-05-17T07:30:00.000Z",
      discoveryChanges: 12,
      runStatus: "paused",
      projectMarkdown: `# 智能客服平台

## 项目概述
面向企业客户的智能客服 SaaS 平台。

## 技术栈
- 前端：Next.js + TailwindCSS
- 后端：tRPC + Prisma + PostgreSQL
- 集成：飞书、钉钉、企业微信`,
      createdAt: "2026-04-20T03:00:00.000Z",
      updatedAt: "2026-05-16T14:00:00.000Z",
    },
    {
      id: "proj-003",
      name: "Docs Automation",
      repoPath: "D:/work/vibecode/DocsAutomation",
      defaultBranch: "main",
      worktreeRoot: ".claude/worktrees",
      scope: "personal",
      desktopIntegrationStatus: "deferred",
      permissions: {
        permissionLevel: "owner",
      },
      settings: {
        installCommand: "npm install",
        testCommand: "npm test",
        buildCommand: "npm run build",
        previewCommand: "npm run dev",
        detectedStack: "Node.js + Markdown + Mermaid",
        riskSummary: "文档自动化工具，从代码仓库自动生成 API 文档和变更日志，风险较低。",
      },
      workflowTemplateId: "software-dev-v1",
      remoteRepo: {
        platform: "github",
        credentialId: "git-gh-personal",
        repoOwner: "user",
        repoName: "docs-automation",
        defaultBranch: "main",
        syncEnabled: true,
        syncStatus: "idle",
        lastSyncAt: "2026-05-17T06:00:00.000Z",
      },
      sourceType: "generic" as const,
      phase: "Phase 1 基础功能",
      healthScore: 72,
      riskLevel: "low" as const,
      currentMilestone: "Markdown 渲染引擎完成",
      nextCheckpoint: "API 文档自动生成",
      lastCheckAt: "2026-05-16T12:00:00.000Z",
      discoveryChanges: 2,
      runStatus: "running",
      projectMarkdown: `# Docs Automation

## 项目概述
自动化文档生成工具，从源代码提取注释和类型定义自动生成 API 文档。

## 技术栈
- 运行时：Node.js
- 文档格式：Markdown + Mermaid 图表
- 集成：GitHub Actions 自动生成

## 进度
- 18% 完成
- Markdown 渲染引擎开发中`,
      createdAt: "2026-05-10T02:00:00.000Z",
      updatedAt: "2026-05-16T10:00:00.000Z",
    },
    {
      id: "proj-004",
      name: "Internal CLI Tools",
      repoPath: "D:/work/vibecode/InternalCLI",
      defaultBranch: "main",
      worktreeRoot: ".claude/worktrees",
      scope: "team",
      desktopIntegrationStatus: "deferred",
      permissions: {
        permissionLevel: "admin",
      },
      settings: {
        installCommand: "npm install -g",
        testCommand: "npm test",
        buildCommand: "npm run build",
        previewCommand: "",
        detectedStack: "Node.js + Commander.js + TypeScript",
        riskSummary: "内部 CLI 工具集，涉及团队工作流自动化，Phase 0 概念验证阶段，需要明确需求范围。",
      },
      workflowTemplateId: "software-dev-v1",
      remoteRepo: {
        platform: "gitlab",
        credentialId: "git-gl-company",
        repoOwner: "internal-tools",
        repoName: "cli-toolkit",
        defaultBranch: "main",
        syncEnabled: true,
        syncStatus: "syncing",
        lastSyncAt: "2026-05-17T08:00:00.000Z",
      },
      sourceType: "generic" as const,
      phase: "Phase 0 概念验证",
      healthScore: 45,
      riskLevel: "high" as const,
      currentMilestone: "CLI 框架搭建",
      nextCheckpoint: "首个命令原型完成",
      lastCheckAt: "2026-05-17T09:00:00.000Z",
      discoveryChanges: 8,
      runStatus: "paused",
      projectMarkdown: `# Internal CLI Tools

## 项目概述
内部命令行工具集，用于自动化团队日常工作流。

## 技术栈
- 运行时：Node.js
- CLI 框架：Commander.js
- 语言：TypeScript

## 进度
- 42% 完成
- 当前阶段：Phase 0 概念验证
- 高风险：需求范围未明确，可能返工`,
      createdAt: "2026-05-01T06:00:00.000Z",
      updatedAt: "2026-05-17T08:30:00.000Z",
    },
  ],

  tasks: [
    {
      id: "task-001",
      projectId: "proj-001",
      goal: "完成 V1 产品闭环页面开发",
      acceptanceCriteria: [
        "项目接入页可以走完整流程",
        "新建任务流程可以创建本地任务",
        "工作流编辑器可以修改步骤配置",
        "人工决策页可以基于证据继续、重跑、改派或终止",
        "记忆管理页可以查看、编辑和沉淀记忆",
      ],
      workflowTemplateId: "software-dev-v1",
      roleAssignment: {
        product: "role-001",
        ui: "role-002",
        frontend: "role-003",
        review: "role-004",
        test: "role-005",
      },
      capabilityAuthorization: ["ui-ux-pro-max", "browser", "github", "local-shell"],
      launchStrategy: "worktree",
      status: "gate",
      activeRunId: "run-001",
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T08:00:00.000Z",
    },
    {
      id: "task-002",
      projectId: "proj-002",
      goal: "API 网关模块开发和集成测试",
      acceptanceCriteria: [
        "API 网关路由规则正确",
        "认证中间件通过",
        "限流策略生效",
        "集成测试覆盖 80%",
      ],
      workflowTemplateId: "software-dev-v1",
      roleAssignment: {
        product: "role-001",
        frontend: "role-003",
        review: "role-004",
        test: "role-005",
      },
      capabilityAuthorization: ["browser", "github", "local-shell"],
      launchStrategy: "worktree",
      status: "running",
      activeRunId: "run-002",
      createdAt: "2026-05-16T02:00:00.000Z",
      updatedAt: "2026-05-17T07:00:00.000Z",
    },
    {
      id: "task-003",
      projectId: "proj-003",
      goal: "Markdown 渲染引擎开发",
      acceptanceCriteria: [
        "支持 GFM 语法完整渲染",
        "Mermaid 图表正确渲染",
        "代码块语法高亮",
        "暗色主题适配",
      ],
      workflowTemplateId: "software-dev-v1",
      roleAssignment: {
        product: "role-001",
        frontend: "role-003",
        review: "role-004",
        test: "role-005",
      },
      capabilityAuthorization: ["browser", "github", "local-shell"],
      launchStrategy: "worktree",
      status: "running",
      activeRunId: "run-003",
      createdAt: "2026-05-10T02:00:00.000Z",
      updatedAt: "2026-05-16T12:00:00.000Z",
    },
    {
      id: "task-004",
      projectId: "proj-004",
      goal: "CLI 框架搭建与原型验证",
      acceptanceCriteria: [
        "Commander.js 脚手架搭建完成",
        "基本命令注册和执行流程通畅",
        "参数解析正确",
        "错误处理完善",
      ],
      workflowTemplateId: "software-dev-v1",
      roleAssignment: {
        product: "role-001",
        frontend: "role-003",
        review: "role-004",
        test: "role-005",
      },
      capabilityAuthorization: ["browser", "github", "local-shell"],
      launchStrategy: "worktree",
      status: "draft",
      activeRunId: null,
      createdAt: "2026-05-01T06:00:00.000Z",
      updatedAt: "2026-05-17T08:30:00.000Z",
    },
  ],

  workflowTemplates: [
    {
      id: "software-dev-v1",
      name: "软件开发完整流程",
      version: 1,
      steps: [
        {
          id: "step-001",
          order: 1,
          name: "需求分析",
          roleId: "role-001",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["项目背景", "用户需求"],
          outputs: ["需求规格摘要"],
          gateMode: "manual",
          failureStrategy: "stop",
          stepMarkdown: `# 需求分析步骤

## 输入
- 项目背景：从项目上下文获取
- 用户需求：从任务目标获取

## 执行规则
1. 分析用户需求与现有系统能力
2. 如功能范围不明确，向用户提问澄清
3. 输出需求规格摘要，包含功能列表和优先级

## 输出
- 需求规格摘要：markdown 格式的需求文档

## 约束
- 禁止自行决定跳过用户确认步骤
- 高风险需求必须在摘要中标注风险等级`,
          projectOverride: false,
        },
        {
          id: "step-002",
          order: 2,
          name: "UI/UX 设计",
          roleId: "role-002",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["需求规格摘要"],
          outputs: ["设计稿", "设计规格"],
          gateMode: "manual",
          failureStrategy: "stop",
          projectOverride: false,
        },
        {
          id: "step-003",
          order: 3,
          name: "前端开发",
          roleId: "role-003",
          modelProviderId: "provider-openai",
          modelName: "gpt-5.3-codex",
          inputs: ["设计规格"],
          outputs: ["组件代码", "页面实现"],
          gateMode: "auto",
          failureStrategy: "retry",
          projectOverride: false,
        },
        {
          id: "step-004",
          order: 4,
          name: "代码审查",
          roleId: "role-004",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["组件代码", "页面实现"],
          outputs: ["审查意见"],
          gateMode: "manual",
          failureStrategy: "retry",
          projectOverride: false,
        },
        {
          id: "step-005",
          order: 5,
          name: "测试验证",
          roleId: "role-005",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["审查后的代码"],
          outputs: ["测试报告"],
          gateMode: "manual",
          failureStrategy: "stop",
          projectOverride: false,
        },
      ],
      workflowMarkdown: `# 软件开发完整流程

## 流程说明
本流程覆盖从需求分析到测试验证的完整软件开发周期。

## 执行规则
1. 每个步骤完成后需要人工决策确认（auto 步骤除外）
2. 失败策略：需求分析和测试验证步骤失败时停止，开发步骤失败时重试
3. 所有步骤的输出自动传递给下一步骤作为输入

## 角色分工
- 产品经理：需求分析与验收
- UI/UX 设计师：界面与交互设计
- 前端工程师：组件与页面实现
- 代码审查员：质量与安全审查
- 测试工程师：测试与验证`,
      versions: [
        {
          label: "applied",
          version: 1,
          updatedAt: "2026-05-15T06:00:00.000Z",
        },
        {
          label: "draft",
          version: 2,
          updatedAt: "2026-05-17T10:00:00.000Z",
          changedSteps: ["step-003", "step-004"],
        },
        {
          label: "changed",
          version: 1,
          updatedAt: "2026-05-16T08:00:00.000Z",
          changedSteps: ["step-005"],
        },
      ],
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "design-review-v1",
      name: "设计评审流程",
      version: 1,
      steps: [
        {
          id: "dr-step-001",
          order: 1,
          name: "设计方案提交",
          roleId: "role-002",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["设计稿"],
          outputs: ["设计说明"],
          gateMode: "manual",
          failureStrategy: "stop",
          projectOverride: false,
        },
        {
          id: "dr-step-002",
          order: 2,
          name: "设计评审",
          roleId: "role-001",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["设计说明"],
          outputs: ["评审意见"],
          gateMode: "manual",
          failureStrategy: "stop",
          projectOverride: false,
        },
        {
          id: "dr-step-003",
          order: 3,
          name: "设计修改",
          roleId: "role-002",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["评审意见"],
          outputs: ["修改后设计"],
          gateMode: "auto",
          failureStrategy: "retry",
          projectOverride: false,
        },
        {
          id: "dr-step-004",
          order: 4,
          name: "评审通过",
          roleId: "role-001",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["修改后设计"],
          outputs: ["评审结论"],
          gateMode: "manual",
          failureStrategy: "stop",
          projectOverride: false,
        },
      ],
      workflowMarkdown: `# 设计评审流程\n\n设计师提交方案 → 产品经理评审 → 修改 → 最终确认`,
      versions: [],
      createdAt: "2026-05-16T06:00:00.000Z",
      updatedAt: "2026-05-16T06:00:00.000Z",
    },
    {
      id: "bug-fix-v1",
      name: "Bug 修复流程",
      version: 1,
      steps: [
        {
          id: "bf-step-001",
          order: 1,
          name: "问题定位",
          roleId: "role-003",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["问题描述"],
          outputs: ["根因分析"],
          gateMode: "manual",
          failureStrategy: "stop",
          projectOverride: false,
        },
        {
          id: "bf-step-002",
          order: 2,
          name: "修复方案",
          roleId: "role-003",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["根因分析"],
          outputs: ["修复方案"],
          gateMode: "manual",
          failureStrategy: "stop",
          projectOverride: false,
        },
        {
          id: "bf-step-003",
          order: 3,
          name: "代码修复",
          roleId: "role-003",
          modelProviderId: "provider-openai",
          modelName: "gpt-5.3-codex",
          inputs: ["修复方案"],
          outputs: ["修复代码"],
          gateMode: "auto",
          failureStrategy: "retry",
          projectOverride: false,
        },
        {
          id: "bf-step-004",
          order: 4,
          name: "修复验证",
          roleId: "role-005",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["修复代码"],
          outputs: ["验证报告"],
          gateMode: "manual",
          failureStrategy: "stop",
          projectOverride: false,
        },
      ],
      workflowMarkdown: `# Bug 修复流程\n\n问题定位 → 方案制定 → 代码修复 → 验证通过`,
      versions: [],
      createdAt: "2026-05-17T06:00:00.000Z",
      updatedAt: "2026-05-17T06:00:00.000Z",
    },
    {
      id: "refactor-v1",
      name: "代码重构流程",
      version: 1,
      steps: [
        {
          id: "rf-step-001",
          order: 1,
          name: "重构分析",
          roleId: "role-004",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["代码库"],
          outputs: ["重构建议"],
          gateMode: "manual",
          failureStrategy: "stop",
          projectOverride: false,
        },
        {
          id: "rf-step-002",
          order: 2,
          name: "重构计划",
          roleId: "role-003",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["重构建议"],
          outputs: ["重构计划"],
          gateMode: "manual",
          failureStrategy: "stop",
          projectOverride: false,
        },
        {
          id: "rf-step-003",
          order: 3,
          name: "执行重构",
          roleId: "role-003",
          modelProviderId: "provider-openai",
          modelName: "gpt-5.3-codex",
          inputs: ["重构计划"],
          outputs: ["重构后代码"],
          gateMode: "auto",
          failureStrategy: "retry",
          projectOverride: false,
        },
        {
          id: "rf-step-004",
          order: 4,
          name: "重构验证",
          roleId: "role-005",
          modelProviderId: "provider-deepseek",
          modelName: "deepseek-v4-pro",
          inputs: ["重构后代码"],
          outputs: ["验证报告"],
          gateMode: "manual",
          failureStrategy: "stop",
          projectOverride: false,
        },
      ],
      workflowMarkdown: `# 代码重构流程\n\n分析重构点 → 制定计划 → 执行重构 → 验证`,
      versions: [],
      createdAt: "2026-05-18T06:00:00.000Z",
      updatedAt: "2026-05-18T06:00:00.000Z",
    },
  ],

  roles: [
    {
      id: "role-001",
      projectId: null,
      name: "产品经理",
      description: "负责需求分析、验收标准定义和产品决策。",
      roleMarkdown: `# 产品经理

**角色描述：** 负责需求分析、产品规划和功能优先级排序。

## 核心职责
- 分析用户需求和市场趋势
- 定义产品路线图和版本计划
- 编写功能规格和验收标准
- 协调设计、开发和测试团队

## 工作流程
1. 接收需求 → 2. 分析可行性 → 3. 编写规格 → 4. 评审 → 5. 跟踪实现

## 输出物
- 产品需求文档（PRD）
- 功能验收标准
- 版本发布说明`,
      isBuiltIn: true,
      defaultCapabilities: ["browser", "github"],
    },
    {
      id: "role-002",
      projectId: null,
      name: "UI/UX 设计师",
      description: "负责界面设计、交互规范和视觉一致性。",
      roleMarkdown: `# UI/UX 设计师\n\n**角色描述：** 负责界面设计、交互规范和视觉一致性。\n\n## 核心职责\n- 设计高保真 UI 界面和交互原型\n- 维护设计系统和组件库`,
      isBuiltIn: true,
      defaultCapabilities: ["ui-ux-pro-max", "browser"],
    },
    {
      id: "role-003",
      projectId: null,
      name: "后端开发专家",
      description: "严格遵循 API 规范实现业务逻辑，编写单元测试，确保代码高可用。",
      roleMarkdown: `# 后端开发专家

**角色描述：** 严格遵循 API 规范实现业务逻辑，编写单元测试，确保代码高可用。

## 核心职责
- 严格遵循 API 规范实现业务逻辑
- 编写单元测试，确保代码高可用
- 处理数据持久化与接口联调
- 优化性能与系统稳定性

## 工作流程
1. 接收 API 规范 → 2. 实现业务逻辑 → 3. 编写单元测试 → 4. 自测通过 → 5. 提交审查

## 输出物
- 后端业务代码
- 单元测试用例
- API 接口文档`,
      isBuiltIn: true,
      defaultCapabilities: ["github", "local-shell"],
    },
    {
      id: "role-004",
      projectId: null,
      name: "前端开发专家",
      description: "实现 UI 交互与接口联调，优化性能，确保多端兼容性。",
      roleMarkdown: `# 前端开发专家

**角色描述：** 实现 UI 交互与接口联调，优化性能，确保多端兼容性。

## 核心职责
- 开发可复用的 React/Vue 组件
- 实现页面交互逻辑和状态管理
- 接口联调与数据绑定
- 优化前端性能，确保多端兼容

## 工作流程
1. 接收 UI 设计稿 → 2. 组件开发 → 3. 接口联调 → 4. 兼容性测试 → 5. 提交审查

## 输出物
- 前端页面与组件代码
- 交互逻辑实现
- 联调通过报告`,
      isBuiltIn: true,
      defaultCapabilities: ["browser", "github", "local-shell"],
    },
    {
      id: "role-005",
      projectId: null,
      name: "代码审查专员",
      description: "执行 Pull Request 强制审查，重点检查代码规范、逻辑漏洞、安全隐患及测试覆盖率，未通过严禁合并。",
      roleMarkdown: `# 代码审查专员

**角色描述：** 你是代码质量守门员，执行 Pull Request 强制审查，重点检查代码规范、逻辑漏洞、安全隐患及测试覆盖率，未通过严禁合并。

## 核心职责
- 执行 Pull Request 强制审查
- 检查代码规范与命名一致性
- 排查逻辑漏洞与安全隐患
- 验证测试覆盖率是否达标
- 审查未通过，严禁合并

## 工作流程
1. 接收 PR → 2. 代码规范检查 → 3. 逻辑漏洞排查 → 4. 安全隐患扫描 → 5. 测试覆盖率验证 → 6. 通过/驳回

## 输出物
- 代码审查报告
- 问题清单与修复建议
- 审查通过/驳回决定`,
      isBuiltIn: true,
      defaultCapabilities: ["github", "local-shell"],
    },
    {
      id: "role-006",
      projectId: null,
      name: "功能测试专员",
      description: "依据 PRD 验证业务逻辑闭环，执行模块级冒烟测试。",
      roleMarkdown: `# 功能测试专员

**角色描述：** 依据 PRD 验证业务逻辑闭环，执行模块级冒烟测试。

## 核心职责
- 依据 PRD 编写测试用例
- 验证业务逻辑闭环
- 执行模块级冒烟测试
- 记录并跟踪缺陷

## 工作流程
1. 分析 PRD → 2. 编写测试用例 → 3. 执行冒烟测试 → 4. 缺陷记录 → 5. 回归验证

## 输出物
- 测试用例集
- 冒烟测试报告
- 缺陷清单`,
      isBuiltIn: true,
      defaultCapabilities: ["browser", "github", "local-shell"],
    },
    {
      id: "role-007",
      projectId: null,
      name: "集成测试专员",
      description: "负责端到端全链路回归，验证接口交互与系统稳定性。",
      roleMarkdown: `# 集成测试专员

**角色描述：** 负责端到端全链路回归，验证接口交互与系统稳定性。

## 核心职责
- 设计端到端测试场景
- 执行全链路回归测试
- 验证接口交互与数据一致性
- 确保系统稳定性

## 工作流程
1. 分析系统架构 → 2. 设计 E2E 场景 → 3. 执行全链路回归 → 4. 接口交互验证 → 5. 稳定性报告

## 输出物
- 端到端测试报告
- 接口交互验证结果
- 系统稳定性评估`,
      isBuiltIn: true,
      defaultCapabilities: ["browser", "github", "local-shell"],
    },
  ],

  agentRuns: [
    {
      id: "run-001",
      projectId: "proj-001",
      taskId: "task-001",
      workflowTemplateId: "workflow-001",
      workflowStepId: "step-001",
      roleId: "role-001",
      runnerId: "runner-claude-code",
      processId: "process-001",
      modelProviderId: "provider-deepseek",
      modelName: "deepseek-v4-pro",
      currentStepId: "step-001",
      status: "waiting_gate",
      log: [
        "2026-05-15T06:00:00.000Z Agent 启动",
        "2026-05-15T06:30:00.000Z 步骤完成：需求分析",
        "2026-05-15T06:30:01.000Z 等待人工决策",
      ],
      startedAt: "2026-05-15T06:00:00.000Z",
      finishedAt: null,
    },
    {
      id: "run-002",
      projectId: "proj-001",
      taskId: "task-002",
      workflowTemplateId: "workflow-001",
      workflowStepId: "step-003",
      roleId: "role-003",
      runnerId: "runner-claude-code",
      processId: "process-002",
      modelProviderId: "provider-openai",
      modelName: "gpt-5.3-codex",
      currentStepId: "step-003",
      status: "running",
      log: [
        "2026-05-16T02:00:00.000Z Agent 启动",
        "2026-05-17T07:00:00.000Z 步骤执行中：前端开发",
      ],
      startedAt: "2026-05-16T02:00:00.000Z",
      finishedAt: null,
    },
    {
      id: "run-003",
      projectId: "proj-001",
      taskId: "task-003",
      workflowTemplateId: "workflow-001",
      workflowStepId: "step-002",
      roleId: "role-003",
      runnerId: "runner-claude-code",
      processId: "process-003",
      modelProviderId: "provider-deepseek",
      modelName: "deepseek-v4-pro",
      currentStepId: "step-002",
      status: "running",
      log: [
        "2026-05-10T02:00:00.000Z Agent 启动",
        "2026-05-16T12:00:00.000Z 步骤执行中：UI/UX 设计",
      ],
      startedAt: "2026-05-10T02:00:00.000Z",
      finishedAt: null,
    },
    {
      id: "run-004",
      projectId: "proj-001",
      taskId: "task-004",
      workflowTemplateId: "workflow-001",
      workflowStepId: "step-001",
      roleId: "role-001",
      runnerId: "runner-claude-code",
      processId: "process-004",
      modelProviderId: "provider-deepseek",
      modelName: "deepseek-v4-pro",
      currentStepId: "step-001",
      status: "waiting_gate",
      log: [
        "2026-05-01T06:00:00.000Z Agent 启动",
        "2026-05-17T08:00:00.000Z 步骤完成：需求分析",
        "2026-05-17T08:00:01.000Z 等待人工决策",
      ],
      startedAt: "2026-05-01T06:00:00.000Z",
      finishedAt: null,
    },
  ],

  manualGates: [
    {
      id: "gate-001",
      taskId: "task-001",
      runId: "run-001",
      stepId: "step-001",
      status: "waiting",
      summary: "需求分析已完成，请确认产品需求规格后继续。",
      diffEvidence: [
        "docs/superpowers/specs/2026-05-15-v1-product-flow.md",
        "docs/PHASE_1_WEB_MVP_EXECUTION_CONSTRAINTS.md",
      ],
      testEvidence: ["npm test: 21 passed", "npm run build: passed"],
      previewEvidence: [],
      logSummary: "Agent 已完成需求分析，并生成了需求规格摘要。",
      permissionUsage: ["browser: 3 次，project scope", "github: 1 次，project scope"],
      memorySuggestion: "将需求规格摘要保存为项目记忆，供后续任务复用。",
      createdAt: "2026-05-15T06:30:01.000Z",
      resolvedAt: null,
    },
    {
      id: "gate-002",
      taskId: "task-002",
      runId: "run-002",
      stepId: "step-003",
      status: "waiting",
      summary: "API 网关模块开发完成，需要人工确认路由和中间件配置。",
      diffEvidence: [
        "src/gateway/routes.ts",
        "src/gateway/middleware/auth.ts",
        "src/gateway/middleware/ratelimit.ts",
      ],
      testEvidence: ["pnpm test: 45 passed, 2 failed", "pnpm build: passed"],
      previewEvidence: [],
      logSummary: "前端 Agent 已完成 API 网关模块，等待人工决策确认。",
      permissionUsage: ["local-shell: 12 次，project scope", "github: 3 次，project scope"],
      memorySuggestion: "将 API 网关配置保存为项目记忆。",
      createdAt: "2026-05-17T07:30:00.000Z",
      resolvedAt: null,
    },
    {
      id: "gate-003",
      taskId: "task-004",
      runId: "run-004",
      stepId: "step-001",
      status: "waiting",
      summary: "CLI 工具需求分析已完成，请确认功能范围和优先级后继续。",
      diffEvidence: [
        "docs/cli-requirements.md",
        "docs/cli-architecture.md",
      ],
      testEvidence: ["npm test: 8 passed", "npm run build: passed"],
      previewEvidence: [],
      logSummary: "产品 Agent 已完成 CLI 工具需求分析，输出了需求文档和架构设计。",
      permissionUsage: ["browser: 2 次，project scope", "github: 1 次，project scope"],
      memorySuggestion: "将 CLI 工具需求文档保存为项目记忆，供开发阶段复用。",
      createdAt: "2026-05-17T08:00:01.000Z",
      resolvedAt: null,
    },
  ],

  engineeringFeedback: {
    diff: [
      {
        file: "src/components/AppShell.tsx",
        patch: "+ 侧边栏需要完整汉化，并使用图标替代字母缩写。",
      },
      {
        file: "src/data/fixtures.ts",
        patch: "+ fixtures 需要保持中文可读，避免乱码进入界面。",
      },
    ],
    testResults: { passed: 21, failed: 0, output: "4 个测试文件全部通过" },
    previewUrl: "http://127.0.0.1:5173/",
    artifactPath: null,
    log: ["页面骨架已完成", "当前重点是汉化、图标化和关键交互闭环"],
    memorySuggestion: {
      kind: "project",
      title: "Phase 1 只做前端 Web MVP",
      body: "本阶段使用 fixtures 和 App 本地状态验证产品流程，不接入后端、runner、多 Agent 调度、团队权限或桌面端。",
    },
    permissionRecord: [
      { tool: "local-shell", scope: "project", count: 4 },
      { tool: "ui-ux-pro-max", scope: "design", count: 1 },
    ],
    commitReady: false,
  },

  memories: [
    {
      id: "mem-001",
      kind: "project",
      scope: "project",
      projectId: "proj-001",
      roleId: null,
      taskId: null,
      title: "AgentManagement 项目背景",
      body: "AI 软件项目经理工作台，第一版是个人本地 Web MVP，采用 Vite + React + TypeScript 技术栈。",
      citation: [
        {
          source: "产品路线文档",
          timestamp: "2026-05-15T06:00:00.000Z",
        },
      ],
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "mem-002",
      kind: "role",
      scope: "project",
      projectId: "proj-001",
      roleId: "role-001",
      taskId: null,
      title: "产品经理角色约束",
      body: "产品经理负责需求分析和验收标准定义，不参与代码实现。高风险操作需要经过人工决策确认。",
      citation: [
        {
          source: "角色定义配置",
          timestamp: "2026-05-15T06:00:00.000Z",
        },
      ],
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "mem-003",
      kind: "task",
      scope: "task",
      projectId: "proj-001",
      roleId: null,
      taskId: "task-001",
      title: "V1 产品闭环任务记录",
      body: "本次任务需要完成项目接入、新建任务、工作流、人工决策和记忆管理五个核心页面。",
      citation: [
        {
          source: "任务创建记录",
          timestamp: "2026-05-15T06:00:00.000Z",
        },
      ],
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
  ],

  capabilityPacks: [
    {
      id: "cap-001",
      name: "ui-ux-pro-max",
      description: "UI/UX 设计智能库，包含风格、配色、字体、UX 指南和审查规则。",
      enabled: true,
      requiredGrants: [],
    },
    {
      id: "cap-002",
      name: "browser",
      description: "浏览器自动化，用于页面截图、端到端测试和可视化验证。",
      enabled: true,
      requiredGrants: ["browser"],
    },
    {
      id: "cap-003",
      name: "github",
      description: "GitHub 操作，包括 PR 管理、代码审查和 issue 跟踪。",
      enabled: true,
      requiredGrants: ["github"],
    },
    {
      id: "cap-004",
      name: "local-shell",
      description: "本地 shell 执行，用于运行构建、测试和文件操作。",
      enabled: true,
      requiredGrants: ["shell"],
    },
  ],

  modelProviders: [
    {
      id: "provider-openai",
      name: "OpenAI",
      apiKeyStatus: "configured",
      apiFormat: "OpenAI",
      baseUrl: "https://api.openai.com",
      models: [
        { name: "gpt-4.1", contextLength: 128000, temperature: 0.7, maxTokens: 16384 },
        { name: "gpt-4.1-mini", contextLength: 128000, temperature: 0.7, maxTokens: 16384 },
        { name: "gpt-5.5", contextLength: 256000, temperature: 0.7, maxTokens: 65536 },
        { name: "gpt-5.3-codex", contextLength: 200000, temperature: 0.5, maxTokens: 32768 },
      ],
      defaultModel: "gpt-5.5",
      enabled: true,
    },
    {
      id: "provider-deepseek",
      name: "DeepSeek",
      apiKeyStatus: "configured",
      apiFormat: "DeepSeek",
      baseUrl: "https://api.deepseek.com",
      models: [
        { name: "deepseek-v4-pro", contextLength: 128000, temperature: 0.6, maxTokens: 32768 },
        { name: "deepseek-v4-lite", contextLength: 64000, temperature: 0.6, maxTokens: 16384 },
      ],
      defaultModel: "deepseek-v4-pro",
      enabled: true,
    },
    {
      id: "provider-anthropic",
      name: "Anthropic",
      apiKeyStatus: "missing",
      models: [
        { name: "claude-opus-4-7", contextLength: 200000, temperature: 0.7, maxTokens: 65536 },
        { name: "claude-sonnet-4-6", contextLength: 200000, temperature: 0.7, maxTokens: 65536 },
        { name: "claude-haiku-4-5", contextLength: 200000, temperature: 0.5, maxTokens: 32768 },
      ],
      defaultModel: "claude-sonnet-4-6",
      enabled: false,
    },
    {
      id: "provider-local",
      name: "Local Model",
      apiKeyStatus: "configured",
      models: [
        { name: "ollama-llama3.2", contextLength: 128000, temperature: 0.8, maxTokens: 8192 },
        { name: "ollama-qwen2.5", contextLength: 32768, temperature: 0.7, maxTokens: 8192 },
      ],
      defaultModel: "ollama-llama3.2",
      enabled: true,
    },
  ],

  // MCP Servers
  mcpServers: [
    {
      id: "mcp-browser",
      name: "Browser",
      source: "built-in",
      status: "enabled",
      transport: "stdio",
      toolCount: 8,
      resourceCount: 0,
      requiredEnv: [],
      usedByRoleIds: ["role-001", "role-002", "role-005"],
      usedByWorkflowStepIds: ["step-001", "step-002", "step-005"],
    },
    {
      id: "mcp-github",
      name: "GitHub",
      source: "built-in",
      status: "enabled",
      transport: "stdio",
      toolCount: 12,
      resourceCount: 3,
      requiredEnv: ["GITHUB_TOKEN"],
      usedByRoleIds: ["role-001", "role-003", "role-004", "role-005"],
      usedByWorkflowStepIds: ["step-001", "step-003", "step-004", "step-005"],
    },
    {
      id: "mcp-local-shell",
      name: "Local Shell",
      source: "built-in",
      status: "enabled",
      transport: "stdio",
      toolCount: 6,
      resourceCount: 0,
      requiredEnv: [],
      usedByRoleIds: ["role-003", "role-004", "role-005"],
      usedByWorkflowStepIds: ["step-003", "step-004", "step-005"],
    },
    {
      id: "mcp-memory",
      name: "Memory Service",
      source: "project",
      status: "missing-config",
      transport: "http",
      toolCount: 4,
      resourceCount: 5,
      requiredEnv: ["MEMORY_SERVICE_URL"],
      usedByRoleIds: [],
      usedByWorkflowStepIds: [],
    },
  ] as McpServerCapability[],

  // Skills
  skills: [
    {
      id: "skill-ui-ux-pro-max",
      name: "ui-ux-pro-max",
      source: "plugin",
      status: "enabled",
      description: "UI/UX 设计智能库，包含风格、配色、字体、UX 指南和审查规则。",
      triggerRules: ["on-design-request", "on-ui-review"],
      requiredToolIds: ["mcp-browser"],
      recommendedRoleIds: ["role-002"],
      pluginId: "plugin-superpowers",
    },
    {
      id: "skill-brainstorming",
      name: "Brainstorming",
      source: "built-in",
      status: "enabled",
      description: "产品方案头脑风暴，帮助产品经理探索多种可能性。",
      triggerRules: ["on-planning-request"],
      requiredToolIds: [],
      recommendedRoleIds: ["role-001"],
      pluginId: null,
    },
    {
      id: "skill-planning",
      name: "Planning",
      source: "plugin",
      status: "enabled",
      description: "方案和实施计划生成，输出分步骤执行方案。",
      triggerRules: ["on-plan-request"],
      requiredToolIds: [],
      recommendedRoleIds: ["role-001", "role-003"],
      pluginId: "plugin-superpowers",
    },
    {
      id: "skill-tdd",
      name: "TDD",
      source: "plugin",
      status: "enabled",
      description: "测试驱动开发流程，先写测试再实现。",
      triggerRules: ["on-code-request"],
      requiredToolIds: ["mcp-local-shell"],
      recommendedRoleIds: ["role-003"],
      pluginId: "plugin-superpowers",
    },
    {
      id: "skill-verification",
      name: "Verification Before Completion",
      source: "plugin",
      status: "enabled",
      description: "完成前验证流程，确保测试通过和代码审查完成。",
      triggerRules: ["on-complete-request"],
      requiredToolIds: ["mcp-local-shell", "mcp-github"],
      recommendedRoleIds: ["role-005"],
      pluginId: "plugin-superpowers",
    },
    {
      id: "skill-receiving-code-review",
      name: "Receiving Code Review",
      source: "built-in",
      status: "enabled",
      description: "接收代码审查意见并按要求修改。",
      triggerRules: ["on-review-feedback"],
      requiredToolIds: [],
      recommendedRoleIds: ["role-003"],
      pluginId: null,
    },
    {
      id: "skill-requesting-code-review",
      name: "Requesting Code Review",
      source: "built-in",
      status: "enabled",
      description: "发起代码审查请求，准备审查材料。",
      triggerRules: ["on-review-request"],
      requiredToolIds: ["mcp-github"],
      recommendedRoleIds: ["role-004"],
      pluginId: null,
    },
  ] as SkillCapability[],

  // Plugins
  plugins: [
    {
      id: "plugin-superpowers",
      name: "Superpowers",
      version: "1.2.0",
      source: "built-in",
      status: "enabled",
      includedSkillIds: ["skill-planning", "skill-tdd", "skill-verification", "skill-ui-ux-pro-max"],
      includedMcpIds: [],
      permissions: ["read-files", "write-files", "run-tests"],
    },
    {
      id: "plugin-github",
      name: "GitHub",
      version: "2.1.0",
      source: "built-in",
      status: "enabled",
      includedSkillIds: [],
      includedMcpIds: ["mcp-github"],
      permissions: ["read-repo", "write-repo", "create-pr"],
    },
    {
      id: "plugin-documents",
      name: "Documents",
      version: "0.8.0",
      source: "plugin",
      status: "disabled",
      includedSkillIds: [],
      includedMcpIds: [],
      permissions: ["read-docs"],
    },
  ] as PluginCapability[],

  // Agents
  agents: [
    {
      id: "agent-explore",
      name: "Explore Agent",
      source: "built-in",
      status: "enabled",
      description: "代码库探索专家，快速定位代码结构和关键文件。",
      modelProvider: "DeepSeek",
      modelName: "deepseek-v4-pro",
      reasoningLevel: "standard",
      toolIds: ["mcp-browser", "mcp-github"],
      mcpIds: ["mcp-browser", "mcp-github"],
      skillIds: [],
      pluginIds: [],
      roleIds: ["role-001"],
    },
    {
      id: "agent-plan",
      name: "Plan Agent",
      source: "built-in",
      status: "enabled",
      description: "方案和实施计划生成专家，输出详细分步骤方案。",
      modelProvider: "DeepSeek",
      modelName: "deepseek-v4-pro",
      reasoningLevel: "standard",
      toolIds: [],
      mcpIds: [],
      skillIds: ["skill-planning", "skill-brainstorming"],
      pluginIds: ["plugin-superpowers"],
      roleIds: ["role-001"],
    },
    {
      id: "agent-ui-review",
      name: "UI Review Agent",
      source: "built-in",
      status: "enabled",
      description: "视觉和交互审查专家，检查 UI 规范一致性。",
      modelProvider: "OpenAI",
      modelName: "gpt-5.5",
      reasoningLevel: "standard",
      toolIds: ["mcp-browser"],
      mcpIds: ["mcp-browser"],
      skillIds: ["skill-ui-ux-pro-max"],
      pluginIds: ["plugin-superpowers"],
      roleIds: ["role-002"],
    },
    {
      id: "agent-frontend",
      name: "Frontend Agent",
      source: "built-in",
      status: "enabled",
      description: "前端实现专家，专注 React + TypeScript 开发。",
      modelProvider: "OpenAI",
      modelName: "gpt-5.3-codex",
      reasoningLevel: "high",
      toolIds: ["mcp-local-shell", "mcp-github"],
      mcpIds: ["mcp-local-shell", "mcp-github"],
      skillIds: ["skill-tdd", "skill-receiving-code-review"],
      pluginIds: ["plugin-superpowers", "plugin-github"],
      roleIds: ["role-003"],
    },
    {
      id: "agent-code-review",
      name: "Code Review Agent",
      source: "built-in",
      status: "enabled",
      description: "代码质量审查专家，检查安全性、最佳实践和代码规范。",
      modelProvider: "DeepSeek",
      modelName: "deepseek-v4-pro",
      reasoningLevel: "high",
      toolIds: ["mcp-github"],
      mcpIds: ["mcp-github"],
      skillIds: ["skill-requesting-code-review"],
      pluginIds: ["plugin-github"],
      roleIds: ["role-004"],
    },
    {
      id: "agent-verification",
      name: "Verification Agent",
      source: "built-in",
      status: "enabled",
      description: "完成前验证专家，确保测试通过、代码审查完成。",
      modelProvider: "DeepSeek",
      modelName: "deepseek-v4-pro",
      reasoningLevel: "standard",
      toolIds: ["mcp-local-shell", "mcp-github"],
      mcpIds: ["mcp-local-shell", "mcp-github"],
      skillIds: ["skill-verification"],
      pluginIds: ["plugin-superpowers", "plugin-github"],
      roleIds: ["role-005"],
    },
  ] as AgentCapability[],

  // IM Adapters
  imAdapters: [
    {
      id: "im-feishu",
      name: "公司飞书群",
      platform: "feishu",
      enabled: true,
      webhookUrl: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
      appId: "cli_xxx",
      appSecret: "已配置",
      verifyToken: "xxx",
      templates: {
        gate_approval: {
          title: "🔔 {{taskName}} 需要审批",
          body: "步骤「{{stepName}}」已完成，由 {{roleName}} 执行。请决定：继续 / 重跑 / 改派 / 终止",
          buttons: ["同意继续", "重跑", "改派", "终止"],
        },
        task_complete: {
          title: "✅ {{taskName}} 已完成",
          body: "任务目标：{{goal}}\n验收标准：{{criteria}}\n执行角色：{{roleName}}\n完成时间：{{completedAt}}",
          buttons: ["查看详情"],
        },
        agent_error: {
          title: "⚠️ {{taskName}} 执行异常",
          body: "步骤「{{stepName}}」执行失败。\n错误信息：{{errorMessage}}\n角色：{{roleName}}\n建议：手动介入或重试",
          buttons: ["重试", "跳过", "查看日志"],
        },
        direct_chat: {
          title: "{{userMessage}}",
          body: "{{agentResponse}}\n回复「详情」查看完整内容",
          buttons: ["继续", "终止对话"],
        },
      },
      routeRules: [
        { eventType: "gate_approval", enabled: true, targetRoleIds: ["role-001", "role-004"], requireResponse: true },
        { eventType: "task_complete", enabled: true, targetRoleIds: ["role-001"], requireResponse: false },
        { eventType: "agent_error", enabled: true, targetRoleIds: ["role-001", "role-005"], requireResponse: true },
        { eventType: "direct_chat", enabled: false, targetRoleIds: [], requireResponse: false },
      ],
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "im-dingtalk",
      name: "钉钉项目组",
      platform: "dingtalk",
      enabled: true,
      webhookUrl: "https://oapi.dingtalk.com/robot/send?access_token=xxx",
      appId: "",
      appSecret: "已配置",
      verifyToken: "",
      templates: {
        gate_approval: {
          title: "🔔 {{taskName}} 需要审批",
          body: "步骤「{{stepName}}」已完成，由 {{roleName}} 执行。请决定：继续 / 重跑 / 改派 / 终止",
          buttons: ["同意继续", "重跑", "改派", "终止"],
        },
        task_complete: {
          title: "✅ {{taskName}} 已完成",
          body: "任务目标：{{goal}}\n验收标准：{{criteria}}\n执行角色：{{roleName}}\n完成时间：{{completedAt}}",
          buttons: ["查看详情"],
        },
        agent_error: {
          title: "⚠️ {{taskName}} 执行异常",
          body: "步骤「{{stepName}}」执行失败。\n错误信息：{{errorMessage}}\n角色：{{roleName}}\n建议：手动介入或重试",
          buttons: ["重试", "跳过", "查看日志"],
        },
        direct_chat: {
          title: "{{userMessage}}",
          body: "{{agentResponse}}\n回复「详情」查看完整内容",
          buttons: ["继续", "终止对话"],
        },
      },
      routeRules: [
        { eventType: "gate_approval", enabled: true, targetRoleIds: ["role-004"], requireResponse: true },
        { eventType: "task_complete", enabled: true, targetRoleIds: ["role-001"], requireResponse: false },
        { eventType: "agent_error", enabled: false, targetRoleIds: [], requireResponse: false },
        { eventType: "direct_chat", enabled: false, targetRoleIds: [], requireResponse: false },
      ],
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "im-wechat",
      name: "企业微信通知",
      platform: "wechat",
      enabled: false,
      webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx",
      appId: "",
      appSecret: "未配置",
      verifyToken: "",
      templates: {
        gate_approval: { title: "", body: "", buttons: [] },
        task_complete: { title: "", body: "", buttons: [] },
        agent_error: { title: "", body: "", buttons: [] },
        direct_chat: { title: "", body: "", buttons: [] },
      },
      routeRules: [],
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "im-telegram",
      name: "Telegram Bot",
      platform: "telegram",
      enabled: false,
      webhookUrl: "https://api.telegram.org/bot<token>/sendMessage",
      appId: "",
      appSecret: "未配置",
      verifyToken: "",
      templates: {
        gate_approval: { title: "", body: "", buttons: [] },
        task_complete: { title: "", body: "", buttons: [] },
        agent_error: { title: "", body: "", buttons: [] },
        direct_chat: { title: "", body: "", buttons: [] },
      },
      routeRules: [],
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
  ] as ImAdapter[],

  // Project IM Bindings
  projectImBindings: [
    {
      projectId: "proj-001",
      adapterId: "im-feishu",
      enabled: true,
      overrideTemplates: {},
    },
    {
      projectId: "proj-001",
      adapterId: "im-dingtalk",
      enabled: true,
      overrideTemplates: {},
    },
  ] as ProjectImBinding[],

  // Git Credentials
  gitCredentials: [
    {
      id: "git-gh-personal",
      platform: "github",
      name: "个人 GitHub",
      token: "ghp_****",
      apiUrl: "api.github.com",
      verified: true,
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "git-gh-company",
      platform: "github",
      name: "公司 GitHub (GHE)",
      token: "ghp_****",
      apiUrl: "gh.company.com",
      verified: true,
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "git-gl-company",
      platform: "gitlab",
      name: "公司 GitLab",
      token: "glpat-****",
      apiUrl: "gitlab.company.com",
      verified: false,
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "git-gitee-personal",
      platform: "gitee",
      name: "个人 Gitee",
      token: "****",
      apiUrl: "gitee.com",
      verified: true,
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
  ] as GitCredential[],

  // Git Statuses
  gitStatuses: [
    {
      projectId: "proj-001",
      branch: "main",
      ahead: 2,
      behind: 0,
      changedFiles: 5,
      untracked: 3,
      lastCommitSha: "a1b2c3d",
      lastCommitMessage: "feat: add git status card UI",
      lastCommitDate: "2026-05-16T12:00:00Z",
    },
    {
      projectId: "proj-002",
      branch: "develop",
      ahead: 3,
      behind: 1,
      changedFiles: 8,
      untracked: 2,
      lastCommitSha: "x9y8z7",
      lastCommitMessage: "feat: API gateway rate limiting middleware",
      lastCommitDate: "2026-05-17T07:00:00Z",
    },
  ] as GitStatus[],

  // Repo Issues
  repoIssues: [
    {
      id: "issue-12",
      platform: "github",
      credentialId: "git-gh-personal",
      repoOwner: "anthropic",
      repoName: "claude-code",
      issueNumber: 12,
      title: "feat: 支持工作流步骤覆盖",
      state: "open",
      labels: ["enhancement"],
      assignee: "role-001",
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "issue-11",
      platform: "github",
      credentialId: "git-gh-personal",
      repoOwner: "anthropic",
      repoName: "claude-code",
      issueNumber: 11,
      title: "fix: 人工决策面板暗色主题显示异常",
      state: "open",
      labels: ["bug"],
      assignee: "role-003",
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "issue-10",
      platform: "github",
      credentialId: "git-gh-personal",
      repoOwner: "anthropic",
      repoName: "claude-code",
      issueNumber: 10,
      title: "docs: 更新 README",
      state: "open",
      labels: ["docs"],
      assignee: null,
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "issue-8",
      platform: "github",
      credentialId: "git-gh-personal",
      repoOwner: "anthropic",
      repoName: "claude-code",
      issueNumber: 8,
      title: "feat: 内存管理 CRUD 完成",
      state: "closed",
      labels: ["enhancement", "done"],
      assignee: "role-003",
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
  ] as RepoIssue[],

  // Pull Requests
  repoPullRequests: [
    {
      id: "pr-5",
      platform: "github",
      credentialId: "git-gh-personal",
      repoOwner: "anthropic",
      repoName: "claude-code",
      prNumber: 5,
      title: "fix: gate-decision 重构",
      state: "merged",
      sourceBranch: "fix/gate-refactor",
      targetBranch: "main",
      author: "role-003",
      reviewStatus: "approved",
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "pr-4",
      platform: "github",
      credentialId: "git-gh-personal",
      repoOwner: "anthropic",
      repoName: "claude-code",
      prNumber: 4,
      title: "feat: AppShell 导航合并",
      state: "open",
      sourceBranch: "feat/nav-merge",
      targetBranch: "main",
      author: "role-001",
      reviewStatus: "pending",
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "pr-3",
      platform: "github",
      credentialId: "git-gh-personal",
      repoOwner: "anthropic",
      repoName: "claude-code",
      prNumber: 3,
      title: "feat: 记忆管理 CRUD",
      state: "open",
      sourceBranch: "feat/memory-crud",
      targetBranch: "main",
      author: "role-003",
      reviewStatus: "changes_requested",
      createdAt: "2026-05-15T06:00:00.000Z",
      updatedAt: "2026-05-15T06:00:00.000Z",
    },
  ] as RepoPullRequest[],

  // CI Pipelines
  ciPipelines: [
    {
      id: "ci-1",
      platform: "github",
      credentialId: "git-gh-personal",
      repoOwner: "anthropic",
      repoName: "claude-code",
      pipelineName: "Build & Test",
      status: "success",
      branch: "main",
      commitSha: "abc1234",
      commitMessage: "feat: AppShell 导航合并",
      duration: "2m 15s",
      createdAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "ci-2",
      platform: "github",
      credentialId: "git-gh-personal",
      repoOwner: "anthropic",
      repoName: "claude-code",
      pipelineName: "Lint & Check",
      status: "failed",
      branch: "main",
      commitSha: "def5678",
      commitMessage: "fix: 暗色主题修正",
      duration: "45s",
      createdAt: "2026-05-15T06:00:00.000Z",
    },
    {
      id: "ci-3",
      platform: "github",
      credentialId: "git-gh-personal",
      repoOwner: "anthropic",
      repoName: "claude-code",
      pipelineName: "Deploy Preview",
      status: "running",
      branch: "main",
      commitSha: "ghi9012",
      commitMessage: "docs: 更新 README",
      duration: "运行中",
      createdAt: "2026-05-15T06:00:00.000Z",
    },
  ] as CiPipeline[],

  // Repo Commits
  repoCommits: [
    { id: "commit-1", projectId: "proj-001", sha: "a1b2c3d", message: "feat: add git status card UI", author: "dev", date: "2026-05-16T12:00:00Z" },
    { id: "commit-2", projectId: "proj-001", sha: "e4f5g6h", message: "fix: stepper layout centering", author: "dev", date: "2026-05-16T10:30:00Z" },
    { id: "commit-3", projectId: "proj-001", sha: "i7j8k9l", message: "refactor: extract context panel", author: "dev", date: "2026-05-15T16:00:00Z" },
    { id: "commit-4", projectId: "proj-001", sha: "m0n1o2p", message: "feat: add model selector dropdown", author: "dev", date: "2026-05-15T14:00:00Z" },
    { id: "commit-5", projectId: "proj-001", sha: "q3r4s5t", message: "chore: update dependencies", author: "dev", date: "2026-05-15T10:00:00Z" },
  ] as RepoCommit[],

  // Git Branches
  gitBranches: [
    { id: "branch-1", projectId: "proj-001", name: "main", isRemote: false, isDefault: true, lastCommitSha: "a1b2c3d" },
    { id: "branch-2", projectId: "proj-001", name: "origin/main", isRemote: true, isDefault: true, lastCommitSha: "a1b2c3d" },
    { id: "branch-3", projectId: "proj-001", name: "feature/git-status", isRemote: false, isDefault: false, lastCommitSha: "e4f5g6h" },
    { id: "branch-4", projectId: "proj-001", name: "feature/settings-panel", isRemote: false, isDefault: false, lastCommitSha: "i7j8k9l" },
  ] as GitBranch[],

  // CLI Runners
  runnerProfiles: [
    {
      id: "runner-claude-code",
      kind: "claude-code",
      displayName: "Claude Code CLI",
      command: "claude",
      defaultArgs: ["--dangerously-skip-permissions"],
      description: "Anthropic Claude Code CLI，支持 MCP 和代码执行",
      enabled: true,
    },
    {
      id: "runner-codex-cli",
      kind: "codex-cli",
      displayName: "Codex CLI",
      command: "codex",
      defaultArgs: ["--full-auto"],
      description: "OpenAI Codex CLI，用于代码生成和执行",
      enabled: true,
    },
    {
      id: "runner-cursor-cli",
      kind: "cursor-cli",
      displayName: "Cursor CLI",
      command: "cursor-agent",
      defaultArgs: [],
      description: "Cursor AI Agent CLI",
      enabled: false,
    },
    {
      id: "runner-gemini-cli",
      kind: "gemini-cli",
      displayName: "Gemini CLI",
      command: "gemini",
      defaultArgs: [],
      description: "Google Gemini CLI 工具",
      enabled: false,
    },
  ] as RunnerProfile[],

  defaultRunner: "runner-claude-code",
  settings: {
    theme: 'system',
    language: 'zh-CN',
    notifications: true,
    autoSave: true,
    editorFontSize: 14,
    editorFontFamily: 'monospace',
    runner: { defaultTimeout: 300000, autoRestart: false },
    git: { autoFetch: true, fetchInterval: 60000 },
  },
};
