export const meta = {
  name: 'phase3-p0-issues',
  description: '完成 Issue #20、#21、#22 Phase 3 P0 核心功能开发',
  phases: [
    { title: 'Issue #20: CLI Runner Panel', detail: '创建 Runner 控制面板、日志流组件、服务上下文' },
    { title: 'Issue #21: Project Persistence', detail: '实现项目 CRUD UseCase 和 UI 集成' },
    { title: 'Issue #22: Workflow Control', detail: '创建工作流执行控制面板' },
    { title: '验证与提交', detail: '运行测试、构建验证、创建 PR' },
  ],
};

// Phase 1: Issue #20 CLI Runner 控制面板
phase('Issue #20: CLI Runner Panel');

// Task 1: 创建基础设施（Hook + Context）
await agent('创建 useLocalServices Hook 和 ServiceContext', {
  label: 'infra-setup',
  phase: 'Issue #20: CLI Runner Panel',
  schema: {
    type: 'object',
    properties: {
      filesCreated: { type: 'array' },
      buildPassed: { type: 'boolean' },
    },
    required: ['filesCreated', 'buildPassed'],
  },
});

// Task 2: 实现 PwRunnerPanel 组件
await agent('实现 PwRunnerPanel 组件 - Runner 选择器、启动/停止按钮、状态显示', {
  label: 'runner-panel',
  phase: 'Issue #20: CLI Runner Panel',
  schema: {
    type: 'object',
    properties: {
      filesCreated: { type: 'array' },
      testsPassing: { type: 'boolean' },
    },
    required: ['filesCreated', 'testsPassing'],
  },
});

// Task 3: 实现 PwLogStream 组件
await agent('实现 PwLogStream 组件 - 实时日志流、stdout/stderr 区分、自动滚动', {
  label: 'log-stream',
  phase: 'Issue #20: CLI Runner Panel',
  schema: {
    type: 'object',
    properties: {
      filesCreated: { type: 'array' },
      testsPassing: { type: 'boolean' },
    },
    required: ['filesCreated', 'testsPassing'],
  },
});

// Task 4: 集成到 ProjectWorkspace
await agent('将 PwRunnerPanel 集成到 ProjectWorkspace 左侧面板', {
  label: 'integrate-runner',
  phase: 'Issue #20: CLI Runner Panel',
  schema: {
    type: 'object',
    properties: {
      modifiedFiles: { type: 'array' },
      uiVerified: { type: 'boolean' },
    },
    required: ['modifiedFiles', 'uiVerified'],
  },
});

log('Issue #20 完成，进入 Issue #21');

// Phase 2: Issue #21 项目创建与导入持久化
phase('Issue #21: Project Persistence');

// Task 5: 创建 projectUseCase
await agent('实现 projectUseCase - createProject、importProject、updateProject、deleteProject、listProjects', {
  label: 'project-usecase',
  phase: 'Issue #21: Project Persistence',
  schema: {
    type: 'object',
    properties: {
      filesCreated: { type: 'array' },
      testsPassing: { type: 'boolean' },
    },
    required: ['filesCreated', 'testsPassing'],
  },
});

// Task 6: 对接 NewProjectWizard
await agent('修改 NewProjectWizard 组件，调用 createProject UseCase', {
  label: 'wizard-integration',
  phase: 'Issue #21: Project Persistence',
  schema: {
    type: 'object',
    properties: {
      modifiedFiles: { type: 'array' },
      persistenceVerified: { type: 'boolean' },
    },
    required: ['modifiedFiles', 'persistenceVerified'],
  },
});

// Task 7: 对接 ExistingProjectImport
await agent('修改 ExistingProjectImport 组件，调用 importProject UseCase', {
  label: 'import-integration',
  phase: 'Issue #21: Project Persistence',
  schema: {
    type: 'object',
    properties: {
      modifiedFiles: { type: 'array' },
      importVerified: { type: 'boolean' },
    },
    required: ['modifiedFiles', 'importVerified'],
  },
});

log('Issue #21 完成，进入 Issue #22');

// Phase 3: Issue #22 工作流执行控制
phase('Issue #22: Workflow Control');

// Task 8: 实现 PwWorkflowControl 组件
await agent('实现 PwWorkflowControl 组件 - 模板选择器、启动/暂停/恢复/取消按钮、状态显示', {
  label: 'workflow-control',
  phase: 'Issue #22: Workflow Control',
  schema: {
    type: 'object',
    properties: {
      filesCreated: { type: 'array' },
      testsPassing: { type: 'boolean' },
    },
    required: ['filesCreated', 'testsPassing'],
  },
});

// Task 9: 集成到 ProjectWorkspace
await agent('将 PwWorkflowControl 集成到 ProjectWorkspace', {
  label: 'integrate-workflow',
  phase: 'Issue #22: Workflow Control',
  schema: {
    type: 'object',
    properties: {
      modifiedFiles: { type: 'array' },
      uiVerified: { type: 'boolean' },
    },
    required: ['modifiedFiles', 'uiVerified'],
  },
});

log('Issue #22 完成，进入验证阶段');

// Phase 4: 验证与提交
phase('验证与提交');

// Task 10: 全面测试验证
const testResult = await agent('运行完整测试和构建验证', {
  label: 'final-verify',
  phase: '验证与提交',
  schema: {
    type: 'object',
    properties: {
      buildPassed: { type: 'boolean' },
      testsPassed: { type: 'integer' },
      testsFailed: { type: 'integer' },
    },
    required: ['buildPassed', 'testsPassed', 'testsFailed'],
  },
});

log(`验证结果: 构建=${testResult.buildPassed}, 测试=${testResult.testsPassed} passed / ${testResult.testsFailed} failed`);

if (!testResult.buildPassed) {
  log('构建失败，需要修复');
  await agent('修复构建错误', {
    label: 'fix-build',
    phase: '验证与提交',
  });
}

if (testResult.testsFailed > 0) {
  log('存在测试失败，需要修复');
  await agent('修复测试失败', {
    label: 'fix-tests',
    phase: '验证与提交',
  });
}

// Task 11: Git 提交
await agent('创建 Git 提交 - 所有 Phase 3 P0 功能', {
  label: 'git-commit',
  phase: '验证与提交',
  schema: {
    type: 'object',
    properties: {
      commitCreated: { type: 'boolean' },
      commitSha: { type: 'string' },
    },
    required: ['commitCreated', 'commitSha'],
  },
});

log('Phase 3 P0 Issues (#20, #21, #22) 开发完成');

return {
  completed: true,
  issues: [20, 21, 22],
  summary: '已完成 CLI Runner 控制面板、项目持久化、工作流执行控制三大核心功能',
};