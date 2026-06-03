# Task #28-11: Bind Task.activeRunId

## Summary

Bound `Task.activeRunId` to the workflow run lifecycle so that when a workflow run starts, the corresponding task's `activeRunId` is set to the new run's ID, and `ProjectWorkspace` can use it to fetch live run state.

## Problem

`Task.activeRunId` was defined in the domain model (`src/domain/task.ts`) but was always `null`. The `PwWorkflowControl` component started workflow runs via `workflowApi.run()`, which returned a `runId`, but this ID was only logged to console (`console.log('Workflow run changed:', runId)`) -- never persisted back to the task. As a result, `ProjectWorkspace` could never find the active run, leaving step progress, agent online status, and run tracking broken.

## Root Cause

Missing binding in the `onRunChange` callback of `PwWorkflowControl` within `ProjectWorkspace.tsx` (line 699). No `UPDATE_TASK` action existed in the reducer to mutate a task's fields.

## Solution

### 1. Added UPDATE_TASK action and reducer case

- **`src/state/workbenchActions.ts`**: Added `UPDATE_TASK` action type `{ taskId: string; updates: Partial<Task> }` and `updateTaskAction` creator.
- **`src/state/workbenchReducer.ts`**: Added `UPDATE_TASK` case that merges partial updates into the matching task and sets `updatedAt`.

### 2. Exposed updateTask on WorkbenchProvider

- **`src/state/WorkbenchProvider.tsx`**: Added `updateTask(taskId, updates)` method to `WorkbenchState` interface, callback implementation, and wired it into the `useMemo` state object and dependency array.

### 3. Wired onRunChange to bind activeRunId

- **`src/components/ProjectWorkspace.tsx`**: Changed `onRunChange` from `console.log` to `updateTask(currentTask.id, { activeRunId: runId })`. Also passes `currentRunId={currentTask?.activeRunId}` prop so `PwWorkflowControl` knows about the existing run.

### 4. Replaced static AgentRun lookup with WorkflowRun API polling

- **`src/services/api/workflowApi.ts`**: Added `getRun(runId)` method to fetch full `WorkflowRun` from `GET /workflow/run/:runId`.
- **`src/components/ProjectWorkspace.tsx`**: Replaced the `activeRun` useMemo (which looked up `data.agentRuns`) with a `useState` + `useEffect` that polls `workflowApi.getRun(currentTask.activeRunId)` every 5 seconds. Falls back to legacy `data.agentRuns` lookup if no WorkflowRun is available.

### 5. Added regression tests

- **`src/__tests__/workbench-reducer.test.ts`**: Added 3 tests for `UPDATE_TASK`:
  - Updates a task's `activeRunId`
  - Updates a task's `status`
  - Does not mutate other tasks when updating one

## Modified Files

| File | Change |
|------|--------|
| `src/state/workbenchActions.ts` | Added `UPDATE_TASK` action type and `updateTaskAction` creator |
| `src/state/workbenchReducer.ts` | Added `UPDATE_TASK` case |
| `src/state/WorkbenchProvider.tsx` | Added `updateTask` method to state interface and implementation |
| `src/components/ProjectWorkspace.tsx` | Wired `onRunChange` to `updateTask`, added WorkflowRun API polling |
| `src/services/api/workflowApi.ts` | Added `getRun(runId)` method |
| `src/__tests__/workbench-reducer.test.ts` | Added 3 regression tests for UPDATE_TASK |

## Design Decisions

1. **WorkflowRun over AgentRun for activeRunId**: The `activeRunId` field in `Task` was typed to reference `AgentRun` objects stored in `data.agentRuns`. However, the actual workflow execution path creates `WorkflowRun` objects (stored server-side in a Map). Rather than refactor the type system, I made `activeRunId` store the `WorkflowRun.id` and changed the lookup to fetch from the API. The `AgentRun` concept is a legacy artifact from the Phase 1 reducer-based mock; `WorkflowRun` is the real execution model.

2. **Polling vs EventSource**: Used simple 5-second polling for WorkflowRun state. EventSource/SSE would be more efficient but requires server-side changes outside this task's scope.

3. **UPDATE_TASK vs specialized SET_ACTIVE_RUN_ID**: Chose a generic `UPDATE_TASK` action that accepts `Partial<Task>` rather than a specialized action. This is more reusable and follows the pattern of `UPDATE_PROJECT`, `UPDATE_ROLE`, etc.

## Verification

- `npx tsc --noEmit` -- no new errors (pre-existing errors in unrelated files)
- `npx vitest run src/__tests__/workbench-reducer.test.ts` -- 12/12 passed (was 9)
- `npx vitest run src/__tests__/project-workspace.test.tsx` -- 9/9 passed
- All test suite: 511 passed, 11 failed (all pre-existing)
