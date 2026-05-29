# 项目 MD 体系完整设计

日期：2026-05-16
状态：设计方案
关联：`docs/superpowers/specs/2026-05-16-role-markdown-design.md`

## 完整 MD 类型

一个项目需要 **4 类 MD**，覆盖从项目上下文到步骤级别的行为定义：

| 类型 | 存放位置 | 优先级规则 | 编辑入口 |
|------|---------|-----------|---------|
| **项目 MD** | `Project.projectMarkdown` | 唯一 | 项目工作区 / 新建项目时自动生成 |
| **角色 MD** | `AgentRole.roleMarkdown` → `Project.roleOverrides[roleId]` | 项目级 > 默认 | 角色池 [📝] / 工作区 [📄角色指令] |
| **流程 MD** | `WorkflowTemplate.workflowMarkdown` → `Project.workflowOverrides` | 项目级 > 模板级 | 工作流画布模板 / 步骤编辑模态框 |
| **步骤 MD** | `WorkflowStep.stepMarkdown` | 唯一（模板内定义） | 步骤编辑模态框 |

## 数据模型

```typescript
// project.ts
interface Project {
  projectMarkdown?: string;              // 项目级上下文 MD
  roleOverrides?: Record<string, string>;  // roleId → MD
  workflowOverrides?: string;            // 流程 MD 的项目级覆盖
}

// role.ts
interface AgentRole {
  roleMarkdown?: string;  // 角色默认 MD
  // ... 其他字段
}

// workflow.ts
interface WorkflowTemplate {
  workflowMarkdown?: string;  // 流程全局 MD
  // ... 其他字段
}

interface WorkflowStep {
  stepMarkdown?: string;  // 步骤级 MD
  // ... 其他字段
}
```

## 自动生成规则

### 项目 MD 生成模板
根据 Project 字段自动生成：
```markdown
# {project.name}

**仓库：** {project.repoPath}
**分支：** {project.defaultBranch}
**技术栈：** {project.settings.detectedStack}

## 命令
- 安装：`{installCommand}`
- 测试：`{testCommand}`
- 构建：`{buildCommand}`

## 风险摘要
{project.settings.riskSummary}
```

### 流程 MD 生成模板
```markdown
# {template.name} v{template.version}

**步骤数：** {steps.length}
**人工决策点：** {gateCount}

## 流程规则
- 每个步骤按顺序执行
- 人工决策步骤需要审批后才能继续
- 失败策略在各步骤中定义
```

### 步骤 MD 生成模板
```markdown
# {step.name}

**执行角色：** {roleName}
**模型：** {providerName} / {modelName}

## 输入
{inputs}

## 输出
{outputs}

## 失败策略
{failureStrategy}
```

## 编辑入口汇总

| MD 类型 | 入口 1 | 入口 2 |
|---------|--------|--------|
| **项目 MD** | 项目工作区顶部栏 [📄项目指令] 按钮 | 新建/导入项目时自动生成 |
| **角色 MD** | 工作流画布角色池 [📝] 按钮 | 项目工作区 Agent 栏 [📄角色指令] |
| **流程 MD** | 工作流画布模板信息栏 [📄流程规则] | 步骤编辑模态框中引用查看 |
| **步骤 MD** | 步骤编辑模态框（双击卡片）中的 "步骤规则" 区域 | — |
