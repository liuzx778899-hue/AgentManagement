# Workflow Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current list-based WorkflowBuilder with a vertical canvas visualization — node cards connected by arrows with failure/retry branching.

**Architecture:** Three new components (WorkflowCanvas, WorkflowNode, WorkflowEdge) compose into a rewritten WorkflowBuilder. Pure CSS + DOM — no canvas API, no third-party visualization libraries. Nodes are vertical flex items connected by CSS-styled lines with arrowheads and inline SVG curves for retry/fallback branches.

**Tech Stack:** React + TypeScript + CSS (project tokens), lucide-react icons, Vitest + Testing Library

---

## File Map

| File | Role |
|------|------|
| `src/components/WorkflowNode.tsx` | **NEW** — Step card: header with order/name/role/model/Gate, IO row, footer, inline edit form |
| `src/components/WorkflowEdge.tsx` | **NEW** — Vertical arrow line + retry/fallback SVG arc + output label |
| `src/components/WorkflowCanvas.tsx` | **NEW** — Iterates steps, interleaves nodes and edges, "add step" at bottom |
| `src/components/WorkflowBuilder.tsx` | **MODIFY** — Rewire: keep template selector header, replace wf-list/wf-editor with `<WorkflowCanvas>` |
| `src/styles.css` | **MODIFY** — Add workflow-canvas, workflow-node, workflow-edge CSS blocks |
| `src/__tests__/workflow-canvas.test.tsx` | **NEW** — Tests for canvas rendering, node edit, edge display |

---

### Task 1: WorkflowNode component (card + inline edit)

**Files:**
- Create: `src/components/WorkflowNode.tsx`

- [ ] **Step 1: Create WorkflowNode component**

```typescript
import { useState } from "react";
import { Check, ChevronDown, Pencil, ShieldAlert, X } from "lucide-react";
import type { WorkflowStep, AgentRole, ModelProvider, WorkbenchData } from "../domain/workbench";

interface WorkflowNodeProps {
  step: WorkflowStep;
  index: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave: (updates: Partial<WorkflowStep>) => void;
  data: WorkbenchData;
}

export function WorkflowNode({ step, index, isEditing, onToggleEdit, onSave, data }: WorkflowNodeProps) {
  const role = data.roles.find((r) => r.id === step.roleId);
  const provider = data.modelProviders.find((p) => p.id === step.modelProviderId);
  const [edits, setEdits] = useState<Partial<WorkflowStep>>({});

  const handleStartEdit = () => {
    setEdits({
      name: step.name,
      roleId: step.roleId,
      modelProviderId: step.modelProviderId,
      modelName: step.modelName,
      gateMode: step.gateMode,
      failureStrategy: step.failureStrategy,
      inputs: [...step.inputs],
      outputs: [...step.outputs],
    });
    onToggleEdit();
  };

  const handleSave = () => {
    onSave(edits);
    onToggleEdit();
  };

  const gateLabel = step.gateMode === "manual" ? "人工决策" : "自动继续";
  const failureLabel =
    step.failureStrategy === "stop" ? "停止" :
    step.failureStrategy === "retry" ? "重试" :
    step.failureStrategy === "skip" ? "跳过" : "回退";

  return (
    <div className={`workflow-node${isEditing ? " editing" : ""}`}>
      <button type="button" className="workflow-node-header" onClick={handleStartEdit}>
        <div className="workflow-node-order">
          <span className="workflow-node-order-num">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className="workflow-node-meta">
          <strong className="workflow-node-name">{step.name}</strong>
          <div className="workflow-node-tags">
            {role && <span className="badge violet">{role.name}</span>}
            {provider && <span className="badge blue">{provider.name} / {step.modelName}</span>}
            <span className={`badge ${step.gateMode === "manual" ? "orange" : "green"}`}>
              <ShieldAlert size={10} />
              {gateLabel}
            </span>
          </div>
        </div>
        <span className="workflow-node-edit-hint">
          <Pencil size={12} />
        </span>
      </button>

      <div className="workflow-node-io">
        <div className="workflow-node-io-row">
          <span className="workflow-node-io-label">输入</span>
          <span className="workflow-node-io-value">{step.inputs.join(", ") || "—"}</span>
        </div>
        <div className="workflow-node-io-row">
          <span className="workflow-node-io-label">输出</span>
          <span className="workflow-node-io-value">{step.outputs.join(", ") || "—"}</span>
        </div>
      </div>

      <div className="workflow-node-footer">
        <span className="workflow-node-failure">
          失败：{failureLabel}
        </span>
      </div>

      {isEditing && (
        <div className="workflow-node-edit">
          <div className="workflow-node-edit-grid">
            <div className="form-field">
              <label>步骤名称</label>
              <input
                value={edits.name ?? ""}
                onChange={(e) => setEdits({ ...edits, name: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>执行角色</label>
              <select
                value={edits.roleId ?? ""}
                onChange={(e) => {
                  const newRoleId = e.target.value;
                  const newRole = data.roles.find((r) => r.id === newRoleId);
                  setEdits({
                    ...edits,
                    roleId: newRoleId,
                  });
                }}
              >
                {data.roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>模型供应商</label>
              <select
                value={edits.modelProviderId ?? ""}
                onChange={(e) => setEdits({ ...edits, modelProviderId: e.target.value })}
              >
                {data.modelProviders.filter((p) => p.enabled).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>模型名称</label>
              <select
                value={edits.modelName ?? ""}
                onChange={(e) => setEdits({ ...edits, modelName: e.target.value })}
              >
                {(data.modelProviders.find((p) => p.id === (edits.modelProviderId ?? step.modelProviderId))?.models ?? []).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Gate 模式</label>
              <select
                value={edits.gateMode ?? "auto"}
                onChange={(e) => setEdits({ ...edits, gateMode: e.target.value as "auto" | "manual" })}
              >
                <option value="auto">自动继续</option>
                <option value="manual">人工决策</option>
              </select>
            </div>
            <div className="form-field">
              <label>失败策略</label>
              <select
                value={edits.failureStrategy ?? "stop"}
                onChange={(e) => setEdits({ ...edits, failureStrategy: e.target.value as WorkflowStep["failureStrategy"] })}
              >
                <option value="stop">停止</option>
                <option value="retry">重试</option>
                <option value="skip">跳过</option>
                <option value="fallback">回退</option>
              </select>
            </div>
          </div>
          <div className="workflow-node-edit-io">
            <div className="form-field">
              <label>输入（逗号分隔）</label>
              <input
                value={(edits.inputs ?? []).join(", ")}
                onChange={(e) => setEdits({ ...edits, inputs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            </div>
            <div className="form-field">
              <label>输出（逗号分隔）</label>
              <input
                value={(edits.outputs ?? []).join(", ")}
                onChange={(e) => setEdits({ ...edits, outputs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            </div>
          </div>
          <div className="workflow-node-edit-actions">
            <button className="btn primary btn-sm" onClick={handleSave}>
              <Check size={14} /> 保存
            </button>
            <button className="btn ghost btn-sm" onClick={onToggleEdit}>
              <X size={14} /> 取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build to verify no import errors**

```powershell
npm --cache .npm-cache run build
```

Expected: may warn about unused import (WorkflowNode not referenced yet), but no TypeScript errors in WorkflowNode.tsx itself.


### Task 2: WorkflowEdge component (vertical arrow + retry/fallback branch)

**Files:**
- Create: `src/components/WorkflowEdge.tsx`

- [ ] **Step 1: Create WorkflowEdge component**

```typescript
import { ArrowDown, RefreshCcw, Undo2 } from "lucide-react";
import type { WorkflowStep } from "../domain/workbench";

interface WorkflowEdgeProps {
  step: WorkflowStep;
  isLast: boolean;
}

export function WorkflowEdge({ step, isLast }: WorkflowEdgeProps) {
  const showRetry = step.failureStrategy === "retry";
  const showFallback = step.failureStrategy === "fallback";

  return (
    <div className="workflow-edge-wrapper">
      {/* Output label */}
      <div className="workflow-edge-output">
        <span className="workflow-edge-output-label">输出 →</span>
        <span className="workflow-edge-output-value">{step.outputs.join(", ") || "—"}</span>
      </div>

      {/* Main downward line with arrow */}
      <div className="workflow-edge-line">
        <div className="workflow-edge-arrow" />
      </div>

      {/* Failure branch */}
      {(showRetry || showFallback) && (
        <div className="workflow-edge-branch">
          <svg width="80" height="36" viewBox="0 0 80 36">
            <path
              d={showRetry
                ? "M 40 0 C 60 -8, 75 8, 72 24"
                : "M 40 0 C 60 4, 70 16, 50 20"}
              stroke="var(--warn)"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="4 2"
            />
          </svg>
          <span className="workflow-edge-branch-label">
            {showRetry ? (
              <><RefreshCcw size={10} /> 重试</>
            ) : (
              <><Undo2 size={10} /> 回退</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

```powershell
npm --cache .npm-cache run build
```


### Task 3: WorkflowCanvas component (node + edge composition)

**Files:**
- Create: `src/components/WorkflowCanvas.tsx`

- [ ] **Step 1: Create WorkflowCanvas component**

```typescript
import { useState } from "react";
import { Plus } from "lucide-react";
import type { WorkflowTemplate, WorkflowStep, WorkbenchData } from "../domain/workbench";
import { useWorkbenchState } from "../App";
import { WorkflowNode } from "./WorkflowNode";
import { WorkflowEdge } from "./WorkflowEdge";

interface WorkflowCanvasProps {
  template: WorkflowTemplate;
  data: WorkbenchData;
}

export function WorkflowCanvas({ template, data }: WorkflowCanvasProps) {
  const { updateWorkflowStep } = useWorkbenchState();
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  const sortedSteps = [...template.steps].sort((a, b) => a.order - b.order);

  return (
    <div className="workflow-canvas">
      <div className="workflow-canvas-inner">
        {sortedSteps.length === 0 ? (
          <div className="empty-state">此工作流模板没有步骤，点击下方按钮添加。</div>
        ) : (
          sortedSteps.map((step, i) => (
            <div className="workflow-step-group" key={step.id}>
              <WorkflowNode
                step={step}
                index={i}
                isEditing={editingStepId === step.id}
                onToggleEdit={() =>
                  setEditingStepId(editingStepId === step.id ? null : step.id)
                }
                onSave={(updates) =>
                  updateWorkflowStep(template.id, step.id, updates)
                }
                data={data}
              />
              {i < sortedSteps.length - 1 && (
                <WorkflowEdge step={step} isLast={i === sortedSteps.length - 1} />
              )}
            </div>
          ))
        )}

        <button
          className="workflow-canvas-add"
          onClick={() => {
            const newStep: WorkflowStep = {
              id: `step-${Date.now()}`,
              order: sortedSteps.length + 1,
              name: "新步骤",
              roleId: data.roles[0]?.id ?? "",
              modelProviderId: data.modelProviders.find((p) => p.enabled)?.id ?? "",
              modelName: data.modelProviders.find((p) => p.enabled)?.models[0] ?? "",
              inputs: [],
              outputs: [],
              gateMode: "auto",
              failureStrategy: "stop",
              projectOverride: false,
            };
            updateWorkflowStep(template.id, newStep.id, newStep);
          }}
        >
          <Plus size={16} />
          添加步骤
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

```powershell
npm --cache .npm-cache run build
```


### Task 4: Rewrite WorkflowBuilder with canvas

**Files:**
- Modify: `src/components/WorkflowBuilder.tsx`

- [ ] **Step 1: Replace WorkflowBuilder body with canvas**

Current file keeps the header (template selector + actions) and the `useMemo`/`useState` for selected template. Replace the content area (`.wf-content` div with `.wf-list` + `.wf-editor`) with `<WorkflowCanvas>`.

The entire file becomes:

```typescript
import { useMemo, useState } from "react";
import { Copy, GitBranch, Plus } from "lucide-react";
import type { WorkbenchData } from "../domain/workbench";
import { IconBadge } from "./IconBadge";
import { WorkflowCanvas } from "./WorkflowCanvas";

interface WorkflowBuilderProps {
  data: WorkbenchData;
}

export function WorkflowBuilder({ data }: WorkflowBuilderProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    data.workflowTemplates[0]?.id ?? null
  );

  const selectedTemplate = useMemo(
    () => data.workflowTemplates.find((t) => t.id === selectedTemplateId) ?? null,
    [data, selectedTemplateId]
  );

  return (
    <div className="workflow-builder">
      <header className="wf-header">
        <div className="wf-title">
          <IconBadge icon={GitBranch} label="工作流" />
          <div>
            <h1>工作流库</h1>
            <span>可视化编排任务流程，绑定角色、模型和决策策略。</span>
          </div>
        </div>
        <div className="wf-header-actions">
          <select
            className="wf-template-select"
            value={selectedTemplateId ?? ""}
            onChange={(e) => setSelectedTemplateId(e.target.value || null)}
          >
            {data.workflowTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} v{t.version}
              </option>
            ))}
          </select>
          <button className="btn ghost" title="复制模板">
            <Copy size={15} /> 复制
          </button>
          <button className="btn primary">
            <Plus size={15} /> 新建模板
          </button>
        </div>
      </header>

      <div className="wf-canvas-area">
        {selectedTemplate ? (
          <WorkflowCanvas template={selectedTemplate} data={data} />
        ) : (
          <div className="empty-state">请选择或新建一个工作流模板</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

```powershell
npm --cache .npm-cache run build
```

Expected: PASS. No TypeScript errors.


### Task 5: Add CSS for canvas, nodes, and edges

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add canvas CSS**

Find the existing `/* Workflow Builder */` section and replace/augment with:

```css
/* ==============================
   Workflow Builder — Canvas
   ============================== */

.wf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line-soft);
  margin-bottom: 20px;
}

.wf-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.wf-title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.wf-title span {
  display: block;
  color: var(--muted);
  font-size: 13px;
  margin-top: 2px;
}

.wf-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wf-template-select {
  min-height: 38px;
  padding: 5px 12px;
  font-size: 13.5px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 7px;
  font-weight: 500;
  min-width: 220px;
}

.wf-canvas-area {
  flex: 1;
  overflow-y: auto;
}

/* Canvas */

.workflow-canvas {
  display: flex;
  justify-content: center;
  padding: 40px 20px 80px;
  min-height: 400px;
}

.workflow-canvas-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 480px;
  max-width: 100%;
}

.workflow-step-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.workflow-canvas-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  padding: 12px 24px;
  border: 2px dashed var(--line);
  border-radius: 10px;
  background: none;
  color: var(--muted);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 120ms, color 120ms, background 120ms;
  width: 100%;
  min-height: 48px;
}

.workflow-canvas-add:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(79, 140, 255, 0.05);
}

/* Node Card */

.workflow-node {
  width: 100%;
  border: 1px solid var(--line-soft);
  border-radius: 10px;
  background: var(--surface);
  overflow: hidden;
  transition: border-color 120ms, box-shadow 120ms;
}

.workflow-node:hover {
  border-color: var(--line);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.18);
}

.workflow-node.editing {
  border-color: rgba(79, 140, 255, 0.35);
  box-shadow: 0 0 0 1px rgba(79, 140, 255, 0.15);
}

.workflow-node-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  min-height: unset;
  transition: background 100ms;
}

.workflow-node-header:hover {
  background: rgba(32, 36, 43, 0.3);
}

.workflow-node-order {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(79, 140, 255, 0.10);
  border: 1px solid rgba(79, 140, 255, 0.2);
  flex-shrink: 0;
}

.workflow-node-order-num {
  font-size: 16px;
  font-weight: 800;
  color: var(--primary);
  font-family: var(--mono);
}

.workflow-node-meta {
  flex: 1;
  min-width: 0;
}

.workflow-node-name {
  display: block;
  font-size: 15px;
  font-weight: 650;
  margin-bottom: 6px;
}

.workflow-node-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.workflow-node-edit-hint {
  color: var(--faint);
  opacity: 0;
  transition: opacity 100ms;
}

.workflow-node:hover .workflow-node-edit-hint {
  opacity: 1;
}

/* Node IO */

.workflow-node-io {
  padding: 12px 18px 12px 72px;
  display: grid;
  gap: 6px;
  border-top: 1px solid var(--line-soft);
  background: rgba(17, 20, 25, 0.3);
}

.workflow-node-io-row {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.workflow-node-io-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 32px;
  flex-shrink: 0;
}

.workflow-node-io-value {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
}

/* Node Footer */

.workflow-node-footer {
  padding: 8px 18px 8px 72px;
  border-top: 1px solid var(--line-soft);
  background: rgba(17, 20, 25, 0.2);
}

.workflow-node-failure {
  font-size: 11.5px;
  color: var(--faint);
  font-weight: 500;
}

/* Node Edit Form */

.workflow-node-edit {
  padding: 18px;
  border-top: 1px solid var(--line);
  background: rgba(17, 20, 25, 0.4);
  display: grid;
  gap: 14px;
}

.workflow-node-edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.workflow-node-edit-io {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.workflow-node-edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--line-soft);
}

/* Edge / Connection Line */

.workflow-edge-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
}

.workflow-edge-output {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0 4px;
}

.workflow-edge-output-label {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.workflow-edge-output-value {
  font-size: 12px;
  color: var(--muted);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-edge-line {
  width: 2px;
  height: 28px;
  background: var(--line);
  position: relative;
}

.workflow-edge-arrow {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid var(--line);
}

/* Failure branch */

.workflow-edge-branch {
  position: absolute;
  right: -80px;
  top: 30px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.workflow-edge-branch-label {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--warn);
  font-weight: 600;
  white-space: nowrap;
}

/* Responsive */

@media (max-width: 1024px) {
  .workflow-canvas-inner {
    width: 100%;
  }

  .workflow-edge-branch {
    display: none;
  }

  .workflow-node-edit-grid,
  .workflow-node-edit-io {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .wf-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .wf-header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .wf-template-select {
    flex: 1;
  }

  .workflow-node-header {
    padding: 12px 14px;
    gap: 10px;
  }

  .workflow-node-io,
  .workflow-node-footer {
    padding-left: 56px;
  }
}
```

- [ ] **Step 2: Build to verify**

```powershell
npm --cache .npm-cache run build
```

Expected: PASS. CSS compiles with Vite.


### Task 6: Add workflow canvas test

**Files:**
- Create: `src/__tests__/workflow-canvas.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { WorkflowBuilder } from "../components/WorkflowBuilder";
import { workbenchData } from "../data/fixtures";

describe("Workflow Canvas", () => {
  it("renders template selector with template name", () => {
    render(<WorkflowBuilder data={workbenchData} />);
    expect(screen.getByText("工作流库")).toBeInTheDocument();
    expect(screen.getByText("软件开发完整流程 v1")).toBeInTheDocument();
  });

  it("renders all step nodes on the canvas", () => {
    render(<WorkflowBuilder data={workbenchData} />);
    expect(screen.getByText("需求分析")).toBeInTheDocument();
    expect(screen.getByText("UI/UX 设计")).toBeInTheDocument();
    expect(screen.getByText("前端开发")).toBeInTheDocument();
    expect(screen.getByText("代码审查")).toBeInTheDocument();
    expect(screen.getByText("测试验证")).toBeInTheDocument();
  });

  it("shows step order numbers", () => {
    render(<WorkflowBuilder data={workbenchData} />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText("05")).toBeInTheDocument();
  });

  it("shows role and gate badges on nodes", () => {
    render(<WorkflowBuilder data={workbenchData} />);
    // The retry step has auto gate mode → "自动继续"
    expect(screen.getByText("自动继续")).toBeInTheDocument();
    // Manual gate steps show "人工决策"
    const manualBadges = screen.getAllByText("人工决策");
    expect(manualBadges.length).toBeGreaterThanOrEqual(2);
  });

  it("shows output labels on edges", () => {
    render(<WorkflowBuilder data={workbenchData} />);
    expect(screen.getByText("需求规格摘要")).toBeInTheDocument();
    expect(screen.getByText("设计稿, 设计规格")).toBeInTheDocument();
    expect(screen.getByText("审查意见")).toBeInTheDocument();
  });

  it("has add step button", () => {
    render(<WorkflowBuilder data={workbenchData} />);
    expect(screen.getByRole("button", { name: /添加步骤/ })).toBeInTheDocument();
  });

  it("clicking step header toggles inline edit form", () => {
    render(<WorkflowBuilder data={workbenchData} />);
    // Before click: no "取消" button
    expect(screen.queryByRole("button", { name: /取消/ })).not.toBeInTheDocument();
    // Click first step header
    const stepHeaders = document.querySelectorAll(".workflow-node-header");
    fireEvent.click(stepHeaders[0]);
    // After click: edit form appears with 取消 button
    expect(screen.getByRole("button", { name: /取消/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /保存/ })).toBeInTheDocument();
  });

  it("shows empty state when no template selected", () => {
    const emptyData = { ...workbenchData, workflowTemplates: [] };
    render(<WorkflowBuilder data={emptyData} />);
    expect(screen.getByText(/请选择或新建一个工作流模板/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm --cache .npm-cache test -- workflow-canvas
```

Expected: tests run against the new canvas layout. They should pass since we already built the components.

- [ ] **Step 3: Run full test suite**

```powershell
npm --cache .npm-cache test
```

Expected: all tests pass (existing 41 + new 8 = 49 tests, 7 files).

- [ ] **Step 4: Final build verification**

```powershell
npm --cache .npm-cache run build
```

Expected: PASS.
