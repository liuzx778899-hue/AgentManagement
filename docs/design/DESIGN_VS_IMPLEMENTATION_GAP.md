# 设计图 vs 实现差距分析

更新时间：2026-05-17  
审查目标：docs/design/assets/ 中 6 张设计图 vs 当前 src/ 实现  
对比依据：DESIGN_OVERVIEW.md、PAGE_SPEC.md、design-tokens.md

---

## 1. 工作台 (workbench-v1.png)

### 实现文件
- `src/components/WorkbenchHome.tsx` (~548 行)
- `src/styles/base.css`（工作台 CSS 在 base.css 中）

### 设计图关键元素
- 顶部栏：项目选择、分支、worktree、Phase、保存状态、启动项目、恢复会话、保存进度、关闭项目
- 顶部流程带：角色流程卡片展示步骤顺序、角色、Runner、模型
- 中央 Terminal Workspace（最大视觉区域）
- 右侧状态面板：TODO、Gate、项目记忆、角色记忆、最近文件、会话状态，支持固定/浮动/隐藏

### 差距分析

| # | 设计规格 | 实现状态 | 差距说明 |
|---|---------|----------|---------|
| GAP-01 | 顶部栏分支信息 | ✅ 已实现 | `GitBranch size={12}` + 分支名，已存在 |
| GAP-02 | worktree 信息 | ✅ 已实现 | 已显示 worktree 路径 |
| GAP-03 | 保存状态指示 | ⚠️ 已实现（静态） | 固定在"已保存"，缺少真实的保存状态变化 |
| GAP-04 | 启动项目/恢复会话/保存进度/关闭项目按钮 | ✅ 已实现 | 4 个按钮均有 mock 交互 |
| GAP-05 | 角色流程运行带 | ✅ 已实现 | 步骤卡片、角色、Runner 信息均展示 |
| GAP-06 | 流程卡片点击联动 Terminal Tab | ⚠️ 部分实现 | 点击切换 Tab，但 Tab 内容全是 mock 文本 |
| GAP-07 | Terminal Workspace 最大化 | ✅ 已实现 | 面板隐藏时 Terminal 能扩展 |
| GAP-08 | 工具栏（上下文/记忆/提示词/MCP/Skills/Git/Shell/快照/更多） | ✅ 已实现 | 全部 9 个按钮都有 |
| GAP-09 | 工具栏 Popover 内容 | ⚠️ 部分实现 | 内容较简单，缺少详细展示 |
| GAP-10 | 右侧面板固定/浮动/隐藏 | ✅ 已实现 | 三种模式切换均有 |
| GAP-11 | 右侧面板 TODO 列表 | ✅ 已实现 | 从 data.tasks 读取展示 |
| GAP-12 | 右侧面板 Gate 状态 | ✅ 已实现 | 展示待处理 Gate |
| GAP-13 | 右侧面板项目记忆摘要 | ✅ 已实现 | 从 data.memories 读取 |
| GAP-14 | 右侧面板角色记忆摘要 | ✅ 已实现 | 按 roleId 筛选展示 |
| GAP-15 | 右侧面板最近文件 | ⚠️ 部分实现 | 硬编码列表 `recentFiles`，非动态 |
| GAP-16 | 右侧面板会话状态 | ✅ 已实现 | 展示运行中 Agent 数、Gate 数 |
| GAP-17 | loading/empty/error/success/disabled 状态 | ⚠️ 部分实现 | loading/empty/error 已实现但 mock；无 disabled 态 |
| GAP-18 | 流程卡片状态标签（已完成/运行中/待处理/排队） | ✅ 已实现 | 各状态按 step.order 区分 |

### 工作台差距评级：轻微（约 90% 对齐）
主要缺失：Tab 内容 mock、最近文件硬编码、disabled 状态未实现。

---

## 2. 项目管理总览 + AI 方案立项 (project-management-overview-ai-briefing-v1.png)

### 实现文件
- `src/components/ProjectManagement.tsx`
- `src/components/ProjectCard.tsx`
- `src/styles/project-management.css`

### 设计图关键元素
- 顶部：新建空白项目、导入已有项目、AI 方案立项、检查全部项目进度
- KPI 指标：项目总数、运行中、等待确认、高风险、Gate 阻塞、今日同步
- 项目卡片：名称、来源、Phase、进度、健康分、风险、里程碑、验收点、操作
- 右侧面板：组合关注、风险面板、本周里程碑
- AI 方案立项（右下角展示）

### 差距分析

| # | 设计规格 | 实现状态 | 差距说明 |
|---|---------|----------|---------|
| GAP-20 | 新建空白项目入口 | ✅ 已实现 | 按钮+弹窗 NewProjectWizard |
| GAP-21 | 导入已有项目入口 | ✅ 已实现 | 按钮+弹窗 ExistingProjectImport |
| GAP-22 | AI 方案立项入口 | ⚠️ 基本实现 | 按钮存在，但 handleAiBriefing 仅 alert，无实际 UI |
| GAP-23 | 检查全部项目进度 | ⚠️ 部分实现 | 按钮存在，alert 模拟检查结果，无 UI 反馈面板 |
| GAP-24 | KPI 指标行 | ✅ 已实现 | 6 个 KPI 卡片全部展示 |
| GAP-25 | 项目卡片 | ✅ 已实现 | ProjectCard 组件已独立 |
| GAP-26 | 卡片：来源类型 | ⚠️ 部分实现 | 卡片有来源类型字段但可能不完整 |
| GAP-27 | 卡片：健康分 | ✅ 已实现 | 展示 healthScore |
| GAP-28 | 卡片：当前里程碑/下一验收点 | ✅ 已实现 | 展示 currentMilestone/nextCheckpoint |
| GAP-29 | 卡片操作（详情/工作台/Check） | ✅ 已实现 | 三个操作按钮存在 |
| GAP-30 | 右侧组合关注面板 | ✅ 已实现 | 展示待决策 Gate 列表 |
| GAP-31 | 右侧风险面板 | ✅ 已实现 | 展示高风险项目 |
| GAP-32 | 右侧本周里程碑 | ✅ 已实现 | 展示各项目里程碑 |
| GAP-33 | AI 方案立项交互流程 | ❌ 未实现 | 设计图展示 4 步骤面板（讨论/文档/截图/对话），当前只有 alert |
| GAP-34 | 总览 empty 状态 | ✅ 已实现 | 三个引导入口展示 |
| GAP-35 | totalProgress 计算 | ⚠️ 简单实现 | 仅基于 doneTasks/totalTasks，缺少综合计算 |

### 项目管理总览差距评级：中等（约 80% 对齐）
主要缺失：AI 方案立项完整交互、检查全部进度的 UI 反馈面板。

---

## 3. 项目详情 - 甘特/项目健康视图 (project-detail-gantt-v1.png)

### 实现文件
- `src/components/ProjectDetailPage.tsx` (~1378 行)
- `src/styles/project-detail.css`

### 设计图关键元素
- 顶部：项目名、Phase、运行状态、风险、同步时间
- KPI 指标行：总进度、待确认、门禁、测试通过、高风险
- 7 个 Tabs：项目概况、计划与任务、进度视图、风险与决策、角色与流程、协同文件、变更记录
- 甘特图/健康视图
- 右侧抽屉：任务/风险/角色/Gate 详情

### 差距分析

| # | 设计规格 | 实现状态 | 差距说明 |
|---|---------|----------|---------|
| GAP-40 | 顶部状态条 | ✅ 已实现 | Phase/运行状态/风险/同步时间 badge |
| GAP-41 | KPI 指标行 | ✅ 已实现 | 5 个 KPI 指标 |
| GAP-42 | 7 个 Tabs | ✅ 已实现 | 全部 7 个 Tab |
| GAP-43 | 项目概况 Tab | ✅ 已实现 | 描述、信息、协同来源、阶段时间线 |
| GAP-44 | 计划与任务 Tab | ✅ 已实现 | P0-P3 队列、任务表 |
| GAP-45 | 进度视图 Tab（甘特图） | ⚠️ 部分实现 | 使用进度条替代甘特图，非真正甘特图 |
| GAP-46 | 风险与决策 Tab | ✅ 已实现 | 风险矩阵、风险清单（鱼骨图 stub） |
| GAP-47 | 角色与流程 Tab | ✅ 已实现 | 角色卡、步骤矩阵 |
| GAP-48 | 协同文件 Tab | ✅ 已实现 | 文件卡片、同步摘要 |
| GAP-49 | 变更记录 Tab | ✅ 已实现 | 变更日志列表 |
| GAP-50 | 右侧抽屉 | ✅ 已实现 | 任务/风险/角色/Gate 均支持 |
| GAP-51 | loading/empty/error/partial 状态 | ✅ 已实现 | skeleton + empty hint + error |
| GAP-52 | 进度视图看板/阶段时间线 | ❌ 未实现 | 设计图要求甘特图、看板、阶段时间线，目前只有进度条 |
| GAP-53 | 拖拽排序任务 | ❌ 未实现 | 设计图要求拖拽排序 P0-P3 任务 |
| GAP-54 | AiProgressCheckCard | ❌ 未实现 | 设计图中有 AI 进度检查卡片组件 |

### 项目详情差距评级：中等（约 78% 对齐）
主要缺失：真正甘特图、看板、拖拽排序、AI 进度检查卡片。

---

## 4. 项目详情 - 右侧追溯抽屉 (project-detail-trace-drawer-v1.png)

### 实现文件
- `src/components/ProjectDetailPage.tsx` (drawer 部分)

### 设计图关键元素
- 右侧追溯抽屉：展示任务、风险、角色、Gate、协同文件解析详情
- 任务详情：基本信息、验收标准、关联 Gate、来源文件

### 差距分析

| # | 设计规格 | 实现状态 | 差距说明 |
|---|---------|----------|---------|
| GAP-60 | 右侧抽屉基础结构 | ✅ 已实现 | 覆盖层 + slideIn 动画 |
| GAP-61 | 任务详情抽屉 | ✅ 已实现 | 基本信息、验收标准、关联 Gate |
| GAP-62 | 风险详情抽屉 | ✅ 已实现 | 概率/影响/等级/缓解措施 |
| GAP-63 | 角色详情抽屉 | ✅ 已实现 | 角色提示词/能力集/记忆 |
| GAP-64 | Gate 详情抽屉 | ✅ 已实现 | 状态/摘要/决策历史 |
| GAP-65 | 协同文件追溯抽屉 | ❌ 未实现 | 设计图要求 CollaborationFileTraceDrawer，展示来源文件和影响范围 |
| GAP-66 | 记忆存储建议展示 | ❌ 未实现 | 设计图要求在抽屉中展示记忆存储建议 |

### 追溯抽屉差距评级：轻微（约 88% 对齐）
主要缺失：协同文件追溯抽屉、记忆存储建议。

---

## 5. 流程编排 - 双模式 (workflow-builder-dual-mode-v1.png)

### 实现文件
- `src/components/WorkflowBuilder.tsx`
- `src/components/WorkflowCanvas.tsx`
- `src/components/WorkflowNode.tsx`
- `src/components/StepEditModal.tsx`

### 设计图关键元素
- 顶部 segmented control：常规配置 / AI 辅助生成
- 左侧：流程模板列表 + 项目角色池
- 中间：网格流程画布（节点+连线+拖拽排序）
- 右侧：步骤配置面板（角色绑定、Runner/模型/能力、Gate、验收标准）
- AI 辅助生成模式：来源选择、草案生成、差异对比

### 差距分析

| # | 设计规格 | 实现状态 | 差距说明 |
|---|---------|----------|---------|
| GAP-70 | 常规配置 / AI 辅助生成 segmented control | ❌ 未实现 | 当前无此切换控件 |
| GAP-71 | 左侧流程模板列表 | ✅ 已实现 | 模板卡片+新建/复制/删除 |
| GAP-72 | 左侧角色池 | ⚠️ 部分实现 | 展示已绑定角色，缺少未绑定角色的拖拽 |
| GAP-73 | 网格画布背景 | ✅ 已实现 | grid pattern 背景 |
| GAP-74 | 流程节点卡片 | ✅ 已实现 | 可拖拽排序、双击编辑 |
| GAP-75 | 连线（success/failure edge） | ✅ 已实现 | success 绿色连线+箭头 |
| GAP-76 | 步骤配置面板 | ⚠️ 部分实现 | 使用 Modal 而非右侧面板 |
| GAP-77 | 角色绑定 | ✅ 已实现 | 在 StepEditModal 中选择角色 |
| GAP-78 | Runner/模型配置 | ✅ 已实现 | 在 StepEditModal 中配置 |
| GAP-79 | 能力授权矩阵 | ❌ 未实现 | CapabilityAuthorizationMatrix |
| GAP-80 | Gate 配置 | ✅ 已实现 | gateMode auto/manual |
| GAP-81 | 验收标准编辑 | ❌ 未实现 | 设计图要求 GateAndAcceptanceEditor |
| GAP-82 | AI 辅助生成模式 | ❌ 未实现 | 整个 AI 模式（来源选择、草案生成、差异对比） |
| GAP-83 | 流程校验 | ❌ 未实现 | 缺角色/缺 Runner/缺模型/缺验收标准提示 |
| GAP-84 | 应用到项目弹窗 | ❌ 未实现 | 影响范围确认弹窗 |
| GAP-85 | AI 建议框 | ❌ 未实现 | AiFlowSuggestionBox |
| GAP-86 | 模板库 | ✅ 已实现 | 可切换、复制模板 |
| GAP-87 | 插入步骤按钮 | ✅ 已实现 | 步骤间的 ⊕ 按钮 |
| GAP-88 | 拖拽排序 | ✅ 已实现 | 支持 drag and drop 重新排序 |

### 流程编排差距评级：较大（约 55% 对齐）
主要缺失：segmented control、右侧配置面板、能力授权矩阵、验收标准编辑器、AI 辅助生成模式、流程校验、应用到项目弹窗。

---

## 6. 记忆管理 - 知识资产中心 (memory-management-knowledge-center-v1.png)

### 实现文件
- `src/components/MemoryManager.tsx`
- `src/styles/memory-manager.css`

### 设计图关键元素
- 顶部栏：AI 助手记忆整理模式、提炼记忆、导入记忆、导出知识库
- 左侧记忆空间树：项目/角色/知识库 segment
- 中间记忆工作区：KPI 卡片、分类 Tabs、记忆列表
- 右侧 AI 提炼面板：跨项目洞察、知识提取队列、复用建议、记忆审计

### 差距分析

| # | 设计规格 | 实现状态 | 差距说明 |
|---|---------|----------|---------|
| GAP-90 | 三栏布局 | ❌ 未实现 | 当前是两栏（列表+详情），缺少右侧 AI 提炼面板 |
| GAP-91 | 左侧记忆空间树 | ❌ 未实现 | 当前只有 filter buttons，缺少项目/角色/知识库结构树 |
| GAP-92 | 中间 KPI 卡片 | ❌ 未实现 | 无记忆统计卡片 |
| GAP-93 | 中间分类 Tabs（全部/决策记录/角色经验/风险/prompt/流程经验） | ❌ 未实现 | 当前只有 kind filter（all/project/role/task） |
| GAP-94 | 右侧跨项目洞察 | ❌ 未实现 | CrossProjectInsights |
| GAP-95 | 右侧知识提取队列 | ❌ 未实现 | KnowledgeExtractionQueue |
| GAP-96 | 右侧复用建议 | ❌ 未实现 | ReuseSuggestions |
| GAP-97 | 右侧记忆审计面板 | ❌ 未实现 | MemoryAuditPanel |
| GAP-98 | 顶部提炼记忆按钮 | ❌ 未实现 | 当前只有新增记忆 |
| GAP-99 | 顶部导入/导出知识库 | ❌ 未实现 | 无导入导出功能 |
| GAP-100 | 记忆状态 chip（待确认/已确认/已复用/即将过期/已过期） | ⚠️ 部分实现 | 当前 memory 模型缺少 confirmed/reused/expiry 字段 |
| GAP-101 | 置信度展示 | ❌ 未实现 | 无 confidence 字段和展示 |
| GAP-102 | 来源追溯 | ⚠️ 部分实现 | 有 citation 引用列表，无专门追溯抽屉 |
| GAP-103 | 记忆四层结构（项目/角色/知识库/跨项目） | ❌ 未实现 | 当前只有 project/role/task 三层，无 knowledge base 和跨项目 |
| GAP-104 | AI 提炼功能 | ❌ 未实现 | 无 AI 提炼过程和确认队列 |
| GAP-105 | 复用按钮+确认弹窗 | ❌ 未实现 | MemoryReuseButton + ExtractMemoryConfirmationDialog |
| GAP-106 | 过期控制 | ❌ 未实现 | MemoryExpiryControl |
| GAP-107 | 上下移动顺序 | ❌ 未实现 | 无上移/下移操作 |

### 记忆管理差距评级：较大（约 45% 对齐）
主要缺失：三栏布局、记忆空间树、分类 Tabs、右侧 AI 提炼面板、知识库功能、记忆状态/置信度、过期控制。

---

## 总结：各页面差距评级

| 页面 | 对齐度 | 评级 |
|------|--------|------|
| 工作台 | ~90% | ⚡ 轻微差距 |
| 项目管理总览 | ~80% | ⚡ 中等差距 |
| 项目详情 - 甘特 | ~78% | ⚡ 中等差距 |
| 项目详情 - 抽屉 | ~88% | ⚡ 轻微差距 |
| 流程编排 - 双模式 | ~55% | 🔴 较大差距 |
| 记忆管理 - 资产中心 | ~45% | 🔴 较大差距 |

---

## 总任务拆解

按优先级和依赖关系拆解为可执行任务包。

### Phase A：快速对齐（当前差距小，快速修复）

| 任务ID | 页面 | 描述 | 涉及文件 |
|--------|------|------|---------|
| A-01 | 工作台 | Terminal Tab 内容改用动态 mock，去除纯文本 | WorkbenchHome.tsx |
| A-02 | 工作台 | 最近文件改为动态读取（从 domain 层扩展） | WorkbenchHome.tsx, project.ts |
| A-03 | 工作台 | 添加 disabled 状态处理（无权限按钮） | WorkbenchHome.tsx, base.css |
| A-04 | 项目管理 | AI 方案立项 alert 改为基本 UI 框架（面板 + 输入区） | ProjectManagement.tsx |
| A-05 | 项目管理 | 检查全部进度改为 UI 反馈面板而非 alert | ProjectManagement.tsx, project-management.css |
| A-06 | 项目详情 | AI 进度检查卡片（AiProgressCheckCard 组件） | ProjectDetailPage.tsx, project-detail.css |
| A-07 | 项目详情 | 协同文件追溯抽屉 | ProjectDetailPage.tsx, project-detail.css |

### Phase B：中等改造（新功能组件）

| 任务ID | 页面 | 描述 | 涉及文件 |
|--------|------|------|---------|
| B-01 | 项目详情 | 甘特图/看板视图（进度 Tab 重构） | ProjectDetailPage.tsx, project-detail.css |
| B-02 | 项目详情 | 任务拖拽排序 | ProjectDetailPage.tsx, project-detail.css |
| B-03 | 流程编排 | segmented control + 右侧步骤面板（替换 Modal） | WorkflowBuilder.tsx, workflow.css |
| B-04 | 流程编排 | 能力授权矩阵组件 | WorkflowBuilder.tsx, StepEditModal.tsx |
| B-05 | 流程编排 | 验收标准编辑器 | WorkflowBuilder.tsx, StepEditModal.tsx |
| B-06 | 流程编排 | 流程校验逻辑 | WorkflowBuilder.tsx, domain/workflow.ts |
| B-07 | 流程编排 | 应用到项目弹窗 | WorkflowBuilder.tsx |

### Phase C：重大改造（新页面/大重构）

| 任务ID | 页面 | 描述 | 涉及文件 |
|--------|------|------|---------|
| C-01 | 流程编排 | AI 辅助生成模式完整功能（来源选择→草案生成→差异对比→确认） | 新文件 WorkflowAiMode.tsx |
| C-02 | 流程编排 | AiFlowSuggestionBox 组件 | 新文件 |
| C-03 | 记忆管理 | 重构为三栏布局（左树/中列表/右 AI 面板） | MemoryManager.tsx, memory-manager.css |
| C-04 | 记忆管理 | 左侧记忆空间树（项目/角色/知识库 segment） | MemoryManager.tsx |
| C-05 | 记忆管理 | 中间分类 Tabs + KPI 卡片 | MemoryManager.tsx |
| C-06 | 记忆管理 | 右侧 AI 提炼面板（洞察/提取/复用/审计） | 新文件 MemoryIntelligencePanel.tsx |
| C-07 | 记忆管理 | 记忆状态 chip + 置信度展示 + 过期控制 | MemoryManager.tsx, domain/memory.ts |
| C-08 | 记忆管理 | AI 提炼功能 + 确认队列 | MemoryManager.tsx |
| C-09 | 记忆管理 | 记忆复用按钮 + 确认弹窗 | MemoryManager.tsx |
| C-10 | 记忆管理 | 来源追溯抽屉 | 新文件 MemorySourceTraceDrawer.tsx |

### Phase D：数据模型扩展（配合以上功能）

| 任务ID | 描述 | 涉及文件 |
|--------|------|---------|
| D-01 | memory domain 增加 confirmed/reused/expiry/confidence 字段 | domain/memory.ts |
| D-02 | 扩展 workflow step domain，增加验收标准和能力授权字段 | domain/workflow.ts |
| D-03 | 增加 project 协同文件追溯所需字段 | domain/project.ts |
| D-04 | 增加 AI briefing 相关 domain 类型 | domain/project.ts 或新文件 |

---

## 执行建议

1. **Phase A** 可并行执行，预计 1-2 小时完成
2. **Phase B** 建议按 B-03 → B-04/B-05 → B-06 → B-07 顺序，预计 3-4 小时
3. **Phase C** 建议先做 C-03（记忆管理重构）+ C-01（AI 流程），其余可并行，预计 6-8 小时
4. **Phase D** 数据模型扩展应放在 Phase B/C 之前完成
5. 总工作量估计：约 12-16 小时

---

## 下一步行动

1. 审阅此差距分析，确认优先级和范围
2. 开始执行 Phase A（快速对齐）
3. 同步此差距分析到团队协同文件
