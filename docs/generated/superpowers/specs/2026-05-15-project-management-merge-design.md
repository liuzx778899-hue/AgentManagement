# Project Management Merge + Role-Model Decoupling Design

日期：2026-05-15
状态：设计方案（更新：角色项目级管理 + 角色模型解耦）
关联：`docs/HANDOFF_NEXT_TASKS.md`

## 问题

### 问题 1：导航层级不合理

当前侧边栏 `项目接入` 和 `新建任务` 是两个独立的一级菜单，但两者本质都是项目管理的子操作。

### 问题 2：角色管理位置不合理

当前「角色库」放在设置中心的全局标签页。但角色是跟着项目走的（项目 A 的 PM 配置和项目 B 的 PM 配置可能不同）。角色列表长时不友好、不直观。

### 问题 3：角色和模型强绑定不合理

当前 `LauncherProfile` 一对一绑在角色上（roleId → modelProvider + modelName）。实际上角色和模型应该是独立管理的资源池，角色应当可以在 workflow 步骤中任意选择模型，不是固定绑定。

## 设计方案

### 最新交互修正：先角色，后工作流绑定角色

项目管理里的“新建项目 / 接入已有项目”必须先建立项目角色池，再让工作流步骤绑定这些角色。

2026-05-16 产品确认：

- 先有角色，再让工作流绑定角色。
- 角色放左边。
- 工作流放右边。
- 已有项目导入扫描本地仓库。
- 仓库路径支持选择本地文件夹，也支持手动输入或粘贴。
- 如果旧设计、旧截图或旧实现与上述规则冲突，以上述规则为准。

推荐布局：

- 左栏：项目角色
  - 角色列表
  - 新增角色
  - 编辑角色
  - 删除角色
  - 角色描述
  - 默认能力
- 右栏：工作流配置
  - 工作流模板选择
  - 工作流步骤列表
  - 每个步骤从左侧项目角色池选择角色
  - 每个步骤再配置 Runner Provider、模型供应商、模型、Gate 和能力授权

验收要求：

- 页面视觉上必须体现“角色是基础，工作流消费角色”。
- 不要把工作流配置放在左侧主区、角色放在右侧次要区。
- 编辑左侧角色后，右侧工作流步骤的角色下拉需要同步更新。

### 最新交互修正：已有项目导入支持选择或输入本地路径

已有项目导入需要支持两种仓库路径输入方式：

- 选择本地文件夹路径。
- 手动输入或粘贴本地路径。

扫描本地仓库后，导入前需要展示：

- 仓库路径。
- 默认分支。
- package/scripts。
- 技术栈。
- 从 `CLAUDE.md`、`AGENTS.md`、`.codex`、`.claude` 或项目文档中识别的角色。
- 检测到的 Skills / MCP / Plugins。
- 建议写入的项目记忆。

检测到的角色要先进入左侧项目角色池，用户可以在确认导入前新增、编辑、删除。

### 一、导航变化

```
当前                               改为
──────────────────────────────    ──────────────────────────────
工作台                             工作台
项目接入                ──┐        项目管理
新建任务                ──┘        工作流
工作流                             人工决策
人工决策                           记忆管理
记忆管理                           设置中心（不含角色库）
设置中心（含角色库）               运行日志
运行日志
```

### 二、角色归属：从全局 → 项目级

| 当前 | 改为 |
|------|------|
| 设置中心 → 角色库（全局标签页） | 去掉全局角色库标签页 |
| 所有角色混在一起显示 | 每个项目内部维护自己的角色列表 |
| 编辑角色在设置中心 | 在项目管理页面编辑当前项目的角色 |

**项目级角色管理：**

- **已有项目导入**：智能检测时从 CLAUDE.md/AGENTS.md 中解析角色，匹配后导入为项目角色
- **新建项目**：Wizard 第 2 步内联配置角色（新增、编辑、删除），角色列表属于当前项目
- **工作台首页**：可以查看当前项目的角色矩阵（角色→当前步骤→模型）
- **Workflow Builder**：步骤绑定角色时，下拉列表取自当前项目的角色池

**domain model 变化：**
- `AgentRole` 新增 `projectId` 字段（全局内置角色 `projectId` 为 null，项目级角色绑定 projectId）
- `LauncherProfile` 废弃，角色不再有固定绑定的模型

### 三、角色和模型解耦

| 当前 | 改为 |
|------|------|
| Role → LauncherProfile（固定绑定 modelProvider + modelName） | Role 独立存在 |
| WorkflowStep 引用 roleId | WorkflowStep 引用 roleId + modelProviderId + modelName |
| 一个角色只有一个模型 | 同一个角色在不同步骤/项目中可以用不同模型 |

**新的数据关系：**

```
ModelProvider（全局，设置中心维护）
     │
     ▼
  Model（属于 Provider）
     │
     │ 自由组合（在 workflow 步骤中）
     ▼
WorkflowStep ──→ AgentRole（项目级）
     │
     ▼
  StepConfig = { roleId, providerId, modelName, gateMode, ... }
```

**domain model 变化：**
- 删除 `LauncherProfile` 类型
- `WorkflowStep` 新增 `modelProviderId` 和 `modelName` 字段
- `AgentRun` 不再引用 `launcherId`，改为 `modelProviderId` + `modelName`
- `AgentRole` 新增 `projectId: string | null`

### 四、项目管理页面结构（更新）

`项目管理` 作为统一入口页面，内部两个 Tab：

#### Tab 1: 已有项目智能导入

1. 用户输入仓库路径
2. 点击「开始检测」
3. 系统模拟扫描：
   - `package.json` → 技术栈、scripts
   - `CLAUDE.md` / `AGENTS.md` → 角色识别、项目约定 → 项目记忆草稿
   - `.claude/skills/` `.codex/skills/` → skills → 能力包建议
   - `.claude/settings.json` → MCP 配置、全局模型供应商
   - git config → 默认分支
4. 检测结果分区展示，**角色区可内联新增/编辑/删除角色**：

| 检测区 | 内容示例 | 用户操作 |
|---|---|---|
| 技术栈与命令 | Vite + React / npm / install: `npm install` | 确认/修改 |
| **项目角色** | 从 CLAUDE.md 解析的角色列表（PM, FE, QA...） | **确认 / 新增 / 编辑 / 删除** |
| Skills | `ui-ux-pro-max`, `code-simplifier` | 勾选导入 |
| MCP 配置 | `computer-use` MCP server | 勾选导入 |
| 项目记忆 | 从 CLAUDE.md 提取 | 编辑/确认 |
| Workflow | 推荐默认 workflow | 选择 |

5. 点击「导入适配」→ 生成 Project + Project-level Roles + Settings + Memories

#### Tab 2: 新建项目（4 步 Wizard）

| 步骤 | 标题 | 内容 |
|------|------|------|
| **01** | 项目信息 | 项目名、仓库路径、默认分支、worktree 根目录 |
| **02** | 工作流+角色配置 | 选择 workflow 模板；**项目角色管理**（新增/编辑/删除角色）；每步配置：选择角色 + 选择模型 |
| **03** | 能力授权 | MCP / Skills / Plugins 启用/禁用 |
| **04** | 确认创建 | 汇总摘要 → 创建项目 |

**步骤 2 详细交互（更新）：**

分为左右两栏：
- **左栏**：当前项目角色列表
  - 可新增角色、编辑角色名和描述、删除角色。
  - 每个角色卡片显示：名称、描述、默认能力包。
  - 角色池是工作流步骤绑定的来源。
- **右栏**：Workflow 模板列表 + 步骤详情
  - 每步可展开编辑：选择角色（下拉，来自左侧当前项目角色池）、选择 Runner Provider、选择模型（下拉，来自全局模型池）、Gate 模式、失败策略。
  - 左侧角色发生新增、编辑、删除后，右侧步骤角色下拉同步更新。

**角色-模型组合示例：**
```
步骤 "需求分析" → 角色: "PM" + 模型: DeepSeek/deepseek-v4-pro
步骤 "前端开发" → 角色: "FE" + 模型: DeepSeek/deepseek-v4-pro  （同模型，不同角色）
步骤 "代码评审" → 角色: "Reviewer" + 模型: deepseek/deepseek-v4-flash （不同模型）
```

### 五、设置中心变化

| 当前标签页 | 改为 |
|---|---|
| 用户偏好 | 保留 |
| 项目设置 | 保留 |
| 模型配置 | 保留（全局模型池） |
| **角色库** | **删除（移到项目级别）** |
| 工作流库 | 保留（全局模板，项目可引用+覆盖） |
| 项目工作流 | 保留 |
| 能力中心 | 保留 |

设置中心从 7 个标签页减少到 6 个。

### 六、domain model 变更

```typescript
// 删除
// export interface LauncherProfile { ... }

// 修改
export interface AgentRole {
  id: string;
  projectId: string | null;  // null = 全局内置角色，非 null = 属于某个项目
  name: string;
  description: string;
  isBuiltIn: boolean;
  defaultCapabilities: string[];
}

export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  roleId: string;
  modelProviderId: string;   // 新增：引用的模型供应商
  modelName: string;          // 新增：引用的模型名
  inputs: string[];
  outputs: string[];
  gateMode: GateMode;
  failureStrategy: FailureStrategy;
  projectOverride: boolean;
}

export interface AgentRun {
  id: string;
  taskId: string;
  roleId: string;
  modelProviderId: string;  // 替换原 launcherId
  modelName: string;        // 新增
  currentStepId: string;
  status: "starting" | "running" | "waiting_gate" | "done" | "failed";
  log: string[];
  startedAt: string;
  finishedAt: string | null;
}
```

### 七、代码变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `src/components/ProjectManagement.tsx` | 项目管理入口页（双 Tab） |
| 新增 | `src/components/ExistingProjectImport.tsx` | 已有项目智能导入 |
| 新增 | `src/components/NewProjectWizard.tsx` | 新建项目 4 步 Wizard |
| 修改 | `src/domain/workbench.ts` | 删除 LauncherProfile；AgentRole 加 projectId；WorkflowStep 加 modelProviderId/modelName；AgentRun 替换 launcherId；WorkbenchView 更新；launcherProfiles 从 WorkbenchData 删除 |
| 修改 | `src/data/fixtures.ts` | 移除 launcherProfiles；更新 WorkflowStep 和 AgentRun 数据 |
| 修改 | `src/components/AppShell.tsx` | NAV_ITEMS 合并 |
| 修改 | `src/App.tsx` | 路由映射更新；去掉 launcher 相关逻辑 |
| 修改 | `src/components/Settings.tsx` | 删除角色库标签页 |
| 修改 | `src/components/WorkflowBuilder.tsx` | 步骤编辑增加模型选择 |
| 修改 | `src/components/WorkbenchHome.tsx` | launcher 引用替换为 modelProviderId |
| 修改 | `src/components/ManualGateDecision.tsx` | launcher 引用替换 |
| 修改 | `src/components/MemoryManager.tsx` | 角色相关更新 |
| 修改 | `src/components/RunnerLogs.tsx` | launcher 引用替换 |
| 删除 | `src/components/ProjectOnboarding.tsx` | 功能被新组件替代 |
| 删除 | `src/components/NewTaskFlow.tsx` | 功能被 NewProjectWizard 替代 |
| 更新 | `src/__tests__/` | 全部测试同步更新 |

### 八、UI 设计约束

- 深色主题，`--bg: #101215`，`--surface: #171a1f`
- 使用 `IconBadge` 组件统一图标角标
- 使用 `flow-stepper` 组件统一步骤导航
- 项目角色列表使用紧凑卡片，支持内联编辑
- 模型选择使用 dropdown，数据来自全局模型池
- step 角色+模型组合显示为 `角色名 / 模型名` 格式
- 按钮使用 `btn primary` / `btn ghost` / `btn danger` 样式
- icon-only button 必须有 `aria-label`

### 九、验收

- [ ] 侧边栏从 8 项减少到 7 项
- [ ] 设置中心去掉角色库标签页
- [ ] `项目管理` 页面可切换「已有项目导入」和「新建项目」
- [ ] 已有项目导入可内联管理角色
- [ ] 新建项目 Wizard 第 2 步可管理角色 + 自由组合模型
- [ ] WorkflowStep 引用 roleId + modelProviderId + modelName
- [ ] `LauncherProfile` 类型已删除
- [ ] `launcherProfiles` 从 fixtures 和 WorkbenchData 中移除
- [ ] `npm test` 通过
- [ ] `npm run build` 通过
