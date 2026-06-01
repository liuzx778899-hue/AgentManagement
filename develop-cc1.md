# develop-cc1 - AI 工程管理平台开发指南

## 项目概述

develop-cc1（原 AgentDevelop）是一个 AI 驱动的软件工程管理平台，提供项目管理、流程管理、记忆管理、工作台等核心模块。支持 AI 辅助流程设计、自动化工作流执行、多角色协作。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript 5 |
| 构建工具 | Vite 6 |
| 后端框架 | Express 5 |
| 测试框架 | Vitest + Testing Library |
| E2E 测试 | Playwright |
| 图标库 | Lucide React |
| 样式方案 | 原生 CSS（CSS Variables） |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev              # 前端 (127.0.0.1:5173)
npm run dev:server       # 后端 API
npm run dev:full         # 前后端同时启动

# 测试
npm run test             # 运行所有测试
npm run test:watch       # 测试监听模式

# 代码质量
npm run typecheck        # TypeScript 类型检查
npm run lint             # ESLint 检查
npm run format           # Prettier 格式化

# 数据初始化
npm run seed             # 填充种子数据
```

## 项目架构

```
develop-cc1/
├── src/
│   ├── components/          # React 组件
│   │   ├── AppShell.tsx            # 应用壳
│   │   ├── WorkbenchHome.tsx       # 工作台首页
│   │   ├── WorkflowCanvas.tsx      # 流程画布
│   │   ├── WorkflowNode.tsx        # 流程节点
│   │   ├── MemoryManager.tsx       # 记忆管理
│   │   ├── settings/               # 设置模块
│   │   │   ├── ProjectPanel.tsx
│   │   │   ├── UserPanel.tsx
│   │   │   └── CliRunnerPanel.tsx
│   │   └── ...
│   ├── domain/               # 领域模型（纯类型）
│   │   ├── project.ts
│   │   ├── workflow.ts
│   │   ├── role.ts
│   │   ├── capability.ts
│   │   ├── gate.ts
│   │   ├── memory.ts
│   │   └── ...
│   ├── services/
│   │   ├── api/                     # 前端 API 层
│   │   │   ├── workflowApi.ts
│   │   │   ├── projectApi.ts
│   │   │   ├── gitApi.ts
│   │   │   └── runnerApi.ts
│   │   └── local/                   # 后端服务
│   │       ├── adapters/            # 适配器
│   │       │   ├── gitAdapter.ts
│   │       │   ├── fileStoreAdapter.ts
│   │       │   ├── processRunnerAdapter.ts
│   │       │   └── githubAdapter.ts
│   │       ├── useCases/            # 业务用例
│   │       │   ├── gitStatusUseCase.ts
│   │       │   ├── worktreeUseCase.ts
│   │       │   ├── runnerUseCase.ts
│   │       │   └── workflowExecutionUseCase.ts
│   │       └── security/            # 安全模块
│   │           └── mod.ts
│   ├── server/
│   │   ├── routes/                  # API 路由
│   │   │   ├── workflow.ts
│   │   │   ├── projects.ts
│   │   │   ├── git.ts
│   │   │   └── runner.ts
│   │   ├── services/
│   │   │   └── serviceFactory.ts
│   │   └── middleware/
│   │       └── errorHandler.ts
│   ├── state/               # 状态管理
│   │   ├── index.ts
│   │   └── selectors.ts
│   ├── context/             # React Context
│   │   └── ServiceContext.tsx
│   ├── config/              # 配置文件
│   │   ├── product.ts
│   │   └── localEngineering.ts
│   ├── types/               # 全局类型
│   │   └── settings.ts
│   └── __tests__/           # 测试文件
│       ├── components/
│       ├── services/
│       └── server/
├── docs/
│   └── design/
│       ├── DESIGN_OVERVIEW.md      # 产品设计总览
│       ├── assets/                  # 设计素材
│       └── mockups/                 # HTML 原型
├── public/
│   └── mockups/             # 预览用 HTML
├── mockups/                 # 开发中 HTML 原型
├── CLAUDE.md                # Claude Code 提示词
├── develop-cc1.md           # 开发指南（本文件）
├── test-cc1.md              # 测试指南
└── package.json
```

## 核心领域模型

### Project（项目）

```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'planning';
  createdAt: Date;
  updatedAt: Date;
}
```

### Workflow（流程）

```typescript
interface Workflow {
  id: string;
  name: string;
  category: 'development' | 'design' | 'review' | 'release';
  steps: WorkflowStep[];
  version: number;
  status: 'draft' | 'active' | 'deprecated';
}

interface WorkflowStep {
  id: string;
  name: string;
  order: number;
  roleId: string;
  gateType: 'auto' | 'manual' | 'none';
  capabilities: string[];
}
```

### Role（角色）

```typescript
interface Role {
  id: string;
  name: string;
  type: 'human' | 'ai';
  modelConfig?: ModelConfig;
  capabilities: string[];
}
```

### Gate（关卡）

```typescript
interface Gate {
  id: string;
  type: 'auto' | 'manual';
  condition?: string;
  reviewers?: string[];
  timeout?: number;
}
```

## 开发规范

### 组件开发规范

```tsx
// ✅ 推荐：清晰的 Props 接口
interface WorkflowCardProps {
  workflow: Workflow;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function WorkflowCard({ workflow, onEdit, onDelete, isLoading }: WorkflowCardProps) {
  return (
    <div className="workflow-card">
      <h3>{workflow.name}</h3>
      <button onClick={() => onEdit(workflow.id)} disabled={isLoading}>
        编辑
      </button>
    </div>
  );
}
```

```tsx
// ❌ 避免：隐式 any
export function WorkflowCard({ workflow, onEdit }) {
  // ...
}
```

### API 开发规范

```typescript
// ✅ 推荐：清晰的错误处理
router.get('/workflows/:id', async (req, res) => {
  try {
    const workflow = await workflowService.getById(req.params.id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 状态管理规范

```typescript
// ✅ 推荐：使用 Reducer 模式
type State = { workflows: Workflow[]; loading: boolean };
type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Workflow[] }
  | { type: 'FETCH_ERROR'; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { workflows: action.payload, loading: false };
    default:
      return state;
  }
}
```

### 样式规范

```css
/* ✅ 推荐：使用 CSS 变量 */
.workflow-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 16px;
}

.workflow-card:hover {
  border-color: var(--accent-blue);
}

/* ❌ 避免：硬编码颜色 */
.workflow-card {
  background: #0a1520;
  border: 1px solid #1e2a38;
}
```

### 测试规范

```typescript
// ✅ 推荐：清晰的测试描述
describe('WorkflowCanvas', () => {
  it('should display workflow steps in correct order', () => {
    // ...
  });

  it('should call onStepClick when step is clicked', () => {
    // ...
  });

  it('should show loading state while fetching', () => {
    // ...
  });
});
```

## 关键设计决策

### 1. 流程管理层级

```
流程管理总览
├─ 流程 KPI
├─ 分类筛选与分类维护
├─ 流程资产卡片
├─ 流程健康诊断
└─ 操作入口

流程详情
├─ 流程版本
├─ 应用项目
├─ 步骤与角色绑定
└─ Runner / Model / Capability

流程设计器
├─ 常规流程设计
└─ AI 流程设计
```

### 2. AI 助手集成

- 全局 AI 助手在流程页切换为"流程设计模式"
- 支持来源导入：项目计划、协同文件、AI 建项结果、已有流程
- AI 输出为草案，应用前需人工确认

### 3. 工作台设计

- Terminal Workspace 风格
- Runner 执行面板 + 实时日志流
- 支持多任务并行

## 常见问题

### Q: 如何添加新的 API 端点？

1. 在 `src/server/routes/` 添加路由文件
2. 在 `src/services/api/` 添加 API 客户端
3. 在 `src/__tests__/server/routes/` 添加测试

### Q: 如何添加新组件？

1. 在 `src/components/` 创建组件
2. 使用 CSS 变量定义样式
3. 在 `src/__tests__/components/` 添加测试

### Q: 如何修改领域模型？

1. 先在 `docs/design/DESIGN_OVERVIEW.md` 确认设计意图
2. 修改 `src/domain/` 下的类型定义
3. 更新相关组件和服务
4. 更新测试

## 提交规范

```bash
# 提交前检查
npm run typecheck && npm run test && npm run lint

# 提交信息格式
feat: 添加流程版本管理功能
fix: 修复工作台日志流显示问题
refactor: 重构 API 错误处理
docs: 更新开发指南
test: 添加 WorkflowCanvas 集成测试
```

## 关键文件索引

| 文件 | 说明 |
|------|------|
| `docs/design/DESIGN_OVERVIEW.md` | 产品设计总览，所有设计决策基准 |
| `src/components/AppShell.tsx` | 应用主框架 |
| `src/state/index.ts` | 状态管理核心 |
| `src/server/routes/*.ts` | API 路由定义 |
| `src/domain/*.ts` | 领域模型定义 |
| `develop-cc1.md` | 开发指南（本文件） |
| `test-cc1.md` | 测试指南 |

---

**作为资深开发者，修改代码前请先理解业务上下文，遵循现有代码风格和架构模式。遇到问题优先查阅设计文档或现有实现。**
