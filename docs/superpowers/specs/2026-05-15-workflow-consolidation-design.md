# Workflow Redundancy Consolidation Design

日期：2026-05-15
状态：设计方案
关联：`docs/HANDOFF_NEXT_TASKS.md`

## 目标

消除工作流相关功能的 3 处冗余入口，简化为单一工作流定义入口 + 项目引用。

## 当前问题

| 入口 | 位置 | 功能 | 问题 |
|------|------|------|------|
| 侧边栏「工作流」 | AppShell → WorkflowBuilder | 模板列表 + 步骤编辑 | 与设置中心重叠 |
| 设置中心「工作流库」 | Settings tab | 模板列表（只读） | 与侧边栏功能重复 |
| 设置中心「项目工作流」 | Settings tab | 项目选模板 | 信息量极少，不配独立 tab |

三者关系混乱：用户不知道在哪里定义工作流、在哪里绑定项目。

## 合并后模型

```
侧边栏「工作流」    → 唯一的模板定义入口（增删改查 + 步骤编排 + 绑定角色/模型）
项目管理页面        → 选择引用工作流模板（新建任务自动沿用）
设置中心            → 删掉「工作流库」和「项目工作流」两个 tab
```

### 关系链路

```
工作流模板 ──1:N── 步骤 ──N:1── 角色(Agent)
                              │
                              └── modelProviderId + modelName（已解耦）
     │
     引用（项目中选择）
     │
     ▼
   项目 ──1:N── 任务（任务自动继承项目的工作流）
```

### 导航变化

**侧边栏：** 不变（保留「工作流」入口）

**设置中心标签页：** 7 → 5

```
之前：用户偏好 → 项目设置 → 模型配置 → 角色库 → 工作流库 → 项目工作流 → 能力中心
之后：用户偏好 → 项目设置 → 模型配置 → 能力中心 → IM 适配器
```

角色库已在 P0 中移到项目级，工作流库和项目工作流本次删除。

## 代码变更

| 操作 | 文件 | 说明 |
|------|------|------|
| MODIFY | `src/components/Settings.tsx` | SettingsTab 删 `"workflows"` 和 `"project-workflow"`；删对应渲染代码；tab 数组 7→5 |
| MODIFY | `src/components/WorkflowBuilder.tsx` | 移除 `launcherProfiles` 引用；步骤角色信息用 `role.modelProviderId`/`role.modelName` 展示 |
| MODIFY | `src/__tests__/integration.test.tsx` | 更新 Settings tab 数量断言 |

## 与非本次变更的关系

- **P0 项目管理合并**将在新 `ProjectManagement` 组件中实现"项目选择工作流模板"功能，本方案不涉及
- **P0 角色模型解耦**已为 WorkflowStep/AgentRun 添加 modelProviderId/modelName，WorkflowBuilder 本次利用这些字段
- **P2 工程标准**中将进一步拆分 domain 文件，workflow.ts 独立

## 验收标准

- [ ] 设置中心只有 5 个 tab（不含工作流库、项目工作流）
- [ ] 侧边栏「工作流」页面功能完整可用
- [ ] WorkflowBuilder 不再引用 `launcherProfiles`
- [ ] `npm test` 全部通过
- [ ] `npm run build` 通过
