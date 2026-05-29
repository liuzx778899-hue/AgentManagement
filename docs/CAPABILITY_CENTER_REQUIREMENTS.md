# Capability Center Requirements

更新时间：2026-05-15 18:25 Asia/Shanghai

本文件补充 `Agent Management` 的能力中心设计。其他编码工具执行相关功能前，请先读取：

- `docs/HANDOFF_NEXT_TASKS.md`
- `docs/PHASE_1_WEB_MVP_EXECUTION_CONSTRAINTS.md`
- `docs/LATEST_CONTEXT.md`

## 背景

当前产品里 `能力包` 概念过于笼统，无法表达真实使用场景。

用户希望参考 Claude Code 设置页里的 Agents 浏览器，把能力资源拆解成更明确的类型：

- MCP
- Skills
- Plugins
- Agents

这四类都属于系统可调度能力，但来源、生命周期、绑定方式、权限和展示字段不同，不能继续混在一个 `Capability Packs` 列表里。

## 目标

建立 `能力中心`，用于浏览、启用、配置和绑定系统能力。

能力中心需要回答这些问题：

- 系统当前有哪些 MCP？
- 系统当前有哪些 Skills？
- 系统当前有哪些 Plugins？
- 系统当前有哪些 Agents？
- 它们来自哪里：内置、项目、用户、插件？
- 哪些已经启用，哪些缺配置？
- 某个 Agent 使用了哪些模型、MCP、Skills、Plugins？
- 某个 Role 默认绑定哪个 Agent？
- 某个 Workflow Step 最终会使用哪个 Role / Agent / Model / MCP / Skill / Plugin？

## 信息架构

建议在 `设置中心` 中新增一级区域：

`能力中心`

能力中心下使用标签页或二级导航：

- `MCP`
- `Skills`
- `Plugins`
- `Agents`

每个页面顶部都有统计卡：

- 总数
- 已启用
- 来源类型数量
- 缺配置/异常数量

每个页面都支持：

- 搜索
- 来源筛选
- 状态筛选
- 作用域筛选
- 点击进入详情

## MCP 页面

MCP 是外部工具或服务能力入口。

列表字段：

- MCP 名称
- 来源：内置 / 项目 / 用户 / 插件
- 连接状态：已连接 / 未连接 / 缺配置 / 错误
- 工具数量
- Resource 数量
- 权限范围
- 依赖环境
- 最近检查时间

详情字段：

- server name
- transport 类型：stdio / http / sse
- command 或 url
- required env
- tools 列表
- resources / resource templates
- 权限声明
- 当前项目是否启用
- 被哪些 Role 使用
- 被哪些 Workflow Step 使用

Phase 1 只用 fixtures 和本地状态模拟，不接真实 MCP。

## Skills 页面

Skills 是可被 Agent 调用的工作方法、专业能力或流程规范。

列表字段：

- Skill 名称
- 描述
- 来源：内置 / 项目 / 用户 / 插件
- 适用场景
- 是否启用
- 依赖工具
- 推荐角色

详情字段：

- skill name
- description
- source path
- trigger rules
- required tools
- related MCP
- related plugins
- recommended roles
- usage examples
- 当前项目是否启用

需要支持 Skill 绑定到 Role。

示例：

- UI/UX 设计师 -> `ui-ux-pro-max`
- 产品经理 -> `brainstorming`
- 代码审查员 -> `receiving-code-review` / `requesting-code-review`
- 测试工程师 -> `verification-before-completion`

## Plugins 页面

Plugins 是打包能力，可能包含 Skills、MCP server、connector、assets 或 UI 扩展。

列表字段：

- Plugin 名称
- 版本
- 来源：官方 / 第三方 / 本地
- 包含内容：Skills / MCP / Connector / Assets
- 是否启用
- 更新状态
- 风险标记

详情字段：

- plugin id
- version
- description
- included skills
- included MCP servers
- included connectors
- permissions
- install path
- update channel
- 当前项目是否启用

需要展示 Plugin 与 Skill/MCP 的包含关系。

示例：

- `Superpowers` plugin 提供 planning、TDD、debugging、verification 等 skills
- `GitHub` plugin 提供 GitHub 相关 skills 和 connector
- `Documents` plugin 提供文档处理能力

## Agents 页面

Agents 是可被调度的执行主体。此页面参考用户截图中的 Agents 浏览器。

列表字段：

- Agent 名称
- 描述
- 来源：内置 / 项目 / 用户 / 插件
- 模型供应商
- 模型名称
- 推理档位
- 工具数量
- 绑定 Skills
- 可用 MCP
- 是否启用
- 适用任务类型

详情字段：

- agent id
- name
- description
- source
- model provider
- model name
- reasoning level
- tools
- MCP access
- skills
- plugins
- system prompt / custom prompt
- 可绑定 Role
- 可执行 Workflow Steps

需要明确：

- Role 是业务职责
- Agent 是执行主体
- 一个 Role 可以绑定默认 Agent
- 一个 Agent 可以服务多个 Role

示例 Agents：

- `Explore Agent`：代码库探索
- `Plan Agent`：方案和实施计划
- `Verification Agent`：完成前验证
- `UI Review Agent`：视觉和交互审查
- `Frontend Agent`：前端实现

## 与模型、角色、工作流的关系

能力中心必须接入核心链路：

`Model Provider -> Launcher Profile -> Agent -> Role -> Workflow Step -> Project Default Workflow -> New Task Role Assignment`

关系解释：

- Model Provider 决定可用模型
- Launcher Profile 决定模型参数和 prompt
- Agent 绑定 Launcher Profile、MCP、Skills、Plugins
- Role 绑定默认 Agent
- Workflow Step 选择 Role
- 新建任务确认每一步最终使用的 Role / Agent / Model / MCP / Skill / Plugin

新建任务 Review 页需要展示最终矩阵：

| Step | Role | Agent | Model | MCP | Skills | Plugins |
|------|------|-------|-------|-----|--------|---------|
| 需求分析 | 产品经理 | Plan Agent | DeepSeek | browser/github | brainstorming | Superpowers |
| UI 设计 | UI/UX 设计师 | UI Review Agent | GPT-5.5 | browser | ui-ux-pro-max | Superpowers |
| 前端实现 | 前端工程师 | Frontend Agent | GPT-5.3 Codex | local-shell/github | verification | GitHub |

## UI 参考要求

参考截图中的 Agents 页面，能力中心应具备：

- 顶部说明区：解释当前资源类型是什么
- 统计卡：总数、启用中、来源类型
- 分组列表：内置 / 项目 / 用户 / 插件来源
- 每项展示图标、名称、标签、描述、工具数量、来源、状态
- 当前选中项高亮
- 右侧箭头进入详情
- 详情页展示绑定关系和依赖关系

视觉风格：

- 工程工具风格
- 信息密度高但层级清楚
- 不做营销化卡片
- 不使用字母缩写代替图标
- 图标建议继续使用 `lucide-react`

## 数据模型建议

不要继续只用单一 `CapabilityPack` 表达所有能力。

建议新增：

```ts
export type CapabilitySource = "built-in" | "project" | "user" | "plugin";
export type CapabilityStatus = "enabled" | "disabled" | "missing-config" | "error";

export interface McpServerCapability {
  id: string;
  name: string;
  source: CapabilitySource;
  status: CapabilityStatus;
  transport: "stdio" | "http" | "sse";
  toolCount: number;
  resourceCount: number;
  requiredEnv: string[];
  usedByRoleIds: string[];
  usedByWorkflowStepIds: string[];
}

export interface SkillCapability {
  id: string;
  name: string;
  source: CapabilitySource;
  status: CapabilityStatus;
  description: string;
  triggerRules: string[];
  requiredToolIds: string[];
  recommendedRoleIds: string[];
  pluginId: string | null;
}

export interface PluginCapability {
  id: string;
  name: string;
  version: string;
  source: CapabilitySource;
  status: CapabilityStatus;
  includedSkillIds: string[];
  includedMcpIds: string[];
  permissions: string[];
}

export interface AgentCapability {
  id: string;
  name: string;
  source: CapabilitySource;
  status: CapabilityStatus;
  modelProvider: string;
  modelName: string;
  reasoningLevel: string;
  toolIds: string[];
  mcpIds: string[];
  skillIds: string[];
  pluginIds: string[];
  roleIds: string[];
}
```

可以保留 `CapabilityPack` 作为兼容层，但 UI 必须按 MCP / Skills / Plugins / Agents 四类展示。

## 验收标准

- 设置中心不再只有笼统的 `能力包`
- 能看到四个清晰分类：MCP / Skills / Plugins / Agents
- 每类都有总数、启用状态、来源类型统计
- 每类都有列表和详情入口
- Agents 页面参考截图展示内置 Agents
- Role 能绑定 Agent
- Agent 能展示其模型、MCP、Skills、Plugins
- Workflow Step 能通过 Role 间接看到最终 Agent 和模型能力
- 新建任务 Review 页能展示 Step / Role / Agent / Model / MCP / Skill / Plugin 矩阵
- Phase 1 仍然只用 fixtures + App 本地状态，不接真实外部服务

## 优先级建议

1. 品牌统一为 `Agent Management`
2. 静态设计页 `http://localhost:55179/` 同步最新方案
3. 补齐多模型配置与角色绑定模型闭环
4. 拆分能力中心：MCP / Skills / Plugins / Agents
5. 将能力中心接入 Role / Agent / Workflow / New Task Review
6. 补齐 MVP 本地状态交互闭环
7. 补测试
8. 回到本线程做视觉、交互和完成度审查
