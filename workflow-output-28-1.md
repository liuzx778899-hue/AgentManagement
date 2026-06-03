# Workflow Output: AgentRun Domain Model (Task 28-1)

## Task
New AgentRun domain model

## Summary
Extracted `AgentRun` from `src/domain/task.ts` into a dedicated `src/domain/agentRun.ts` file with enriched fields for Phase 2 runner integration. The original interface had only basic fields; the new model adds process tracking, exit codes, log paths, step context, artifacts, token usage, and duration -- all needed for real CLI runner process management.

## Design Decisions

1. **Extract to dedicated file**: AgentRun was co-located with Task in `task.ts`. It now lives in its own `agentRun.ts` to follow the single-responsibility principle and allow independent evolution as the runner subsystem grows.

2. **Backward-compatible re-exports**: `task.ts` re-exports `AgentRun` (and the new helper types) so that all existing imports (`from '../../../domain/task'` and `from '../domain/workbench'`) continue to work without changes.

3. **New `AgentRunStatus` type**: The original inline union `"starting" | "running" | "waiting_gate" | "done" | "failed"` is now a named type. Added `"cancelled"` as a terminal state.

4. **Optional extended fields**: All Phase 2 fields (`runnerId`, `processId`, `pid`, `exitCode`, `logPath`, `errorMessage`, `workingDirectory`, `envOverrides`, `stepContext`, `gateIds`, `artifacts`, `tokenUsage`, `durationSeconds`) are optional so existing fixture data and mock objects continue to work without modification.

5. **Helper types**: Added `CreateAgentRunInput` and `AgentRunUpdate` to standardize how runs are created and updated across use cases and the API layer.

6. **State machine documentation**: Added JSDoc comments describing the valid state transitions for the `AgentRunStatus` state machine.

## Modified Files

| File | Action | Description |
|------|--------|-------------|
| `src/domain/agentRun.ts` | **NEW** | AgentRun domain model with extended fields, helper types, and state machine documentation |
| `src/domain/task.ts` | **MODIFIED** | Removed inline AgentRun interface; added re-export from agentRun.ts |
| `src/domain/workbench.ts` | **MODIFIED** | Updated imports to use agentRun.ts; added new type exports |
| `src/services/local/repositories/agentRunRepository.ts` | **MODIFIED** | Updated import path from task.ts to agentRun.ts |

## Verification

- TypeScript typecheck: Pre-existing `updateTask` errors only; no new errors introduced
- Tests: 431 passed; 3 pre-existing failures unrelated to this change
- No regressions introduced

## Phase 2 Blueprint Alignment

The new fields directly implement the PHASE_2_BLUEPRINT requirements:
- "每个 AgentRun 记录开始时间、结束时间、退出码、日志位置、关联步骤" -> `exitCode`, `logPath`, `currentStepId`, `startedAt`, `finishedAt`
- "进程管理：启动/监控/终止 Agent 子进程" -> `processId`, `pid`, `runnerId`
- "日志流：stdout/stderr 实时管道传输" -> `logPath`, `log`
- "AgentRun 状态按明确状态迁移处理" -> `AgentRunStatus` with documented transitions
