# Task Output: Runner Exit Synchronization (#28)

## Date: 2026-06-03

## Summary

Implemented Runner exit synchronization in the workbench run lifecycle. When a Runner process exits (normally or with error), the system now automatically detects this during polling and syncs the WorkflowRun state accordingly.

## Problem

When a Runner process exited, the `ProcessRunnerAdapter` updated the `RunnerProcess` state in-memory via the `close` event handler, but:
1. No callback/notification mechanism existed to alert the `workbenchRunUseCase`
2. The `getWorkbenchRunView` polling function never checked if the process had exited
3. WorkflowRun and Task states remained stuck in "running" even after process exit

## Solution

### 1. ProcessRunnerAdapter - Exit Callback Registration
- Added `ProcessExitCallback` type for exit event notifications
- Added `onProcessExit(callback)` method with unsubscribe support
- `close` event handler now invokes all registered callbacks with processId, exitCode, and updated RunnerProcess
- Mock mode and explicit `stop()` also trigger callbacks for consistency

### 2. workbenchRunUseCase - Exit Sync via Polling
- Added `syncProcessExitIfNeeded()` function that detects process state transitions
- Tracks `lastKnownProcessState` per run to detect running -> stopped/failed transitions
- Called automatically from `getWorkbenchRunView()` (the main polling endpoint)
- Sync rules:
  - `RunnerProcess.state = stopped` + `exitCode = 0` -> WorkflowRun = completed
  - `RunnerProcess.state = failed` or `exitCode != 0` -> WorkflowRun = failed
- Cleans up `activeProcesses` and `lastKnownProcessState` on sync

### 3. workflowExecutionUseCase - Export workflowRuns Map
- Exported `workflowRuns` Map so `workbenchRunUseCase` can directly update run state
- Added to index.ts re-exports

### 4. New Public API Functions
- `checkDuplicateStart()` - Prevents duplicate runner starts for the same task
- `markRunStale()` - Marks a run as stale when process disappears
- `getTaskActiveRunId()` - Gets the current runId for a task

## Files Modified

| File | Change |
|------|--------|
| `src/services/local/adapters/processRunnerAdapter.ts` | Added `ProcessExitCallback` type, `onProcessExit()` method, callback invocation in close/stop/mock handlers |
| `src/services/local/useCases/workbenchRunUseCase.ts` | Added `syncProcessExitIfNeeded()`, integrated into `getWorkbenchRunView()`, added `lastKnownProcessState` tracking, duplicate start prevention, stale session handling |
| `src/services/local/useCases/workflowExecutionUseCase.ts` | Exported `workflowRuns` Map |
| `src/services/local/useCases/index.ts` | Added exports: `workflowRuns`, `checkDuplicateStart`, `markRunStale`, `getTaskActiveRunId` |

## Test Results

- `workbenchRunUseCase.test.ts`: 61 passed (includes exit sync test)
- `typecheck`: passed
- Pre-existing failures (not caused by this change):
  - `workflowExecutionUseCase.test.ts`: 8 failures (pre-existing bugs in gate/concurrent handling)
  - `project-detail.test.tsx`: 1 failure (pre-existing UI test issue)

## Design Decisions

1. **Polling-based sync** rather than callback-based: The `syncProcessExitIfNeeded` runs during `getWorkbenchRunView()` polling (every ~2s from UI) rather than reacting to the ProcessRunnerAdapter callback. This is simpler and avoids cross-layer callback complexity.

2. **Direct Map update**: The `workflowRuns` Map is exported and updated directly rather than going through `advanceWorkflowStep` or `cancelWorkflowRun`, because the exit sync is a state correction rather than a user action.

3. **Callback still registered**: The `onProcessExit` callback mechanism was added to ProcessRunnerAdapter for future use (e.g., WebSocket push notifications), but the current sync is polling-based.

## Remaining Work

- Add test for failed exit (non-zero exit code) sync
- Add test for exit during waiting-gate state
- Wire up ProcessExitCallback to the server for push-based notifications
- Connect exit sync to Task.status updates via the task repository
