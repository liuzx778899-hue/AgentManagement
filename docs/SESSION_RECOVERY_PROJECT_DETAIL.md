# Session Recovery: Project Detail Page

Date: 2026-05-25

## Current Goal

Continue aligning the real project detail page with the design mockup:

- Design mockup: `docs/design/mockups/project-detail-trace-drawer-v1.html`
- Real page: `http://127.0.0.1:5173/#project-detail`

The page should visually follow the mockup proportions, spacing, tab content layout, and persistent right detail drawer.

## Important Context

The current long Codex thread has become unstable and can make the Codex desktop app freeze. Continue work in a fresh thread and read this file first.

Do not rely on the full chat history. Use these files as source of truth:

- `docs/HANDOFF_NEXT_TASKS.md`
- `docs/design/DESIGN_OVERVIEW.md`
- `docs/design/PAGE_SPEC.md`
- `docs/design/design-tokens.md`
- `docs/frontend/FRONTEND_IMPLEMENTATION_PLAN.md`
- `docs/design/mockups/project-detail-trace-drawer-v1.html`

## Files Already Modified

- `src/App.tsx`
- `src/components/ProjectDetailPage.tsx`
- `src/styles/project-detail.css`

## Fixes Already Applied

### Direct Route Fix

`http://127.0.0.1:5173/#project-detail` previously opened blank when no project id was selected.

`src/App.tsx` now falls back to the first project id so the detail page can render directly.

### Right Drawer Fix

The project detail drawer was changed from a global/fixed layout into a page-contained drawer:

- it stays inside the project detail page area
- it no longer collides with the global top bar
- it remains visible while the main content changes

### Overview Tab Rework

The `项目概况` tab was rebuilt toward the mockup structure:

- `项目基本信息`
- `计划摘要`
- `协同来源`

### Tab/Timeline Layout Work

The latest intended behavior is:

- the tab content area should be stable
- the bottom phase timeline should be stable
- switching tabs should not push the timeline down
- content-heavy tabs should scroll internally

The latest CSS direction moved away from a too-small fixed content box and back toward the mockup ratio:

- tab content area about 510px high at 1920x1080
- bottom timeline about 118px high
- timeline remains near the bottom of the working page area

## Current User Feedback

The user says the current real page still does not match the design well enough. Specific feedback from the latest screenshots:

1. The design mockup looks more naturally balanced.
2. `风险与决策`, `角色与流程`, and `协同文件` tabs should follow the screenshot mockup style.
3. The tab content area and bottom timeline should feel like fixed regions in the design, but not create a large empty unused area.
4. Avoid tiny cramped content or unnecessary scrollbars in the overview tab.
5. The real page should not feel like a mechanically fixed layout; it should preserve the design mockup's visual proportions.

## Immediate Next Task

Implement the following tabs to match the mockup screenshots:

### 1. 风险与决策

Target layout:

- Left large panel: `风险与决策 · SWOT 分析`
- SWOT grid 2x2:
  - `S 优势`
  - `W 劣势`
  - `O 机会`
  - `T 威胁`
- Right panel: `风险矩阵`
  - 2x2 matrix: 高概率/低概率 x 高影响/低影响
  - `待决策 Gate` card with `进入决策` button
- Bottom phase timeline remains below this content, same fixed location.

### 2. 角色与流程

Target layout:

- Main panel title: `角色与流程`
- Left column: `项目角色池`
  - 5 roles
  - compact role cards with badge, role name, description, model/runner pill
- Right area: `流程绑定关系`
  - horizontal workflow cards
  - 01 需求分析 -> 02 UI/UX 设计 -> 03 前端开发 -> 04 代码审查 -> 05 测试验证
  - line should be visually centered and harmonious
- No page-level layout jump when switching into this tab.

### 3. 协同文件

Target layout:

- Left large panel: `协同文件`
  - `同步协同文件` button
  - large file rows:
    - `HANDOFF_NEXT_TASKS.md`
    - `CODE_REVIEW_AND_FIX_REQUESTS.md`
    - `FRONTEND_IMPLEMENTATION_PLAN.md`
  - each row should have document icon, description, time pill
- Right panel: `AI 解析摘要`
  - short summary of what current collaborative files say
- Keep spacing, font size, card radius, and colors aligned with the mockup.

## Layout Rules To Preserve

- The global app shell style must remain consistent with the workbench standard.
- Do not reintroduce `--page-scale: .8` or `transform: scale(.8)`.
- Do not depend on browser zoom 80%.
- At 100% browser zoom and 1920x1080, the page should look close to the mockup density.
- The right drawer must stay contained in the page and must not overlap global navigation.
- The tab content area and bottom timeline must not jump vertically when switching tabs.
- If a tab has more content than the visible area, scroll inside `.pd-tab-content`, not the whole page.

## Verification Commands

Run:

```powershell
npm --cache .npm-cache run build
```

Optional visual check with Playwright:

- open `http://127.0.0.1:5173/mockups/project-detail-trace-drawer-v1.html`
- open `http://127.0.0.1:5173/#project-detail`
- compare at 1920x1080, browser zoom 100%

## Known Test Note

Earlier, `npm --cache .npm-cache test -- --run` showed an unrelated failure in `workflow-canvas.test.tsx` expecting the empty-state text `请选择一个流程模板`.

That failure is not part of the project detail page work unless it still appears after the new changes and is proven related.

## Suggested Prompt For Fresh Thread

```text
工作目录：D:\work\vibecode\AgentDevelop

请先读取：
docs/SESSION_RECOVERY_PROJECT_DETAIL.md
docs/design/mockups/project-detail-trace-drawer-v1.html
docs/design/DESIGN_OVERVIEW.md
docs/design/PAGE_SPEC.md
docs/frontend/FRONTEND_IMPLEMENTATION_PLAN.md

当前任务：
只调整项目详情页 #project-detail，让它对齐 project-detail-trace-drawer-v1.html。
重点修复 风险与决策 / 角色与流程 / 协同文件 三个 tab 的布局和视觉。
不要改其它页面，不要重新引入 80% 缩放方案。
完成后运行 npm --cache .npm-cache run build，并用浏览器截图对比。
```
