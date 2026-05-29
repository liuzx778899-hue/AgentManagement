# P5 MD 体系剩余任务（P5-6 ~ P5-9）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 补完 MD 体系剩余 4 项：项目 MD 入口、流程/步骤 Domain、步骤模态框集成、CSS+测试。

**背景：** P5-1~P5-5 已完成（AgentRole.roleMarkdown、Project.roleOverrides、RoleMdEditor、RoleMdViewer、角色池入口、工作区角色入口）。

**效果参考：** `mockups/md-system-overview.html`

---

## 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| MODIFY | `src/domain/workflow.ts` | WorkflowTemplate 加 workflowMarkdown，WorkflowStep 加 stepMarkdown |
| MODIFY | `src/domain/project.ts` | Project 加 projectMarkdown、workflowOverrides |
| MODIFY | `src/data/fixtures.ts` | fixtures 加 projectMarkdown/workflowMarkdown/stepMarkdown 示例 |
| MODIFY | `src/components/ProjectWorkspace.tsx` | P5-6: 顶部栏加 [📄项目指令] 按钮 |
| MODIFY | `src/components/StepEditModal.tsx` | P5-8: 加步骤规则 textarea |
| MODIFY | `src/styles/pages.css` | P5-9: 按钮样式 |

---

### Task P5-7: Domain 层（流程 MD + 步骤 MD + 项目 MD + workflowOverrides）

**文件：** `src/domain/workflow.ts`、`src/domain/project.ts`、`src/data/fixtures.ts`

**workflow.ts** — 在 WorkflowTemplate 和 WorkflowStep 接口中各加一行：
```typescript
// WorkflowTemplate 加
workflowMarkdown?: string;

// WorkflowStep 加
stepMarkdown?: string;
```

**project.ts** — 在 Project 接口加两行：
```typescript
projectMarkdown?: string;
workflowOverrides?: string;
```

**fixtures.ts** — 给 project[0] 加 projectMarkdown 示例；给 workflowTemplates[0] 加 workflowMarkdown 示例；给 steps 各加 stepMarkdown 示例。

---

### Task P5-6: 项目工作区加 [📄项目指令] 按钮

**文件：** `src/components/ProjectWorkspace.tsx`

**位置：** 顶部栏 `.ws-topbar-right` 区域，在现有按钮（人工决策/议题/流水线/设置）之前加：

```tsx
import { FileText } from "lucide-react";

// 状态
const [showProjectMd, setShowProjectMd] = useState(false);

// 按钮（在人工决策按钮之前）
<button className="pw-quick-btn" onClick={() => setShowProjectMd(true)} type="button">
  <FileText size={14} />
  <span>项目指令</span>
</button>
```

**渲染覆盖层（在现有 GateDecisionPanel 旁边）：**
```tsx
{showProjectMd && (
  <div className="overlay" onClick={() => setShowProjectMd(false)}>
    <div className="gate-panel" onClick={(e) => e.stopPropagation()}>
      <div className="gate-panel-header">
        <h3><span className="gate-dot" /> 项目指令</h3>
        <button className="btn ghost btn-sm" onClick={() => setShowProjectMd(false)}>✕</button>
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        <textarea
          style={{ flex: 1, padding: 16, background: "#0d1014", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.7, border: "none", resize: "none", outline: "none" }}
          value={project?.projectMarkdown ?? ""}
          readOnly
        />
      </div>
      <div style={{ padding: "10px 20px", borderTop: "1px solid var(--line-soft)", display: "flex", justifyContent: "flex-end", gap: 6 }}>
        <button className="btn" onClick={() => setShowProjectMd(false)}>关闭</button>
      </div>
    </div>
  </div>
)}
```

---

### Task P5-8: 步骤编辑模态框加步骤规则

**文件：** `src/components/StepEditModal.tsx`

在现有模态框 body 中的路由配置区域下方，加一个"步骤规则" textarea：

```tsx
{/* 步骤规则 MD */}
<div className="modal-routing" style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
  <div className="modal-routing-title">步骤规则（Markdown）</div>
  <div style={{ gridColumn: "1 / -1" }}>
    <textarea
      style={{ width: "100%", minHeight: 100, border: "1px solid var(--line)", borderRadius: 6, background: "#111419", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 12, padding: 10, resize: "vertical" }}
      value={editStepMarkdown ?? step.stepMarkdown ?? ""}
      onChange={(e) => setEditStepMarkdown(e.target.value)}
      placeholder="定义此步骤的行为规则（Markdown）..."
    />
  </div>
</div>
```

**新增状态：**
```typescript
const [editStepMarkdown, setEditStepMarkdown] = useState(step.stepMarkdown ?? "");
```

**onSave 中加入 stepMarkdown：**
```typescript
onSave({
  // ... existing fields
  stepMarkdown: editStepMarkdown,
});
```

---

### Task P5-9: CSS + 测试

**文件：** `src/styles/pages.css`

追加项目指令按钮样式（复用现有 `.pw-quick-btn`）：

```css
.pw-quick-btn .lucide-file-text { color: var(--primary); }
```

**测试：** 不需要新增测试文件，确认 `npm test` 和 `npm run build` 通过。

---

## 验证

- [x] P5-1~P5-5 已完成
- [ ] `workflow.ts` 有 workflowMarkdown + stepMarkdown
- [ ] `project.ts` 有 projectMarkdown + workflowOverrides
- [ ] 项目工作区顶部栏有 [📄项目指令] 按钮
- [ ] 步骤编辑模态框有"步骤规则" textarea
- [ ] `npm test` 全部通过
- [ ] `npm run build` 通过
