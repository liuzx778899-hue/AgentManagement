/**
 * 数据初始化脚本
 * 用于创建示例项目、工作流模板等初始数据
 */
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const BASE_DIR = '.agentmanagement';

interface SeedProject {
  id: string;
  name: string;
  repoPath: string;
  defaultBranch: string;
  worktreeRoot: string;
  scope: string;
  sourceType: string;
  phase: string;
  riskLevel: string;
  healthScore: number;
  permissions: { permissionLevel: string };
  settings: {
    installCommand: string;
    testCommand: string;
    buildCommand: string;
    previewCommand: string;
    detectedStack: string;
    riskSummary: string;
  };
  workflowTemplateId: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  persistedAt: string;
}

interface SeedAssignment {
  id: string;
  order: number;
  roleId: string;
  runnerId?: string;
  modelProviderId?: string;
  modelName?: string;
  goal: string;
  acceptanceCriteria: string[];
  inputs: string[];
  outputs: string[];
  dependsOnAssignmentIds: string[];
  notifyAssignmentIds: string[];
  eventRoutes: string[];
}

interface SeedWorkflowTemplate {
  id: string;
  name: string;
  version: number;
  status: string;
  steps: Array<{
    id: string;
    order: number;
    name: string;
    assignments: SeedAssignment[];
    inputs: string[];
    outputs: string[];
    gateMode: string;
    gateType?: string;
    failureStrategy: string;
    projectOverride: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface SeedMemory {
  id: string;
  kind: string;
  scope: string;
  projectId: string;
  roleId: string | null;
  taskId: string | null;
  title: string;
  body: string;
  citation: string[];
  createdAt: string;
  updatedAt: string;
}

interface SeedModelProvider {
  id: string;
  name: string;
  apiBase: string;
  apiKeyEnv: string;
  models: Array<{
    name: string;
    displayName: string;
    contextWindow: number;
    maxOutputTokens: number;
    pricing: { inputPerMillion: number; outputPerMillion: number };
  }>;
  defaultModel: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SeedRole {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

async function seedData() {
  console.log('🚀 开始初始化数据...\n');

  // 创建目录
  const projectsDir = join(BASE_DIR, 'projects');
  const workflowsDir = join(BASE_DIR, 'workflows');
  const memoriesDir = join(BASE_DIR, 'memories');
  const modelsDir = join(BASE_DIR, 'model-providers');
  const rolesDir = join(BASE_DIR, 'roles');

  await mkdir(projectsDir, { recursive: true });
  await mkdir(workflowsDir, { recursive: true });
  await mkdir(memoriesDir, { recursive: true });
  await mkdir(modelsDir, { recursive: true });
  await mkdir(rolesDir, { recursive: true });

  const now = new Date().toISOString();

  // 1. 创建角色定义
  console.log('👤 创建角色定义...');
  const roles: SeedRole[] = [
    {
      id: 'role-pm',
      name: '产品经理',
      description: '负责需求分析、用户故事和产品规划',
      capabilities: ['需求分析', '用户故事编写', '优先级排序'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'role-tech-lead',
      name: '技术负责人',
      description: '负责技术架构设计和代码审查',
      capabilities: ['架构设计', '代码审查', '技术决策'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'role-dev',
      name: '开发工程师',
      description: '负责功能开发和代码实现',
      capabilities: ['编码实现', '单元测试', '代码重构'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'role-qa',
      name: '测试工程师',
      description: '负责测试用例设计和质量保障',
      capabilities: ['测试设计', '自动化测试', '缺陷追踪'],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'role-devops',
      name: 'DevOps工程师',
      description: '负责部署和运维自动化',
      capabilities: ['CI/CD', '容器化', '监控告警'],
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const role of roles) {
    await writeFile(join(rolesDir, `${role.id}.json`), JSON.stringify(role, null, 2));
    console.log(`  ✓ 创建角色: ${role.name}`);
  }

  // 2. 创建工作流模板（带角色绑定）
  console.log('\n📋 创建工作流模板...');
  const workflows: SeedWorkflowTemplate[] = [
    {
      id: 'software-dev-v1',
      name: '软件开发流程',
      version: 1,
      status: 'enabled',
      steps: [
        {
          id: 'step-req',
          order: 0,
          name: '需求分析',
          assignments: [{
            id: 'step-req-assign-0',
            order: 0,
            roleId: 'role-pm',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-haiku',
            goal: '分析并编写需求文档',
            acceptanceCriteria: ['需求完整清晰'],
            inputs: [],
            outputs: ['requirements.md'],
            dependsOnAssignmentIds: [],
            notifyAssignmentIds: ['step-design-assign-0'],
            eventRoutes: [],
          }],
          inputs: [],
          outputs: ['requirements.md'],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
        {
          id: 'step-design',
          order: 1,
          name: '技术设计',
          assignments: [{
            id: 'step-design-assign-0',
            order: 0,
            roleId: 'role-tech-lead',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-sonnet',
            goal: '设计技术方案',
            acceptanceCriteria: ['架构设计合理'],
            inputs: ['requirements.md'],
            outputs: ['design.md'],
            dependsOnAssignmentIds: ['step-req-assign-0'],
            notifyAssignmentIds: ['step-dev-assign-0'],
            eventRoutes: [],
          }],
          inputs: ['requirements.md'],
          outputs: ['design.md'],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
        {
          id: 'step-dev',
          order: 2,
          name: '开发实现',
          assignments: [{
            id: 'step-dev-assign-0',
            order: 0,
            roleId: 'role-dev',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-sonnet',
            goal: '实现功能代码',
            acceptanceCriteria: ['代码通过编译'],
            inputs: ['design.md'],
            outputs: ['src/'],
            dependsOnAssignmentIds: ['step-design-assign-0'],
            notifyAssignmentIds: ['step-review-assign-0'],
            eventRoutes: [],
          }],
          inputs: ['design.md'],
          outputs: ['src/'],
          gateMode: 'auto',
          failureStrategy: 'stop',
          projectOverride: false,
        },
        {
          id: 'step-review',
          order: 3,
          name: '代码审查',
          assignments: [{
            id: 'step-review-assign-0',
            order: 0,
            roleId: 'role-tech-lead',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-sonnet',
            goal: '审查代码质量',
            acceptanceCriteria: ['代码规范通过'],
            inputs: ['src/'],
            outputs: [],
            dependsOnAssignmentIds: ['step-dev-assign-0'],
            notifyAssignmentIds: ['step-test-assign-0'],
            eventRoutes: [],
          }],
          inputs: ['src/'],
          outputs: [],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
        {
          id: 'step-test',
          order: 4,
          name: '自动化测试',
          assignments: [{
            id: 'step-test-assign-0',
            order: 0,
            roleId: 'role-qa',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-haiku',
            goal: '编写并执行测试',
            acceptanceCriteria: ['测试全部通过'],
            inputs: ['src/'],
            outputs: ['test-results/'],
            dependsOnAssignmentIds: ['step-review-assign-0'],
            notifyAssignmentIds: ['step-deploy-assign-0'],
            eventRoutes: [],
          }],
          inputs: ['src/'],
          outputs: ['test-results/'],
          gateMode: 'auto',
          failureStrategy: 'stop',
          projectOverride: false,
        },
        {
          id: 'step-deploy',
          order: 5,
          name: '部署发布',
          assignments: [{
            id: 'step-deploy-assign-0',
            order: 0,
            roleId: 'role-devops',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-haiku',
            goal: '自动化部署',
            acceptanceCriteria: ['部署成功'],
            inputs: ['test-results/'],
            outputs: [],
            dependsOnAssignmentIds: ['step-test-assign-0'],
            notifyAssignmentIds: [],
            eventRoutes: [],
          }],
          inputs: ['test-results/'],
          outputs: [],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'bug-fix-v1',
      name: 'Bug修复流程',
      version: 1,
      status: 'enabled',
      steps: [
        {
          id: 'step-analyze',
          order: 0,
          name: '问题分析',
          assignments: [{
            id: 'step-analyze-assign-0',
            order: 0,
            roleId: 'role-dev',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-sonnet',
            goal: '分析问题根因',
            acceptanceCriteria: ['根因分析完整'],
            inputs: [],
            outputs: ['analysis.md'],
            dependsOnAssignmentIds: [],
            notifyAssignmentIds: ['step-fix-assign-0'],
            eventRoutes: [],
          }],
          inputs: [],
          outputs: ['analysis.md'],
          gateMode: 'auto',
          failureStrategy: 'stop',
          projectOverride: false,
        },
        {
          id: 'step-fix',
          order: 1,
          name: '修复实现',
          assignments: [{
            id: 'step-fix-assign-0',
            order: 0,
            roleId: 'role-dev',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-sonnet',
            goal: '实现修复代码',
            acceptanceCriteria: ['代码正确'],
            inputs: ['analysis.md'],
            outputs: ['fix/'],
            dependsOnAssignmentIds: ['step-analyze-assign-0'],
            notifyAssignmentIds: ['step-verify-assign-0'],
            eventRoutes: [],
          }],
          inputs: ['analysis.md'],
          outputs: ['fix/'],
          gateMode: 'auto',
          failureStrategy: 'stop',
          projectOverride: false,
        },
        {
          id: 'step-verify',
          order: 2,
          name: '验证测试',
          assignments: [{
            id: 'step-verify-assign-0',
            order: 0,
            roleId: 'role-qa',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-haiku',
            goal: '验证修复效果',
            acceptanceCriteria: ['验证通过'],
            inputs: ['fix/'],
            outputs: ['verify-results/'],
            dependsOnAssignmentIds: ['step-fix-assign-0'],
            notifyAssignmentIds: [],
            eventRoutes: [],
          }],
          inputs: ['fix/'],
          outputs: ['verify-results/'],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'design-review-v1',
      name: '设计评审流程',
      version: 1,
      status: 'enabled',
      steps: [
        {
          id: 'step-submit',
          order: 0,
          name: '提交方案',
          assignments: [{
            id: 'step-submit-assign-0',
            order: 0,
            roleId: 'role-tech-lead',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-sonnet',
            goal: '提交设计方案',
            acceptanceCriteria: ['方案完整'],
            inputs: [],
            outputs: ['proposal.md'],
            dependsOnAssignmentIds: [],
            notifyAssignmentIds: ['step-review-assign-0'],
            eventRoutes: [],
          }],
          inputs: [],
          outputs: ['proposal.md'],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
        {
          id: 'step-review',
          order: 1,
          name: '评审会议',
          assignments: [{
            id: 'step-review-assign-0',
            order: 0,
            roleId: 'role-tech-lead',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-sonnet',
            goal: '组织评审',
            acceptanceCriteria: ['评审意见明确'],
            inputs: ['proposal.md'],
            outputs: ['review-notes.md'],
            dependsOnAssignmentIds: ['step-submit-assign-0'],
            notifyAssignmentIds: ['step-approve-assign-0'],
            eventRoutes: [],
          }],
          inputs: ['proposal.md'],
          outputs: ['review-notes.md'],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
        {
          id: 'step-approve',
          order: 2,
          name: '批准执行',
          assignments: [{
            id: 'step-approve-assign-0',
            order: 0,
            roleId: 'role-pm',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-haiku',
            goal: '审批方案',
            acceptanceCriteria: ['审批完成'],
            inputs: ['review-notes.md'],
            outputs: [],
            dependsOnAssignmentIds: ['step-review-assign-0'],
            notifyAssignmentIds: [],
            eventRoutes: [],
          }],
          inputs: ['review-notes.md'],
          outputs: [],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'java-backend-v1',
      name: 'Java后端开发流程',
      version: 1,
      status: 'enabled',
      steps: [
        {
          id: 'step-java-design',
          order: 0,
          name: '接口设计',
          assignments: [{
            id: 'step-java-design-assign-0',
            order: 0,
            roleId: 'role-tech-lead',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-sonnet',
            goal: '设计API接口和数据模型',
            acceptanceCriteria: ['接口文档完整', '数据模型合理'],
            inputs: [],
            outputs: ['api-design.md', 'db-schema.sql'],
            dependsOnAssignmentIds: [],
            notifyAssignmentIds: ['step-java-dev-assign-0', 'step-java-dev-assign-1'],
            eventRoutes: [],
          }],
          inputs: [],
          outputs: ['api-design.md', 'db-schema.sql'],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
        {
          id: 'step-java-dev',
          order: 1,
          name: '后端开发',
          assignments: [
            {
              id: 'step-java-dev-assign-0',
              order: 0,
              roleId: 'role-dev',
              runnerId: 'runner-claude-code',
              modelProviderId: 'anthropic',
              modelName: 'claude-3-sonnet',
              goal: '实现Controller/Service/Mapper层代码',
              acceptanceCriteria: ['接口可用', '单元测试通过'],
              inputs: ['api-design.md', 'db-schema.sql'],
              outputs: ['src/main/java/**/*.java'],
              dependsOnAssignmentIds: ['step-java-design-assign-0'],
              notifyAssignmentIds: ['step-java-test-assign-0'],
              eventRoutes: [],
            },
            {
              id: 'step-java-dev-assign-1',
              order: 1,
              roleId: 'role-qa',
              runnerId: 'runner-claude-code',
              modelProviderId: 'anthropic',
              modelName: 'claude-3-haiku',
              goal: '编写单元测试和集成测试',
              acceptanceCriteria: ['覆盖率≥70%', '所有测试通过'],
              inputs: ['api-design.md'],
              outputs: ['src/test/java/**/*Test.java'],
              dependsOnAssignmentIds: ['step-java-design-assign-0'],
              notifyAssignmentIds: ['step-java-review-assign-0'],
              eventRoutes: [],
            },
          ],
          inputs: ['api-design.md', 'db-schema.sql'],
          outputs: ['src/main/java/**/*.java', 'src/test/java/**/*Test.java'],
          gateMode: 'auto',
          failureStrategy: 'retry',
          projectOverride: false,
        },
        {
          id: 'step-java-test',
          order: 2,
          name: '接口测试',
          assignments: [{
            id: 'step-java-test-assign-0',
            order: 0,
            roleId: 'role-qa',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-haiku',
            goal: '执行集成测试和压力测试',
            acceptanceCriteria: ['集成测试通过', '性能达标'],
            inputs: ['src/main/java/**/*.java'],
            outputs: ['test-results/', 'perf-report.md'],
            dependsOnAssignmentIds: ['step-java-dev-assign-0'],
            notifyAssignmentIds: ['step-java-review-assign-0'],
            eventRoutes: [],
          }],
          inputs: ['src/main/java/**/*.java'],
          outputs: ['test-results/', 'perf-report.md'],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
        {
          id: 'step-java-review',
          order: 3,
          name: '代码审查',
          assignments: [{
            id: 'step-java-review-assign-0',
            order: 0,
            roleId: 'role-tech-lead',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-sonnet',
            goal: '审查Java代码质量和架构',
            acceptanceCriteria: ['代码审查通过', '无严重问题'],
            inputs: ['src/main/java/**/*.java', 'test-results/'],
            outputs: ['review-report.md'],
            dependsOnAssignmentIds: ['step-java-test-assign-0'],
            notifyAssignmentIds: [],
            eventRoutes: [],
          }],
          inputs: ['src/main/java/**/*.java', 'test-results/'],
          outputs: ['review-report.md'],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'vue-frontend-v1',
      name: 'Vue前端开发流程',
      version: 1,
      status: 'enabled',
      steps: [
        {
          id: 'step-vue-design',
          order: 0,
          name: 'UI原型与组件设计',
          assignments: [
            {
              id: 'step-vue-design-assign-0',
              order: 0,
              roleId: 'role-pm',
              runnerId: 'runner-claude-code',
              modelProviderId: 'anthropic',
              modelName: 'claude-3-haiku',
              goal: '设计交互原型和页面结构',
              acceptanceCriteria: ['原型覆盖全部页面', '交互流程清晰'],
              inputs: [],
              outputs: ['ui-prototype.md', 'component-tree.md'],
              dependsOnAssignmentIds: [],
              notifyAssignmentIds: ['step-vue-dev-assign-0'],
              eventRoutes: [],
            },
            {
              id: 'step-vue-design-assign-1',
              order: 1,
              roleId: 'role-tech-lead',
              runnerId: 'runner-claude-code',
              modelProviderId: 'anthropic',
              modelName: 'claude-3-sonnet',
              goal: '确定组件架构和技术选型',
              acceptanceCriteria: ['组件拆分合理', '技术选型确定'],
              inputs: [],
              outputs: ['tech-design.md'],
              dependsOnAssignmentIds: [],
              notifyAssignmentIds: ['step-vue-dev-assign-0'],
              eventRoutes: [],
            },
          ],
          inputs: [],
          outputs: ['ui-prototype.md', 'component-tree.md', 'tech-design.md'],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
        {
          id: 'step-vue-dev',
          order: 1,
          name: '组件开发',
          assignments: [{
            id: 'step-vue-dev-assign-0',
            order: 0,
            roleId: 'role-dev',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-sonnet',
            goal: '实现Vue组件和页面',
            acceptanceCriteria: ['组件功能完整', '响应式布局正常'],
            inputs: ['ui-prototype.md', 'component-tree.md', 'tech-design.md'],
            outputs: ['src/components/**/*.vue', 'src/views/**/*.vue'],
            dependsOnAssignmentIds: ['step-vue-design-assign-0', 'step-vue-design-assign-1'],
            notifyAssignmentIds: ['step-vue-test-assign-0'],
            eventRoutes: [],
          }],
          inputs: ['ui-prototype.md', 'component-tree.md', 'tech-design.md'],
          outputs: ['src/components/**/*.vue', 'src/views/**/*.vue'],
          gateMode: 'auto',
          failureStrategy: 'retry',
          projectOverride: false,
        },
        {
          id: 'step-vue-test',
          order: 2,
          name: '前端测试',
          assignments: [{
            id: 'step-vue-test-assign-0',
            order: 0,
            roleId: 'role-qa',
            runnerId: 'runner-claude-code',
            modelProviderId: 'anthropic',
            modelName: 'claude-3-haiku',
            goal: '执行组件测试和E2E测试',
            acceptanceCriteria: ['组件测试通过', 'E2E关键路径通过'],
            inputs: ['src/components/**/*.vue'],
            outputs: ['test-results/', 'e2e-report.md'],
            dependsOnAssignmentIds: ['step-vue-dev-assign-0'],
            notifyAssignmentIds: [],
            eventRoutes: [],
          }],
          inputs: ['src/components/**/*.vue'],
          outputs: ['test-results/', 'e2e-report.md'],
          gateMode: 'manual',
          gateType: 'manual',
          failureStrategy: 'stop',
          projectOverride: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const workflow of workflows) {
    await writeFile(join(workflowsDir, `${workflow.id}.json`), JSON.stringify(workflow, null, 2));
    console.log(`  ✓ 创建工作流: ${workflow.name}`);
    workflow.steps.forEach(step => {
      const roleIds = step.assignments.map(a => a.roleId).join(", ");
      console.log(`      - ${step.name} → ${roleIds || "(无角色)"}`);
    });
  }

  // 3. 创建示例项目
  console.log('\n📦 创建示例项目...');
  const projects: SeedProject[] = [
    {
      id: randomUUID(),
      name: 'AgentManagement',
      repoPath: process.cwd(),
      defaultBranch: 'main',
      worktreeRoot: join(process.cwd(), '.worktrees'),
      scope: 'personal',
      sourceType: 'claude-code',
      phase: '开发中',
      riskLevel: 'low',
      healthScore: 85,
      permissions: { permissionLevel: 'owner' },
      settings: {
        installCommand: 'npm install',
        testCommand: 'npm test',
        buildCommand: 'npm run build',
        previewCommand: 'npm run preview',
        detectedStack: 'React + TypeScript + Vite',
        riskSummary: '项目健康，测试覆盖良好',
      },
      workflowTemplateId: 'software-dev-v1',
      createdAt: now,
      updatedAt: now,
      version: '1.0',
      persistedAt: now,
    },
    {
      id: randomUUID(),
      name: '示例Web应用',
      repoPath: '/path/to/example-web-app',
      defaultBranch: 'main',
      worktreeRoot: '/path/to/example-web-app/.worktrees',
      scope: 'team',
      sourceType: 'manual',
      phase: '规划中',
      riskLevel: 'medium',
      healthScore: 70,
      permissions: { permissionLevel: 'write' },
      settings: {
        installCommand: 'npm install',
        testCommand: 'npm test',
        buildCommand: 'npm run build',
        previewCommand: 'npm run preview',
        detectedStack: 'Next.js',
        riskSummary: '新项目，需要完善配置',
      },
      workflowTemplateId: 'software-dev-v1',
      createdAt: now,
      updatedAt: now,
      version: '1.0',
      persistedAt: now,
    },
  ];

  for (const project of projects) {
    await writeFile(join(projectsDir, `${project.id}.json`), JSON.stringify(project, null, 2));
    console.log(`  ✓ 创建项目: ${project.name}`);
  }

  // 4. 创建示例记忆
  console.log('\n📝 创建示例记忆...');
  const memories: SeedMemory[] = [
    {
      id: randomUUID(),
      kind: 'project',
      scope: 'project',
      projectId: projects[0].id,
      roleId: null,
      taskId: null,
      title: '项目架构决策',
      body: '采用 React + TypeScript + Vite 架构，使用 Vitest 进行单元测试，Playwright 进行E2E测试。',
      citation: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: randomUUID(),
      kind: 'technical',
      scope: 'project',
      projectId: projects[0].id,
      roleId: null,
      taskId: null,
      title: '技术栈选择',
      body: '前端：React 19 + Vite 6\n后端：Express 5\n测试：Vitest + Playwright\n类型：TypeScript 5.8',
      citation: [],
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const memory of memories) {
    await writeFile(join(memoriesDir, `${memory.id}.json`), JSON.stringify(memory, null, 2));
    console.log(`  ✓ 创建记忆: ${memory.title}`);
  }

  // 5. 创建模型配置
  console.log('\n🤖 创建模型配置...');
  const modelProviders: SeedModelProvider[] = [
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      apiBase: 'https://api.anthropic.com',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      models: [
        {
          name: 'claude-3-haiku',
          displayName: 'Claude 3 Haiku',
          contextWindow: 200000,
          maxOutputTokens: 4096,
          pricing: { inputPerMillion: 0.25, outputPerMillion: 1.25 },
        },
        {
          name: 'claude-3-sonnet',
          displayName: 'Claude 3 Sonnet',
          contextWindow: 200000,
          maxOutputTokens: 4096,
          pricing: { inputPerMillion: 3, outputPerMillion: 15 },
        },
        {
          name: 'claude-3-opus',
          displayName: 'Claude 3 Opus',
          contextWindow: 200000,
          maxOutputTokens: 4096,
          pricing: { inputPerMillion: 15, outputPerMillion: 75 },
        },
      ],
      defaultModel: 'claude-3-haiku',
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await writeFile(join(modelsDir, 'providers.json'), JSON.stringify({ providers: modelProviders, aiAssistantModel: null }, null, 2));
  console.log(`  ✓ 创建模型配置: ${modelProviders[0].name}`);

  // 6. 创建索引文件
  console.log('\n📑 创建索引文件...');
  await writeFile(join(BASE_DIR, 'index.json'), JSON.stringify({
    version: '1.0',
    lastUpdated: now,
    projects: projects.map(p => ({ id: p.id, name: p.name })),
    workflows: workflows.map(w => ({ id: w.id, name: w.name })),
    memories: memories.map(m => ({ id: m.id, title: m.title })),
    modelProviders: modelProviders.map(mp => ({ id: mp.id, name: mp.name })),
    roles: roles.map(r => ({ id: r.id, name: r.name })),
  }, null, 2));
  console.log('  ✓ 创建索引文件');

  console.log('\n✅ 数据初始化完成！\n');
  console.log('创建的数据:');
  console.log(`  - ${projects.length} 个项目`);
  console.log(`  - ${workflows.length} 个工作流模板`);
  console.log(`  - ${roles.length} 个角色`);
  console.log(`  - ${memories.length} 条记忆`);
  console.log(`  - ${modelProviders.length} 个模型配置`);
}

seedData().catch(console.error);