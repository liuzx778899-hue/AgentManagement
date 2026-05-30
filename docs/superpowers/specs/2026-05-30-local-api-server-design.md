# 本地后端服务架构设计

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 搭建本地 HTTP 服务，让浏览器前端能够调用真实的 Node.js 能力（CLI Runner、Git、文件系统等）。

**Architecture:** 浏览器前端 (React) <--HTTP API--> 本地后端服务 (Express) <--child_process/fs--> CLI/Git/文件系统

**Tech Stack:** Node.js + Express + TypeScript (后端), 已有的 UseCase/Adapter 复用

---

## 问题背景

### 当前状态

Phase 2 已完成的后端能力：
- `GitAdapter` - Git 命令封装
- `FileStoreAdapter` - 文件系统读写
- `ProcessRunnerAdapter` - CLI 进程管理
- `GitHubAdapter` - GitHub API 调用
- `LlmAdapter` - LLM API 调用
- 各种 UseCase 和 Repository

### 核心问题

React 前端在**浏览器**中运行，存在限制：
- 无法执行 `child_process` (shell 命令)
- 无法直接访问 `fs` (文件系统)
- 无法调用 `git` 命令

当前 `useLocalServices` Hook 在浏览器环境强制使用 mock：
```typescript
function createMockServices(): LocalEngineeringServices {
  return createLocalServices({ enableMock: true }); // 浏览器只能用 mock
}
```

### 解决方案

添加一个**本地 Express 服务**作为中间层：

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户机器                                  │
│                                                                 │
│  ┌─────────────────┐         ┌─────────────────────────────┐   │
│  │   浏览器         │  HTTP   │   本地后端服务               │   │
│  │   React App     │ <-----> │   Express Server            │   │
│  │   localhost:5173│         │   localhost:3001            │   │
│  └─────────────────┘         └───────────┬─────────────────┘   │
│                                          │                      │
│                                          │ child_process        │
│                                          │ fs, git, etc.        │
│                                          ▼                      │
│                              ┌─────────────────────────────┐   │
│                              │   真实环境                   │   │
│                              │   - Git 命令                 │   │
│                              │   - CLI Runner               │   │
│                              │   - 文件系统                 │   │
│                              │   - .agentmanagement/        │   │
│                              └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 文件结构规划

```
src/
├── server/                        # 新增：本地后端服务
│   ├── index.ts                   # 服务入口
│   ├── app.ts                     # Express 应用配置
│   ├── routes/
│   │   ├── runner.ts              # CLI Runner API
│   │   ├── projects.ts            # 项目管理 API
│   │   ├── workflow.ts            # 工作流 API
│   │   ├── git.ts                 # Git 状态 API
│   │   ├── memory.ts              # 记忆管理 API
│   │   ├── settings.ts            # 设置 API
│   │   └── index.ts               # 路由聚合
│   ├── middleware/
│   │   ├── errorHandler.ts        # 错误处理
│   │   └── cors.ts                # CORS 配置
│   └── services/
│       └── serviceFactory.ts      # 创建服务实例
├── services/
│   └── api/                       # 新增：前端 API 客户端
│       ├── client.ts              # HTTP 客户端基类
│       ├── runnerApi.ts           # Runner API 客户端
│       ├── projectApi.ts          # 项目 API 客户端
│       ├── workflowApi.ts         # 工作流 API 客户端
│       └── index.ts               # API 聚合
├── hooks/
│   └── useLocalServices.ts        # 修改：优先调用 API，fallback mock
└── scripts/
    └── dev.ts                     # 新增：同时启动前端+后端
```

---

## API 接口设计

### CLI Runner API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/runner/start` | 启动 Runner | `{ runnerId, kind, cwd }` | `{ ok, data: RunnerProcess }` |
| POST | `/api/runner/stop` | 停止进程 | `{ processId }` | `{ ok }` |
| GET | `/api/runner/logs/:processId` | 获取日志 | - | `{ ok, data: LogEntry[] }` |
| GET | `/api/runner/status/:processId` | 获取状态 | - | `{ ok, data: RunnerProcess }` |
| GET | `/api/runner/list` | 列出进程 | - | `{ ok, data: RunnerProcess[] }` |

### 项目管理 API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/projects` | 列出项目 | - | `{ ok, data: Project[] }` |
| GET | `/api/projects/:id` | 获取项目 | - | `{ ok, data: Project }` |
| POST | `/api/projects` | 创建项目 | `CreateProjectInput` | `{ ok, data: Project }` |
| POST | `/api/projects/import` | 导入项目 | `{ path }` | `{ ok, data: Project }` |
| PUT | `/api/projects/:id` | 更新项目 | `UpdateProjectInput` | `{ ok, data: Project }` |
| DELETE | `/api/projects/:id` | 删除项目 | - | `{ ok }` |

### 工作流 API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/workflow/run` | 启动工作流 | `{ projectId, templateId }` | `{ ok, data: { runId } }` |
| POST | `/api/workflow/pause` | 暂停工作流 | `{ runId }` | `{ ok }` |
| POST | `/api/workflow/resume` | 恢复工作流 | `{ runId }` | `{ ok }` |
| POST | `/api/workflow/cancel` | 取消工作流 | `{ runId }` | `{ ok }` |
| GET | `/api/workflow/status/:runId` | 获取状态 | - | `{ ok, data: WorkflowRun }` |

### Git 状态 API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/git/status` | 获取状态 | `?path=/repo/path` | `{ ok, data: GitStatus }` |
| GET | `/api/git/branches` | 列出分支 | `?path=/repo/path` | `{ ok, data: string[] }` |
| GET | `/api/git/worktrees` | 列出 worktree | `?path=/repo/path` | `{ ok, data: WorktreeInfo[] }` |

### 记忆管理 API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/memory` | 列出记忆 | `?projectId=xxx` | `{ ok, data: Memory[] }` |
| POST | `/api/memory` | 创建记忆 | `CreateMemoryInput` | `{ ok, data: Memory }` |
| PUT | `/api/memory/:id` | 更新记忆 | `UpdateMemoryInput` | `{ ok, data: Memory }` |
| DELETE | `/api/memory/:id` | 删除记忆 | - | `{ ok }` |
| GET | `/api/memory/search` | 搜索记忆 | `?keyword=xxx` | `{ ok, data: Memory[] }` |

### 设置 API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/settings` | 获取设置 | - | `{ ok, data: AppSettings }` |
| PUT | `/api/settings` | 保存设置 | `AppSettings` | `{ ok }` |

---

## 实现细节

### 1. Express 服务入口 (src/server/index.ts)

```typescript
import express from 'express';
import cors from 'cors';
import { createRouter } from './routes';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api', createRouter());

app.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
});
```

### 2. 服务工厂 (src/server/services/serviceFactory.ts)

```typescript
import { createLocalServices, LocalEngineeringServices } from '../../services/local';

let services: LocalEngineeringServices | null = null;

export function getServices(): LocalEngineeringServices {
  if (!services) {
    services = createLocalServices({
      enableMock: false, // 服务端禁用 mock
      projectRoot: process.cwd(),
    });
  }
  return services;
}
```

### 3. Runner 路由 (src/server/routes/runner.ts)

```typescript
import { Router } from 'express';
import { getServices } from '../services/serviceFactory';
import { startRunnerProcess, stopRunnerProcess, getProcessLogs, getProcessStatus } from '../../services/local/useCases';

export const runnerRouter = Router();

runnerRouter.post('/start', async (req, res) => {
  const { runnerId, kind, cwd } = req.body;
  const services = getServices();
  
  const result = await startRunnerProcess(services.processRunner, {
    runnerId,
    runnerKind: kind,
    command: '', // 根据 kind 自动选择
    args: [],
    cwd,
  });
  
  res.json(result);
});

runnerRouter.post('/stop', async (req, res) => {
  const { processId } = req.body;
  const services = getServices();
  
  const result = await stopRunnerProcess(services.processRunner, processId);
  res.json(result);
});

runnerRouter.get('/logs/:processId', async (req, res) => {
  const { processId } = req.params;
  const services = getServices();
  
  const result = await getProcessLogs(services.processRunner, processId);
  res.json(result);
});

runnerRouter.get('/status/:processId', async (req, res) => {
  const { processId } = req.params;
  const services = getServices();
  
  const result = await getProcessStatus(services.processRunner, processId);
  res.json(result);
});
```

### 4. 前端 API 客户端 (src/services/api/client.ts)

```typescript
const API_BASE = 'http://localhost:3001/api';

export async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<{ ok: boolean; data?: T; error?: { message: string } }> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    return response.json();
  } catch (error) {
    // 如果本地服务不可用，返回 mock fallback 标记
    return {
      ok: false,
      error: { message: 'Local API server not available' },
    };
  }
}
```

### 5. 修改 useLocalServices Hook

```typescript
export function useLocalServices(): LocalEngineeringServices {
  // 尝试连接本地 API 服务
  const apiAvailable = useCheckApiAvailable();
  
  if (apiAvailable) {
    return createApiServices(); // 通过 HTTP API 调用
  }
  
  // Fallback: 浏览器环境使用 mock
  if (typeof window !== 'undefined') {
    return createMockServices();
  }
  
  throw new Error('useLocalServices must be used within ServiceProvider');
}

function useCheckApiAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  
  useEffect(() => {
    fetch('http://localhost:3001/api/health')
      .then(() => setAvailable(true))
      .catch(() => setAvailable(false));
  }, []);
  
  return available;
}
```

### 6. 开发启动脚本 (src/scripts/dev.ts)

```typescript
import { spawn } from 'child_process';

// 启动后端服务
const server = spawn('npx', ['ts-node', 'src/server/index.ts'], {
  stdio: 'inherit',
});

// 启动前端开发服务
const vite = spawn('npm', ['run', 'dev:vite'], {
  stdio: 'inherit',
});

process.on('SIGINT', () => {
  server.kill();
  vite.kill();
  process.exit();
});
```

---

## 开发任务

### Phase 3.1: 本地服务基础

| 任务 | 文件 | 说明 |
|------|------|------|
| 1 | `src/server/index.ts` | Express 服务入口 |
| 2 | `src/server/app.ts` | 应用配置 (CORS, JSON) |
| 3 | `src/server/services/serviceFactory.ts` | 服务实例工厂 |
| 4 | `src/server/middleware/` | 错误处理中间件 |
| 5 | `package.json` | 添加依赖 (express, cors) |

### Phase 3.2: API 路由实现

| 任务 | 文件 | 说明 |
|------|------|------|
| 6 | `src/server/routes/runner.ts` | CLI Runner API |
| 7 | `src/server/routes/projects.ts` | 项目管理 API |
| 8 | `src/server/routes/workflow.ts` | 工作流 API |
| 9 | `src/server/routes/git.ts` | Git 状态 API |
| 10 | `src/server/routes/memory.ts` | 记忆管理 API |
| 11 | `src/server/routes/settings.ts` | 设置 API |

### Phase 3.3: 前端 API 客户端

| 任务 | 文件 | 说明 |
|------|------|------|
| 12 | `src/services/api/client.ts` | HTTP 客户端 |
| 13 | `src/services/api/runnerApi.ts` | Runner API 客户端 |
| 14 | `src/services/api/projectApi.ts` | 项目 API 客户端 |
| 15 | `src/hooks/useLocalServices.ts` | 修改：优先 API，fallback mock |

### Phase 3.4: 开发体验优化

| 任务 | 文件 | 说明 |
|------|------|------|
| 16 | `src/scripts/dev.ts` | 同时启动前后端 |
| 17 | `package.json` | 添加 `npm run dev:full` 命令 |
| 18 | 测试 | 验证真实功能 |

---

## 验收标准

### 功能验收

- [ ] 运行 `npm run dev:full` 同时启动前端和后端
- [ ] 浏览器访问 http://localhost:5173 能正常显示页面
- [ ] 点击 Runner 启动按钮能**真实启动** CLI 进程
- [ ] 新建项目后 `.agentmanagement/projects/` 有真实 JSON 文件
- [ ] 项目卡片显示**真实 Git 分支**
- [ ] 后端服务关闭时，前端自动 fallback 到 mock

### 技术验收

- [ ] `npm run build` 通过
- [ ] `npm test` 通过
- [ ] TypeScript 无错误
- [ ] API 接口有错误处理

---

## 安全考虑

1. **仅监听 localhost** - 服务只绑定 127.0.0.1，不接受外部请求
2. **CORS 限制** - 只允许 http://localhost:5173 来源
3. **路径校验** - 文件系统操作必须校验路径在允许范围内
4. **命令白名单** - Runner 只允许执行白名单中的命令
5. **无认证需求** - 本地单用户场景，不需要认证

---

## 后续扩展

1. **Electron 打包** - 将 Express 服务嵌入 Electron main process
2. **系统托盘** - 后端服务常驻系统托盘
3. **多项目管理** - 支持同时管理多个本地项目
4. **远程协作** - 可选启用远程访问（需要认证）
