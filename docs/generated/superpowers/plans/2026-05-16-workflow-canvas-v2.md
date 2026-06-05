# Workflow Canvas V2 Implementation Plan (更新版)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Transform WorkflowBuilder into a two-panel layout: left sidebar (workflow template list + project role pool), right canvas (compact step cards with insert buttons, double-click edit modal, exit ports, drag handle).

**Architecture:** WorkflowBuilder becomes the layout orchestrator with Topbar + two child columns. WorkflowNode is simplified to a compact card (header only) with drag handle + exit ports. A new StepEditModal handles detailed editing via double-click. Insert buttons appear between step groups. Green success edges with output labels.

**Tech Stack:** React + TypeScript + CSS (project tokens), lucide-react icons, Vitest + Testing Library

**Design reference:** `mockups/workflow-canvas-design.html`

---

## File Map

| File | Role |
|------|------|
| `src/components/WorkflowBuilder.tsx` | **REWRITE** — Topbar + Sidebar + Canvas layout |
| `src/components/WorkflowNode.tsx` | **REWRITE** — Compact card: drag handle + order + name + badges + exit ports |
| `src/components/StepEditModal.tsx` | **NEW** — Modal dialog with icon header + routing config + delete |
| `src/components/WorkflowCanvas.tsx` | **MODIFY** — Canvas with insert buttons + green success edges |
| `src/styles/pages.css` | **MODIFY** — Full workflow CSS matching mockup |
| `src/__tests__/workflow-canvas.test.tsx` | **MODIFY** — Updated selectors |

---

## Completed Tasks

- [x] **Task 1: Create StepEditModal component** — Modal with Edit icon + routing section with ChevronRight icon
- [x] **Task 2: Rewrite WorkflowNode** — Compact card with drag handle + success/failure exit ports
- [x] **Task 3: Rewrite WorkflowBuilder** — Topbar + two-panel layout
- [x] **Task 4: Update WorkflowCanvas** — Insert buttons + green success edges
- [x] **Task 5: Add CSS** — Full styling matching `mockups/workflow-canvas-design.html`
- [x] **Task 6: Update tests** — Updated selectors for new class names

---

## Key UI Elements (Completed)

### Topbar
- GitBranch icon + title「工作流编排」
- Subtitle「定义角色 Agent，编排步骤流程」
- Actions: [版本管理] [保存工作流]

### Left Sidebar
- **Workflow Template List**:
  - Header: ● green dot + count badge
  - Template cards: icon + name + meta (version · steps)
  - Hover actions: [复制] [删除]
  - Active: green border + tinted background
  - New button: dashed border

- **Role Pool**:
  - Header: ● violet dot + count badge + [+ 新增]
  - Role items: avatar + name + desc + model badge + bound steps (✓ 步骤1,2)

### Right Canvas
- **Info Bar**: icon + name + meta + stats (steps + decisions)
- **Toolbar Hint**: drag + double-click + insert hints
- **Canvas Body**: 560px width, centered

### Step Cards
- **Drag Handle**: left side, hover visible
- **Order Badge**: blue background, mono font
- **Info**: name + role badge + model badge + gate badge
- **Exit Ports**: 
  - Success (green dot): hover shows「→ 步骤2」or「→ 完成」
  - Failure (orange dot): hover shows「→ 停止」or「→ 重试」

### Edges
- Green success line with output label + check icon + arrow
- Insert button between steps (hover visible)

### Modal
- Header with Edit2 icon
- Routing section with ChevronRight icon
- Danger delete button

---

## Verification

- [x] `npm test` passes (59 tests)
- [x] `npm run build` passes (64KB CSS, 349KB JS)
