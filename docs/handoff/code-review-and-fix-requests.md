# Code Review And Fix Requests

Date: 2026-05-15 (Updated 22:03)

Project: Agent Management

Purpose: This document records the latest review findings and concrete fix requests for the next implementation tool. Codex is currently responsible for product design, prototype review, and acceptance review. Implementation work is expected to be handled by another tool.

## Review Summary

The following P0/P1 items have been completed:

1. ✅ Chinese text corruption fixed - all UI text and tests now use correct Chinese.
2. ✅ Model configuration CRUD implemented - add/edit/delete/enable/disable/set-default all working.
3. ✅ Capability center split implemented - MCP/Skills/Plugins/Agents all have separate sections.
4. ✅ Manual Gate behavior completed - Continue/Rerun/Reassign/Terminate all have real workflow behavior.
5. ✅ Agent binding completed - New Task review shows full Step→Role→Agent→Model→MCP→Skills matrix.

Remaining items:

- P2: Frontend engineering standards (ESLint/Prettier/state layer) still pending.
- P2: Flow page header spacing consistency still pending.
- P1: Developer tool/runner provider model not yet implemented.

## Findings

### P0: Chinese UI Text Is Still Corrupted ✅ FIXED

All Chinese text in UI and tests is now correct. No mojibake detected.

Affected files:

- `src/components/Settings.tsx`
- `src/components/NewTaskFlow.tsx`
- `src/data/fixtures.ts`
- `src/__tests__/integration.test.tsx`

Observed problem:

- Many Chinese strings are mojibake, for example labels in settings tabs, form fields, role names, fixture descriptions, and test assertions.
- Some tests currently assert corrupted strings, so passing tests do not prove that localization is correct.

Required fix:

- Restore all user-facing Chinese text to valid Simplified Chinese.
- Update tests so they assert correct Chinese labels.
- Add a regression check that fails if common mojibake fragments appear in `src/**/*.{ts,tsx}`.

Acceptance criteria:

- Sidebar, dashboard, new-task flow, settings center, manual gate, memory manager, and fixtures all display readable Chinese.
- No visible mojibake appears in the browser.
- Test assertions use correct Chinese, not corrupted text.

### P1: Frontend Engineering Standards Are Not Complete

Affected files and areas:

- `package.json`
- `src/App.tsx`
- `src/domain/workbench.ts`
- `src/styles.css`
- `src/__tests__`

Observed problem:

- The app is a workable Vite + React + TypeScript MVP, but it is not yet structured as a maintainable engineering product.
- There is no visible ESLint / Prettier setup.
- There are no explicit `lint`, `format`, or `typecheck` scripts.
- `src/App.tsx` owns too much state mutation logic.
- Domain types are centralized, but product model boundaries are not yet mature.
- CSS is concentrated in one global stylesheet.
- Tests pass but do not yet prove real product acceptance.

Required fix:

- Add engineering scripts:
  - `npm run lint`
  - `npm run format`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
- Add ESLint and Prettier configuration.
- Move workbench state out of `src/App.tsx` into a dedicated state layer:
  - `src/state/WorkbenchProvider.tsx`
  - `src/state/workbenchActions.ts`
  - `src/state/workbenchReducer.ts`
  - `src/state/selectors.ts`
- Keep Phase 1 frontend-only and local-state based, but make mutations isolated and testable.
- Refine the domain model around stable product concepts:
  - Project
  - Workflow
  - Role
  - Agent
  - Model Provider
  - Model
  - MCP Server
  - Skill
  - Plugin
  - Capability Authorization
  - Manual Gate Decision
- Split CSS into maintainable layers where practical:
  - `src/styles/tokens.css`
  - `src/styles/layout.css`
  - `src/styles/components.css`
  - `src/styles/pages.css`
- Separate fixture/demo data from test data when practical.

Acceptance criteria:

- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
- `src/App.tsx` mostly composes providers and routes.
- State mutation logic can be tested without rendering the entire app.
- Domain model includes first-class Agent and capability-center concepts.
- Formatting and linting are reproducible by command.

### P2: Flow Page Header Spacing Is Inconsistent

Affected files:

- `src/components/ProjectOnboarding.tsx`
- `src/components/NewTaskFlow.tsx`
- `src/styles.css`

Observed problem:

- The `项目接入` page and `新建任务` page have visibly different spacing around the page title, subtitle, stepper, and first content card.
- The `新建任务` header appears lower than the `项目接入` header.
- The stepper width, top alignment, and vertical rhythm are inconsistent.

Required fix:

- Introduce or reuse shared flow-page layout classes:
  - `.flow-page`
  - `.flow-page-header`
  - `.flow-title-row`
  - `.flow-stepper`
  - `.flow-content`
- Standardize flow-page spacing:
  - page top padding from topbar boundary
  - title-to-subtitle spacing
  - subtitle-to-stepper spacing
  - stepper-to-card spacing
  - stepper width and start alignment
- Suggested spacing:
  - title to subtitle: 4px-6px
  - subtitle to stepper: about 16px
  - stepper to main card: about 24px
- Apply the same visual rhythm to other process pages where relevant.

Acceptance criteria:

- Switching between `项目接入` and `新建任务` does not create a noticeable header jump.
- Title, subtitle, stepper, and first card align consistently on a 1920px desktop viewport.
- Flow pages do not define competing one-off margins for the same layout role.

### P1: Capability Center Split Is Not Implemented ✅ FIXED

Domain models added: `McpServerCapability`, `SkillCapability`, `PluginCapability`, `AgentCapability`.
`WorkbenchData` now includes `mcpServers`, `skills`, `plugins`, `agents` arrays.
Settings page shows separate MCP / Skills / Plugins / Agents tabs with stats, list, and detail panel.
Fixtures include 4 MCP servers, 7 skills, 3 plugins, 6 agents.

### P1: Developer Tool / Runner Provider Selection Is Missing

Affected files:

- `src/domain/workbench.ts`
- `src/components/Settings.tsx`
- `src/components/NewTaskFlow.tsx`
- `src/data/fixtures.ts`

Observed problem:

- The product needs to represent whether a step is executed by Claude Code CLI, Codex CLI, Gemini CLI, Cursor Agent, or a custom command runner.
- This is not the same as model provider selection.
- A model provider decides which model is used.
- A runner provider decides which developer tool or CLI executes the work.
- The current implementation has no first-class runner/developer-tool model.

Required fix:

- Add a `RunnerProvider` or `DeveloperToolProvider` domain model.
- Suggested fields:
  - `id`
  - `name`
  - `kind`: `claude-code-cli` | `codex-cli` | `gemini-cli` | `cursor-agent` | `custom`
  - `executablePath`
  - `defaultArgs`
  - `env`
  - `supportsWorktree`
  - `supportsPlanMode`
  - `supportsReviewMode`
  - `supportsMcp`
  - `supportsSkills`
  - `supportsPlugins`
  - `enabled`
- Add fixture examples:
  - Claude Code CLI
  - Codex CLI
  - Custom command runner
- Add a Settings section named `开发工具` or `执行器配置`.
- Allow add, edit, delete, enable, and disable runner providers.
- Bind Agent profiles to runner providers.
- Show runner provider in the New Task review matrix.

Target relationship:

Project -> Workflow -> Step -> Role -> Agent -> Runner Provider -> Model Provider / Model -> MCP / Skill / Plugin authorization

Acceptance criteria:

- Users can tell whether a workflow step will run through Claude Code CLI, Codex CLI, or another configured tool.
- Runner provider and model provider are separate concepts in the domain model and UI.
- New Task review shows Agent, runner provider, model, and capability authorization for each step.

### P1: Manual Gate Rerun And Reassign Are Not Real Behaviors ✅ FIXED

All four actions now have real workflow behavior:
- Continue: gate resolved, task proceeds
- Rerun: creates new run attempt, resets gate to waiting
- Reassign: modal to select new role, creates new run with updated assignment
- Terminate: stops task and marks failed

`App.tsx` has `reassignAgentRun` method. Tests cover all four actions (8 tests in manual-gate.test.tsx).

Affected files:

- `src/App.tsx`
- `src/components/ManualGateDecision.tsx`
- `src/__tests__/manual-gate.test.tsx`
- `src/__tests__/integration.test.tsx`

Observed problem:

- UI exposes continue, rerun, reassign, and terminate actions.
- Current state logic mostly only marks the gate status.
- Rerun and reassign do not update task state, agent run state, workflow step, assignee, or logs.

Required fix:

- Define behavior for each decision:
  - Continue: gate resolved, task proceeds to next step.
  - Rerun: create or mark a new run attempt for the current step.
  - Reassign: allow selecting another role or agent, then update current run assignment.
  - Terminate: stop current task and mark it as terminated or blocked.
- Add state updates and visible feedback for each action.
- Add tests for all four actions.

Acceptance criteria:

- Each Manual Gate action changes visible state in a way users can understand.
- Rerun and reassign are no longer only visual button clicks.
- Tests cover all four gate decisions.

### P1: Model Configuration Is Read-Only ✅ FIXED

All CRUD operations implemented:
- Add/edit/delete provider
- Enable/disable provider
- Add/delete model under provider
- Set default model

App state methods added: `addModelProvider`, `updateModelProvider`, `deleteModelProvider`, `addProviderModel`, `deleteProviderModel`, `setDefaultProviderModel`.
Tests added in `model-config.test.tsx` (5 tests).

### P1: Multi-Model / Role / Agent Binding Is Incomplete ✅ FIXED

Agent is now a first-class entity with role, model, MCP, skill, plugin bindings.
New Task review shows complete matrix: Step → Role → Agent → Model → MCP → Skills.

Affected files:

- `src/components/Settings.tsx`
- `src/App.tsx`
- `src/domain/workbench.ts`
- `src/data/fixtures.ts`

Observed problem:

- The model configuration tab displays `data.modelProviders`.
- There are no add, delete, edit, enable/disable, set-default, add-model, or delete-model controls.
- App state has no methods such as `addModelProvider`, `updateModelProvider`, or `deleteModelProvider`.

Required fix:

- Complete the model configuration tab with:
  - Add provider
  - Edit provider name
  - Edit provider type or source
  - Edit Base URL when relevant
  - API Key status display
  - Enable / disable provider
  - Delete provider
  - Add model under provider
  - Delete model under provider
  - Set default model
- Add app-state methods:
  - `addModelProvider`
  - `updateModelProvider`
  - `deleteModelProvider`
  - `addProviderModel`
  - `deleteProviderModel`
  - `setDefaultProviderModel`
- Add tests for adding, deleting, editing, and setting defaults.

Acceptance criteria:

- Users can create and modify model provider data inside the Web MVP.
- Users can manage model lists per provider.
- Role binding can read the updated provider and model list.

### P1: Multi-Model / Role / Agent Binding Is Incomplete

Affected files:

- `src/domain/workbench.ts`
- `src/components/NewTaskFlow.tsx`
- `src/components/Settings.tsx`
- `src/data/fixtures.ts`

Observed problem:

- Current model is close to role-to-launcher binding.
- There is no first-class `Agent` entity.
- There is no full chain: project -> workflow -> role -> agent -> runner provider -> model -> MCP/Skill/Plugin authorization.
- New tasks are created with empty `capabilityAuthorization`.

Required fix:

- Introduce a first-class Agent concept for the MVP.
- Clarify these relationships:
  - Project selects workflow template.
  - Workflow steps select roles.
  - Roles bind to agent profiles.
  - Agent profiles bind to runner provider, model provider, and model.
  - Agent profiles declare allowed MCP / Skills / Plugins.
- Surface this relationship in Settings and New Task flow.

Acceptance criteria:

- In the new task flow, users can see which workflow, role, agent, model, and capabilities will be used.
- In settings, users can configure role-to-agent and agent-to-model relationships.
- Capability authorization is no longer always empty for created tasks.

### P2: Tests Are Green But Do Not Prove Product Acceptance

Affected files:

- `src/__tests__/integration.test.tsx`
- `src/__tests__/manual-gate.test.tsx`
- Other relevant component tests

Observed problem:

- Tests pass, but some assertions validate corrupted text.
- Manual Gate tests do not fully cover the four required decisions.
- Capability center split has no meaningful test coverage yet.

Required fix:

- Rewrite localization assertions to expect correct Chinese.
- Add tests for model provider CRUD.
- Add tests for capability center sections.
- Add tests for role-agent-model-capability binding.
- Add tests for all Manual Gate actions.

Acceptance criteria:

- Tests fail if corrupted Chinese text returns.
- Tests fail if MCP / Skills / Plugins / Agents sections disappear.
- Tests fail if model configuration becomes read-only again.

## Next Implementation Order

Recommended order for the next tool:

1. Fix encoding and all Chinese display text first.
2. Establish frontend engineering standards: lint, format, typecheck, state layer, domain model boundaries, and style layering.
3. Repair or rewrite tests that currently assert corrupted text.
4. Implement model configuration CRUD.
5. Implement capability center split: MCP / Skills / Plugins / Agents.
6. Add Developer Tool / Runner Provider model for Claude Code CLI, Codex CLI, and custom runners.
7. Add first-class Agent model and role-agent-runner-model-capability binding.
8. Complete Manual Gate rerun and reassign behavior.
9. Run full test and build verification.
10. Review in browser at the active local preview URL.

## Commands To Run After Fixes

```powershell
npm --cache .npm-cache test
npm --cache .npm-cache run build
```

Engineering verification should also include:

```powershell
npm run typecheck
npm run lint
```

If a local preview is needed:

```powershell
npm run dev -- --port 55179
```

Then verify:

- `http://localhost:55179/`
- `http://localhost:55179/#new-task`
- `http://localhost:55179/#settings`

## Notes For Implementer

- Keep Phase 1 as frontend-only Web MVP.
- Do not introduce backend services, database, real runner process control, team permissions, or desktop packaging in this phase.
- Use fixture data and local React state.
- Preserve the product name: `Agent Management`.
- Prioritize clear Chinese enterprise-product UI over decorative visual design.
