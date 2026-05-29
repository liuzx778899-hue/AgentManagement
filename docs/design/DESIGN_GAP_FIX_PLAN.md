# 设计图 vs 实现 — 确切修改意见

更新时间：2026-05-17  
范围：6 张冻结设计图 vs 当前前端实现的明细差距，给出**可直接执行的修改方案**

---

## 设计图 1: 工作台 (workbench-v1.png)

### 1.1 顶部栏

**设计图特征**：紧凑横条，项目名在左、操作按钮在右，中间无换行

**差距**：当前 `.wb-topbar` 包裹了 project-select + meta，导致顶部有两行文字

**修改意见**：

```css
/* 改为单行紧凑布局 */
.wb-topbar {
  padding: 6px 16px;
  min-height: 44px; /* 原 52px */
  gap: 8px;
}
.wb-topbar-left {
  flex-direction: row;   /* 原 column，导致两行 */
  align-items: center;
  gap: 8px;
}
.wb-topbar-meta {
  display: inline-flex;  /* 原 flex，需和 project 同行 */
  margin-left: 4px;
}
/* 新增 meta-item 分隔符符号改用 · 而非 | */
.wb-topbar-sep::before { content: "·"; color: var(--line); }
```

**WorkbenchHome.tsx 第 28-29 行**，meta 信息需从 `display: flex; flex-direction: column` 改为与项目选择同行。

### 1.2 角色流程运行带

**设计图特征**：卡片带步骤编号 + 角色 + Runner/模型 + 状态色块，卡片紧凑横向排列

**差距**：当前 `wb-role-flow` gap 为 `2px` 过小，卡片内 padding 偏大

**修改意见**：

```css
.wb-role-flow {
  gap: 6px;           /* 原 2px */
  padding: 6px 16px;  /* 原 6px 12px */
  overflow-x: auto;
}
.wb-role-step-card {
  padding: 6px 10px;  /* 原 6px 12px */
  min-width: 144px;   /* 原 160px */
  gap: 6px;
}
/* 步骤编号放大、加亮 */
.wb-step-order {
  font-size: 13px;    /* 原 11px */
  font-weight: 800;
  color: var(--primary);
  min-width: 22px;
}
.wb-step-info strong { font-size: 12px; }  /* 原 11px */
```

**WorkbenchHome.tsx 第 153-213 行**：流程带里缺**状态图标左对齐**——设计图在每个步骤编号左侧有竖线或状态指示器。

```tsx
// 在 wb-step-order 前加状态指示块
<div className={`wb-step-indicator ${isActive ? "active" : statusLabel === "已完成" ? "done" : ""}`} />
```

添加 CSS：
```css
.wb-step-indicator {
  width: 3px;
  height: 36px;
  border-radius: 2px;
  background: var(--surface-4);
  flex-shrink: 0;
}
.wb-step-indicator.active { background: var(--primary); box-shadow: 0 0 6px var(--primary-glow); }
.wb-step-indicator.done { background: var(--ok); }
```

### 1.3 Terminal Tab 样式

**设计图特征**：Tab 底色深色且 tab 之间有分隔线（非 1px gap），active tab 底色为黑色

**差距**：当前 `.wb-terminal-tabs` 用的 gap 模拟 tab 间距

**修改意见**：

```css
.wb-terminal-tabs {
  background: #0a0c10;    /* 原 var(--surface-2) 过亮 */
  padding: 0;
  border-bottom: 1px solid var(--line);
}
.wb-terminal-tab {
  padding: 6px 14px;      /* 原 5px 10px */
  border-right: 1px solid var(--line-subtle);  /* tab间竖线 */
  border-radius: 0;       /* 原 4px 4px 0 0 */
  font-size: 12px;        /* 原 11px */
}
.wb-terminal-tab.active {
  background: #080b10;    /* 更深 */
  color: var(--primary);
}
```

### 1.4 Terminal Content 样式

**设计图特征**：深色终端区域 + 带行号或 prompt 前缀

**差距**：当前背景 `#0a0c10` 偏亮，prompt 着色简单

**修改意见**：

```css
.wb-terminal-content {
  background: #06080c;    /* 更接近真实终端 */
  padding: 16px 20px;
}
.wb-terminal-output {
  font-size: 13px;        /* 原 12px */
  line-height: 1.6;
}
```

### 1.5 工具栏 Popover

**设计图特征**：Popover 浮在 toolbar 下方（非全屏 overlay），带向下箭头

**差距**：当前 Popover 使用 `position: fixed; inset: 0` 全屏遮罩层

**修改意见**：

WorkbenchHome.tsx 中 Popover 渲染方式改为：

```tsx
// Popover 渲染在 toolbar 按钮旁边，加 ref 定位
{popover === "context" && (
  <div className="wb-popover-anchor">
    <div className="wb-popover-card">
      {/* ... */}
    </div>
  </div>
)}
```

CSS 改为：
```css
.wb-popover-anchor {
  position: relative;
}
.wb-popover-card {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  z-index: 100;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  min-width: 280px;
  box-shadow: var(--shadow-lg);
}
```

### 1.6 右侧面板宽度

**设计图特征**：右侧面板宽度约 320px，信息密集度高

**差距**：当前 `wb-right-panel` 宽度 `300px`

**修改意见**：

```css
.wb-right-panel {
  width: 320px;
}
```

---

## 设计图 2: 项目管理总览 (project-management-overview-ai-briefing-v1.png)

### 2.1 顶部操作按钮

**设计图特征**：四个入口并排：新建空白项目、导入已有项目、AI 方案立项、检查全部进度

**差距**：当前只有三个按钮，检查全部进度按钮藏在"项目列表"标题旁

**修改意见**：

ProjectManagement.tsx 第 206-216 行：
```tsx
// 把"检查全部项目进度"移动到 pm-header-actions 中
<button className="btn" onClick={handleCheckAllProgress} disabled={loading} type="button">
  <Search size={16} />
  {loading ? "检查中..." : "检查全部项目进度"}
</button>
```

### 2.2 AI 方案立项 — 从 alert 改为 UI 面板

**设计图特征**：右侧有 AI 方案立项面板，包含来源输入（讨论/文档/截图/对话）和草案预览

**差距**：当前仅有 `alert` 占位

**修改意见**：

新增 `AiBriefingPanel` 组件（新文件 `src/components/AiBriefingPanel.tsx`）：

```tsx
interface AiBriefingPanelProps {
  onClose: () => void;
  onCreateProject: (draft: BriefingDraft) => void;
}

interface BriefingDraft {
  name: string;
  description: string;
  phases: string[];
  roles: string[];
  tasks: string[];
}
```

布局：
- 顶部 `SourceTabs`：`直接讨论` / `粘贴对话` / `导入文档` / `上传截图` / `当前会话`
- 中间：输入区（文本域或聊天输入框）
- 底部：解析预览 + 确认按钮

### 2.3 KPI 指标卡片

**设计图特征**：6 个指标卡片宽度均匀，数值突出

**差距**：当前 `pm-kpi-row` 已实现 6 列，但可用性差

**修改意见**：小幅微调
```css
.pm-kpi-value { font-size: 22px; }  /* 原 24px，稍减小保持紧凑 */
```

### 2.4 检查全部项目进度

**差距**：当前直接用 `alert` 弹出结果

**修改意见**：新增 `ProgressCheckModal` 组件，以 overlay 形式展示各项目进度快照：

```tsx
<ProgressCheckModal
  results={checkResults}
  onClose={() => setShowCheckResults(false)}
/>
```

---

## 设计图 3 & 4: 项目详情 — 甘特/健康/追溯抽屉

### 3.1 顶部驾驶舱

**设计图特征**：项目名 + 状态 badge 紧凑横排，下方 KPI 行

**差距**：当前 `pd-cockpit-top` 的 `margin-bottom: var(--space-lg)` 和 `pd-cockpit-header` 的 padding 偏大

**修改意见**：
```css
.pd-cockpit-header {
  padding: var(--space-md) var(--space-xl); /* 原 padding: var(--space-lg) ...*/
}
.pd-cockpit-top {
  margin-bottom: var(--space-md);  /* 原 var(--space-lg) */
}
```

### 3.2 进度视图 Tab — 甘特图

**设计图特征**：甘特图横向条形，展示各阶段时间跨度和进度

**差距**：当前仅有纵向进度条列表

**修改意见**：

重构 `renderProgressTab()` 函数（ProjectDetailPage.tsx 第 705-738 行），新增甘特图样式：

```tsx
function renderProgressTab() {
  const phases = [
    { name: "需求分析", start: "05-10", end: "05-14", pct: 100, status: "done" },
    { name: "UI/UX 设计", start: "05-14", end: "05-17", pct: 100, status: "done" },
    { name: "前端开发", start: "05-17", end: "05-25", pct: 65, status: "running" },
    { name: "代码审查", start: "05-25", end: "05-28", pct: 0, status: "pending" },
    { name: "测试验证", start: "05-28", end: "06-05", pct: 0, status: "pending" },
  ];

  return (
    <div className="pd-gantt-chart">
      {/* 时间轴标尺 */}
      <div className="pd-gantt-timeline">
        {["05-10", "05-17", "05-24", "05-31", "06-07"].map(date => (
          <span key={date} className="pd-gantt-tick">{date}</span>
        ))}
      </div>
      {/* 甘特条 */}
      {phases.map(phase => (
        <div key={phase.name} className="pd-gantt-row">
          <span className="pd-gantt-label">{phase.name}</span>
          <div className="pd-gantt-track">
            <div 
              className={`pd-gantt-bar ${phase.status}`}
              style={{
                left: `${getLeft(phase.start)}%`,
                width: `${getWidth(phase.start, phase.end)}%`,
              }}
            >
              <span className="pd-gantt-pct">{phase.pct}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

CSS（新增）：
```css
.pd-gantt-chart {
  padding: var(--space-lg);
  background: var(--surface);
  border-radius: var(--radius);
  border: 1px solid var(--line-soft);
}
.pd-gantt-timeline {
  display: flex;
  justify-content: space-between;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--line-soft);
  margin-bottom: var(--space-lg);
}
.pd-gantt-tick { font-size: 11px; color: var(--faint); }
.pd-gantt-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: var(--space-md);
  align-items: center;
  margin-bottom: var(--space-md);
  min-height: 40px;
}
.pd-gantt-label { font-size: 13px; color: var(--text-secondary); font-weight: 600; }
.pd-gantt-track {
  position: relative;
  height: 28px;
  background: var(--surface-2);
  border-radius: 4px;
  overflow: hidden;
}
.pd-gantt-bar {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  min-width: 40px;
}
.pd-gantt-bar.done { background: var(--ok); }
.pd-gantt-bar.running { background: var(--primary); }
.pd-gantt-bar.pending { background: var(--surface-4); }
.pd-gantt-pct { font-size: 10px; font-weight: 700; color: #fff; }
```

### 3.3 协同文件追溯抽屉

**设计图特征**：右侧抽屉展示协同文件的结构解析、来源引用、影响范围

**差距**：当前无此抽屉

**修改意见**：

在 ProjectDetailPage.tsx 的 `renderDrawerContent()` 中新增 `"file"` view：

```tsx
// DrawerState 增加 "file" 类型
interface DrawerState {
  view: "task" | "risk" | "role" | "gate" | "file" | null;
  itemId: string;
}

// 在 file card 的点击事件中打开文件抽屉
<FileText size={16} onClick={() => handleOpenDrawer("file", file.name)} />

// renderDrawerContent 增加 file case
if (drawer.view === "file") {
  const fileName = drawer.itemId;
  return (
    <>
      <div className="pd-drawer-header">
        <span className="pd-drawer-title">
          <FileText size={16} /> 文件追溯
        </span>
        <button className="pd-drawer-close" onClick={handleCloseDrawer}><X size={16} /></button>
      </div>
      <div className="pd-drawer-body">
        <div className="pd-drawer-section">
          <h4>文件信息</h4>
          <div className="pd-drawer-field">
            <span className="pd-drawer-field-label">文件名</span>
            <span className="pd-drawer-field-value">{fileName}</span>
          </div>
        </div>
        <div className="pd-drawer-section">
          <h4>引用来源</h4>
          <div className="pd-drawer-field">
            <span className="pd-drawer-field-value" style={{ color: "var(--muted)" }}>
              暂无引用数据（Phase 1 mock）
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
```

---

## 设计图 5: 流程编排双模式 (workflow-builder-dual-mode-v1.png)

**这是差距最大的页面。** 设计图的布局结构与当前实现差异较大。

### 5.1 整体布局差异

**设计图**：三栏（左侧边栏 + 中间画布 + 右侧步骤配置面板）
**当前**：两栏（左侧边栏 + 中间画布），步骤配置在 Modal 中

**修改方案**：

WorkflowBuilder.tsx 新增右侧面板区域（第 224-266 行后）：

```tsx
{/* ===== RIGHT SIDE: Step Inspector ===== */}
<aside className="wf-inspector">
  {selectedStep ? (
    <WorkflowStepInspector
      step={selectedStep}
      template={selectedTemplate}
      data={data}
      onUpdate={(updates) => updateWorkflowStep(template.id, selectedStep.id, updates)}
      onClose={() => setSelectedStepId(null)}
    />
  ) : (
    <div className="wf-inspector-empty">
      <div className="wf-inspector-empty-icon"><MousePointerClick size={32} /></div>
      <h3>选择步骤</h3>
      <p>点击画布上的步骤卡片查看和编辑配置</p>
    </div>
  )}
</aside>
```

CSS：
```css
.wf-main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.wf-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.wf-inspector {
  width: 380px;
  flex-shrink: 0;
  border-left: 1px solid var(--line);
  background: var(--surface);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
```

### 5.2 顶部 Segmented Control

**设计图**：顶部 segmented control：「常规配置」/「AI 辅助生成」，切换时画布面板保持

**差距**：当前完全缺失

**新增**：
```tsx
interface WorkflowBuilderProps {
  data: WorkbenchData;
}

export function WorkflowBuilder({ data }: WorkflowBuilderProps) {
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  // ... 现有代码
```

在 `wf-topbar` 顶部新增 segmented control：

```tsx
<div className="wf-mode-switch">
  <button 
    className={`wf-mode-btn${mode === "manual" ? " active" : ""}`}
    onClick={() => setMode("manual")}
  >
    <Pencil size={14} />
    常规配置
  </button>
  <button 
    className={`wf-mode-btn${mode === "ai" ? " active" : ""}`}
    onClick={() => setMode("ai")}
  >
    <Sparkles size={14} />
    AI 辅助生成
  </button>
</div>
```

CSS：
```css
.wf-mode-switch {
  display: inline-flex;
  padding: 3px;
  border-radius: 8px;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  gap: 2px;
}
.wf-mode-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 120ms;
}
.wf-mode-btn.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
```

### 5.3 右侧步骤面板 — WorkflowStepInspector

**设计图**：分节展示：基本字段 → 角色绑定 → Runner/模型 → 能力授权 → Gate/验收标准

**差距**：当前 StepEditModal 只包含部分字段

**新增组件** `WorkflowStepInspector.tsx`：

```tsx
interface WorkflowStepInspectorProps {
  step: WorkflowStep;
  template: WorkflowTemplate;
  data: WorkbenchData;
  onUpdate: (updates: Partial<WorkflowStep>) => void;
  onClose: () => void;
}

export function WorkflowStepInspector({
  step, template, data, onUpdate, onClose,
}: WorkflowStepInspectorProps) {
  return (
    <div className="wf-inspector-content">
      <div className="wf-inspector-header">
        <h3>步骤配置</h3>
        <button onClick={onClose}><X size={16} /></button>
      </div>
      
      {/* 基本字段 */}
      <section className="wf-inspector-section">
        <h4>基本字段</h4>
        <div className="form-field">
          <label>步骤名称</label>
          <input value={step.name} onChange={e => onUpdate({ name: e.target.value })} />
        </div>
      </section>

      {/* 角色绑定 */}
      <section className="wf-inspector-section">
        <h4>角色</h4>
        <select value={step.roleId} onChange={e => onUpdate({ roleId: e.target.value })}>
          {data.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </section>

      {/* Runner/模型 */}
      <section className="wf-inspector-section">
        <h4>执行与模型</h4>
        <div className="form-field">
          <label>Runner</label>
          <select value={step.runnerId ?? ""} onChange={e => onUpdate({ runnerId: e.target.value })}>
            {data.runnerProfiles.map(rp => (
              <option key={rp.id} value={rp.id}>{rp.displayName ?? rp.name}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>模型 Provider</label>
          <select value={step.modelProviderId} onChange={e => onUpdate({ modelProviderId: e.target.value })}>
            {data.modelProviders.filter(p => p.enabled).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </section>

      {/* 能力授权矩阵 */}
      <CapabilityAuthorizationMatrix step={step} data={data} onUpdate={onUpdate} />

      {/* Gate 和验收标准 */}
      <section className="wf-inspector-section">
        <h4>Gate</h4>
        <select value={step.gateMode} onChange={e => onUpdate({ gateMode: e.target.value as "auto" | "manual" })}>
          <option value="auto">自动通过</option>
          <option value="manual">人工决策</option>
        </select>
      </section>
      <section className="wf-inspector-section">
        <h4>验收标准</h4>
        <textarea
          rows={3}
          value={step.acceptanceCriteria ?? ""}
          onChange={e => onUpdate({ acceptanceCriteria: e.target.value })}
          placeholder="定义步骤完成标准..."
        />
      </section>
    </div>
  );
}
```

### 5.4 能力授权矩阵组件

新增 `CapabilityAuthorizationMatrix.tsx`：

```tsx
export function CapabilityAuthorizationMatrix({
  step, data, onUpdate,
}: {
  step: WorkflowStep;
  data: WorkbenchData;
  onUpdate: (updates: Partial<WorkflowStep>) => void;
}) {
  return (
    <section className="wf-inspector-section">
      <h4>能力授权</h4>
      {/* MCP */}
      <div className="form-field">
        <label>MCP 服务器</label>
        <div className="cap-matrix-grid">
          {data.mcpServers.map(mcp => (
            <label key={mcp.id} className="cap-matrix-item">
              <input type="checkbox" checked={step.capabilityIds?.includes(mcp.id) ?? false}
                onChange={() => {
                  const ids = step.capabilityIds ?? [];
                  const next = ids.includes(mcp.id)
                    ? ids.filter(id => id !== mcp.id)
                    : [...ids, mcp.id];
                  onUpdate({ capabilityIds: next });
                }}
              />
              <span>{mcp.name}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Skills */}
      <div className="form-field">
        <label>Skills</label>
        <div className="cap-matrix-grid">
          {data.skills.map(skill => (
            <label key={skill.id} className="cap-matrix-item">
              <input type="checkbox" checked={step.capabilityIds?.includes(skill.id) ?? false}
                onChange={() => {
                  const ids = step.capabilityIds ?? [];
                  const next = ids.includes(skill.id)
                    ? ids.filter(id => id !== skill.id)
                    : [...ids, skill.id];
                  onUpdate({ capabilityIds: next });
                }}
              />
              <span>{skill.name}</span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
```

CSS：
```css
.cap-matrix-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: var(--space-sm) 0;
}
.cap-matrix-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.cap-matrix-item:hover { background: var(--surface-2); }
```

### 5.5 插销 StepEditModal

保留 Modal 作为双击编辑的快捷入口，但主交互改为右侧面板。推荐：
1. 点击画布节点 → 右侧 WorkflowStepInspector 打开
2. 双击画布节点 → 仍然弹出 StepEditModal 全量编辑（保留向后兼容）
3. 两者数据源同步

### 5.6 AI 辅助生成模式占位

WorkflowBuilder.tsx 新增 `mode === "ai"` 时的渲染：

```tsx
{mode === "ai" ? (
  <div className="wf-ai-mode">
    <div className="wf-ai-source-selector">
      <h3>选择输入来源</h3>
      {/* 来源选择按钮组 */}
    </div>
    <div className="wf-ai-draft-area">
      {/* 草案预览 + 差异对比 */}
      <div className="wf-ai-draft-placeholder">
        <Sparkles size={40} />
        <p>选择来源后 AI 将生成流程草案</p>
      </div>
    </div>
  </div>
) : (
  /* 现有 canvas 内容 */
)}
```

---

## 设计图 6: 记忆管理 — 知识资产中心 (memory-management-knowledge-center-v1.png)

**这是差距第二大的页面。** 当前 MemoryManager 是两栏 CRUD 列表，设计图是三栏知识资产中心。

### 6.1 三栏布局

**设计图**：左树（项目/角色/知识库）| 中工作区（KPI + tabs + 列表）| 右 AI 面板

**差距**：当前是两栏（列表 + 详情）

**修改意见**：

MemoryManager.tsx 整体重构为三栏：

```tsx
export function MemoryManager({ data }: MemoryManagerProps) {
  const [leftTab, setLeftTab] = useState<"project" | "role" | "kb">("project");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  return (
    <div className="memory-manager-v2">
      {/* ===== TOPBAR ===== */}
      <header className="mm-topbar">
        <div className="mm-topbar-left">
          <span className="mm-ai-badge">AI 助手 · 记忆整理模式</span>
        </div>
        <div className="mm-topbar-actions">
          <button className="btn btn-sm accent-btn"><Sparkles size={14} /> 提炼记忆</button>
          <button className="btn btn-sm ghost"><Upload size={14} /> 导入</button>
          <button className="btn btn-sm ghost"><Download size={14} /> 导出</button>
        </div>
      </header>

      <div className="mm-three-column">
        {/* === LEFT: Memory Space Tree === */}
        <aside className="mm-left">
          <div className="mm-space-tabs">
            <button className={`mm-space-tab${leftTab === "project" ? " active" : ""}`}
              onClick={() => setLeftTab("project")}>
              <FolderGit2 size={14} /> 项目
            </button>
            <button className={`mm-space-tab${leftTab === "role" ? " active" : ""}`}
              onClick={() => setLeftTab("role")}>
              <Users size={14} /> 角色
            </button>
            <button className={`mm-space-tab${leftTab === "kb" ? " active" : ""}`}
              onClick={() => setLeftTab("kb")}>
              <BookOpen size={14} /> 知识库
            </button>
          </div>
          <div className="mm-tree">
            {/* 项目树或角色树，根据 leftTab 显示 */}
          </div>
        </aside>

        {/* === CENTER: Memory Workspace === */}
        <main className="mm-center">
          {/* KPI 卡片 */}
          <div className="mm-kpi-row">{/* 4 个 KPI 卡片 */}</div>
          {/* 分类 Tabs */}
          <div className="mm-category-tabs">{/* 全部/决策/经验/风险/Prompt/流程 */}</div>
          {/* 记忆列表 */}
          <div className="mm-record-list">{/* MemoryRecordCard 列表 */}</div>
        </main>

        {/* === RIGHT: AI Intelligence Panel === */}
        <aside className="mm-right">
          <div className="mm-right-section">
            <h4><Lamp size={14} /> 跨项目洞察</h4>
            {/* 洞察列表 */}
          </div>
          <div className="mm-right-section">
            <h4><Sparkles size={14} /> 可沉淀知识</h4>
            {/* 提取队列 */}
          </div>
          <div className="mm-right-section">
            <h4><RefreshCw size={14} /> 复用建议</h4>
            {/* 推荐列表 */}
          </div>
          <div className="mm-right-section">
            <h4><Search size={14} /> 记忆审计</h4>
            {/* 审计摘要 */}
          </div>
        </aside>
      </div>
    </div>
  );
}
```

### 6.2 新增 CSS（三栏布局）

```css
.memory-manager-v2 {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.mm-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  border-bottom: 1px solid var(--line-soft);
  flex-shrink: 0;
}
.mm-ai-badge {
  padding: 4px 12px;
  border-radius: 99px;
  background: var(--accent-glow);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(124, 108, 240, 0.2);
}
.mm-three-column {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.mm-left {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--line-soft);
  display: flex;
  flex-direction: column;
  background: var(--surface);
}
.mm-center {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-xl);
}
.mm-right {
  width: 360px;
  flex-shrink: 0;
  border-left: 1px solid var(--line-soft);
  overflow-y: auto;
  padding: var(--space-lg);
  background: var(--bg-elevated);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}
.mm-space-tabs {
  display: flex;
  border-bottom: 1px solid var(--line-soft);
}
.mm-space-tab {
  flex: 1;
  padding: 10px 8px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}
.mm-space-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
.mm-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}
.mm-category-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: var(--space-lg);
  overflow-x: auto;
}
.mm-right-section {
  padding: var(--space-md);
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  font-size: 13px;
}
.mm-right-section h4 {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
  display: flex;
  align-items: center;
  gap: 6px;
}
```

### 6.3 记忆状态展示

当前 memory 模型缺少 `confirmed/reused/expiry/confidence` 字段。

**domain/memory.ts** 扩展：
```ts
export interface MemoryRecord {
  // ... 现有字段
  status: "pending" | "confirmed" | "reused" | "stale" | "expired";
  confidence: number; // 0-100
  expiresAt?: string;
  sourceType: "manual" | "ai" | "sync" | "file";
  usedByProjectIds: string[];
}
```

新增记忆状态 chip：
```css
.memory-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 10px;
  font-weight: 700;
}
.memory-status-chip.confirmed { background: var(--ok-glow); color: var(--ok); }
.memory-status-chip.pending { background: var(--warn-glow); color: var(--warn); }
.memory-status-chip.reused { background: var(--primary-2-glow); color: var(--primary-2); }
.memory-status-chip.stale { background: rgba(240,160,80,0.08); color: var(--warn); }
.memory-status-chip.expired { background: var(--danger-glow); color: var(--danger); }
```

---

## 总结：按修改优先级排列

### 立即执行（1-2 小时）
| # | 影响面积 | 修改内容 |
|---|---------|---------|
| 1 | 工作台 | 顶部栏单行布局、流程指示线、Tab 样式、Terminal 背景色 |
| 2 | 工作台 | Popover 从全屏 overlay 改为局部浮层 |
| 3 | 项目管理 | 检查进度按钮移到顶部、改为 Modal 而非 alert |
| 4 | 项目详情 | 甘特图视图替换进度条列表 |
| 5 | 项目详情 | 协同文件追溯抽屉 |

### 下次迭代（3-4 小时）
| # | 影响面积 | 修改内容 |
|---|---------|---------|
| 6 | 流程编排 | 三栏布局（新增右侧步骤面板） |
| 7 | 流程编排 | Segmented control + 能力授权矩阵 |
| 8 | 流程编排 | 验收标准编辑器（在 inspect 面板中） |
| 9 | 记忆管理 | domain 模型扩展（status/confidence/expiry） |
| 10 | 记忆管理 | KPI 卡片 + 分类 Tabs（在现有布局上加） |

### 架构级改动（6-8 小时）
| # | 影响面积 | 修改内容 |
|---|---------|---------|
| 11 | 记忆管理 | 三栏布局重构（左树 + 中工作区 + 右 AI 面板） |
| 12 | 流程编排 | AI 辅助生成模式全流程 |
| 13 | 记忆管理 | AI 提炼面板 + 复用建议 + 审计 |
| 14 | 项目管理 | AI 方案立项完整 UI |
