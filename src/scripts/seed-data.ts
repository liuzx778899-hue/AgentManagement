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

interface SeedWorkflowTemplate {
  id: string;
  name: string;
  version: number;
  status: string;
  steps: Array<{
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
    projectOverride: boolean;
    runnerId?: string;
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
          roleId: 'role-pm',
          modelProviderId: 'anthropic',
          modelName: 'claude-3-haiku',
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
          roleId: 'role-tech-lead',
          modelProviderId: 'anthropic',
          modelName: 'claude-3-sonnet',
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
          roleId: 'role-dev',
          modelProviderId: 'anthropic',
          modelName: 'claude-3-sonnet',
          inputs: ['design.md'],
          outputs: ['src/'],
          gateMode: 'auto',
          failureStrategy: 'stop',
          projectOverride: false,
          runnerId: 'runner-claude-code',
        },
        {
          id: 'step-review',
          order: 3,
          name: '代码审查',
          roleId: 'role-tech-lead',
          modelProviderId: 'anthropic',
          modelName: 'claude-3-sonnet',
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
          roleId: 'role-qa',
          modelProviderId: 'anthropic',
          modelName: 'claude-3-haiku',
          inputs: ['src/'],
          outputs: ['test-results/'],
          gateMode: 'auto',
          failureStrategy: 'stop',
          projectOverride: false,
          runnerId: 'runner-claude-code',
        },
        {
          id: 'step-deploy',
          order: 5,
          name: '部署发布',
          roleId: 'role-devops',
          modelProviderId: 'anthropic',
          modelName: 'claude-3-haiku',
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
          roleId: 'role-dev',
          modelProviderId: 'anthropic',
          modelName: 'claude-3-sonnet',
          inputs: [],
          outputs: ['analysis.md'],
          gateMode: 'auto',
          failureStrategy: 'stop',
          projectOverride: false,
          runnerId: 'runner-claude-code',
        },
        {
          id: 'step-fix',
          order: 1,
          name: '修复实现',
          roleId: 'role-dev',
          modelProviderId: 'anthropic',
          modelName: 'claude-3-sonnet',
          inputs: ['analysis.md'],
          outputs: ['fix/'],
          gateMode: 'auto',
          failureStrategy: 'stop',
          projectOverride: false,
          runnerId: 'runner-claude-code',
        },
        {
          id: 'step-verify',
          order: 2,
          name: '验证测试',
          roleId: 'role-qa',
          modelProviderId: 'anthropic',
          modelName: 'claude-3-haiku',
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
          roleId: 'role-tech-lead',
          modelProviderId: 'anthropic',
          modelName: 'claude-3-sonnet',
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
          roleId: 'role-tech-lead',
          modelProviderId: 'anthropic',
          modelName: 'claude-3-sonnet',
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
          roleId: 'role-pm',
          modelProviderId: 'anthropic',
          modelName: 'claude-3-haiku',
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
  ];

  for (const workflow of workflows) {
    await writeFile(join(workflowsDir, `${workflow.id}.json`), JSON.stringify(workflow, null, 2));
    console.log(`  ✓ 创建工作流: ${workflow.name}`);
    workflow.steps.forEach(step => {
      console.log(`      - ${step.name} → ${step.roleId}`);
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