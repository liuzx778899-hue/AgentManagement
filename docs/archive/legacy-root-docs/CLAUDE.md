# develop-cc1 - AI 工程管理平台

## 项目概述

AgentDevelop 是一个 AI 驱动的软件工程管理平台，提供项目管理、流程管理、记忆管理、工作台等核心模块。支持 AI 辅助流程设计、自动化工作流执行、多角色协作。

## 技术栈

- **前端**: React 19 + TypeScript + Vite
- **后端**: Express 5 + TypeScript
- **测试**: Vitest + Testing Library + Playwright
- **样式**: 原生 CSS（深色工程风格）
- **图标**: Lucide React
- **构建**: TypeScript + Vite

## 开发命令

```bash
# 开发
npm run dev           # 启动前端 (127.0.0.1:5173)
npm run dev:server    # 启动后端 API
npm run dev:full      # 同时启动前后端

# 测试
npm run test          # 运行所有测试
npm run test:watch    # 测试监听模式

# 代码质量
npm run typecheck    # 类型检查
npm run lint         # ESLint 检查
npm run format       # Prettier 格式化

# 数据
npm run seed         # 种子数据填充
```

## 项目结构

```
src/
├── components/        # React 组件
│   ├── AppShell.tsx           # 应用壳（侧边栏 + 主区域）
│   ├── WorkbenchHome.tsx      # 工作台首页
│   ├── WorkflowCanvas.tsx     # 流程画布
│   ├── WorkflowNode.tsx       # 流程节点
│   ├── MemoryManager.tsx      # 记忆管理
│   ├── settings/              # 设置相关组件
│   └── ...
├── domain/             # 领域模型（纯类型定义）
│   ├── project.ts             # 项目
│   ├── workflow.ts            # 流程
│   ├── role.ts                # 角色
│   ├── capability.ts          # 能力
│   ├── gate.ts                # 关卡决策
│   └── ...
├── services/
│   ├── api/                   # 前端 API 调用层
│   └── local/                 # 后端服务实现
│       ├── adapters/          # 适配器（Git, FileStore, Runner）
│       ├── useCases/          # 业务用例
│       └── security/          # 安全模块
├── server/
│   ├── routes/                # Express 路由
│   └── middleware/            # 中间件
├── state/              # 状态管理（Reducer + Selectors）
├── config/             # 配置文件
└── __tests__/          # 测试文件（镜像 src 结构）
```

## 开发规范

### 组件开发

1. **命名**: PascalCase，语义化（如 `WorkflowCanvas`, `GateDecisionPanel`）
2. **Props**: 定义明确的 interface，避免 `any`
3. **样式**: 使用 CSS 变量，遵循深色工程风格
4. **图标**: 统一使用 `lucide-react`

```tsx
// 组件模板
interface MyComponentProps {
  title: string;
  onSubmit: (data: DataType) => void;
}

export function MyComponent({ title, onSubmit }: MyComponentProps) {
  return (
    <div className="my-component">
      {/* ... */}
    </div>
  );
}
```

### 领域模型

- `domain/` 目录只放纯类型定义和接口
- 不依赖任何框架或外部库
- 业务逻辑放在 `useCases/`

```typescript
// domain/workflow.ts
export interface WorkflowStep {
  id: string;
  name: string;
  roleId: string;
  gateType: 'auto' | 'manual';
}
```

### API 层

- 前端 `services/api/` 封装 fetch 调用
- 后端 `server/routes/` 定义 REST 端点
- 统一错误处理，返回 `{ error: string }`

```typescript
// services/api/workflowApi.ts
export async function getWorkflows(): Promise<Workflow[]> {
  const res = await fetch('/api/workflows');
  if (!res.ok) throw new Error('Failed to fetch workflows');
  return res.json();
}
```

### 测试规范

- 测试文件放在 `src/__tests__/`，镜像 src 结构
- 组件测试用 Testing Library
- 业务逻辑测试用纯 Vitest

```typescript
// __tests__/components/WorkflowCanvas.test.tsx
import { render, screen } from '@testing-library/react';
import { WorkflowCanvas } from '../components/WorkflowCanvas';

describe('WorkflowCanvas', () => {
  it('renders workflow steps', () => {
    render(<WorkflowCanvas steps={mockSteps} />);
    expect(screen.getByText('需求分析')).toBeInTheDocument();
  });
});
```

### 样式规范

```css
:root {
  /* 主色调 - 深色工程风 */
  --bg-primary: #07111a;
  --bg-secondary: #0a1520;
  --bg-tertiary: #111c27;
  --border-primary: #1e2a38;

  /* 文字 */
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;

  /* 强调色 */
  --accent-blue: #58a6ff;
  --accent-green: #3fb950;
  --accent-orange: #d29922;
  --accent-purple: #a371f7;
}
```

## 核心模块

### 1. 流程管理

- 流程总览 → 流程详情 → 流程设计器
- AI 辅助生成流程草案
- 流程版本管理与健康诊断

### 2. 项目管理

- 项目创建向导
- 项目详情与工作台入口
- AI 建项助手

### 3. 工作台

- Terminal Workspace 风格
- Runner 执行面板
- 实时日志流

### 4. 记忆管理

- 项目记忆库
- 角色记忆配置
- 记忆检索与更新

## 关键文件

| 文件 | 说明 |
|------|------|
| `docs/design/DESIGN_OVERVIEW.md` | 产品设计总览，所有设计决策的基准 |
| `src/components/AppShell.tsx` | 应用主框架 |
| `src/state/index.ts` | 状态管理核心 |
| `src/server/routes/*.ts` | API 路由定义 |

## 注意事项

1. **修改代码前**：先阅读 `docs/design/DESIGN_OVERVIEW.md` 理解产品定位
2. **新增组件**：遵循现有命名和目录结构
3. **API 变更**：同步更新前后端代码和测试
4. **样式修改**：使用 CSS 变量，保持深色主题一致性
5. **提交前**：运行 `npm run typecheck && npm run test`

---

**作为资深开发者，请遵循以上规范。遇到问题优先查阅设计文档或现有代码实现。**
