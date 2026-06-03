# Workflow Output: Add /workbench-runs Route

## Task
Add `/workbench-runs` API route to the Express server.

## Findings

The `/workbench-runs` route was **already fully implemented** in the codebase. All three layers were in place:

1. **Server route**: `src/server/routes/workbenchRuns.ts` -- complete Express router with endpoints:
   - `POST /start` -- start a new workbench run
   - `GET /project/:projectId` -- list runs for a project
   - `GET /:runId` -- get run status with step/process info
   - `GET /:runId/progress` -- get run progress summary
   - `GET /:runId/logs` -- get logs for active runner process
   - `POST /:runId/advance` -- advance to next step
   - `POST /:runId/gate` -- handle gate decision
   - `POST /:runId/stop` -- stop a run
   - `POST /:runId/pause` -- pause a run
   - `POST /:runId/resume` -- resume a paused run

2. **Route registration**: `src/server/routes/index.ts` -- already mounted at `/workbench-runs` (line 31)

3. **Frontend API client**: `src/services/api/workbenchRunsApi.ts` -- full client with typed methods

4. **API export**: `src/services/api/index.ts` -- already exports `workbenchRunsApi` and all types

## Changes Made

The only gap was that `AgentRunRepository` was not wired into `LocalEngineeringServices`, meaning the route's backend repository layer was incomplete. I connected it:

- **`src/services/local/repositories/index.ts`** -- already had `AgentRunRepository` export (no change needed)
- **`src/services/local/index.ts`** -- three changes:
  1. Added `AgentRunRepository` to the import from `./repositories`
  2. Added `agentRun: AgentRunRepository` to `LocalEngineeringServices.repositories` interface
  3. Added `agentRun: new AgentRunRepository(fileStore)` to `createLocalServices()` factory

## Verification

- `npx tsc --noEmit` passes with zero errors
- Test failures (9 in `workflowExecutionUseCase.test.ts`, 1 in `project-detail.test.tsx`) are pre-existing and unrelated to this change -- they come from open bug-fix tasks #57 and #58

## Files Modified

- `src/services/local/index.ts` -- connected `AgentRunRepository` to `LocalEngineeringServices`
