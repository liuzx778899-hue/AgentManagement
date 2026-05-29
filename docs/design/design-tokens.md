# Agent 工程管理系统 - Design Tokens

更新时间：2026-05-17  
用途：前端实现必须优先使用本文件定义的颜色、字体、间距、圆角、阴影和状态，不要随意写魔法值。

## 1. 设计风格

产品类型：工程管理 / AI 协作 / CLI 工作台 / 企业级 SaaS  
视觉关键词：深色、紧凑、专业、工程感、低装饰、高信息密度  
避免：大面积营销 hero、渐变装饰球、过度卡片化、单一紫蓝色堆叠、无意义插画。

### 1.1 全局 UI 基准

全局前端 UI 必须以 `workbench-v1` 工作台为基准。工作台不是一个孤立页面，而是整个系统的视觉母版。

统一原则：

- 左侧一级导航、顶部面包屑栏、页面内容起点、字体、图标、按钮高度、边框、圆角和颜色必须保持一致。
- 从 `工作台` 切换到 `流程管理`、`项目管理`、`记忆管理`、`设置中心` 时，左侧导航位置、顶部栏高度、页面内容左上起点不能明显跳动。
- 页面可以有自己的业务内容，但不能重新定义一套独立的标题栏、导航栏、卡片密度或图标体系。
- 所有页面默认使用同一个 `AppShell`：左侧 Sidebar + 顶部 Topbar + 内容区 Content。
- 只有工作台可以在内容区内部增加第二层执行 Topbar，但该 Topbar 的高度、按钮、图标和颜色仍必须继承本规范。

### 1.2 全局 Shell 尺寸

| 区域 | 桌面端规范 | 说明 |
| --- | --- | --- |
| Sidebar 宽度 | `256px` | 所有一级页面一致 |
| Sidebar collapsed 宽度 | `72px` | 只保留图标 |
| App Topbar 高度 | `64px` | 全局面包屑和右侧状态 |
| 内容区 padding | `24px` | 常规管理页面使用 |
| 工作台内容 padding | `0` | 工作台需要 full-bleed 执行区 |
| 页面标题区高度 | `auto`，但首行基线固定 | 标题不能导致页面内容忽上忽下 |
| 右侧面板宽度 | `278px` / `360px` / `420px` | 工作台 278px，管理分析页 360-420px |

全局 Shell 结构：

```text
AppShell
├─ Sidebar
│  ├─ ProductBrand
│  └─ PrimaryNav
└─ MainArea
   ├─ AppTopbar
   │  ├─ Breadcrumb
   │  └─ GlobalStatus
   └─ Content
      └─ Page
```

禁止：

- 某个页面自己再创建一个与 AppTopbar 位置冲突的顶部导航。
- 页面内容从不同 x/y 坐标开始，导致切页时视觉跳动。
- 用大号页面标题替代全局面包屑。
- 在普通管理页里复刻工作台的执行 Topbar。

### 1.3 页面标题规范

所有一级页面标题由 `AppTopbar` 承担：

- 左侧：`AgentDevelop / 当前页面`
- 当前页面字体：14px，font-weight 700，颜色 `--text`
- 上级面包屑字体：13.5px，font-weight 500，颜色 `--muted`
- 分隔符颜色：`--line`
- 右侧状态 chip：使用 12px，颜色 `--muted`，边框 `--line-soft`

页面内容内部如需标题，只能作为业务区块标题：

- 区块标题：18px / 26px，font-weight 700
- 卡片标题：15px / 22px，font-weight 650
- 不允许每个页面自行设置超大 H1，除非是独立文档或空状态。

### 1.4 导航规范

Sidebar 视觉必须保持稳定：

- Logo 尺寸：36px × 36px
- 导航项高度：44px
- 导航项内边距：`0 12px`
- 导航图标容器：26px × 26px
- 导航图标：15px，stroke-width 2.2
- 导航文字：13.5px，font-weight 550
- 导航项间距：2px 到 8px，页面间不得不同
- Active 状态：`--primary-glow` 背景 + 左侧 3px primary 指示条 + 图标容器 primary 背景
- Hover 状态：`--surface` 背景，文字 `--text-secondary`

一级导航固定顺序：

```text
工作台
流程管理
项目管理
记忆管理
设置中心
```

禁止：

- 页面内部新增与一级导航重复的侧栏。
- 不同页面切换时改变 Sidebar 宽度、字号、图标尺寸或 active 样式。
- 使用字母缩写、emoji、方块字符代替语义图标。

### 1.5 图标规范

全局图标库统一使用 `lucide-react`。

规则：

- 不新增第二套图标库，除非有明确产品原因并写入设计变更。
- 不使用 emoji、特殊字符、字母缩写作为功能图标。
- 常规图标尺寸：14px / 15px / 16px。
- 一级导航图标：15px。
- 工具栏按钮图标：14px。
- 卡片标题图标：16px。
- 品牌 Logo 图标：18px。
- stroke-width：普通 2，导航 2.2，品牌 2.4。
- icon-only 按钮必须有 `aria-label` 或 `title`。

推荐语义映射：

| 场景 | Lucide 图标 |
| --- | --- |
| 工作台 | `Home` |
| 流程管理 | `GitBranch` / `Workflow` |
| 项目管理 | `FolderGit2` |
| 记忆管理 | `MemoryStick` / `Database` |
| 设置中心 | `Settings` |
| 项目 | `FolderGit2` |
| 项目提示词 | `FileText` |
| 分支 / worktree | `GitBranch` |
| 阶段 / 运行态 | `CircleDot` |
| 已保存 / 完成 | `CircleCheck` / `CheckCircle2` |
| 启动 | `Play` |
| 恢复 | `RotateCcw` |
| 保存 | `Save` |
| 关闭 | `XCircle` |
| Terminal | `Terminal` |
| MCP | `Puzzle` |
| Skills | `Zap` |
| Git | `GitBranch` |
| 快照 | `Camera` |
| 角色记忆 | `Brain` |
| 项目记忆 | `Database` |
| 最近文件 | `FileCode2` |
| 右侧面板展开/收起 | `PanelRightOpen` / `PanelRightClose` |

### 1.6 页面切换稳定性

浏览器验收必须检查页面切换稳定性：

- 从工作台切到流程管理，Sidebar 不移动、不变宽、不变字号。
- AppTopbar 高度保持 64px。
- 面包屑位置保持一致。
- 内容区左上角起点一致：普通页面从 `24px, 24px` 开始；工作台为 full-bleed，但内部执行 Topbar 仍从内容区原点开始。
- 图标风格保持 lucide 线性风格。
- 背景色、边框色和 active 状态不跳变。

### 1.7 100% 缩放与管理页密度

所有定稿页面必须按浏览器 `100%` 缩放设计和验收。不得要求用户把浏览器缩放到 `80%` 才能看到完整页面。

禁止：

- 使用全页 `transform: scale(.8)`、`zoom: .8` 或类似视觉缩放作为布局方案。
- 用放大后的虚拟画布再缩小显示，导致点击区域、滚动区域和视觉区域不一致。
- 让普通管理页在 `1920x1080` 视口下出现页面级横向或纵向溢出。

验收标准：

- `document.documentElement.scrollWidth <= window.innerWidth`
- `document.documentElement.scrollHeight <= window.innerHeight`
- 普通管理页的主要内容在 100% 缩放下可完整看到；局部列表可以内部滚动，但页面整体不应被撑出视口。

流程管理总览 v1 的当前密度基准：

- HTML 原型：`docs/design/mockups/flow-management-overview-v1.html`
- Sidebar：原型为 `230px`，实际 React 实现如使用全局 `256px` Sidebar，必须相应压缩内容区而不是要求浏览器缩放。
- AppTopbar：`64px`
- 基础字号：约 `12.5px - 13.5px`
- 工具按钮高度：约 `30px`
- 卡片圆角：`8px`
- 页面禁止底部解释性大图占位，优先展示可操作的流程资产列表。

## 2. 色彩

与现有 `src/styles/tokens.css` 对齐。

### 背景

| Token | Value | 用途 |
| --- | --- | --- |
| `--bg` | `#0c0e12` | 页面背景 |
| `--bg-elevated` | `#12151a` | 顶部栏/侧栏/浮层背景 |
| `--surface` | `#181c23` | 主卡片背景 |
| `--surface-2` | `#1f242d` | 次级卡片、按钮背景 |
| `--surface-3` | `#272d38` | hover/active 背景 |
| `--surface-4` | `#2f3642` | 强调面板背景 |

### 边框

| Token | Value | 用途 |
| --- | --- | --- |
| `--line` | `#2a3140` | 默认边框 |
| `--line-soft` | `#222833` | 弱边框 |
| `--line-subtle` | `#1a1f28` | 分割线 |

### 文本

| Token | Value | 用途 |
| --- | --- | --- |
| `--text` | `#f0f4f8` | 主标题和关键数字 |
| `--text-secondary` | `#c4cdd8` | 正文 |
| `--muted` | `#8a96a8` | 说明、次要标签 |
| `--faint` | `#5a6778` | 占位、弱提示 |
| `--disabled` | `#4a5568` | 禁用态 |

### 语义色

| Token | Value | 用途 |
| --- | --- | --- |
| `--primary` | `#5b8def` | 主操作、选中、链接 |
| `--primary-hover` | `#6d9cf2` | 主操作 hover |
| `--primary-2` | `#4fd1a5` | 成功/同步/健康 |
| `--accent` | `#7c6cf0` | AI、能力、辅助强调 |
| `--warn` | `#f0a050` | Gate、待确认、中风险 |
| `--danger` | `#f05050` | 错误、高风险、删除 |
| `--ok` | `#40d090` | 完成、通过 |
| `--violet` | `#a088f0` | 模型/角色辅助色 |

### Glow

| Token | Value |
| --- | --- |
| `--primary-glow` | `rgba(91, 141, 239, 0.15)` |
| `--primary-2-glow` | `rgba(79, 209, 165, 0.12)` |
| `--accent-glow` | `rgba(124, 108, 240, 0.12)` |
| `--warn-glow` | `rgba(240, 160, 80, 0.12)` |
| `--danger-glow` | `rgba(240, 80, 80, 0.12)` |
| `--ok-glow` | `rgba(64, 208, 144, 0.12)` |

## 3. 字体

| Token | Value | 用途 |
| --- | --- | --- |
| `--font` | `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif` | UI 主字体 |
| `--mono` | `"JetBrains Mono", "SF Mono", "Fira Code", Consolas, monospace` | Terminal、代码、日志 |

字号建议：

| 名称 | 尺寸 | 行高 | 用途 |
| --- | --- | --- | --- |
| Page Title | 24px | 32px | 页面主标题 |
| Section Title | 18px | 26px | 区块标题 |
| Card Title | 15px | 22px | 卡片标题 |
| Body | 14px | 22px | 正文 |
| Small | 12px | 18px | 标签、辅助信息 |
| Mono | 13px | 20px | Terminal 和日志 |

规则：

- 不使用 viewport width 缩放字体。
- letter-spacing 默认 0。
- 按钮文字不小于 13px。
- 卡片内标题不使用 hero 级字号。

## 4. 间距

沿用 4px 基础栅格。

| Token | Value | 用途 |
| --- | --- | --- |
| `--space-xs` | `4px` | 极小间隔 |
| `--space-sm` | `8px` | 组件内间距 |
| `--space-md` | `12px` | 表单/按钮内边距 |
| `--space-lg` | `16px` | 卡片内边距 |
| `--space-xl` | `24px` | 区块间距 |
| `--space-2xl` | `32px` | 页面大区间距 |

布局建议：

- 页面左右 padding：24px 到 32px。
- 卡片内边距：16px 或 20px。
- 表单行间距：16px。
- 工具栏按钮间距：8px。
- 管理台账表格行高：44px 到 52px。
- Terminal Workspace 与右侧面板间距：12px。

## 5. 圆角

| Token | Value | 用途 |
| --- | --- | --- |
| `--radius-sm` | `6px` | 按钮、输入框、chip |
| `--radius` | `10px` | 标准卡片 |
| `--radius-lg` | `14px` | 大面板、抽屉 |
| `--radius-xl` | `20px` | 大弹窗，不常用 |

规则：

- 常规卡片建议 8px 到 10px。
- 不使用过度圆润的营销风格卡片。
- 嵌套卡片要谨慎，避免卡片套卡片。

## 6. 阴影

| Token | Value | 用途 |
| --- | --- | --- |
| `--shadow-sm` | `0 1px 3px rgba(0, 0, 0, 0.25)` | 轻微浮起 |
| `--shadow-md` | `0 4px 12px rgba(0, 0, 0, 0.35)` | 抽屉、弹窗 |
| `--shadow-lg` | `0 12px 32px rgba(0, 0, 0, 0.45)` | 大浮层 |
| `--shadow-glow` | `0 0 24px rgba(91, 141, 239, 0.15)` | 选中状态辅助 |

规则：

- 深色界面主要靠边框和层级，不要依赖强阴影。
- Floating 右侧面板可使用 `--shadow-lg`。

## 7. 状态色规则

| 状态 | 主色 | 背景 |
| --- | --- | --- |
| 已完成 | `--ok` | `--ok-glow` |
| 运行中 | `--primary` | `--primary-glow` |
| 待确认 / Gate | `--warn` | `--warn-glow` |
| 待处理 | `--muted` | `--surface-2` |
| 高风险 / 错误 | `--danger` | `--danger-glow` |
| AI 生成 / 建议 | `--accent` | `--accent-glow` |
| 记忆已确认 | `--ok` | `--ok-glow` |
| 记忆待确认 | `--warn` | `--warn-glow` |
| 记忆已复用 | `--primary-2` | `--primary-2-glow` |
| 记忆即将过期 | `--warn` | `--warn-glow` |
| 记忆已过期 / 失效 | `--danger` | `--danger-glow` |

## 8. 组件规格

### 按钮

- 默认高度：36px。
- 紧凑按钮：32px。
- 主按钮背景：`--primary`。
- 次级按钮背景：`--surface-2`。
- 危险按钮使用 `--danger` 或 danger outline。
- icon-only 按钮必须有 tooltip 或 aria-label。

### Chip

- 高度：24px 到 28px。
- 圆角：`--radius-sm`。
- 字号：12px。
- 用于状态、来源、风险、Phase、Runner、模型。

### 卡片

- 背景：`--surface`。
- 边框：`1px solid var(--line-soft)`。
- 圆角：`--radius`。
- 标准 padding：16px。
- hover 卡片可升高边框亮度，不改变尺寸。

### Tabs

- 设置中心、能力中心、IM/Git 认证页的 tab 样式需要统一。
- Tab 高度：48px 到 56px。
- active 背景：`--surface-3`。
- active 文本：`--text`。
- inactive 文本：`--muted`。
- icon 使用 lucide-react 对应语义图标。

### 抽屉

- 默认宽度：360px 到 420px。
- 背景：`--bg-elevated`。
- 边框：`1px solid var(--line)`。
- 可关闭，Esc 支持。
- 用于任务、风险、角色、Gate、协同文件详情。

### 表格/队列

- 行高：44px 到 52px。
- 表头颜色：`--muted`。
- 支持排序/优先级调整。
- 状态使用 chip，不只依赖颜色。

### 记忆管理

- 采用三栏布局：左侧 260px 到 320px，中间自适应，右侧 360px 到 420px。
- 左侧记忆树使用 `--surface` 背景，active 项使用 `--primary-glow` 和 `--primary` 边框。
- 中间记忆卡片使用 `--surface`，hover 时只增强边框和背景，不改变尺寸。
- 右侧 AI 提炼面板使用 `--bg-elevated`，AI 建议使用 `--accent-glow`。
- 记忆状态必须使用 chip + 图标 + 文案，不能只靠颜色表达。
- 置信度建议用 small progress 或数字百分比，颜色映射到 ok/warn/danger。
- 来源、引用项目、更新时间使用 `--muted`，不要与标题抢层级。
- 过期记忆保留可读性，使用 danger chip，不整卡置灰到不可读。
- 来源追溯抽屉宽度 400px 到 480px，用于展示来源文件、协同记录和应用影响范围。

### Terminal

- 背景接近 `#080b0f`。
- 字体使用 `--mono`。
- 行高 20px。
- Terminal Toolbar 置于标题栏右侧。
- Terminal 区域必须是工作台最大视觉重心。

## 9. 响应式规则

### Desktop >= 1440px

- 使用左侧固定导航 + 主内容 + 可选右侧面板。
- 工作台 Terminal Workspace 占主要宽度。
- 项目详情可显示右侧抽屉。

### Laptop 1024px - 1439px

- 保留左侧导航。
- 右侧面板默认可折叠。
- 项目详情抽屉可覆盖内容，而不是占固定列。

### Tablet 768px - 1023px

- 左侧导航收窄为图标。
- 项目卡片从三列变两列。
- 工作台右侧面板默认自动隐藏。
- Terminal Toolbar 可折叠为更多菜单。

### Mobile < 768px

- Phase 1 不要求完整移动端体验，但不能横向溢出。
- 左侧导航改为顶部或抽屉。
- 项目卡片单列。
- 项目详情 Tabs 可横向滚动。
- Terminal Workspace 以单列显示，右侧状态面板只作为底部抽屉。

## 10. 可访问性

- 正文对比度至少 4.5:1。
- 交互控件最小点击区域 36px，移动端 44px。
- 所有图标按钮必须有可读标签或 tooltip。
- 不能只用颜色表达状态，需要文字或图标。
- Focus ring 不可移除。
- 支持键盘关闭弹窗和抽屉。
## 11. AppShell Baseline / 页面左上间距基线

This section is the mandatory spacing standard for all future pages. The latest Workbench page is the source of truth.

| Area | Value | Requirement |
| --- | --- | --- |
| Global AppTopbar height | `64px` | Owned by `AppShell`; do not duplicate it inside pages. |
| Secondary context header height | `58px` | Match `.wb-topbar` exactly when a page needs a workbench-like toolbar. |
| Secondary header padding | `0 22px 0 12px` | Match `.wb-topbar` horizontal rhythm. |
| Content left inset | `10px` | First visible panel/card/canvas starts 10px from content area's left edge. |
| Content top inset | `10px` | First visible panel/card/canvas starts 10px below secondary header or compact title row. |
| Compact title row | `padding: 10px 10px 8px` | Use for design/editing pages such as Workflow Management. |
| Full-bleed page `.content` padding | `0` | Workbench and canvas-heavy pages manage spacing internally. |

Implementation rules:

- `工作台` uses `.content:has(.wb-cockpit) { padding: 0; }`.
- `流程管理` must use `.content:has(.workflow-builder-v2) { padding: 0; }`.
- Do not combine outer `.content` padding with page-level `margin-left`, `padding-left`, `margin-top`, or `padding-top`.
- Breadcrumb, secondary toolbar controls, page title, and main panels must keep stable x/y alignment when switching pages.
- New pages with a secondary toolbar must copy the Workbench baseline first, then change only business actions.

Acceptance:

- Switching `工作台 -> 流程管理` must not create a visible top/left jump.
- Sidebar width, AppTopbar height, secondary header height, and first content left edge stay visually aligned.
- If a page needs more whitespace, add it inside its panel, not before the first panel.
## Compact Density Baseline - 2026-05-19

This project uses a compact desktop density. Browser zoom must remain `100%`; do not rely on browser zoom or `transform: scale(.8)` to achieve the intended product density.

The visual target is: **100% browser zoom should look close to the previous 80% browser zoom screenshot**.

Mandatory density tokens:

| Token | Value | Requirement |
| --- | --- | --- |
| `--font-size-base` | `12px` | Default app text size. |
| `--line-height-base` | `1.45` | Compact but readable line height. |
| `--control-height` | `30px` | Default input/select/button height. |
| `--control-height-sm` | `26px` | Compact chips and small toolbar buttons. |
| `--secondary-toolbar-height` | `46px` | Workbench and Workflow Management secondary topbar height. |
| `--page-inset` | `8px` | First panel/canvas inset from the page content edge. |
| `--panel-gap` | `8px` | Default gap between dense work panels. |
| `--card-padding` | `10px` | Standard dense card padding. |

Updated AppShell baseline:

- Secondary context header height is `46px`, not `58px`.
- Secondary header padding is `0 18px 0 10px`.
- Canvas-heavy pages must use `.content { padding: 0; }` and manage their own `8px` inner inset.
- Workbench and Workflow Management must share the same x/y origin after the secondary topbar.
- Preferred compact widths: Workbench right panel `262px`, Workflow resource panel `236px`, Workflow inspector panel `264px`.
- Toolbar buttons use `28px` height and `11px-12px` text.
- Flow/work cards use `7px` radius and `8px-12px` internal padding.

Acceptance:

- At browser zoom `100%`, Workbench and Workflow Management should match the density the user previously preferred at browser zoom `80%`.
- Switching between Workbench and Workflow Management must not visibly shift the topbar, left edge, title row, or first panel origin.
- New pages must follow this compact density unless a product decision explicitly marks the page as a reading/document page.

## 最新 Token 补充：AI 流程设计密度规则 - 2026-05-19

本节用于约束 `流程管理 / AI 流程设计` 与后续同类 AI 工作区页面的视觉密度。实现时必须先读取本文件，不得直接在组件中随意写魔法值。

### 三栏 AI 工作区尺寸

| Token 建议 | 值 | 用途 |
| --- | --- | --- |
| `--ai-workspace-left` | `330px` | 左侧讨论区宽度 |
| `--ai-workspace-center-min` | `760px` | 中间分析与草案区最小宽度 |
| `--ai-workspace-right` | `348px` | 右侧差异/输出面板宽度 |
| `--ai-workspace-gap` | `10px` | 三栏间距 |
| `--ai-panel-radius` | `8px` | AI 工作区主面板圆角 |
| `--ai-inner-card-radius` | `7px` | 面板内卡片圆角 |

### AI 流程草案画布

| Token 建议 | 值 | 用途 |
| --- | --- | --- |
| `--ai-draft-canvas-height` | `248px` | 流程草案画布高度 |
| `--ai-draft-node-width` | `118px` | 流程节点宽度 |
| `--ai-draft-node-height` | `194px` | 流程节点高度 |
| `--ai-draft-node-gap` | `14px` | 节点与连接箭头间距 |
| `--ai-draft-node-padding` | `10px` | 节点内边距 |
| `--ai-draft-node-title` | `14px` | 节点标题字号 |
| `--ai-draft-node-field` | `11px` | 节点字段字号 |

### 右侧辅助面板密度

右侧差异与确认面板是辅助信息区，视觉权重必须低于中间主画布。

| Token 建议 | 值 | 用途 |
| --- | --- | --- |
| `--ai-side-stat-min-height` | `78px` | 右侧统计卡最小高度 |
| `--ai-side-stat-number` | `22px` | 右侧统计数字字号 |
| `--ai-side-row-min-height` | `47px` | 差异列表行最小高度 |
| `--ai-side-row-title` | `12px` | 差异标题字号 |
| `--ai-side-row-text` | `11px` | 差异说明字号 |
| `--ai-side-check-height` | `25px` | 确认项行高 |
| `--ai-side-action-height` | `48px` | 底部操作按钮高度 |

### 资料列表与输入区密度

| Token 建议 | 值 | 用途 |
| --- | --- | --- |
| `--ai-file-row-height` | `25px` | 已添加资料行高 |
| `--ai-file-name-size` | `11px` | 文件名字号 |
| `--ai-file-ext-size` | `10px` | 文件类型字号 |
| `--ai-composer-action-height` | `30px` | 添加资料/粘贴内容按钮高度 |
| `--ai-composer-send-height` | `34px` | 发送按钮高度 |
| `--ai-composer-icon-size` | `15px` | 输入区按钮图标尺寸 |

### 禁止项

- 不允许右侧辅助面板使用与中间主画布相同的字号层级。
- 不允许节点内容被裁切或通过隐藏 overflow 掩盖问题。
- 不允许资料列表出现文件名、扩展名、图标互相挤压。
- 不允许 AI 流程设计页在 100% 浏览器缩放下依赖 80% 缩放才能看起来正常。
