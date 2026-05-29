# Agent Workbench MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable personal-local Web MVP for Agent Workbench from the V1 product flow.

**Architecture:** Use a Vite + React + TypeScript single-page app with typed fixtures and local UI state. V1 implements the product flow screens first, while real runner process control, team permissions, desktop integration, and RAG are represented by explicit fields and deferred states.

**Tech Stack:** Vite, React, TypeScript, lucide-react, Vitest, Testing Library, jsdom, Playwright or browser-use visual verification.

---

## Current Inputs

- Product flow spec: `docs/superpowers/specs/2026-05-15-v1-product-flow.md`
- Roadmap and architecture: `docs/PRODUCT_ROADMAP_AND_ARCHITECTURE.md`
- UI design spec: `docs/superpowers/specs/2026-05-15-agent-workbench-ui-design.md`
- V1 flow mockup: `mockups/v1-product-flow.html`
- High-fidelity workbench mockup: `mockups/agent-workbench-ui.html`
- Progress review page: `mockups/progress-review.html`

## File Structure

- Create: `package.json` for scripts and dependencies.
- Create: `index.html` for the Vite mount point.
- Create: `tsconfig.json` and `tsconfig.node.json` for TypeScript.
- Create: `vite.config.ts` for React and Vitest/jsdom.
- Create: `src/main.tsx` to mount React.
- Create: `src/App.tsx` for top-level routes and local state.
- Create: `src/domain/workbench.ts` for typed Project, Task, Workflow, Role, AgentRun, Gate, Memory, and Capability models.
- Create: `src/data/fixtures.ts` for V1 local data.
- Create: `src/components/AppShell.tsx` for sidebar, topbar, navigation, and layout.
- Create: `src/components/WorkbenchHome.tsx` for first-screen project/task/agent/gate overview.
- Create: `src/components/ProjectOnboarding.tsx` for project intake.
- Create: `src/components/NewTaskFlow.tsx` for task creation.
- Create: `src/components/WorkflowBuilder.tsx` for workflow templates and step editing.
- Create: `src/components/ManualGateDecision.tsx` for evidence-based gate decisions.
- Create: `src/components/MemoryManager.tsx` for project/role/task memory.
- Create: `src/components/SettingsCenter.tsx` for roles, launchers, providers, and capabilities.
- Create: `src/components/RunnerLogs.tsx` for log output.
- Create: `src/styles.css` for the dense dark workbench design system.
- Create: `src/__tests__/workbench-model.test.ts` for model and fixture coverage.
- Create: `src/__tests__/new-task-flow.test.tsx` for task creation behavior.
- Create: `src/__tests__/manual-gate.test.tsx` for gate decisions.
- Create: `src/__tests__/memory-manager.test.tsx` for memory edits.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [x] **Step 1: Create package scripts**

```json
{
  "name": "agent-workbench",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview --host 127.0.0.1"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.0",
    "typescript": "^5.8.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^26.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [x] **Step 2: Create the HTML mount**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Workbench</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [x] **Step 3: Create TypeScript config**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "vite.config.ts"]
}
```

- [x] **Step 4: Create Vite config**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

- [x] **Step 5: Create the React mount and placeholder app**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```tsx
export function App() {
  return (
    <main className="app-placeholder">
      <p className="eyebrow">Agent Workbench</p>
      <h1>Personal Local MVP</h1>
      <p>V1 flow: project onboarding, new task, workflow builder, manual gate, memory.</p>
    </main>
  );
}
```

- [x] **Step 6: Create baseline CSS**

```css
:root {
  color-scheme: dark;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
  background: #090c10;
  color: #e6edf7;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: #090c10;
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-placeholder {
  display: grid;
  min-height: 100vh;
  place-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
}

.app-placeholder h1,
.app-placeholder p {
  margin: 0;
}

.app-placeholder p {
  color: #91a0b5;
}

.eyebrow {
  color: #5b8cff;
  font-size: 13px;
  font-weight: 800;
}
```

- [x] **Step 7: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created.

- [x] **Step 8: Build once**

Run: `npm run build`

Expected: TypeScript and Vite complete successfully and create `dist/`.

---

### Task 2: Domain Model And Fixtures

**Files:**
- Create: `src/domain/workbench.ts`
- Create: `src/data/fixtures.ts`
- Create: `src/__tests__/workbench-model.test.ts`

- [x] **Step 1: Write fixture tests**

```ts
import { describe, expect, it } from "vitest";
import { activeGate, workbenchData } from "../data/fixtures";

describe("workbench fixtures", () => {
  it("covers the V1 flow pages", () => {
    expect(workbenchData.projects[0].repoPath).toContain("Agent Management");
    expect(workbenchData.tasks[0].workflowTemplateId).toBe("software-dev-v1");
    expect(workbenchData.workflowTemplates[0].steps.some((step) => step.gateMode === "manual")).toBe(true);
    expect(activeGate(workbenchData)?.status).toBe("waiting");
    expect(workbenchData.memories.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["project", "role", "task"]),
    );
  });

  it("keeps team and desktop as deferred model fields", () => {
    expect(workbenchData.projects[0]).toMatchObject({
      scope: "personal",
      desktopIntegrationStatus: "deferred",
    });
    expect(workbenchData.projects[0].permissions.permissionLevel).toBe("owner");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/workbench-model.test.ts`

Expected: FAIL because `src/data/fixtures.ts` does not exist yet.

- [x] **Step 3: Implement domain types**

Create `src/domain/workbench.ts` with exported types for `WorkbenchData`, `Project`, `ProjectSettings`, `Task`, `WorkflowTemplate`, `WorkflowStep`, `AgentRole`, `LauncherProfile`, `AgentRun`, `ManualGate`, `EngineeringFeedback`, `MemoryItem`, and `CapabilityPack`.

- [x] **Step 4: Implement fixtures**

Create `src/data/fixtures.ts` with one `workbenchData` object containing:

- one personal project named `Agent Management`;
- one task for V1 product flow;
- one workflow template named `软件开发完整流程`;
- roles for product, UI, frontend, review, and test;
- one waiting manual gate;
- engineering feedback with diff, tests, preview, logs, and memory suggestion;
- project, role, and task memories;
- capability packs for `ui-ux-pro-max`, browser, GitHub, and local shell.

- [x] **Step 5: Run model tests**

Run: `npm test -- src/__tests__/workbench-model.test.ts`

Expected: PASS.

---

### Task 3: App Shell And Navigation

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/AppShell.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Create shell views**

Define the route union:

```ts
export type WorkbenchView =
  | "workbench"
  | "projects"
  | "new-task"
  | "workflows"
  | "gates"
  | "memory"
  | "settings"
  | "logs";
```

- [x] **Step 2: Implement `AppShell`**

`AppShell` renders left navigation, sticky topbar, one primary action button, and a main content slot. Navigation uses buttons with text labels and `aria-current` on the active view.

- [x] **Step 3: Connect local view state**

`App.tsx` stores `view` in `useState<WorkbenchView>("workbench")` and renders placeholder panels for each route.

- [x] **Step 4: Build**

Run: `npm run build`

Expected: PASS.

---

### Task 4: V1 Product Flow Screens

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/WorkbenchHome.tsx`
- Create: `src/components/ProjectOnboarding.tsx`
- Create: `src/components/NewTaskFlow.tsx`
- Create: `src/components/WorkflowBuilder.tsx`
- Create: `src/components/ManualGateDecision.tsx`
- Create: `src/components/MemoryManager.tsx`
- Create: `src/components/RunnerLogs.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Implement `WorkbenchHome`**

Render metrics for active projects, running agents, waiting gates, and changed files. Show task list, current workflow steps, current agent run, and engineering feedback.

- [x] **Step 2: Implement `ProjectOnboarding`**

Render fields for repo path, default branch, worktree root, install/test/build/preview commands, detected stack, risk summary, and project memory draft.

- [x] **Step 3: Implement `NewTaskFlow`**

Render goal, acceptance criteria, workflow selection, role assignment, capability authorization, worktree creation, and launch strategy.

- [x] **Step 4: Implement `WorkflowBuilder`**

Render workflow templates, ordered steps, selected step details, role binding, input/output fields, gate mode, failure strategy, version, and project override indicator.

- [x] **Step 5: Implement `ManualGateDecision`**

Render gate summary, diff evidence, test evidence, preview evidence, log summary, permission usage, memory suggestion, and actions: continue, rerun, reassign, terminate, save memory.

- [x] **Step 6: Implement `MemoryManager`**

Render project, role, and task memory cards. Provide editable title/body/scope fields for the selected memory and display citation/source metadata.

- [x] **Step 7: Implement `RunnerLogs`**

Render logs in a scrollable monospaced panel.

- [x] **Step 8: Build**

Run: `npm run build`

Expected: PASS.

---

### Task 5: Interaction Tests

**Files:**
- Create: `src/__tests__/new-task-flow.test.tsx`
- Create: `src/__tests__/manual-gate.test.tsx`
- Create: `src/__tests__/memory-manager.test.tsx`

- [x] **Step 1: Test task creation flow visibility**

Test that `NewTaskFlow` renders the project, goal, workflow, role assignment, and launch button.

- [x] **Step 2: Test manual gate actions**

Test that clicking `确认继续` changes the local gate message to `已确认继续`.

- [x] **Step 3: Test memory editing**

Test that editing the selected memory title updates the input value.

- [x] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

---

### Task 6: Browser Verification

**Files:**
- Modify: `src/styles.css`

- [x] **Step 1: Start dev server**

Run: `npm run dev -- --port 5173`

Expected: Vite serves at `http://127.0.0.1:5173/`.

- [x] **Step 2: Desktop visual check**

Open `http://127.0.0.1:5173/`.

Expected:

- Sidebar and topbar are visible.
- Workbench route shows project/task/agent/gate state.
- Each V1 route is reachable.
- Manual Gate actions are visible.
- No text overlap at desktop width.

- [x] **Step 3: Mobile visual check**

Set viewport width to 390px.

Expected:

- No horizontal scrolling.
- Sidebar collapses or stacks.
- Buttons remain readable.
- Form fields stack to one column.

- [x] **Step 4: Final build**

Run: `npm run build`

Expected: PASS.

---

## Self-Review

- Spec coverage: This plan covers the five V1 flow pages, shell, fixtures, domain model, tests, and browser verification.
- Deferred scope: Real runner process control, team permissions, desktop integration, and RAG are explicitly out of V1 implementation.
- Placeholder scan: Checked for incomplete marker patterns and vague implementation-only instructions.
- Type consistency: The planned domain types match the V1 product flow spec objects.

