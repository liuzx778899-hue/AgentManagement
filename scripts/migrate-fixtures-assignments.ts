/**
 * Fixtures 迁移脚本
 * Issue #41: WorkflowStep 模型迁移 - 添加 assignments 数组
 *
 * 将旧的 roleId/modelProviderId/modelName 格式转换为 assignments 数组格式
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface OldWorkflowStep {
  id: string;
  order: number;
  name: string;
  roleId: string;
  modelProviderId: string;
  modelName: string;
  inputs: string[];
  outputs: string[];
  gateMode: string;
  gateType?: string;
  failureStrategy: string;
  stepMarkdown?: string;
  projectOverride: boolean;
  runnerId?: string;
}

interface NewWorkflowStepAssignment {
  id: string;
  order: number;
  roleId: string;
  runnerId?: string;
  modelProviderId: string;
  modelName: string;
  goal: string;
  acceptanceCriteria: string[];
  inputs: string[];
  outputs: string[];
  dependsOnAssignmentIds?: string[];
  notifyAssignmentIds?: string[];
  eventRoutes?: { trigger: string; targetAssignmentId?: string; action: string }[];
}

interface NewWorkflowStep {
  id: string;
  order: number;
  name: string;
  description?: string;
  assignments: NewWorkflowStepAssignment[];
  inputs: string[];
  outputs: string[];
  gateMode: string;
  gateType?: string;
  failureStrategy: string;
  stepMarkdown?: string;
  projectOverride: boolean;
}

interface OldWorkflowTemplate {
  id: string;
  name: string;
  version: number;
  status?: string;
  category?: string;
  steps: OldWorkflowStep[];
  workflowMarkdown?: string;
  versions?: any[];
  createdAt: string;
  updatedAt: string;
  roles?: any[];
}

interface NewWorkflowTemplate {
  id: string;
  name: string;
  version: number;
  status?: string;
  category?: string;
  steps: NewWorkflowStep[];
  workflowMarkdown?: string;
  versions?: any[];
  createdAt: string;
  updatedAt: string;
  roles?: any[];
}

function convertStep(oldStep: OldWorkflowStep, stepIndex: number): NewWorkflowStep {
  const assignmentId = `${oldStep.id}-assign-0`;

  // 构建 notifyAssignmentIds - 下一个 step 的第一个 assignment
  const notifyAssignmentId = `${oldStep.id.replace(/\d+$/, String(stepIndex + 2))}-assign-0`;

  const assignment: NewWorkflowStepAssignment = {
    id: assignmentId,
    order: 0,
    roleId: oldStep.roleId,
    runnerId: oldStep.runnerId || 'runner-claude-code',
    modelProviderId: oldStep.modelProviderId,
    modelName: oldStep.modelName,
    goal: oldStep.name,
    acceptanceCriteria: [],
    inputs: oldStep.inputs,
    outputs: oldStep.outputs,
    dependsOnAssignmentIds: [],
    notifyAssignmentIds: stepIndex < 4 ? [notifyAssignmentId] : [], // 最后一个不通知
    eventRoutes: [],
  };

  return {
    id: oldStep.id,
    order: oldStep.order,
    name: oldStep.name,
    assignments: [assignment],
    inputs: oldStep.inputs,
    outputs: oldStep.outputs,
    gateMode: oldStep.gateMode,
    gateType: oldStep.gateType,
    failureStrategy: oldStep.failureStrategy,
    stepMarkdown: oldStep.stepMarkdown,
    projectOverride: oldStep.projectOverride,
  };
}

function convertTemplate(old: OldWorkflowTemplate): NewWorkflowTemplate {
  return {
    id: old.id,
    name: old.name,
    version: old.version,
    status: old.status,
    category: old.category,
    steps: old.steps.map((step, index) => convertStep(step, index)),
    workflowMarkdown: old.workflowMarkdown,
    versions: old.versions,
    createdAt: old.createdAt,
    updatedAt: old.updatedAt,
    roles: old.roles,
  };
}

// 执行转换
const fixturesPath = join(process.cwd(), 'src/data/fixtures.ts');
const content = readFileSync(fixturesPath, 'utf-8');

// 手动转换 workflow templates 部分
// 这里输出转换后的 JSON，然后手动替换到 fixtures.ts

const templates = [
  {
    id: "software-dev-v1",
    name: "软件开发完整流程",
    version: 1,
    status: "enabled",
    steps: [
      { id: "step-001", order: 1, name: "需求分析", roleId: "role-001", modelProviderId: "provider-deepseek", modelName: "deepseek-v4-pro", runnerId: "runner-claude-code" },
      { id: "step-002", order: 2, name: "UI/UX 设计", roleId: "role-002", modelProviderId: "provider-deepseek", modelName: "deepseek-v4-pro", runnerId: "runner-claude-code" },
      { id: "step-003", order: 3, name: "前端开发", roleId: "role-003", modelProviderId: "provider-openai", modelName: "gpt-5.3-codex", runnerId: "runner-codex-cli" },
      { id: "step-004", order: 4, name: "代码审查", roleId: "role-004", modelProviderId: "provider-deepseek", modelName: "deepseek-v4-pro", runnerId: "runner-claude-code" },
      { id: "step-005", order: 5, name: "测试验证", roleId: "role-005", modelProviderId: "provider-deepseek", modelName: "deepseek-v4-pro", runnerId: "runner-claude-code" },
    ],
  },
  {
    id: "design-review-v1",
    name: "设计评审流程",
    version: 1,
    steps: [
      { id: "dr-step-001", order: 1, name: "设计方案提交", roleId: "role-002", modelProviderId: "provider-deepseek", modelName: "deepseek-v4-pro", runnerId: "runner-claude-code" },
      { id: "dr-step-002", order: 2, name: "设计评审", roleId: "role-001", modelProviderId: "provider-deepseek", modelName: "deepseek-v4-pro", runnerId: "runner-claude-code" },
      { id: "dr-step-003", order: 3, name: "设计修改", roleId: "role-002", modelProviderId: "provider-deepseek", modelName: "deepseek-v4-pro", runnerId: "runner-claude-code" },
      { id: "dr-step-004", order: 4, name: "评审通过", roleId: "role-001", modelProviderId: "provider-deepseek", modelName: "deepseek-v4-pro", runnerId: "runner-claude-code" },
    ],
  },
  {
    id: "bug-fix-v1",
    name: "Bug 修复流程",
    version: 1,
    steps: [
      { id: "bf-step-001", order: 1, name: "问题定位", roleId: "role-003", modelProviderId: "provider-deepseek", modelName: "deepseek-v4-pro", runnerId: "runner-claude-code" },
      { id: "bf-step-002", order: 2, name: "修复方案", roleId: "role-003", modelProviderId: "provider-deepseek", modelName: "deepseek-v4-pro", runnerId: "runner-claude-code" },
      { id: "bf-step-003", order: 3, name: "代码修复", roleId: "role-003", modelProviderId: "provider-openai", modelName: "gpt-5.3-codex", runnerId: "runner-codex-cli" },
      { id: "bf-step-004", order: 4, name: "修复验证", roleId: "role-005", modelProviderId: "provider-deepseek", modelName: "deepseek-v4-pro", runnerId: "runner-claude-code" },
    ],
  },
];

console.log('=== 转换后的 workflowTemplates ===\n');
console.log(JSON.stringify(templates.map(t => convertTemplate(t as any)), null, 2));
