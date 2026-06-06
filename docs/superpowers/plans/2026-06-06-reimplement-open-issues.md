# 重新实现所有未关闭 Issue 的工作流计划

> **For agentic workers:** 执行时必须包含每个 issue 评论区的所有审核意见和验收要求。

**Goal:** 基于 main 分支 (commit `a5e8838`) 重新实现所有 7 个未关闭的 issue，关闭旧分支，从零开发。

**Architecture:** 
- Issue 按依赖关系排序执行
- 每个 issue 一个独立分支，从最新 main 创建
- 必须包含评论区的审核意见
- 频繁提交，每完成一个功能点就提交

**Tech Stack:** React 19 + TypeScript + Vite + Express 5 + Vitest

---

## 执行顺序（按依赖关系）

### Phase 1: 基础设施修复（必须先完成）

**顺序:** #37 → #41

---

## Issue #37: 运行时数据未被隔离，垃圾流程模板反复出现

**分支:** `issue-37-runtime-data-isolation`

**评论要点 (必须包含):**
1. `.gitignore` 只影响 git，不影响运行时写入
2. 需要数据分区机制：seed / runtime / test
3. 应用启动时清理非种子文件（方案 B）
4. 测试需要全局 mock，不写真实文件

**任务:**

### Task 1: 创建数据分区目录结构

**Files:**
- Modify: `.gitignore`
- Create: `.agentmanagement/seed/` 目录
- Modify: `src/scripts/seed-data.ts`

- [ ] **Step 1: 更新 .gitignore 添加运行时目录**

```gitignore
# 在现有 .agentmanagement 规则后添加
.agentmanagement/runtime/
.agentmanagement/test/
!.agentmanagement/seed/
```

- [ ] **Step 2: 修改 seed-data.ts 写入 seed 目录**

位置: `src/scripts/seed-data.ts:9`
```typescript
// 修改 BASE_DIR 为 seed 目录
const BASE_DIR = '.agentmanagement/seed';
```

- [ ] **Step 3: 提交**

```bash
git add .gitignore src/scripts/seed-data.ts
git commit -m "fix(#37): add data partition directories (seed/runtime/test)"
```

### Task 2: 应用启动时清理运行时垃圾文件

**Files:**
- Create: `src/services/local/useCases/cleanupRuntimeData.ts`
- Modify: `src/server/app.ts`

- [ ] **Step 4: 写清理逻辑测试**

```typescript
// src/__tests__/services/local/useCases/cleanupRuntimeData.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';

describe('cleanupRuntimeData', () => {
  const testDir = '.agentmanagement/test-cleanup';
  
  beforeEach(async () => {
    await mkdir(join(testDir, 'workflows'), { recursive: true });
  });
  
  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  it('removes non-seed workflow files', async () => {
    // 创建种子文件（不应被删除）
    await writeFile(join(testDir, 'workflows', 'software-dev-v1.json'), JSON.stringify({ id: 'software-dev-v1', seed: true }));
    // 创建垃圾文件（应被删除）
    await writeFile(join(testDir, 'workflows', 'workflow-123.json'), JSON.stringify({ id: 'workflow-123' }));
    
    const { cleanupNonSeedFiles } = await import('../../../services/local/useCases/cleanupRuntimeData');
    await cleanupNonSeedFiles(testDir);
    
    // 种子文件应保留
    const seedFile = await readFile(join(testDir, 'workflows', 'software-dev-v1.json'), 'utf-8');
    expect(JSON.parse(seedFile).id).toBe('software-dev-v1');
    
    // 垃圾文件应不存在
    await expect(readFile(join(testDir, 'workflows', 'workflow-123.json'), 'utf-8')).rejects.toThrow();
  });
  
  it('preserves seed directory files', async () => {
    await mkdir('.agentmanagement/seed/workflows', { recursive: true });
    await writeFile('.agentmanagement/seed/workflows/test.json', '{}');
    
    const { cleanupNonSeedFiles } = await import('../../../services/local/useCases/cleanupRuntimeData');
    await cleanupNonSeedFiles('.agentmanagement');
    
    // seed 目录应保留
    const content = await readFile('.agentmanagement/seed/workflows/test.json', 'utf-8');
    expect(content).toBe('{}');
  });
});
```

- [ ] **Step 5: 运行测试验证失败**

```bash
npm run test -- src/__tests__/services/local/useCases/cleanupRuntimeData.test.ts
```

- [ ] **Step 6: 实现清理逻辑**

```typescript
// src/services/local/useCases/cleanupRuntimeData.ts
import { readdir, rm, stat } from 'fs/promises';
import { join } from 'path';

const SEED_WORKFLOWS = new Set([
  'software-dev-v1.json',
  'bug-fix-v1.json',
  'design-review-v1.json',
]);

export async function cleanupNonSeedFiles(baseDir: string): Promise<void> {
  const workflowsDir = join(baseDir, 'workflows');
  
  try {
    const files = await readdir(workflowsDir);
    
    for (const file of files) {
      if (file.endsWith('.json') && !SEED_WORKFLOWS.has(file)) {
        const filePath = join(workflowsDir, file);
        const fileStat = await stat(filePath);
        
        // 只删除生成的文件（时间戳开头的）
        if (file.startsWith('workflow-') || file.startsWith('custom-template-')) {
          await rm(filePath, { force: true });
        }
      }
    }
  } catch {
    // 目录不存在，忽略
  }
}

export async function cleanupRuntimeDirectories(): Promise<void> {
  const runtimeDir = '.agentmanagement/runtime';
  const testDir = '.agentmanagement/test';
  
  try {
    await rm(runtimeDir, { recursive: true, force: true });
  } catch {}
  
  try {
    await rm(testDir, { recursive: true, force: true });
  } catch {}
}
```

- [ ] **Step 7: 运行测试验证通过**

```bash
npm run test -- src/__tests__/services/local/useCases/cleanupRuntimeData.test.ts
```

- [ ] **Step 8: 在应用启动时调用清理**

位置: `src/server/app.ts` 顶部导入后添加

```typescript
import { cleanupNonSeedFiles, cleanupRuntimeDirectories } from '../services/local/useCases/cleanupRuntimeData';

// 在应用初始化时调用
async function initializeApp() {
  await cleanupNonSeedFiles('.agentmanagement');
  await cleanupRuntimeDirectories();
}

initializeApp().catch(console.error);
```

- [ ] **Step 9: 提交**

```bash
git add src/services/local/useCases/cleanupRuntimeData.ts src/__tests__/services/local/useCases/cleanupRuntimeData.test.ts src/server/app.ts
git commit -m "fix(#37): cleanup non-seed workflow files on startup"
```

### Task 3: 测试全局 mock 不写真实文件

**Files:**
- Modify: `vitest.config.ts`
- Modify: `src/__tests__/setup.ts`

- [ ] **Step 10: 配置 vitest 全局 mock 文件系统**

```typescript
// vitest.config.ts 添加
export default defineConfig({
  test: {
    // ... 现有配置
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

```typescript
// src/__tests__/setup.ts
import { vi } from 'vitest';

// 全局 mock 文件系统写入
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  readFile: vi.fn().mockResolvedValue('{}'),
  rm: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ isFile: () => true }),
}));

// 重置模拟数据
beforeEach(() => {
  vi.clearAllMocks();
});
```

- [ ] **Step 11: 提交**

```bash
git add vitest.config.ts src/__tests__/setup.ts
git commit -m "fix(#37): add global fs mock for tests"
```

---

## Issue #41: WorkflowStep 模型迁移 - 添加 assignments 数组

**分支:** `issue-41-workflowstep-assignments`

**依赖:** #37 完成后

**评论要点 (必须包含):**
1. WorkflowStep 必须有 assignments 字段（必填，非可选）
2. 移除 WorkflowStep 上的 roleId/runnerId/modelProviderId/modelName
3. Task 需要添加 workflowStepId、assignmentId、priority
4. 一次性迁移所有 fixtures 和 .agentmanagement/workflows/*.json
5. 生产代码不再读取旧 roleId

**任务:**

### Task 4: 更新 WorkflowStep 和 Task 模型

**Files:**
- Modify: `src/domain/workflow.ts`
- Modify: `src/domain/task.ts`
- Modify: `src/domain/workbench.ts`

- [ ] **Step 12: 写模型约束测试**

```typescript
// src/__tests__/domain/workflow.test.ts
import { describe, it, expect } from 'vitest';
import type { WorkflowStep } from '../../domain/workflow';

describe('WorkflowStep model', () => {
  it('requires assignments array', () => {
    const step: WorkflowStep = {
      id: 'step-1',
      order: 1,
      name: '需求分析',
      assignments: [{
        id: 'assign-1',
        order: 0,
        roleId: 'role-001',
        runnerId: 'runner-claude-code',
        modelProviderId: 'provider-deepseek',
        modelName: 'deepseek-v4-pro',
        goal: '分析需求',
        acceptanceCriteria: ['完成PRD'],
        inputs: [],
        outputs: ['requirements.md'],
        dependsOnAssignmentIds: [],
        notifyAssignmentIds: [],
        eventRoutes: [],
      }],
      inputs: [],
      outputs: [],
      gateMode: 'manual',
      failureStrategy: 'stop',
      projectOverride: false,
    };
    
    expect(step.assignments).toBeDefined();
    expect(step.assignments.length).toBe(1);
    expect(step.roleId).toBeUndefined(); // 已移除
  });
  
  it('task has workflowStepId and assignmentId', () => {
    const task = {
      id: 'task-1',
      projectId: 'proj-1',
      goal: '实现功能',
      workflowStepId: 'step-1',
      assignmentId: 'assign-1',
      priority: 10,
      status: 'queued',
    };
    
    expect(task.workflowStepId).toBe('step-1');
    expect(task.assignmentId).toBe('assign-1');
    expect(task.priority).toBe(10);
  });
});
```

- [ ] **Step 13: 运行测试验证失败**

- [ ] **Step 14: 更新 domain/workflow.ts**

位置: `src/domain/workflow.ts:49`
```typescript
export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  // 移除: roleId, runnerId, modelProviderId, modelName
  assignments: WorkflowAssignment[]; // 必填
  inputs: string[];
  outputs: string[];
  gateMode: GateMode;
  gateType?: 'manual' | 'auto';
  failureStrategy: FailureStrategy;
  stepMarkdown?: string;
  projectOverride: boolean;
}
```

- [ ] **Step 15: 更新 domain/task.ts**

位置: `src/domain/task.ts:1`
```typescript
export interface Task {
  id: string;
  projectId: string;
  goal: string;
  acceptanceCriteria: string[];
  workflowTemplateId: string;
  workflowStepId: string; // 新增
  assignmentId: string; // 新增
  priority: number; // 新增：动态优先级
  dependsOnTaskIds: string[]; // 新增
  notifyTaskIds: string[]; // 新增
  roleAssignment: Record<string, string>;
  capabilityAuthorization: string[];
  launchStrategy: "worktree" | "direct";
  status: "draft" | "queued" | "running" | "gate" | "done" | "failed";
  activeRunId: string | null;
  phase?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  taskId: string;
  workflowStepId?: string; // 新增
  assignmentId?: string; // 新增
  roleId: string;
  modelProviderId: string;
  modelName: string;
  runnerId?: string; // 新增
  processId?: string; // 新增：绑定的进程ID
  currentStepId: string;
  status: "starting" | "running" | "waiting_gate" | "done" | "failed" | "stale";
  log: string[];
  startedAt: string;
  finishedAt: string | null;
  exitCode?: number; // 新增
  errorMessage?: string; // 新增
}
```

- [ ] **Step 16: 运行测试验证通过**

- [ ] **Step 17: 提交**

```bash
git add src/domain/workflow.ts src/domain/task.ts src/domain/workbench.ts src/__tests__/domain/workflow.test.ts
git commit -m "feat(#41): add assignments to WorkflowStep, extend Task model"
```

### Task 5: 迁移 fixtures.ts

**Files:**
- Modify: `src/data/fixtures.ts`

- [ ] **Step 18: 迁移 fixtures.ts workflow templates**

需要为每个 step 添加 assignments 数组，并移除旧的 roleId/runnerId/modelProviderId/modelName。

示例转换：
```typescript
// 旧格式
{
  id: "step-001",
  order: 1,
  name: "需求分析",
  roleId: "role-001",
  modelProviderId: "provider-deepseek",
  modelName: "deepseek-v4-pro",
  // ...
}

// 新格式
{
  id: "step-001",
  order: 1,
  name: "需求分析",
  assignments: [{
    id: "assign-001-0",
    order: 0,
    roleId: "role-001",
    runnerId: "runner-claude-code",
    modelProviderId: "provider-deepseek",
    modelName: "deepseek-v4-pro",
    goal: "分析用户需求",
    acceptanceCriteria: ["输出需求规格摘要"],
    inputs: ["项目背景", "用户需求"],
    outputs: ["需求规格摘要"],
    dependsOnAssignmentIds: [],
    notifyAssignmentIds: ["assign-002-0"],
    eventRoutes: [],
  }],
  // roleId 等已移除
}
```

- [ ] **Step 19: 提交**

```bash
git add src/data/fixtures.ts
git commit -m "feat(#41): migrate fixtures to assignments model"
```

### Task 6: 迁移 .agentmanagement/workflows/*.json

**Files:**
- Modify: `.agentmanagement/seed/workflows/software-dev-v1.json`
- Modify: `.agentmanagement/seed/workflows/bug-fix-v1.json`
- Modify: `.agentmanagement/seed/workflows/design-review-v1.json`

- [ ] **Step 20: 迁移所有 workflow JSON 文件**

执行脚本或手动转换每个文件。

- [ ] **Step 21: 提交**

```bash
git add .agentmanagement/seed/workflows/
git commit -m "feat(#41): migrate workflow JSON files to assignments model"
```

### Task 7: 更新组件读取 assignments

**Files:**
- Modify: `src/components/WorkflowNode.tsx`
- Modify: `src/components/WorkflowBuilder.tsx`
- Modify: `src/components/WorkbenchHome.tsx`

- [ ] **Step 22: 更新 WorkflowNode 显示多角色头像**

- [ ] **Step 23: 更新 WorkflowBuilder assignment 编辑器**

- [ ] **Step 24: 提交**

```bash
git add src/components/WorkflowNode.tsx src/components/WorkflowBuilder.tsx src/components/WorkbenchHome.tsx
git commit -m "feat(#41): update components to use assignments"
```

---

## Issue #45: AI建项对接真实API

**分支:** `issue-45-ai-briefing-real-api`

**依赖:** #41 完成后

**评论要点 (必须包含):**
1. handleCreateProject 需要调用 `POST /api/projects`
2. persistFlowTemplate 需要调用 `POST /api/workflow-templates`
3. AI生成的角色需要调用 `POST /api/roles`
4. 需要生成任务 `POST /api/tasks`
5. 创建成功后刷新前端 store

**任务:**

### Task 8: 实现 handleCreateProject 真实 API 调用

**Files:**
- Modify: `src/components/AiProjectBriefing.tsx`
- Modify: `src/services/api/projectApi.ts`

- [ ] **Step 25: 写 API 集成测试**

```typescript
// src/__tests__/components/ai-project-briefing-api.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiProjectBriefing } from '../../components/AiProjectBriefing';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AiProjectBriefing API integration', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });
  
  it('creates project via API on confirmation', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'proj-new' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'wf-new' }) });
    
    // ... 测试逻辑
  });
});
```

- [ ] **Step 26: 修改 handleCreateProject 调用真实 API**

位置: `src/components/AiProjectBriefing.tsx:300`

```typescript
const handleCreateProject = useCallback(async () => {
  if (!draft) return;
  setCreating(true);
  
  try {
    // 1. 创建项目
    const project = await projectApi.create({
      name: `AI 建项 - ${new Date().toLocaleDateString('zh-CN')}`,
      repoPath: '',
      defaultBranch: 'main',
      worktreeRoot: '.claude/worktrees',
      workflowTemplateId: _data.workflowTemplates[0]?.id ?? '',
    });
    
    // 2. 更新 store
    dispatch(addProjectAction(project.id, project));
    
    // 3. 创建工作流模板（如果有）
    if (analysisStarted) {
      const template = await workflowApi.createTemplate({
        name: 'AI 建项生成流程',
        version: 1,
        steps: flowBindings.map((binding, index) => ({
          id: `ai-step-${index + 1}`,
          order: index + 1,
          name: binding.step,
          assignments: [{
            id: `ai-assign-${index}`,
            order: 0,
            roleId: _data.roles.find(r => r.name === binding.role)?.id ?? '',
            runnerId: binding.runner,
            modelProviderId: 'provider-deepseek',
            modelName: binding.model,
            goal: binding.step,
            acceptanceCriteria: [],
            inputs: [],
            outputs: [],
            dependsOnAssignmentIds: [],
            notifyAssignmentIds: [],
            eventRoutes: [],
          }],
          inputs: [],
          outputs: [],
          gateMode: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        })),
        workflowMarkdown: draft.productBrief,
      });
      
      dispatch(addWorkflowTemplateAction(template));
    }
    
    setCreating(false);
    onBack();
  } catch (error) {
    setCreating(false);
    // 显示错误提示
  }
}, [draft, analysisStarted, flowBindings, dispatch, _data, onBack]);
```

- [ ] **Step 27: 提交**

```bash
git add src/components/AiProjectBriefing.tsx src/__tests__/components/ai-project-briefing-api.test.tsx
git commit -m "feat(#45): integrate real API for project creation"
```

---

## Issue #28: 工作台 Terminal 连接真实 Runner 进程

**分支:** `issue-28-real-runner-terminal`

**依赖:** #41 完成后

**评论要点 (必须包含):**
1. 缺少 workbenchRunApi / workbenchRunUseCase 编排层
2. 启动任务需要创建真实 RunnerProcess
3. AgentRun 需要 processId 绑定
4. 需要防重复启动逻辑
5. 页面刷新后能恢复或识别 active session
6. 状态同步规则：stopped exitCode=0 → done, failed → Task.failed

**任务:**

### Task 9: 创建 workbenchRunApi 编排层

**Files:**
- Create: `src/services/api/workbenchRunApi.ts`
- Create: `src/services/local/useCases/workbenchRunUseCase.ts`
- Create: `src/server/routes/workbenchRuns.ts`

- [ ] **Step 28: 写 workbenchRunApi 接口测试**

- [ ] **Step 29: 实现前端 API 层**

```typescript
// src/services/api/workbenchRunApi.ts
export interface WorkbenchRunSession {
  task: Task;
  agentRun: AgentRun | null;
  process: RunnerProcess | null;
  logs: LogEntry[];
}

export const workbenchRunApi = {
  startTask: (taskId: string) =>
    apiCall<WorkbenchRunSession>('POST', `/workbench-runs/start`, { taskId }),
  
  stopTask: (taskId: string) =>
    apiCall<WorkbenchRunSession>('POST', `/workbench-runs/stop`, { taskId }),
  
  getSession: (taskId: string) =>
    apiCall<WorkbenchRunSession>('GET', `/workbench-runs/session/${taskId}`),
  
  getLogs: (taskId: string) =>
    apiCall<LogEntry[]>('GET', `/workbench-runs/logs/${taskId}`),
};
```

- [ ] **Step 30: 实现后端路由和用例**

- [ ] **Step 31: 提交**

```bash
git add src/services/api/workbenchRunApi.ts src/services/local/useCases/workbenchRunUseCase.ts src/server/routes/workbenchRuns.ts
git commit -m "feat(#28): add workbenchRun orchestration layer"
```

### Task 10: 实现真实 Runner 启动流程

**Files:**
- Modify: `src/components/WorkbenchHome.tsx`
- Modify: `src/state/workbenchActions.ts`

- [ ] **Step 32: 修改启动按钮调用真实 API**

- [ ] **Step 33: 实现 Terminal 日志轮询**

- [ ] **Step 34: 实现状态同步**

- [ ] **Step 35: 提交**

```bash
git add src/components/WorkbenchHome.tsx src/state/workbenchActions.ts
git commit -m "feat(#28): integrate real runner startup and logs"
```

---

## Issue #27: 工作流节点支持多角色分配

**分支:** `issue-27-multi-role-assignment`

**依赖:** #41, #28 完成后

**评论要点 (必须包含):**
1. WorkflowStep.roleId 必须移除
2. WorkflowEvent 缺少 handoff_requested 事件
3. AI 流程设计必须输出统一 JSON 格式
4. 优先级不再固定 P0-P4 循环，按 step order 动态生成

**任务:**

### Task 11: 更新 WorkflowEvent 模型

**Files:**
- Modify: `src/domain/workflowEvent.ts`
- Modify: `src/domain/workflowAssignment.ts`

- [ ] **Step 36: 添加 handoff_requested 事件类型**

```typescript
export type WorkflowEventTrigger =
  | 'task_completed'
  | 'task_failed'
  | 'bug_reported'
  | 'change_requested'
  | 'gate_requested'
  | 'gate_passed'
  | 'gate_failed'
  | 'task_blocked'
  | 'handoff_requested'; // 新增
```

- [ ] **Step 37: 提交**

### Task 12: 实现动态优先级计算

**Files:**
- Create: `src/services/local/useCases/priorityCalculator.ts`

- [ ] **Step 38: 实现优先级计算逻辑**

优先级 = step.order * 10 + assignment.order

- [ ] **Step 39: 提交**

### Task 13: 更新 AI 流程设计输出格式

**Files:**
- Modify: `src/components/AiWorkflowDesign.tsx`

- [ ] **Step 40: 确保 AI 输出统一 JSON 格式**

- [ ] **Step 41: 提交**

---

## Issue #30: 工作台接入 WorkflowEvent 驱动的角色任务流转

**分支:** `issue-30-workflow-event-routing`

**依赖:** #27, #28 完成后

**评论要点 (必须包含):**
1. 需要 WorkflowNotification 实体和生命周期
2. 事件路由动作需要真实副作用
3. 依赖满足判断需要完整实现
4. 工作台展示需要补齐

**任务:**

### Task 14: 实现通知管理

**Files:**
- Modify: `src/services/local/repositories/notificationRepository.ts`
- Modify: `src/services/local/useCases/workflowEventUseCase.ts`

- [ ] **Step 42: 完善通知生命周期管理**

- [ ] **Step 43: 提交**

### Task 15: 实现事件路由动作

**Files:**
- Modify: `src/services/local/useCases/workflowEventRouter.ts`

- [ ] **Step 44: 实现真实路由动作副作用**

- [ ] **Step 45: 提交**

### Task 16: 更新工作台展示

**Files:**
- Modify: `src/components/WorkbenchHome.tsx`

- [ ] **Step 46: 添加通知列表展示**

- [ ] **Step 47: 提交**

---

## Issue #26: 工作台 mock 数据替换为真实 API

**分支:** `issue-26-workbench-real-api`

**依赖:** 所有以上 issue 完成后

**评论要点 (必须包含):**
1. 流程步骤状态来源真实 task
2. Terminal 日志按 active task / process 隔离
3. 启动/完成操作统一走 taskApi
4. 最近文件来自真实数据源

**任务:**

### Task 17: 移除 mockTabs 和 mock 数据

**Files:**
- Modify: `src/components/WorkbenchHome.tsx`

- [ ] **Step 48: 删除 mockTabs 函数**

- [ ] **Step 49: 使用真实 task 数据构建 tabs**

- [ ] **Step 50: 提交**

### Task 18: 实现真实最近文件

**Files:**
- Modify: `src/components/WorkbenchHome.tsx`
- Modify: `src/services/api/gitApi.ts`

- [ ] **Step 51: 调用 gitApi.getStatus 获取最近变更文件**

- [ ] **Step 52: 提交**

---

## 清理旧分支

完成后需要删除的旧分支：
- `issue-26-workbench-mock-to-api`
- `issue-26-workbench-mock-to-api-v2`
- `issue-26-workbench-real-api-v3`
- `issue-27-role-assignment-orchestration`
- `issue-28-real-runner-terminal`
- `issue-30-workbench-event-notification`
- `issue-32-domain-protocol`
- `worktree-issue-27-workflow-assignment`
- `worktree-issue-28`

---

## 最终验收

每个 issue 完成后运行：
```bash
npm run typecheck && npm run test && npm run build
```

所有 issue 完成后：
```bash
npm run test
npm run build
npm run dev:full
# 手动验收所有功能
```
