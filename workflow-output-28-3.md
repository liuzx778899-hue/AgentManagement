# Workflow Output: New workbenchRunUseCase

## Task: Add workbenchRunUseCase

## Summary

Created a new `workbenchRunUseCase` that bridges `workflowExecutionUseCase` and `runnerUseCase` to provide a unified workbench execution API. This use case orchestrates the full lifecycle of workflow run management combined with real runner process control.

## Architecture

The `workbenchRunUseCase` sits between the workflow execution logic and the runner process adapter, providing these key capabilities:

1. **startWorkbenchRun** - Creates a WorkflowRun, starts a runner process for the first step, and returns an enriched view with step/process info
2. **getWorkbenchRunView** - Returns the current run state with live process information attached
3. **getWorkbenchRunProgress** - Returns a progress summary (totalSteps, completedSteps, percentage)
4. **advanceWorkbenchStepRun** - Stops current runner, advances step, starts new runner for next step
5. **handleWorkbenchGateRun** - Handles gate decisions, starts runner for next step after approval
6. **stopWorkbenchRun** - Stops active runner and cancels the workflow run
7. **pauseWorkbenchRunAction** - Stops runner but keeps run in paused state
8. **resumeWorkbenchRunAction** - Restarts runner for current step after pause
9. **listProjectWorkbenchRuns** - Lists all runs for a project
10. **getWorkbenchRunLogs** - Gets logs from the active runner process

### Data Flow

```
UI -> workbenchRunsApi (frontend) -> /api/workbench-runs/* (server route)
  -> workbenchRunUseCase (orchestration)
    -> workflowExecutionUseCase (workflow state machine)
    -> runnerUseCase -> ProcessRunnerAdapter (process lifecycle)
```

### Key Design Decisions

1. **Enriched View Pattern**: `WorkbenchRunView` combines the `WorkflowRun` with live `RunnerProcessInfo` for each step, giving the UI a single object to render.

2. **Active Process Tracking**: An internal `Map<string, string>` maps `runId -> processId` to track which process belongs to which run. This is cleaned up on stop/pause/completion.

3. **Route Ordering**: The `/project/:projectId` route is registered before `/:runId` to prevent Express from treating "project" as a runId parameter.

4. **Repository-based Data Loading**: Server routes load project, workflow, and task from repositories before calling the use case, keeping the use case pure and testable.

5. **Runner Kind Default**: When the use case needs to start a runner internally (e.g., after gate approval), it defaults to `claude-code` since the original config context isn't available at that point. This is a known simplification.

## Files Modified

### Created
- `src/services/local/useCases/workbenchRunUseCase.ts` - Use case implementation (12 exported functions, 5 exported types)
- `src/server/routes/workbenchRuns.ts` - Express routes (10 endpoints)
- `src/services/api/workbenchRunsApi.ts` - Frontend API client
- `src/__tests__/services/local/useCases/workbenchRunUseCase.test.ts` - 37 tests

### Modified
- `src/services/local/useCases/index.ts` - Added exports for all workbenchRunUseCase functions and types
- `src/server/routes/index.ts` - Registered workbenchRunsRouter at `/workbench-runs`
- `src/services/api/index.ts` - Exported workbenchRunsApi and related types

## Test Results

- **37 new tests**, all passing
- Covers: start, get, progress, advance, gate, stop, pause, resume, list, logs, full lifecycle, utility functions
- Full test suite: 477 passed + 37 new = 514 passed (9 pre-existing failures in workflowExecutionUseCase test unrelated to this change)
- Typecheck: 0 errors

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/workbench-runs/start` | Start a new workbench run |
| GET | `/api/workbench-runs/project/:projectId` | List runs for a project |
| GET | `/api/workbench-runs/:runId` | Get run with enriched step info |
| GET | `/api/workbench-runs/:runId/progress` | Get progress summary |
| GET | `/api/workbench-runs/:runId/logs` | Get active process logs |
| POST | `/api/workbench-runs/:runId/advance` | Advance to next step |
| POST | `/api/workbench-runs/:runId/gate` | Handle gate decision |
| POST | `/api/workbench-runs/:runId/stop` | Stop run |
| POST | `/api/workbench-runs/:runId/pause` | Pause run |
| POST | `/api/workbench-runs/:runId/resume` | Resume paused run |
