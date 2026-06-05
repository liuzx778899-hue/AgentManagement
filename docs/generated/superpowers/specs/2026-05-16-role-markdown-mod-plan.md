# 角色 Markdown 功能 — 修改方案（基于现有代码）

日期：2026-05-16
状态：设计方案 + 精确改动点

## 前提

基于当前代码实际渲染效果（见截图），在现有组件上打补丁，不改动现有布局结构。

---

## 改动清单

### 1. Domain 层：AgentRole 加字段

**文件：** `src/domain/role.ts`

在第 8 行 `defaultCapabilities: string[];` 下方新增一行：

```typescript
roleMarkdown?: string;  // 角色行为 Prompt（Markdown），AI 自动生成 + 手动编辑
```

**文件：** `src/domain/project.ts`

在 Project 接口末尾（`settings: ProjectSettings` 之前或之后）新增：

```typescript
roleOverrides?: Record<string, string>;  // roleId → 项目级覆盖的 Markdown
```

**文件：** `src/data/fixtures.ts`

在 roles 数组的每个角色对象中加入 `roleMarkdown` 字段，给产品经理加一段示例：

```typescript
{
  id: "role-001",
  projectId: null,
  name: "产品经理",
  ...
  roleMarkdown: `# 产品经理\n\n**描述：** 负责需求分析...\n\n## 核心职责\n- 分析需求\n...`,
}
```

---

### 2. P5-1: WorkflowBuilder 角色池加 [📝] 按钮

**文件：** `src/components/WorkflowBuilder.tsx`

**位置：** 角色池列表中每个 `.wf-role-item` 的右侧，大约第 121-134 行

在 `usedSteps` 的 `<span className="wf-role-item-used">` 后面（或在更右边区域）加一个 `[📝]` 图标按钮：

```tsx
{/* 在 role-item 右侧加 MD 编辑按钮 */}
<button
  className="wf-role-item-md-btn"
  onClick={(e) => {
    e.stopPropagation();
    setEditingMdRoleId(role.id);
  }}
  title="编辑角色 Prompt"
  type="button"
>
  <FileText size={12} />
</button>
```

**新增状态：**
```typescript
const [editingMdRoleId, setEditingMdRoleId] = useState<string | null>(null);
const editingMdRole = editingMdRoleId ? data.roles.find(r => r.id === editingMdRoleId) : null;
```

**渲染 RoleMdEditor（在 return 末尾 `<div className="workflow-builder-v2">` 闭合前加）：**

```tsx
{editingMdRole && (
  <RoleMdEditor
    role={editingMdRole}
    data={data}
    onClose={() => setEditingMdRoleId(null)}
  />
)}
```

**CSS（`src/styles/pages.css` 末尾追加）：**

```css
.wf-role-item-md-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 100ms;
  border: none;
  background: none;
  color: var(--faint);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
}
.wf-role-item:hover .wf-role-item-md-btn { opacity: 1; }
.wf-role-item-md-btn:hover { color: var(--primary); background: var(--surface-2); }
```

---

### 3. P5-2: WorkflowBuilder 加载 RoleMdEditor 导入

**文件：** `src/components/WorkflowBuilder.tsx`

在现有 imports 中加一行：

```typescript
import { RoleMdEditor } from "./RoleMdEditor";
import { FileText } from "lucide-react";
```

---

### 4. P5-3: RoleMdEditor 组件（覆盖层弹出编辑）

**文件：** NEW `src/components/RoleMdEditor.tsx`

覆盖层弹出编辑器，类似 GateDecisionPanel 的模式但在角色池中触发。

Props：
```typescript
interface RoleMdEditorProps {
  role: AgentRole;
  data: WorkbenchData;
  onClose: () => void;
}
```

行为：
1. 打开时如果 role.roleMarkdown 为空，则根据 name/description/defaultCapabilities 自动生成初始 MD
2. 双栏：左侧 textarea 编辑，右侧渲染预览
3. 工具栏：标题 + "重新生成" + "重置为默认"
4. 底部：取消 + 保存按钮
5. 保存后将内容写入 role.roleMarkdown

CSS 复用现有 modal 样式（`.overlay` / `.panel-header` 等）。

---

### 5. P5-4: ProjectWorkspace 右侧 [📄 查看角色 MD] 按钮

**文件：** `src/components/ProjectWorkspace.tsx`

**位置 1：Agent 列表切换时自动匹配角色 MD**

新增状态：
```typescript
const [showRoleMd, setShowRoleMd] = useState(false);
const activeRole = activeAgentId
  ? data.roles.find((r) => r.name.includes(
      activeAgentId === "pm" ? "产品" :
      activeAgentId === "design" ? "UI" :
      activeAgentId === "fe" ? "前端" :
      activeAgentId === "review" ? "审查" : "测试"
    ))
  : null;

// 解析当前生效的 Markdown（项目级覆盖优先）
const effectiveMd = activeRole
  ? (project?.roleOverrides?.[activeRole.id] || activeRole.roleMarkdown || "")
  : "";
```

**位置 2：Agent 信息栏（约第 416-431 行，`.pw-agent-info` 区域内）**

在当前 Agent 信息栏右侧 `[flex:1]` 之后、badge 之前加一个按钮：

```tsx
<button
  className="pw-agent-md-btn"
  onClick={() => setShowRoleMd(true)}
  type="button"
  title="查看角色 Prompt"
>
  <FileText size={13} />
  <span>角色指令</span>
</button>
```

**位置 3：渲染 RoleMdViewer（在 `return` 末尾闭合前，`GateDecisionPanel` 旁边）**

```tsx
{showRoleMd && activeRole && (
  <RoleMdViewer
    role={activeRole}
    markdown={effectiveMd}
    source={project?.roleOverrides?.[activeRole.id] ? "项目级覆盖" : "默认配置"}
    onClose={() => setShowRoleMd(false)}
  />
)}
```

**导入：**
```typescript
import { RoleMdViewer } from "./RoleMdViewer";
import { FileText } from "lucide-react";
```

**CSS：**
```css
.pw-agent-md-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 5px;
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 11px;
}
.pw-agent-md-btn:hover { color: var(--primary); background: var(--surface-2); }
```

---

### 6. P5-5: RoleMdViewer 组件（查看 + 切换编辑）

**文件：** NEW `src/components/RoleMdViewer.tsx`

覆盖层弹出查看器，右上角可切换到编辑模式。

Props：
```typescript
interface RoleMdViewerProps {
  role: AgentRole;
  markdown: string;
  source: "默认配置" | "项目级覆盖";
  onClose: () => void;
}
```

行为：
1. 默认只读展示渲染后的 Markdown
2. 右上角 [✏️ 编辑] 按钮切换到编辑模式（切换为 textarea）
3. 编辑模式下保存把内容写入 project.roleOverrides
4. 底部显示来源："当前使用：XX" + "最后保存时间"
5. 如果是项目级覆盖，显示"重置为默认"按钮

---

## 文件清单汇总

| 操作 | 文件 | 改动点 |
|------|------|--------|
| MODIFY | `src/domain/role.ts` | 加 `roleMarkdown?: string` |
| MODIFY | `src/domain/project.ts` | 加 `roleOverrides?: Record<string, string>` |
| MODIFY | `src/data/fixtures.ts` | 角色数据加 roleMarkdown 示例 |
| MODIFY | `src/components/WorkflowBuilder.tsx` | 角色池加 [📝] 按钮 + 状态 + 渲染 RoleMdEditor |
| NEW | `src/components/RoleMdEditor.tsx` | 角色 MD 编辑器（覆盖层弹出） |
| MODIFY | `src/components/ProjectWorkspace.tsx` | Agent 栏加 [📄角色指令] 按钮 + 渲染 RoleMdViewer |
| NEW | `src/components/RoleMdViewer.tsx` | 角色 MD 查看器（覆盖层，可切换编辑） |
| MODIFY | `src/styles/pages.css` | 加按钮样式 |
