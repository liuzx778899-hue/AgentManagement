# Workflow Output: Status Panel (Task 28-20)

## Task
Implement Status Panel in workbench right sidebar - replace hardcoded "会话状态" section with real AgentRun/Runner/Task state display.

## Summary

Replaced the static "会话状态" panel box in `WorkbenchHome.tsx` right sidebar (previously showing hardcoded progress bar and static counts) with a dynamic status panel that reads real runtime data from the component's state and fixture/domain data.

The status panel now displays:
- **Runner Process state** for the active tab (idle/starting/running/stopping/stopped/failed) with colored pills and animated dots
- **AgentRun status** when a matching agent run exists for the active step (starting/running/waiting_gate/done/failed/cancelled)
- **Task status** when an active task exists (queued/running/gate/done/failed/draft)
- **Timing info**: start time, running duration, last log timestamp, log line count
- **Error display** for failed processes
- **Step progress bar** showing completed/running step counts
- **Aggregated counts**: active agents and pending gates across all data
- **恢复会话** action link

The header pill aggregates across all tabs showing "运行中", "启动中", or "空闲" with a pulsing dot animation for active states.

## Design Decisions

1. **Inline IIFE rendering**: Used inline IIFE blocks within JSX to compute derived state (process states, agent runs, tasks) without adding extra component state. This keeps the panel reactive to `tabStates` and `data` changes without new hooks.

2. **Status pill system**: Created a consistent `wb-status-pill` + `wb-status-dot` system with class-based color coding. Each state maps to a specific color:
   - Green (#3fb950): running, done, completed
   - Yellow (#d29922): starting, stale, gate, waiting_gate
   - Blue (#78a2ff): queued
   - Red (#f07070): failed
   - Gray (#8b98aa): idle, stopped

3. **Pulse animation**: Running and starting dots have a CSS keyframe animation (`wb-pulse-dot`) for visual feedback.

4. **Progress bar**: Replaced the old hardcoded 90% width progress bar with a dynamic one that computes `(completedSteps + runningSteps * 0.5) / totalSteps` percentage.

5. **Time formatting**: Inline `fmtTime` and `fmtDuration` helpers for human-readable timestamps and durations.

6. **Conditional sections**: AgentRun and Task rows only appear when matching data exists, keeping the panel clean when no runs are active.

## Modified Files

| File | Action | Description |
|------|--------|-------------|
| `src/styles/base.css` | MODIFIED | Added 34+ new CSS rules for status panel: `.wb-status-row`, `.wb-status-pill`, `.wb-status-dot`, `.wb-status-progress`, `.wb-status-divider`, `.wb-status-error`, `.wb-status-actions`, pulse animation keyframes |
| `src/components/WorkbenchHome.tsx` | MODIFIED (in prior commit) | Replaced static "会话状态" section with dynamic status panel rendering Runner/AgentRun/Task state, timing, progress, and error display |
| `src/__tests__/components/WorkbenchHome.test.tsx` | NEW | 12 tests covering status panel rendering: header, process state, AgentRun status, timing labels, step progress, aggregated counts, action links, progress bar, status dots, empty state |

## Verification

- TypeScript typecheck: PASS (no new errors)
- Status panel tests: 12/12 PASS
- Full test suite: 503 passed, 9 failed (pre-existing failures in workflowExecutionUseCase and project-detail tests, unrelated to this change)
- No regressions introduced

## Issue #28 Alignment

This directly implements the "右侧面板" requirement from Issue #28:

> 显示真实运行态：
> - 当前 AgentRun 状态
> - Runner 进程状态
> - 当前 Task 状态
> - 运行开始时间
> - 最近日志时间

All five items are now implemented and displayed in the right sidebar status panel.
