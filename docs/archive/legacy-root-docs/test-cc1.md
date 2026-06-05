# develop-cc1 集成测试指南

## 测试策略

本项目采用分层测试策略：
- **单元测试**: Vitest + Testing Library
- **集成测试**: Supertest + Express
- **E2E 测试**: Playwright

## 测试命令

```bash
# 运行所有测试
npm run test

# 监听模式
npm run test:watch

# 带覆盖率报告
npm run test -- --coverage

# 只运行集成测试
npm run test -- --grep "integration"

# 只运行 E2E 测试
npx playwright test
```

## 集成测试规范

### 目录结构

```
src/__tests__/
├── components/          # 组件集成测试
├── services/
│   ├── api/            # API 客户端测试
│   └── local/          # 本地服务集成测试
│       ├── adapters/   # 适配器集成测试
│       └── useCases/   # 用例集成测试
└── server/
    ├── routes/         # 路由集成测试
    └── services/       # 服务层测试
```

### API 集成测试模板

```typescript
// __tests__/server/routes/workflow.test.ts
import request from 'supertest';
import { createApp } from '../../../server/index';

describe('Workflow API Integration', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    // 清理资源
  });

  describe('GET /api/workflows', () => {
    it('should return all workflows', async () => {
      const res = await request(app).get('/api/workflows');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter workflows by category', async () => {
      const res = await request(app)
        .get('/api/workflows?category=development');

      expect(res.status).toBe(200);
      res.body.forEach((w: any) => {
        expect(w.category).toBe('development');
      });
    });
  });

  describe('POST /api/workflows', () => {
    it('should create a new workflow', async () => {
      const newWorkflow = {
        name: 'Test Workflow',
        category: 'development',
        steps: []
      };

      const res = await request(app)
        .post('/api/workflows')
        .send(newWorkflow);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject(newWorkflow);
    });

    it('should reject invalid workflow data', async () => {
      const res = await request(app)
        .post('/api/workflows')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});
```

### 服务层集成测试模板

```typescript
// __tests__/services/local/useCases/gitStatusUseCase.test.ts
import { GitStatusUseCase } from '../../../../services/local/useCases/gitStatusUseCase';
import { GitAdapter } from '../../../../services/local/adapters/gitAdapter';

describe('GitStatusUseCase Integration', () => {
  let useCase: GitStatusUseCase;
  let gitAdapter: GitAdapter;

  beforeAll(() => {
    gitAdapter = new GitAdapter();
    useCase = new GitStatusUseCase(gitAdapter);
  });

  beforeEach(async () => {
    // 每个测试前的数据准备
  });

  afterEach(async () => {
    // 清理测试数据
  });

  it('should get git status for valid project', async () => {
    const result = await useCase.execute({
      projectId: 'test-project-id',
      path: '/path/to/repo'
    });

    expect(result).toHaveProperty('branch');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('ahead');
    expect(result).toHaveProperty('behind');
  });

  it('should throw error for invalid path', async () => {
    await expect(
      useCase.execute({ projectId: 'test', path: '/invalid/path' })
    ).rejects.toThrow('not a git repository');
  });
});
```

### 组件集成测试模板

```typescript
// __tests__/components/WorkflowCanvas.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowCanvas } from '../../components/WorkflowCanvas';
import { ServiceContext } from '../../context/ServiceContext';
import { createMockServices } from '../mocks/services';

describe('WorkflowCanvas Integration', () => {
  const mockServices = createMockServices();

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <ServiceContext.Provider value={mockServices}>
        {ui}
      </ServiceContext.Provider>
    );
  };

  it('should load and display workflow steps', async () => {
    mockServices.workflowApi.getWorkflow.mockResolvedValue({
      id: '1',
      name: 'Test Workflow',
      steps: [
        { id: 's1', name: 'Step 1', order: 1 },
        { id: 's2', name: 'Step 2', order: 2 }
      ]
    });

    renderWithProviders(<WorkflowCanvas workflowId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });
  });

  it('should handle step reordering', async () => {
    const user = userEvent.setup();

    renderWithProviders(<WorkflowCanvas workflowId="1" />);

    // 拖拽操作测试
    const step1 = screen.getByText('Step 1');
    const step2 = screen.getByText('Step 2');

    await user.drag(step1);
    await user.drop(step2);

    await waitFor(() => {
      expect(mockServices.workflowApi.updateStepOrder).toHaveBeenCalled();
    });
  });
});
```

### E2E 测试模板

```typescript
// e2e/workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Workflow Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    // 登录或初始化状态
  });

  test('should create a new workflow', async ({ page }) => {
    // 导航到流程管理
    await page.click('text=流程管理');
    await page.click('text=新建流程');

    // 填写表单
    await page.fill('input[name="name"]', 'E2E Test Workflow');
    await page.selectOption('select[name="category"]', 'development');
    await page.click('button:has-text("创建")');

    // 验证结果
    await expect(page.locator('.workflow-card')).toContainText('E2E Test Workflow');
  });

  test('should execute workflow and show logs', async ({ page }) => {
    await page.click('text=E2E Test Workflow');
    await page.click('button:has-text("执行")');

    // 等待执行面板出现
    await expect(page.locator('.runner-panel')).toBeVisible();

    // 验证日志输出
    await expect(page.locator('.log-stream')).toContainText('Starting workflow execution');
  });
});
```

## 测试数据管理

### Fixtures

```typescript
// src/data/workflowFixtures.ts
export const workflowFixtures = {
  basicWorkflow: {
    id: 'wf-001',
    name: 'Basic Development Flow',
    category: 'development',
    steps: [
      { id: 's1', name: '需求分析', order: 1, roleId: 'role-pm' },
      { id: 's2', name: '设计', order: 2, roleId: 'role-designer' },
      { id: 's3', name: '开发', order: 3, roleId: 'role-dev' },
      { id: 's4', name: '测试', order: 4, roleId: 'role-qa' }
    ]
  },

  aiGeneratedWorkflow: {
    id: 'wf-002',
    name: 'AI Generated Flow',
    category: 'ai-assisted',
    steps: []
  }
};
```

### Mock Services

```typescript
// __tests__/mocks/services.ts
export function createMockServices() {
  return {
    workflowApi: {
      getWorkflow: vi.fn(),
      getWorkflows: vi.fn(),
      createWorkflow: vi.fn(),
      updateWorkflow: vi.fn(),
      deleteWorkflow: vi.fn(),
      executeWorkflow: vi.fn()
    },
    projectApi: {
      getProjects: vi.fn(),
      getProject: vi.fn(),
      createProject: vi.fn()
    },
    gitApi: {
      getStatus: vi.fn(),
      commit: vi.fn(),
      push: vi.fn()
    },
    runnerApi: {
      execute: vi.fn(),
      getLogs: vi.fn()
    }
  };
}
```

## 测试最佳实践

### 1. 隔离性

```typescript
// ❌ 错误：共享状态
let sharedWorkflow: Workflow;

beforeAll(async () => {
  sharedWorkflow = await createWorkflow();
});

// ✅ 正确：每个测试独立
beforeEach(async () => {
  await resetDatabase();
  workflow = await createTestWorkflow();
});

afterEach(async () => {
  await cleanupTestWorkflow(workflow.id);
});
```

### 2. 断言明确

```typescript
// ❌ 模糊断言
expect(res.body).toBeDefined();

// ✅ 精确断言
expect(res.body).toMatchObject({
  id: expect.any(String),
  name: 'Test Workflow',
  steps: expect.arrayContaining([
    expect.objectContaining({ name: 'Step 1' })
  ])
});
```

### 3. 异步处理

```typescript
// ❌ 不等待异步
fireEvent.click(button);
expect(screen.getByText('Success')).toBeInTheDocument();

// ✅ 正确等待
await userEvent.click(button);
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

### 4. 错误场景覆盖

```typescript
describe('Error Handling', () => {
  it('should handle network errors', async () => {
    mockServer.use(
      rest.get('/api/workflows', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    await expect(getWorkflows()).rejects.toThrow('Failed to fetch');
  });

  it('should handle validation errors', async () => {
    const res = await request(app)
      .post('/api/workflows')
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('name is required');
  });
});
```

## CI/CD 集成

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test

      - name: Run integration tests
        run: npm run test -- --grep "integration"
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

## 性能测试

```typescript
// __tests__/performance/api-response.test.ts
describe('API Performance', () => {
  it('should respond within 200ms for list endpoints', async () => {
    const start = Date.now();
    await request(app).get('/api/workflows');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(200);
  });

  it('should handle concurrent requests', async () => {
    const requests = Array(50).fill(null).map(() =>
      request(app).get('/api/workflows')
    );

    const responses = await Promise.all(requests);

    responses.forEach(res => {
      expect(res.status).toBe(200);
    });
  });
});
```

## 测试检查清单

- [ ] 所有新 API 端点有对应的集成测试
- [ ] 所有组件交互有集成测试
- [ ] 错误场景被覆盖（网络错误、验证错误、权限错误）
- [ ] 测试数据在测试后清理
- [ ] Mock 不影响测试真实性
- [ ] 异步操作正确等待
- [ ] 断言具体且有业务意义
- [ ] 测试运行在 CI 环境
- [ ] 覆盖率报告已生成

---

**作为资深测试工程师，请确保每次代码变更都有对应的测试覆盖，测试失败时先分析根因再修复。**
