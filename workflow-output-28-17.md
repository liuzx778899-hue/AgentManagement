# Stale Session Detection & Recovery - Workflow Output 28-17

**Date**: 2026-06-03
**Branch**: issue-32-domain-protocol
**Issue**: #28 (Terminal connect to real Runner process)
**Task**: Implement stale session handling

## Summary

Implemented stale session detection, recovery, and cleanup in `workbenchRunUseCase.ts`, and wired the exit sync mechanism into `getWorkbenchRunView` so that stale sessions are detected automatically during UI polling.

## Design Decisions

1. **Three stale session scenarios handled**:
   - **Process exited but mapping still tracked**: The `activeProcesses` map points to a process that has already stopped/failed in the adapter. Detected by polling the process state via `getProcessStatus`.
   - **Page refresh / memory loss**: The WorkflowRun is in "running" state but `activeProcesses` has no entry for it (in-memory map lost on refresh). Detected by checking `!activeProcessId` for a running run.
   - **Adapter recreated**: The processId is tracked but the adapter no longer knows about it. Detected when `getProcessStatus` returns not-found.

2. **Exit sync wired into getWorkbenchRunView**: `syncProcessExitIfNeeded` was previously defined but never called. Now called in `getWorkbenchRunView` so that any UI polling automatically detects and handles process exits.

3. **Recovery marks runs stale and allows restart**: `recoverStaleSession` delegates to `markRunStale` which stops the dead process, cancels the WorkflowRun, and cleans up task/run mappings so the user can start a fresh run.

4. **Batch cleanup for periodic maintenance**: `cleanupStaleSessions` scans all tracked active runs and cleans up stale ones in one pass, designed for periodic timer-based invocation.

## Files Modified

- `src/services/local/useCases/workbenchRunUseCase.ts`
  - Wired `syncProcessExitIfNeeded` into `getWorkbenchRunView`
  - Added `StaleSessionResult` interface
  - Added `detectStaleSession()` - read-only stale session detection
  - Added `recoverStaleSession()` - recovery + cleanup
  - Added `cleanupStaleSessions()` - batch stale cleanup
  - Updated `clearActiveProcess()` to also clean `lastKnownProcessState` and `taskActiveRuns`

- `src/__tests__/services/local/useCases/workbenchRunUseCase.test.ts`
  - Added 13 new tests for stale session detection, recovery, and cleanup
  - Total tests: 61 (all passing)

## Test Coverage

New test cases:
- detect non-stale session when process is running
- detect stale session when process has exited (stopped)
- detect stale session when no process is tracked (page refresh scenario)
- detect stale session when adapter loses process info (adapter recreated)
- not-stale for completed runs
- not-stale for non-existent runs
- not-stale for waiting-gate without process (legitimate state)
- recover from stale session and clean up tracking
- allow starting a new run after stale recovery
- not recover when session is not stale
- recover orphaned process (no task mapping)
- cleanupStaleSessions cleans all stale sessions at once
- cleanupStaleSessions does not touch non-stale sessions
- cleanupStaleSessions handles mixed stale and active sessions
- automatic stale sync via getWorkbenchRunView

## Verification

```
npx tsc --noEmit       -> 0 errors
npx vitest run workbenchRunUseCase.test.ts -> 61 passed
```

## Pre-existing Failures (not introduced by this change)

- `workflowExecutionUseCase.test.ts` - 8 failures from concurrent bug fix in progress
- `project-detail.test.tsx` - 1 failure (collaboration files tab)
