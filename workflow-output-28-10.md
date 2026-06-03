# Issue #28: AgentRun Implementation Output

## Date: 2026-06-03

## Summary

Created the AgentRun domain model and integrated real Runner process management into the workbench. The implementation connects the WorkbenchHome Terminal UI to real Runner processes via the full backend stack: domain model, repository, use case, API route, and frontend API client.

## Design Decisions

1. **AgentRun as first-class domain entity** - Extracted from `task.ts` into its own `src/domain/agentRun.ts` with extended fields for Phase 2 runner integration (processId, runnerId, pid, exitCode, stepContext, tokenUsage, artifacts).

2. **Two-layer use case architecture** - `workbenchRunUseCase.ts` orchestrates `workflowExecutionUseCase` + `runnerUseCase` to provide a unified workbench execution API. It tracks active processes in-memory and enriches workflow runs with live process info.

3. **Duplicate start prevention** - `checkDuplicateStart()` and task-to-run mapping prevent spawning duplicate processes for the same task. Existing active sessions are returned instead of creating new runs.

4. **Stale session detection & recovery** - `detectStaleSession()` checks if a tracked process is still running. `recoverStaleSession()` cleans up stale mappings. `cleanupStaleSessions()` batch-cleans all stale sessions.

5. **Runner exit synchronization** - `getWorkbenchRunView()` automatically detects when a tracked process has exited (stopped/failed) and syncs the WorkflowRun state accordingly.

6. **WorkflowEvent domain type** - Created `src/domain/workflowEvent.ts` as a placeholder for future event-driven workflow orchestration (#27 integration).

## Verification

- `npx tsc --noEmit` passes with 0 errors
- `npx vitest run` passes: 513 tests pass, 9 pre-existing failures (8 in workflowExecutionUseCase, 1 in project-detail)
- All 61 workbenchRunUseCase tests pass
- 0 regressions from this change

## Pre-existing Test Failures (not introduced by this change)

1. `workflowExecutionUseCase.test.ts` (8 failures) - Tests for gate handling and race conditions that expect behavior not yet implemented in the use case
2. `project-detail.test.tsx` (1 failure) - Test expects a "同步协同文件" button that doesn't exist in the current component

## Modified Files

### New Files
- `src/domain/agentRun.ts` - AgentRun domain model with extended fields
- `src/domain/workflowEvent.ts` - WorkflowEvent domain type for #27 integration
- `src/services/local/repositories/agentRunRepository.ts` - AgentRun persistence layer
- `src/services/local/useCases/workbenchRunUseCase.ts` - Workbench run orchestration use case
- `src/server/routes/workbenchRuns.ts` - Express API routes for workbench runs
- `src/services/api/workbenchRunsApi.ts` - Frontend API client for workbench runs
- `src/__tests__/services/local/useCases/workbenchRunUseCase.test.ts` - 61 tests for workbench run use case
- `src/__tests__/domain/workflowEvent.test.ts` - WorkflowEvent domain type tests
- `src/__tests__/app-refresh-restore.test.ts` - Page refresh state restoration tests
- `src/__tests__/components/WorkbenchHome.test.tsx` - WorkbenchHome component tests

### Modified Files
- `src/domain/task.ts` - Re-exports AgentRun from new file for backward compatibility
- `src/domain/workbench.ts` - Updated AgentRun import path
- `src/state/workbenchActions.ts` - Added SET_TASKS action and updateTaskAction
- `src/state/workbenchReducer.ts` - Added SET_TASKS and UPDATE_TASK cases
- `src/state/WorkbenchProvider.tsx` - Added updateTask callback and task API loading
- `src/components/WorkbenchHome.tsx` - Real runner integration with process start/stop/log polling
- `src/components/ProjectWorkspace.tsx` - Enhanced with runner profile integration
- `src/App.tsx` - URL query param state persistence for page refresh
- `src/server/routes/index.ts` - Registered workbench-runs router
- `src/services/api/index.ts` - Exported workbenchRunsApi
- `src/services/api/workflowApi.ts` - Added createTemplate method
- `src/services/local/index.ts` - Exported AgentRunRepository
- `src/services/local/repositories/index.ts` - Exported AgentRunRepository
- `src/services/local/useCases/index.ts` - Exported workbenchRunUseCase functions
- `src/services/local/useCases/workflowExecutionUseCase.ts` - Minor fixes
- `src/services/local/adapters/processRunnerAdapter.ts` - Enhanced process tracking
- `src/styles/base.css` - Added PwLogStream styles
- `src/__tests__/*.tsx` (7 files) - Added missing `updateTask` to test mocks
