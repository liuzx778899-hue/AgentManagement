# Task 13: Duplicate Start Check (防重复启动)

## Issue #28 - Workbench Terminal Real Runner Integration

### Task Description

Implement duplicate start prevention to ensure that clicking "start" on a task that already has a running process does not spawn a second runner. Per Issue #28 design:

> Task.activeRunId exists -> query AgentRun -> query RunnerProcess -> if process still running, don't create new process, return existing session -> if process gone, mark old run stale, allow restart

### Implementation Summary

#### 1. workbenchRunUseCase.ts - Core duplicate start prevention

**New data structures:**
- `taskActiveRuns`: `Map<string, string>` — reverse index from taskId to runId, enables O(1) duplicate detection
- `lastKnownProcessState`: `Map<string, string>` — tracks process state transitions for exit sync

**New exported functions:**
- `checkDuplicateStart(adapter, taskId)` — checks whether a task already has an active run with a running process
  - Returns `{ duplicate: false }` if no active run
  - Returns `{ duplicate: true, runId, view }` if process is running
  - Returns `{ duplicate: true, runId, view: null }` if process gone (stale)
- `markRunStale(adapter, runId, taskId)` — cleans up stale runs to allow restart
- `getTaskActiveRunId(taskId)` — returns the runId for a task (if tracked)
- `getTaskRunMappings()` — returns all task->run pairs for diagnostics
- `resetAllState()` — clears all internal state for test isolation

**Modified functions:**
- `startWorkbenchRun()` — now calls `checkDuplicateStart()` before creating new runs. If duplicate detected:
  - Running process: returns existing session with diagnostic message
  - Stale process: calls `markRunStale()` then proceeds with new start
  - Tracks `taskActiveRuns.set(taskId, runId)` on successful start
- `stopWorkbenchRun()` — cleans up `taskActiveRuns` (with optional taskId, or scan)
- `syncProcessExitIfNeeded()` — cleans up `taskActiveRuns` when run reaches terminal state
- `StopWorkbenchRunConfig` — added optional `taskId` field for efficient cleanup

#### 2. WorkbenchHome.tsx - UI-level duplicate guard

- `handleStartRunner()` now checks tab state before spawning a new process
- If tab is already "running" or "starting", returns early without calling `processRunner.start()`
- Clears `processId` before restart to prevent stale references

#### 3. Tests

9 new tests covering:
- Duplicate start returns existing session (same runId)
- Task->run mapping tracked after start
- Restart allowed after stop
- Different tasks can run concurrently
- `checkDuplicateStart()` returns correct results
- `getTaskRunMappings()` reflects active pairs
- Cleanup on stop with and without taskId

### Design Decisions

1. **taskActiveRuns as reverse index**: O(1) lookup by taskId vs scanning all active processes. Essential because a task can only have one active run at a time.

2. **Graceful stale recovery**: When a process disappears but the run is still tracked, `markRunStale()` cancels the old run and cleans up indices so the user can restart without error.

3. **Two-layer protection**: UseCase layer prevents duplicates at the API level, UI layer provides immediate feedback (button disabled/guard) without waiting for API roundtrip.

4. **taskId optional in StopConfig**: Backward compatible — if not provided, scans taskActiveRuns for the runId. This avoids breaking existing callers.

### Files Modified

| File | Change |
|------|--------|
| `src/services/local/useCases/workbenchRunUseCase.ts` | Added taskActiveRuns, checkDuplicateStart, markRunStale, getTaskActiveRunId, getTaskRunMappings, resetAllState. Modified startWorkbenchRun, stopWorkbenchRun, syncProcessExitIfNeeded, clearActiveProcess |
| `src/components/WorkbenchHome.tsx` | Added duplicate start guard in handleStartRunner |
| `src/__tests__/services/local/useCases/workbenchRunUseCase.test.ts` | Added 9 duplicate start tests, updated imports and beforeEach |

### Verification

- `npx tsc --noEmit` — passes (no type errors)
- `npx vitest run src/__tests__/services/local/useCases/workbenchRunUseCase.test.ts` — 61 tests pass
- Full suite: 501 passed, 9 failed (pre-existing failures in workflowExecutionUseCase race condition test, unrelated to this change)

### Acceptance Criteria Met (from Issue #28)

- [x] Already running session does not create duplicate process
- [x] Stale session is detected and cleaned up for restart
- [x] Different tasks can run concurrently
- [x] Task->run index cleaned up on stop/exit/complete
- [x] Page refresh state recovery works (via existing getWorkbenchRunView polling)
