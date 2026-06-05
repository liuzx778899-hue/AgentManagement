# Latest Context

更新：2026-05-17 Asia/Shanghai

## 当前一句话

**Phase 1 MVP 全部完成，产品可用性 88%。** 已完成设计图 vs 实现差距审查，流程编排和记忆管理需较大重构对齐设计冻结。

## Phase 1 总体进度

```
P0    ████████████ ✅  导航合并/角色解耦
P1a   ████████████ ✅  IM 适配器
P1b   ████████████ ✅  Git/DevOps 集成
P2    ████████████ ✅  工程标准
P3    ████████████ ✅  工作流画布 V2
P4    ████████████ ✅  项目管理 V3
P4-WS ████████████ ✅  项目工作区 V2
P5    ████████████ ✅  MD 体系
P6    ████████████ ✅  AI 助手 (三态+意图+动作+感知)
P7    ████████████ ✅  Git 同步协作
P8    ████████████ ✅  CLI Runner 选择
═══════════════════════════
Phase 1 MVP 完成 (产品可用 88%)
```

## 关键文档

- 总入口：`README.md`
- 当前状态：`docs/handoff/project-status.md`
- 最新上下文：`docs/handoff/latest-context.md`
- 产品审查：`docs/generated/superpowers/status/2026-05-16-product-readiness-audit.md`
- Phase 2 蓝图：`docs/product/phase-2-blueprint.md`
- 设计冻结入口：`docs/design/design-overview.md`

## 当前验证基线

```
npm test       → 92 passed / 11 files / 0 failures
npm run build  → 146KB CSS + 483KB JS
npx tsc --noEmit → 0 errors
npm run lint   → 0 errors / 0 warnings
```

## 代码规模

| 维度 | 数值 |
|------|------|
| TS/TSX 行数 | ~12,200 |
| CSS 行数 | ~11,600 |
| 组件 | 30 个 |
| Domain 文件 | 13 个 |
| 测试 | 11 文件 / 92 tests |
| Reducer actions | 24 种 |

## P0 修复记录

| 问题 | 修复 |
|------|------|
| WorkflowBuilder CRUD直接mutation | ADD/DELETE_WORKFLOW_TEMPLATE action |
| PwSettingsPanel远端仓库mutation | 改为 updateProject() |
| Settings CliRunner mutation | UPDATE_RUNNER / SET_DEFAULT_RUNNER action |
| ProjectCard splice | 改为走reducer |
| 6处按钮无onClick | 全部补齐 |

## 剩余差距

### Phase 1 设计对齐（新发现）

详见 `docs/design/design-vs-implementation-gap.md`：

- **流程编排**（~55% 对齐）：缺 segmented control、右侧配置面板、能力授权矩阵、AI 辅助生成模式、流程校验
- **记忆管理**（~45% 对齐）：缺三栏布局、记忆空间树、AI 提炼面板、分类 Tabs、置信度/过期控制

### Phase 2 后端依赖

- 8处alert → 需API验证
- Git同步setTimeout → 需真实git命令
- AI助手规则匹配 → 需真实LLM
- 浏览器全流程验收 → 需手动走查

## 注意事项

- 当前目录不是 git 仓库
- 品牌名称：Agent Management
- Phase 1 只做前端，Phase 2 接真实后端
- mock data 必须集中放置在 fixtures 中，不散落在组件里
