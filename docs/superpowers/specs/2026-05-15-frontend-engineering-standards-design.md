# Frontend Engineering Standards Design

日期：2026-05-15
状态：设计方案
关联：`docs/HANDOFF_NEXT_TASKS.md`

## 目标

将当前可工作的 MVP 升级为可长期维护的前端工程产品。当前状态：可运行但缺乏工程标准（无 lint/format/typecheck 脚本、状态集中在 App.tsx、CSS 单一文件、domain types 未按产品边界拆分）。

## 一、新增脚本

在 `package.json` 的 `scripts` 中新增：

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/ --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "preview": "vite preview --host 127.0.0.1"
  }
}
```

新增 devDependencies：`eslint`、`prettier`、`eslint-plugin-react`、`eslint-plugin-react-hooks`、`@typescript-eslint/eslint-plugin`、`@typescript-eslint/parser`。

新增 `.eslintrc.cjs` 和 `.prettierrc` 配置文件。

## 二、状态管理层拆分

将 `src/App.tsx` 中的状态逻辑拆分到 `src/state/` 目录。

### 目标结构

```
src/state/
  WorkbenchProvider.tsx   — Context Provider, 包装所有 useCallback 方法
  workbenchReducer.ts     — 纯函数 reducer, 每个 action 不可变更新
  workbenchActions.ts     — Action 类型定义 + action creator 工厂
  selectors.ts            — 派生计算 (activeTask, activeGate, projectById...)
```

### reducer action 类型

```typescript
type WorkbenchAction =
  | { type: "UPDATE_GATE_STATUS"; gateId: string; status: GateStatus }
  | { type: "REASSIGN_AGENT_RUN"; runId: string; newRoleId: string }
  | { type: "ADD_MEMORY"; memory: Omit<MemoryItem, "id" | "createdAt" | "updatedAt"> }
  | { type: "UPDATE_MEMORY"; memoryId: string; updates: Partial<Pick<MemoryItem, "title" | "body">> }
  | { type: "DELETE_MEMORY"; memoryId: string }
  | { type: "CREATE_TASK"; task: Omit<Task, "id" | "createdAt" | "updatedAt"> }
  | { type: "ADD_PROJECT"; project: Omit<Project, "id" | "createdAt" | "updatedAt"> }
  | { type: "UPDATE_WORKFLOW_STEP"; templateId: string; stepId: string; updates: Partial<WorkflowStep> }
  | { type: "ADD_MODEL_PROVIDER"; provider: Omit<ModelProvider, "id"> }
  | { type: "UPDATE_MODEL_PROVIDER"; providerId: string; updates: Partial<ModelProvider> }
  | { type: "DELETE_MODEL_PROVIDER"; providerId: string }
  | { type: "ADD_PROVIDER_MODEL"; providerId: string; modelName: string }
  | { type: "DELETE_PROVIDER_MODEL"; providerId: string; modelName: string }
  | { type: "SET_DEFAULT_MODEL"; providerId: string; modelName: string }
```

### App.tsx 变更

`App.tsx` 只负责：
- 路由映射（view → component）
- 包装 `WorkbenchProvider`

不再包含任何 `useCallback` + `setData` 的业务逻辑。

### 组件影响

所有使用 `useWorkbenchState()` 的组件只需改为从 `src/state/WorkbenchProvider` import，接口不变。

## 三、CSS 分层

将 `src/styles.css` 拆分为 4 层：

```
src/styles/
  tokens.css       — CSS 变量 (:root 设计 token)、基础重置 (*/body/button/input/select/textarea)、:focus-visible
  layout.css       — .shell、.sidebar、.main-area、.topbar、.content、响应式布局
  components.css   — .badge、.btn、.tab、.panel、.empty-state、.mini-box、.terminal、.form-field、.form-grid、.stepper、.gate、.task-card、.flow-stepper、.icon-badge、.nav-item 等共享组件
  pages.css        — .workbench-home、.project-onboarding、.new-task-flow、.manual-gate-page、.memory-manager、.workflow-builder、.runner-logs、.settings-page、.capability-center
```

`src/main.tsx` 改为 `import "./styles/tokens.css"` 等 4 行 import。

### tokens.css 内容示例

```css
:root {
  color-scheme: dark;
  --bg: #101215;
  --surface: #171a1f;
  --surface-2: #20242b;
  --surface-3: #282e37;
  --line: #343b46;
  --line-soft: #262c35;
  --text: #f4f7fb;
  --muted: #a8b0bd;
  --faint: #747f8e;
  --primary: #4f8cff;
  --primary-2: #7cdbb5;
  --warn: #f2b85b;
  --danger: #f97066;
  --ok: #51d6a1;
  --violet: #b697ff;
  --shadow: 0 18px 54px rgba(0, 0, 0, 0.34);
  --radius: 8px;
  --font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
}

* { box-sizing: border-box; }

body { margin: 0; min-height: 100vh; background: var(--bg); }

button, input, select, textarea { font: inherit; color: inherit; }
button { min-height: 36px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface-2); cursor: pointer; }

button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

## 四、Domain Model 边界梳理

当前 `src/domain/workbench.ts` 包含所有类型。按产品边界拆分为多个文件：

```
src/domain/
  workbench.ts        — WorkbenchData、WorkbenchView
  project.ts          — Project、ProjectSettings、Scope、DesktopIntegrationStatus、PermissionLevel
  workflow.ts         — WorkflowTemplate、WorkflowStep、GateMode、FailureStrategy
  task.ts             — Task、AgentRun
  role.ts             — AgentRole
  gate.ts             — ManualGate、GateStatus
  memory.ts           — MemoryItem、MemoryKind、MemoryScope
  capability.ts       — CapabilityPack、McpServerCapability、SkillCapability、PluginCapability、AgentCapability、CapabilitySource、CapabilityStatus
  model.ts            — ModelProvider
  engineering.ts      — EngineeringFeedback
  im.ts               — ImPlatform、ImEventType、ImAdapter、ImMessageTemplate、ImRouteRule、ProjectImBinding
```

`workbench.ts` 重新导出所有类型以保持兼容：

```typescript
export type { Project, ProjectSettings } from "./project";
export type { Task, AgentRun } from "./task";
// ... etc
```

## 五、测试增强

除了当前 7 个测试文件（41 tests），建议补充：

- `src/__tests__/workbench-reducer.test.ts` — reducer 纯函数测试（不依赖 React 渲染）
- `src/__tests__/project-management.test.tsx` — 项目管理页面行为测试（待 Navigation Merge 完成后）
- `src/__tests__/im-adapter.test.tsx` — IM 适配器配置页面测试（待 IM Adapter 完成后）

## 六、文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| MODIFY | `package.json` | 新增 typecheck/lint/format 脚本 + devDependencies |
| NEW | `.eslintrc.cjs` | ESLint 配置 |
| NEW | `.prettierrc` | Prettier 配置 |
| NEW | `src/state/WorkbenchProvider.tsx` | Context Provider |
| NEW | `src/state/workbenchReducer.ts` | 纯函数 reducer |
| NEW | `src/state/workbenchActions.ts` | Action 类型 + creators |
| NEW | `src/state/selectors.ts` | 派生计算 |
| MODIFY | `src/App.tsx` | 简化，使用 WorkbenchProvider |
| DELETE | `src/styles.css` | 拆分为 4 个文件 |
| NEW | `src/styles/tokens.css` | |
| NEW | `src/styles/layout.css` | |
| NEW | `src/styles/components.css` | |
| NEW | `src/styles/pages.css` | |
| MODIFY | `src/main.tsx` | 更新 import 路径 |
| NEW | `src/domain/project.ts` | |
| NEW | `src/domain/workflow.ts` | |
| NEW | `src/domain/task.ts` | |
| NEW | `src/domain/role.ts` | |
| NEW | `src/domain/gate.ts` | |
| NEW | `src/domain/memory.ts` | |
| NEW | `src/domain/capability.ts` | |
| NEW | `src/domain/model.ts` | |
| NEW | `src/domain/engineering.ts` | |
| NEW | `src/domain/im.ts` | |
| MODIFY | `src/domain/workbench.ts` | 改为 re-export，保留兼容 |

## 七、验收标准

- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 检查通过（允许初始 warning）
- [ ] `npm run format` 格式化所有文件
- [ ] `npm test` 全部 41+ tests 通过
- [ ] `npm run build` 通过
- [ ] `src/App.tsx` 只包含 provider 组合 + 路由映射，不包含 useCallback 业务逻辑
- [ ] 4 个 CSS 文件按 tokens → layout → components → pages 加载
- [ ] domain types 按产品边界拆分，`workbench.ts` re-export 保持兼容
- [ ] reducer 可以用纯函数测试，不依赖 React 渲染
