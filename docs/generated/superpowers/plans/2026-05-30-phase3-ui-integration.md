# Phase 3: UI 集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将前端 UI 与 Phase 2 开发的后端工程层完整对接，实现真实数据读写、CLI Runner 控制、工作流执行。

**Architecture:** React 组件 -> UseCase (业务逻辑) -> Adapter (本地能力) -> 文件系统/CLI/GitHub/LLM

**Tech Stack:** TypeScript + React + Vite (前端), Node.js child_process/fs/path (本地工程层)

---

## 文件结构规划

```
src/
├── services/
│   └── local/
│       ├── useCases/
│       │   ├── projectUseCase.ts      # 新增：项目 CRUD
│       │   ├── memoryUseCase.ts       # 新增：记忆 CRUD
│       │   ├── settingsUseCase.ts     # 新增：配置持久化
│       │   ├── aiUseCase.ts           # 新增：AI 功能封装
│       │   └── index.ts               # 更新导出
│       └── index.ts                   # 更新服务创建
├── hooks/
│   └── useLocalServices.ts            # 新增：服务注入 Hook
├── context/
│   └── ServiceContext.tsx              # 新增：服务上下文
├── components/
│   ├── PwRunnerPanel.tsx              # 新增：Runner 控制面板
│   ├── PwLogStream.tsx                # 新增：日志流组件
│   └── [现有组件更新]
└── __tests__/
    └── services/local/useCases/
        ├── projectUseCase.test.ts     # 新增
        ├── memoryUseCase.test.ts      # 新增
        ├── settingsUseCase.test.ts    # 新增
        └── aiUseCase.test.ts          # 新增
```

---

## P0-01: CLI Runner 控制面板

### 目标
在项目工作台添加 Runner 控制面板，支持启动/停止 CLI agent、查看实时日志。

### Task 1: 创建 Runner 控制面板组件

**Files:**
- Create: `src/components/PwRunnerPanel.tsx`
- Create: `src/__tests__/components/PwRunnerPanel.test.tsx`

- [ ] **Step 1: 编写 PwRunnerPanel 测试**

```typescript
// src/__tests__/components/PwRunnerPanel.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PwRunnerPanel } from '../../components/PwRunnerPanel';
import type { RunnerKind } from '../../domain/runner';

// Mock useLocalServices
vi.mock('../../hooks/useLocalServices', () => ({
  useLocalServices: () => ({
    startRunner: vi.fn().mockResolvedValue({ ok: true, data: { id: 'proc-001', state: 'running' } }),
    stopRunner: vi.fn().mockResolvedValue({ ok: true }),
    getLogs: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getStatus: vi.fn().mockResolvedValue({ ok: true, data: { state: 'idle' } }),
  }),
}));

describe('PwRunnerPanel', () => {
  const mockProjectId = 'proj-001';
  const mockRunnerProfiles = [
    { id: 'runner-001', displayName: 'Claude Code CLI', kind: 'claude-code' as RunnerKind, enabled: true },
    { id: 'runner-002', displayName: 'Codex CLI', kind: 'codex-cli' as RunnerKind, enabled: true },
  ];

  it('should render runner selector', () => {
    render(
      <PwRunnerPanel 
        projectId={mockProjectId} 
        runnerProfiles={mockRunnerProfiles}
      />
    );
    
    expect(screen.getByText('Runner 控制')).toBeInTheDocument();
    expect(screen.getByText('Claude Code CLI')).toBeInTheDocument();
    expect(screen.getByText('Codex CLI')).toBeInTheDocument();
  });

  it('should show start button when no process running', () => {
    render(
      <PwRunnerPanel 
        projectId={mockProjectId} 
        runnerProfiles={mockRunnerProfiles}
      />
    );
    
    expect(screen.getByRole('button', { name: /启动/i })).toBeInTheDocument();
  });

  it('should call startRunner when start clicked', async () => {
    const { useLocalServices } = await import('../../hooks/useLocalServices');
    const mockServices = useLocalServices();
    
    render(
      <PwRunnerPanel 
        projectId={mockProjectId} 
        runnerProfiles={mockRunnerProfiles}
      />
    );
    
    const startButton = screen.getByRole('button', { name: /启动/i });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockServices.startRunner).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm --cache .npm-cache test -- src/__tests__/components/PwRunnerPanel.test.tsx`
Expected: FAIL - PwRunnerPanel 不存在

- [ ] **Step 3: 创建 useLocalServices Hook**

```typescript
// src/hooks/useLocalServices.ts

import { useContext } from 'react';
import { ServiceContext } from '../context/ServiceContext';
import type { LocalEngineeringServices } from '../services/local';

export function useLocalServices(): LocalEngineeringServices {
  const services = useContext(ServiceContext);
  if (!services) {
    // 浏览器环境返回 mock 服务
    if (typeof window !== 'undefined') {
      return createMockServices();
    }
    throw new Error('useLocalServices must be used within ServiceProvider');
  }
  return services;
}

function createMockServices(): LocalEngineeringServices {
  // 返回所有方法都是 mock 的服务实例
  const { createLocalServices } = require('../services/local');
  return createLocalServices({ enableMock: true });
}
```

- [ ] **Step 4: 创建 ServiceContext**

```typescript
// src/context/ServiceContext.tsx

import React from 'react';
import type { LocalEngineeringServices } from '../services/local';

export const ServiceContext = React.createContext<LocalEngineeringServices | null>(null);

export function ServiceProvider({ 
  children, 
  services 
}: { 
  children: React.ReactNode;
  services: LocalEngineeringServices;
}) {
  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}
```

- [ ] **Step 5: 实现 PwRunnerPanel**

```typescript
// src/components/PwRunnerPanel.tsx

import { useState, useEffect, useCallback } from 'react';
import { Play, Square, RefreshCw, Terminal, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLocalServices } from '../hooks/useLocalServices';
import { PwLogStream } from './PwLogStream';
import type { RunnerProfile, RunnerKind } from '../domain/runner';
import type { RunnerProcess } from '../types/localEngineering';

interface PwRunnerPanelProps {
  projectId: string;
  projectPath: string;
  runnerProfiles: RunnerProfile[];
  workflowStepId?: string;
  onProcessChange?: (process: RunnerProcess | null) => void;
}

type ProcessState = 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';

export function PwRunnerPanel({
  projectId,
  projectPath,
  runnerProfiles,
  workflowStepId,
  onProcessChange,
}: PwRunnerPanelProps) {
  const services = useLocalServices();
  const [selectedRunnerId, setSelectedRunnerId] = useState<string>(
    runnerProfiles.find(r => r.enabled)?.id ?? ''
  );
  const [processState, setProcessState] = useState<ProcessState>('idle');
  const [currentProcess, setCurrentProcess] = useState<RunnerProcess | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedRunner = runnerProfiles.find(r => r.id === selectedRunnerId);

  const handleStart = useCallback(async () => {
    if (!selectedRunner) return;
    
    setProcessState('starting');
    setError(null);

    const result = await services.startRunner(
      selectedRunnerId,
      selectedRunner.kind as RunnerKind,
      projectPath
    );

    if (result.ok) {
      setCurrentProcess(result.data!);
      setProcessState('running');
      onProcessChange?.(result.data!);
    } else {
      setProcessState('failed');
      setError(result.error?.message ?? '启动失败');
    }
  }, [selectedRunner, selectedRunnerId, projectPath, services, onProcessChange]);

  const handleStop = useCallback(async () => {
    if (!currentProcess) return;

    setProcessState('stopping');
    const result = await services.stopRunner(currentProcess.id);

    if (result.ok) {
      setCurrentProcess(null);
      setProcessState('stopped');
      onProcessChange?.(null);
    } else {
      setProcessState('failed');
      setError(result.error?.message ?? '停止失败');
    }
  }, [currentProcess, services, onProcessChange]);

  const handleRefresh = useCallback(async () => {
    if (!currentProcess) return;

    const result = await services.getStatus(currentProcess.id);
    if (result.ok) {
      setCurrentProcess(result.data);
      setProcessState(result.data.state as ProcessState);
    }
  }, [currentProcess, services]);

  // Poll process status when running
  useEffect(() => {
    if (processState !== 'running') return;
    const interval = setInterval(handleRefresh, 5000);
    return () => clearInterval(interval);
  }, [processState, handleRefresh]);

  const stateColors: Record<ProcessState, string> = {
    idle: 'var(--muted)',
    starting: 'var(--primary)',
    running: 'var(--ok)',
    stopping: 'var(--warn)',
    stopped: 'var(--muted)',
    failed: 'var(--danger)',
  };

  const stateIcons: Record<ProcessState, React.ReactNode> = {
    idle: <Terminal size={16} />,
    starting: <RefreshCw size={16} className="animate-spin" />,
    running: <CheckCircle2 size={16} />,
    stopping: <RefreshCw size={16} className="animate-spin" />,
    stopped: <Square size={16} />,
    failed: <AlertCircle size={16} />,
  };

  return (
    <div className="pw-runner-panel">
      <header className="pw-runner-header">
        <h3>
          <Terminal size={18} />
          Runner 控制
        </h3>
        <div className="pw-runner-status" style={{ color: stateColors[processState] }}>
          {stateIcons[processState]}
          <span>{processState}</span>
        </div>
      </header>

      <div className="pw-runner-controls">
        <select 
          value={selectedRunnerId} 
          onChange={(e) => setSelectedRunnerId(e.target.value)}
          disabled={processState === 'running'}
          className="pw-runner-select"
        >
          <option value="">选择 Runner...</option>
          {runnerProfiles.filter(r => r.enabled).map((runner) => (
            <option key={runner.id} value={runner.id}>
              {runner.displayName}
            </option>
          ))}
        </select>

        {processState === 'idle' || processState === 'stopped' || processState === 'failed' ? (
          <button 
            className="btn primary"
            onClick={handleStart}
            disabled={!selectedRunnerId}
          >
            <Play size={14} />
            启动
          </button>
        ) : (
          <button 
            className="btn danger"
            onClick={handleStop}
            disabled={processState === 'stopping'}
          >
            <Square size={14} />
            停止
          </button>
        )}

        {processState === 'running' && (
          <button className="btn ghost" onClick={handleRefresh}>
            <RefreshCw size={14} />
            刷新
          </button>
        )}
      </div>

      {error && (
        <div className="pw-runner-error">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {currentProcess && (
        <div className="pw-runner-info">
          <span>PID: {currentProcess.pid ?? 'N/A'}</span>
          <span>启动时间: {currentProcess.startedAt}</span>
        </div>
      )}

      {currentProcess && (
        <PwLogStream 
          processId={currentProcess.id}
          maxHeight={300}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: 运行测试验证通过**

Run: `npm --cache .npm-cache test -- src/__tests__/components/PwRunnerPanel.test.tsx`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add src/components/PwRunnerPanel.tsx src/__tests__/components/PwRunnerPanel.test.tsx src/hooks/useLocalServices.ts src/context/ServiceContext.tsx
git commit -m "feat(p0-01): add PwRunnerPanel with start/stop control"
```

---

### Task 2: 创建日志流组件

**Files:**
- Create: `src/components/PwLogStream.tsx`
- Create: `src/__tests__/components/PwLogStream.test.tsx`

- [ ] **Step 1: 编写 PwLogStream 测试**

```typescript
// src/__tests__/components/PwLogStream.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PwLogStream } from '../../components/PwLogStream';

vi.mock('../../hooks/useLocalServices', () => ({
  useLocalServices: () => ({
    getLogs: vi.fn().mockResolvedValue({
      ok: true,
      data: [
        { timestamp: '2026-05-30T10:00:00Z', stream: 'stdout', content: 'Starting...' },
        { timestamp: '2026-05-30T10:00:01Z', stream: 'stderr', content: 'Warning!' },
      ],
    }),
  }),
}));

describe('PwLogStream', () => {
  it('should render log entries', async () => {
    render(<PwLogStream processId="proc-001" />);
    
    await waitFor(() => {
      expect(screen.getByText('Starting...')).toBeInTheDocument();
      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });
  });

  it('should differentiate stdout and stderr', async () => {
    render(<PwLogStream processId="proc-001" />);
    
    await waitFor(() => {
      const stdoutEntry = screen.getByText('Starting...').closest('.pw-log-entry');
      const stderrEntry = screen.getByText('Warning!').closest('.pw-log-entry');
      
      expect(stdoutEntry).toHaveClass('stdout');
      expect(stderrEntry).toHaveClass('stderr');
    });
  });

  it('should auto-scroll to bottom', async () => {
    const { container } = render(<PwLogStream processId="proc-001" />);
    
    await waitFor(() => {
      const logBody = container.querySelector('.pw-log-body');
      expect(logBody?.scrollTop).toBe(logBody?.scrollHeight);
    });
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm --cache .npm-cache test -- src/__tests__/components/PwLogStream.test.tsx`
Expected: FAIL

- [ ] **Step 3: 实现 PwLogStream**

```typescript
// src/components/PwLogStream.tsx

import { useState, useEffect, useRef } from 'react';
import { useLocalServices } from '../hooks/useLocalServices';
import type { LogEntry } from '../types/localEngineering';

interface PwLogStreamProps {
  processId: string;
  maxHeight?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function PwLogStream({
  processId,
  maxHeight = 300,
  autoRefresh = true,
  refreshInterval = 2000,
}: PwLogStreamProps) {
  const services = useLocalServices();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const fetchLogs = async () => {
      const result = await services.getLogs(processId);
      if (mounted && result.ok) {
        setLogs(result.data ?? []);
        setLoading(false);
      }
    };

    fetchLogs();

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, refreshInterval);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      mounted = false;
    };
  }, [processId, services, autoRefresh, refreshInterval]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs]);

  if (loading) {
    return <div className="pw-log-stream loading">加载日志...</div>;
  }

  return (
    <div 
      className="pw-log-stream" 
      style={{ maxHeight }}
    >
      <div className="pw-log-body" ref={bodyRef}>
        {logs.length === 0 ? (
          <div className="pw-log-empty">暂无日志</div>
        ) : (
          logs.map((entry, index) => (
            <div 
              key={`${entry.timestamp}-${index}`}
              className={`pw-log-entry ${entry.stream}`}
            >
              <span className="pw-log-time">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className="pw-log-content">{entry.content}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm --cache .npm-cache test -- src/__tests__/components/PwLogStream.test.tsx`
Expected: PASS

- [ ] **Step 5: 添加日志流样式**

在 `src/styles/components.css` 添加：

```css
/* Runner Panel & Log Stream */
.pw-runner-panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.pw-runner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.pw-runner-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
}

.pw-runner-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  text-transform: uppercase;
}

.pw-runner-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pw-runner-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--fg);
}

.pw-runner-info {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--muted);
  margin-top: 8px;
}

.pw-runner-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--danger);
  font-size: 12px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  margin-top: 8px;
}

.pw-log-stream {
  background: #0d1117;
  border-radius: 6px;
  overflow: hidden;
}

.pw-log-body {
  max-height: inherit;
  overflow-y: auto;
  padding: 8px 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.pw-log-entry {
  display: flex;
  gap: 12px;
  padding: 2px 0;
}

.pw-log-entry.stdout {
  color: #c9d1d9;
}

.pw-log-entry.stderr {
  color: #f85149;
}

.pw-log-time {
  color: #6e7681;
  flex-shrink: 0;
}

.pw-log-empty {
  color: #6e7681;
  text-align: center;
  padding: 20px;
}
```

- [ ] **Step 6: 提交**

```bash
git add src/components/PwLogStream.tsx src/__tests__/components/PwLogStream.test.tsx src/styles/components.css
git commit -m "feat(p0-01): add PwLogStream component for real-time logs"
```

---

### Task 3: 集成 Runner 面板到项目工作台

**Files:**
- Modify: `src/components/ProjectWorkspace.tsx`

- [ ] **Step 1: 在 ProjectWorkspace 中导入 PwRunnerPanel**

```typescript
// 在 ProjectWorkspace.tsx 顶部添加导入
import { PwRunnerPanel } from './PwRunnerPanel';
```

- [ ] **Step 2: 在工作台侧边栏添加 Runner 面板**

找到 ProjectWorkspace 的左侧面板区域，添加：

```tsx
{/* 在 PwContextPanel 后面添加 */}
{project && (
  <PwRunnerPanel
    projectId={projectId}
    projectPath={project.repoPath}
    runnerProfiles={data.runnerProfiles}
    onProcessChange={(proc) => {
      console.log('Process changed:', proc);
    }}
  />
)}
```

- [ ] **Step 3: 验证 UI 显示**

Run: `npm --cache .npm-cache run dev`
检查: http://localhost:5173 -> 进入项目工作台 -> 检查 Runner 控制面板是否显示

- [ ] **Step 4: 提交**

```bash
git add src/components/ProjectWorkspace.tsx
git commit -m "feat(p0-01): integrate PwRunnerPanel into ProjectWorkspace"
```

---

## P0-02: 项目创建与导入

### 目标
实现新建项目、导入已有项目的真实持久化。

### Task 4: 创建项目 UseCase

**Files:**
- Create: `src/services/local/useCases/projectUseCase.ts`
- Create: `src/__tests__/services/local/useCases/projectUseCase.test.ts`

- [ ] **Step 1: 编写项目 UseCase 测试**

```typescript
// src/__tests__/services/local/useCases/projectUseCase.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { createProject, importProject, deleteProject, updateProject } from '../../../../services/local/useCases/projectUseCase';
import { ProjectRepository } from '../../../../services/local/repositories/projectRepository';
import { FileStoreAdapter } from '../../../../services/local/adapters/fileStoreAdapter';
import type { AdapterConfig, Project } from '../../../../types/localEngineering';

describe('projectUseCase', () => {
  let repository: ProjectRepository;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: '/test/project',
  };

  beforeEach(() => {
    const fileStore = new FileStoreAdapter(config);
    repository = new ProjectRepository(fileStore);
    repository.fileStore.setMockData('.agentmanagement/projects/index.json', {
      projects: [],
    });
  });

  describe('createProject', () => {
    it('should create a new project with generated ID', async () => {
      const result = await createProject(repository, {
        name: 'Test Project',
        repoPath: '/test/repo',
        defaultBranch: 'main',
        worktreeRoot: '.worktrees',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.name).toBe('Test Project');
    });

    it('should validate required fields', async () => {
      const result = await createProject(repository, {
        name: '',
        repoPath: '/test/repo',
        defaultBranch: 'main',
        worktreeRoot: '.worktrees',
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('INVALID_INPUT');
    });
  });

  describe('importProject', () => {
    it('should detect project type and create config', async () => {
      repository.fileStore.setMockData('/existing/project/package.json', {
        name: 'existing-project',
      });

      const result = await importProject(repository, '/existing/project');

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('existing-project');
    });
  });

  describe('updateProject', () => {
    it('should update existing project', async () => {
      const project: Project = {
        id: 'proj-001',
        name: 'Old Name',
        repoPath: '/test/repo',
        defaultBranch: 'main',
        worktreeRoot: '.worktrees',
        scope: 'personal',
        desktopIntegrationStatus: 'deferred',
        permissions: { permissionLevel: 'owner' },
        settings: {
          installCommand: 'npm install',
          testCommand: 'npm test',
          buildCommand: 'npm run build',
          previewCommand: 'npm run preview',
          detectedStack: 'Node.js',
          riskSummary: '',
        },
        workflowTemplateId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      repository.fileStore.setMockData('.agentmanagement/projects/proj-001.json', project);

      const result = await updateProject(repository, 'proj-001', { name: 'New Name' });

      expect(result.ok).toBe(true);
      expect(result.data?.name).toBe('New Name');
    });
  });

  describe('deleteProject', () => {
    it('should mark project as deleted', async () => {
      const project: Project = {
        id: 'proj-001',
        name: 'To Delete',
        repoPath: '/test/repo',
        defaultBranch: 'main',
        worktreeRoot: '.worktrees',
        scope: 'personal',
        desktopIntegrationStatus: 'deferred',
        permissions: { permissionLevel: 'owner' },
        settings: {
          installCommand: '',
          testCommand: '',
          buildCommand: '',
          previewCommand: '',
          detectedStack: '',
          riskSummary: '',
        },
        workflowTemplateId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      repository.fileStore.setMockData('.agentmanagement/projects/proj-001.json', project);

      const result = await deleteProject(repository, 'proj-001');

      expect(result.ok).toBe(true);
    });
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm --cache .npm-cache test -- src/__tests__/services/local/useCases/projectUseCase.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现项目 UseCase**

```typescript
// src/services/local/useCases/projectUseCase.ts

import type { ProjectRepository } from '../repositories/projectRepository';
import type { LocalResult, Project } from '../../../types/localEngineering';

export interface CreateProjectInput {
  name: string;
  repoPath: string;
  defaultBranch: string;
  worktreeRoot: string;
  workflowTemplateId?: string;
}

export interface UpdateProjectInput {
  name?: string;
  repoPath?: string;
  defaultBranch?: string;
  worktreeRoot?: string;
  workflowTemplateId?: string;
  settings?: Partial<Project['settings']>;
}

/**
 * 创建新项目
 */
export async function createProject(
  repository: ProjectRepository,
  input: CreateProjectInput
): Promise<LocalResult<Project>> {
  // 验证必填字段
  if (!input.name?.trim()) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '项目名称不能为空',
        recoverable: true,
      },
    };
  }

  if (!input.repoPath?.trim()) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '仓库路径不能为空',
        recoverable: true,
      },
    };
  }

  const now = new Date().toISOString();
  const projectId = `proj-${Date.now()}`;

  const project: Project = {
    id: projectId,
    name: input.name,
    repoPath: input.repoPath,
    defaultBranch: input.defaultBranch || 'main',
    worktreeRoot: input.worktreeRoot || '.worktrees',
    scope: 'personal',
    desktopIntegrationStatus: 'deferred',
    permissions: { permissionLevel: 'owner' },
    settings: {
      installCommand: 'npm install',
      testCommand: 'npm test',
      buildCommand: 'npm run build',
      previewCommand: 'npm run preview',
      detectedStack: 'Unknown',
      riskSummary: '',
    },
    workflowTemplateId: input.workflowTemplateId || '',
    createdAt: now,
    updatedAt: now,
  };

  const result = await repository.save(project);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: project,
    diagnostics: [`项目已创建: ${project.name} (${project.id})`],
  };
}

/**
 * 导入已有项目
 */
export async function importProject(
  repository: ProjectRepository,
  existingPath: string
): Promise<LocalResult<Project>> {
  // 读取 package.json 获取项目信息
  const packageJsonResult = await repository.fileStore.readJson<{
    name?: string;
    scripts?: Record<string, string>;
  }>(`${existingPath}/package.json`);

  const projectName = packageJsonResult.ok 
    ? (packageJsonResult.data?.name || existingPath.split('/').pop() || 'Imported Project')
    : existingPath.split('/').pop() || 'Imported Project';

  const now = new Date().toISOString();
  const projectId = `proj-${Date.now()}`;

  const project: Project = {
    id: projectId,
    name: projectName,
    repoPath: existingPath,
    defaultBranch: 'main',
    worktreeRoot: '.worktrees',
    scope: 'personal',
    desktopIntegrationStatus: 'deferred',
    permissions: { permissionLevel: 'owner' },
    settings: {
      installCommand: packageJsonResult.data?.scripts?.install || 'npm install',
      testCommand: packageJsonResult.data?.scripts?.test || 'npm test',
      buildCommand: packageJsonResult.data?.scripts?.build || 'npm run build',
      previewCommand: packageJsonResult.data?.scripts?.preview || 'npm run preview',
      detectedStack: 'Node.js',
      riskSummary: '',
    },
    workflowTemplateId: '',
    createdAt: now,
    updatedAt: now,
  };

  const result = await repository.save(project);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: project,
    diagnostics: [`项目已导入: ${project.name} (${project.id})`],
  };
}

/**
 * 更新项目配置
 */
export async function updateProject(
  repository: ProjectRepository,
  projectId: string,
  updates: UpdateProjectInput
): Promise<LocalResult<Project>> {
  const loadResult = await repository.load(projectId);

  if (!loadResult.ok) {
    return {
      ok: false,
      error: loadResult.error,
    };
  }

  const existingProject = loadResult.data!;
  const now = new Date().toISOString();

  const updatedProject: Project = {
    ...existingProject,
    ...updates,
    id: existingProject.id, // 确保 ID 不被覆盖
    createdAt: existingProject.createdAt,
    updatedAt: now,
  };

  const saveResult = await repository.save(updatedProject);

  if (!saveResult.ok) {
    return {
      ok: false,
      error: saveResult.error,
    };
  }

  return {
    ok: true,
    data: updatedProject,
    diagnostics: [`项目已更新: ${updatedProject.name}`],
  };
}

/**
 * 删除项目
 */
export async function deleteProject(
  repository: ProjectRepository,
  projectId: string
): Promise<LocalResult<void>> {
  const result = await repository.delete(projectId);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: undefined,
    diagnostics: [`项目已删除: ${projectId}`],
  };
}

/**
 * 列出所有项目
 */
export async function listProjects(
  repository: ProjectRepository
): Promise<LocalResult<Project[]>> {
  // 尝试读取索引文件
  const indexResult = await repository.fileStore.readJson<{ projects: string[] }>(
    '.agentmanagement/projects/index.json'
  );

  if (!indexResult.ok) {
    return {
      ok: true,
      data: [],
      diagnostics: ['项目索引不存在，返回空列表'],
    };
  }

  const projects: Project[] = [];

  for (const projectId of indexResult.data?.projects ?? []) {
    const result = await repository.load(projectId);
    if (result.ok && !result.data?.deletedAt) {
      projects.push(result.data!);
    }
  }

  return {
    ok: true,
    data: projects,
  };
}
```

- [ ] **Step 4: 更新 useCases/index.ts 导出**

```typescript
// 在 src/services/local/useCases/index.ts 添加

export {
  createProject,
  importProject,
  updateProject,
  deleteProject,
  listProjects,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './projectUseCase';
```

- [ ] **Step 5: 运行测试验证通过**

Run: `npm --cache .npm-cache test -- src/__tests__/services/local/useCases/projectUseCase.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/services/local/useCases/projectUseCase.ts src/__tests__/services/local/useCases/projectUseCase.test.ts src/services/local/useCases/index.ts
git commit -m "feat(p0-02): add project CRUD use cases"
```

---

### Task 5: 对接新建项目向导

**Files:**
- Modify: `src/components/NewProjectWizard.tsx`

- [ ] **Step 1: 导入 useLocalServices**

```typescript
// 在 NewProjectWizard.tsx 顶部
import { useLocalServices } from '../hooks/useLocalServices';
import { createProject } from '../services/local/useCases';
```

- [ ] **Step 2: 替换 addProject 调用**

找到 `handleCreate` 函数或创建按钮的处理函数：

```typescript
// 原代码
const handleCreate = () => {
  addProject({...});
  setCreated(true);
};

// 替换为
const handleCreate = async () => {
  setCreating(true);
  setErrorMessage('');
  
  const services = useLocalServices();
  const result = await createProject(services.repositories.project, {
    name: projectInfo.name,
    repoPath: projectInfo.repoPath,
    defaultBranch: projectInfo.defaultBranch,
    worktreeRoot: projectInfo.worktreeRoot,
    workflowTemplateId: selectedWorkflowId,
  });

  if (result.ok) {
    // 同步更新 reducer 状态
    addProject(result.data!);
    setCreated(true);
  } else {
    setErrorMessage(result.error?.message ?? '创建失败');
  }
  
  setCreating(false);
};
```

- [ ] **Step 3: 添加错误显示**

在表单底部添加：

```tsx
{errorMessage && (
  <div className="wizard-error">
    <AlertCircle size={14} />
    {errorMessage}
  </div>
)}
```

- [ ] **Step 4: 验证功能**

Run: `npm --cache .npm-cache run dev`
测试: 新建项目 -> 填写信息 -> 点击创建 -> 检查 `.agentmanagement/projects/` 目录

- [ ] **Step 5: 提交**

```bash
git add src/components/NewProjectWizard.tsx
git commit -m "feat(p0-02): integrate createProject use case in NewProjectWizard"
```

---

### Task 6: 对接导入已有项目

**Files:**
- Modify: `src/components/ExistingProjectImport.tsx`

- [ ] **Step 1: 导入依赖**

```typescript
import { useLocalServices } from '../hooks/useLocalServices';
import { importProject } from '../services/local/useCases';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
```

- [ ] **Step 2: 替换导入逻辑**

找到确认导入的处理函数：

```typescript
// 添加状态
const [importing, setImporting] = useState(false);
const [importError, setImportError] = useState<string | null>(null);

// 替换导入处理
const handleImport = async () => {
  if (!detectedPath) return;
  
  setImporting(true);
  setImportError(null);
  
  const services = useLocalServices();
  const result = await importProject(services.repositories.project, detectedPath);
  
  if (result.ok) {
    addProject(result.data!);
    onClose?.();
  } else {
    setImportError(result.error?.message ?? '导入失败');
  }
  
  setImporting(false);
};
```

- [ ] **Step 3: 添加错误显示**

```tsx
{importError && (
  <div className="import-error">
    <AlertCircle size={14} />
    {importError}
  </div>
)}
```

- [ ] **Step 4: 验证功能**

测试: 导入已有项目 -> 选择目录 -> 检查配置文件生成

- [ ] **Step 5: 提交**

```bash
git add src/components/ExistingProjectImport.tsx
git commit -m "feat(p0-02): integrate importProject use case"
```

---

## P0-03: 工作流执行控制

### 目标
在工作台添加工作流执行控制面板，支持启动/暂停/恢复工作流。

### Task 7: 创建工作流执行面板

**Files:**
- Create: `src/components/PwWorkflowControl.tsx`
- Create: `src/__tests__/components/PwWorkflowControl.test.tsx`

- [ ] **Step 1: 编写测试**

```typescript
// src/__tests__/components/PwWorkflowControl.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PwWorkflowControl } from '../../components/PwWorkflowControl';
import type { WorkflowTemplate } from '../../domain/workflow';

vi.mock('../../hooks/useLocalServices', () => ({
  useLocalServices: () => ({
    createWorkflowRun: vi.fn().mockResolvedValue({ ok: true, data: { runId: 'run-001' } }),
    pauseWorkflowRun: vi.fn().mockResolvedValue({ ok: true }),
    resumeWorkflowRun: vi.fn().mockResolvedValue({ ok: true }),
    cancelWorkflowRun: vi.fn().mockResolvedValue({ ok: true }),
    getWorkflowRunStatus: vi.fn().mockResolvedValue({ ok: true, data: { state: 'idle' } }),
  }),
}));

describe('PwWorkflowControl', () => {
  const mockTemplate: WorkflowTemplate = {
    id: 'tpl-001',
    name: '开发流程',
    version: 1,
    steps: [
      { id: 'step-1', order: 1, name: '需求分析', roleId: 'role-1', modelProviderId: 'provider-1', modelName: 'model-1', inputs: [], outputs: [], gateMode: 'auto', failureStrategy: 'stop', projectOverride: false },
    ],
    createdAt: '2026-05-30T00:00:00Z',
    updatedAt: '2026-05-30T00:00:00Z',
  };

  it('should render workflow template selector', () => {
    render(
      <PwWorkflowControl
        projectId="proj-001"
        templates={[mockTemplate]}
      />
    );
    
    expect(screen.getByText('工作流执行')).toBeInTheDocument();
    expect(screen.getByText('开发流程')).toBeInTheDocument();
  });

  it('should start workflow when start clicked', async () => {
    const { useLocalServices } = await import('../../hooks/useLocalServices');
    const mockServices = useLocalServices();
    
    render(
      <PwWorkflowControl
        projectId="proj-001"
        templates={[mockTemplate]}
      />
    );
    
    const startButton = screen.getByRole('button', { name: /启动/i });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockServices.createWorkflowRun).toHaveBeenCalledWith('proj-001', 'tpl-001');
    });
  });
});
```

- [ ] **Step 2: 实现 PwWorkflowControl**

```typescript
// src/components/PwWorkflowControl.tsx

import { useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Square, ChevronRight } from 'lucide-react';
import { useLocalServices } from '../hooks/useLocalServices';
import type { WorkflowTemplate } from '../domain/workflow';

interface PwWorkflowControlProps {
  projectId: string;
  templates: WorkflowTemplate[];
  currentRunId?: string;
  onRunChange?: (runId: string | null) => void;
}

type RunState = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export function PwWorkflowControl({
  projectId,
  templates,
  currentRunId,
  onRunChange,
}: PwWorkflowControlProps) {
  const services = useLocalServices();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id ?? ''
  );
  const [runState, setRunState] = useState<RunState>('idle');
  const [runId, setRunId] = useState<string | null>(currentRunId ?? null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    if (!selectedTemplateId) return;

    setError(null);
    setRunState('running');

    const result = await services.createWorkflowRun(projectId, selectedTemplateId);

    if (result.ok) {
      setRunId(result.data!.runId);
      onRunChange?.(result.data!.runId);
    } else {
      setRunState('idle');
      setError(result.error?.message ?? '启动失败');
    }
  }, [selectedTemplateId, projectId, services, onRunChange]);

  const handlePause = useCallback(async () => {
    if (!runId) return;

    const result = await services.pauseWorkflowRun(runId);
    if (result.ok) {
      setRunState('paused');
    } else {
      setError(result.error?.message ?? '暂停失败');
    }
  }, [runId, services]);

  const handleResume = useCallback(async () => {
    if (!runId) return;

    const result = await services.resumeWorkflowRun(runId);
    if (result.ok) {
      setRunState('running');
    } else {
      setError(result.error?.message ?? '恢复失败');
    }
  }, [runId, services]);

  const handleCancel = useCallback(async () => {
    if (!runId) return;

    const result = await services.cancelWorkflowRun(runId);
    if (result.ok) {
      setRunState('idle');
      setRunId(null);
      onRunChange?.(null);
    } else {
      setError(result.error?.message ?? '取消失败');
    }
  }, [runId, services, onRunChange]);

  const stateColors: Record<RunState, string> = {
    idle: 'var(--muted)',
    running: 'var(--ok)',
    paused: 'var(--warn)',
    completed: 'var(--ok)',
    failed: 'var(--danger)',
  };

  return (
    <div className="pw-workflow-control">
      <header className="pw-wfc-header">
        <h3>
          <ChevronRight size={18} />
          工作流执行
        </h3>
        <span style={{ color: stateColors[runState] }}>
          {runState.toUpperCase()}
        </span>
      </header>

      <div className="pw-wfc-body">
        {runState === 'idle' && (
          <div className="pw-wfc-start">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="pw-wfc-select"
            >
              <option value="">选择工作流模板...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (v{t.version})
                </option>
              ))}
            </select>

            <button
              className="btn primary"
              onClick={handleStart}
              disabled={!selectedTemplateId}
            >
              <Play size={14} />
              启动工作流
            </button>
          </div>
        )}

        {runState === 'running' && (
          <div className="pw-wfc-controls">
            <button className="btn" onClick={handlePause}>
              <Pause size={14} />
              暂停
            </button>
            <button className="btn danger" onClick={handleCancel}>
              <Square size={14} />
              取消
            </button>
          </div>
        )}

        {runState === 'paused' && (
          <div className="pw-wfc-controls">
            <button className="btn primary" onClick={handleResume}>
              <RotateCcw size={14} />
              恢复
            </button>
            <button className="btn danger" onClick={handleCancel}>
              <Square size={14} />
              取消
            </button>
          </div>
        )}

        {error && (
          <div className="pw-wfc-error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 添加样式**

```css
/* Workflow Control */
.pw-workflow-control {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.pw-wfc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.pw-wfc-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
}

.pw-wfc-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pw-wfc-start {
  display: flex;
  gap: 8px;
}

.pw-wfc-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--fg);
}

.pw-wfc-controls {
  display: flex;
  gap: 8px;
}

.pw-wfc-error {
  color: var(--danger);
  font-size: 12px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
}
```

- [ ] **Step 4: 运行测试**

Run: `npm --cache .npm-cache test -- src/__tests__/components/PwWorkflowControl.test.tsx`
Expected: PASS

- [ ] **Step 5: 集成到工作台**

在 `ProjectWorkspace.tsx` 添加：

```tsx
import { PwWorkflowControl } from './PwWorkflowControl';

// 在适当位置添加
<PwWorkflowControl
  projectId={projectId}
  templates={data.workflowTemplates}
  onRunChange={(runId) => console.log('Run changed:', runId)}
/>
```

- [ ] **Step 6: 提交**

```bash
git add src/components/PwWorkflowControl.tsx src/__tests__/components/PwWorkflowControl.test.tsx src/components/ProjectWorkspace.tsx
git commit -m "feat(p0-03): add workflow execution control panel"
```

---

## P1-01: 设置持久化

### 目标
设置中心点击保存后，实际持久化到本地文件。

### Task 8: 创建设置 UseCase

**Files:**
- Create: `src/services/local/useCases/settingsUseCase.ts`
- Create: `src/__tests__/services/local/useCases/settingsUseCase.test.ts`

- [ ] **Step 1: 定义设置结构**

```typescript
// src/types/settings.ts

export interface AppSettings {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  defaultWorkflowTemplateId?: string;
  defaultRunnerId?: string;
  aiAssistantModel?: string;
  theme?: 'light' | 'dark' | 'system';
  language?: 'zh-CN' | 'en-US';
  updatedAt: string;
}
```

- [ ] **Step 2: 编写测试**

```typescript
// src/__tests__/services/local/useCases/settingsUseCase.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings } from '../../../../services/local/useCases/settingsUseCase';
import { FileStoreAdapter } from '../../../../services/local/adapters/fileStoreAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('settingsUseCase', () => {
  let fileStore: FileStoreAdapter;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: '/test',
  };

  beforeEach(() => {
    fileStore = new FileStoreAdapter(config);
  });

  it('should load default settings when file not exists', async () => {
    const result = await loadSettings(fileStore);
    
    expect(result.ok).toBe(true);
    expect(result.data?.user.name).toBe('');
  });

  it('should save and load settings', async () => {
    const settings = {
      user: { name: 'Test User', email: 'test@example.com' },
      updatedAt: new Date().toISOString(),
    };

    const saveResult = await saveSettings(fileStore, settings);
    expect(saveResult.ok).toBe(true);

    const loadResult = await loadSettings(fileStore);
    expect(loadResult.ok).toBe(true);
    expect(loadResult.data?.user.name).toBe('Test User');
  });
});
```

- [ ] **Step 3: 实现设置 UseCase**

```typescript
// src/services/local/useCases/settingsUseCase.ts

import type { FileStoreAdapter } from '../adapters/fileStoreAdapter';
import type { LocalResult } from '../../../types/localEngineering';
import type { AppSettings } from '../../../types/settings';

const SETTINGS_PATH = '.agentmanagement/settings.json';

const DEFAULT_SETTINGS: AppSettings = {
  user: {
    name: '',
    email: '',
  },
  updatedAt: new Date().toISOString(),
};

/**
 * 加载应用设置
 */
export async function loadSettings(
  fileStore: FileStoreAdapter
): Promise<LocalResult<AppSettings>> {
  const result = await fileStore.readJson<AppSettings>(SETTINGS_PATH);

  if (!result.ok) {
    // 文件不存在，返回默认设置
    return {
      ok: true,
      data: DEFAULT_SETTINGS,
      diagnostics: ['使用默认设置'],
    };
  }

  return {
    ok: true,
    data: {
      ...DEFAULT_SETTINGS,
      ...result.data,
    },
  };
}

/**
 * 保存应用设置
 */
export async function saveSettings(
  fileStore: FileStoreAdapter,
  settings: Partial<AppSettings>
): Promise<LocalResult<AppSettings>> {
  // 先加载现有设置
  const existingResult = await loadSettings(fileStore);
  const existing = existingResult.ok ? existingResult.data! : DEFAULT_SETTINGS;

  const updated: AppSettings = {
    ...existing,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  const result = await fileStore.writeJson(SETTINGS_PATH, updated);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: updated,
    diagnostics: ['设置已保存'],
  };
}
```

- [ ] **Step 4: 更新 Settings 组件**

在 `src/components/Settings.tsx`：

```typescript
// 添加导入
import { useLocalServices } from '../hooks/useLocalServices';
import { saveSettings } from '../services/local/useCases/settingsUseCase';

// 在组件内
const services = useLocalServices();
const [saving, setSaving] = useState(false);

// 替换保存按钮处理
const handleSave = async () => {
  setSaving(true);
  
  const result = await saveSettings(services.fileStore, {
    user: { name: userName, email: userEmail },
    defaultWorkflowTemplateId: defaultTemplate,
    defaultRunnerId: defaultRunner,
  });
  
  if (result.ok) {
    setSaved(true);
  } else {
    // 显示错误
    console.error('保存失败:', result.error);
  }
  
  setSaving(false);
};
```

- [ ] **Step 5: 运行测试**

Run: `npm --cache .npm-cache test -- src/__tests__/services/local/useCases/settingsUseCase.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/types/settings.ts src/services/local/useCases/settingsUseCase.ts src/__tests__/services/local/useCases/settingsUseCase.test.ts src/components/Settings.tsx
git commit -m "feat(p1-01): add settings persistence"
```

---

## P1-02: 记忆管理 CRUD

### 目标
记忆管理页面的创建、编辑、删除操作真实持久化。

### Task 9: 创建记忆 UseCase

**Files:**
- Create: `src/services/local/useCases/memoryUseCase.ts`
- Create: `src/__tests__/services/local/useCases/memoryUseCase.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
// src/__tests__/services/local/useCases/memoryUseCase.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMemory,
  updateMemory,
  deleteMemory,
  listMemories,
  searchMemories,
} from '../../../../services/local/useCases/memoryUseCase';
import { MemoryRepository } from '../../../../services/local/repositories/memoryRepository';
import { FileStoreAdapter } from '../../../../services/local/adapters/fileStoreAdapter';
import type { AdapterConfig, Memory } from '../../../../types/localEngineering';

describe('memoryUseCase', () => {
  let repository: MemoryRepository;
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 30000,
    projectRoot: '/test',
  };

  beforeEach(() => {
    const fileStore = new FileStoreAdapter(config);
    repository = new MemoryRepository(fileStore);
  });

  describe('createMemory', () => {
    it('should create memory with generated ID', async () => {
      const result = await createMemory(repository, {
        kind: 'project',
        scope: 'project',
        projectId: 'proj-001',
        title: 'Test Memory',
        body: 'This is a test memory',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.title).toBe('Test Memory');
    });
  });

  describe('updateMemory', () => {
    it('should update existing memory', async () => {
      // 先创建
      const createResult = await createMemory(repository, {
        kind: 'project',
        scope: 'project',
        projectId: 'proj-001',
        title: 'Original Title',
        body: 'Original body',
      });

      const memoryId = createResult.data!.id;

      // 再更新
      const result = await updateMemory(repository, memoryId, {
        title: 'Updated Title',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.title).toBe('Updated Title');
    });
  });

  describe('deleteMemory', () => {
    it('should mark memory as deleted', async () => {
      const createResult = await createMemory(repository, {
        kind: 'project',
        scope: 'project',
        projectId: 'proj-001',
        title: 'To Delete',
        body: 'Will be deleted',
      });

      const memoryId = createResult.data!.id;

      const result = await deleteMemory(repository, memoryId);
      expect(result.ok).toBe(true);
    });
  });

  describe('searchMemories', () => {
    it('should search by keyword', async () => {
      await createMemory(repository, {
        kind: 'project',
        scope: 'project',
        projectId: 'proj-001',
        title: 'API Design',
        body: 'REST API endpoints',
      });

      await createMemory(repository, {
        kind: 'project',
        scope: 'project',
        projectId: 'proj-001',
        title: 'Database Schema',
        body: 'PostgreSQL tables',
      });

      const result = await searchMemories(repository, 'API');

      expect(result.ok).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].title).toBe('API Design');
    });
  });
});
```

- [ ] **Step 2: 实现记忆 UseCase**

```typescript
// src/services/local/useCases/memoryUseCase.ts

import type { MemoryRepository } from '../repositories/memoryRepository';
import type { LocalResult, Memory } from '../../../types/localEngineering';
import type { MemoryKind, MemoryScope } from '../../../domain/memory';

export interface CreateMemoryInput {
  kind: MemoryKind;
  scope: MemoryScope;
  projectId: string;
  roleId?: string | null;
  taskId?: string | null;
  title: string;
  body: string;
  citation?: { source: string; timestamp: string }[];
}

export interface UpdateMemoryInput {
  title?: string;
  body?: string;
  scope?: MemoryScope;
}

/**
 * 创建记忆
 */
export async function createMemory(
  repository: MemoryRepository,
  input: CreateMemoryInput
): Promise<LocalResult<Memory>> {
  if (!input.title?.trim()) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: '记忆标题不能为空',
        recoverable: true,
      },
    };
  }

  const now = new Date().toISOString();
  const memoryId = `mem-${Date.now()}`;

  const memory: Memory = {
    id: memoryId,
    kind: input.kind,
    scope: input.scope,
    projectId: input.projectId,
    roleId: input.roleId ?? null,
    taskId: input.taskId ?? null,
    title: input.title,
    content: input.body,
    body: input.body,
    citation: input.citation ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const result = await repository.save(memory);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: memory,
    diagnostics: [`记忆已创建: ${memory.title}`],
  };
}

/**
 * 更新记忆
 */
export async function updateMemory(
  repository: MemoryRepository,
  memoryId: string,
  updates: UpdateMemoryInput
): Promise<LocalResult<Memory>> {
  const loadResult = await repository.load(memoryId);

  if (!loadResult.ok) {
    return {
      ok: false,
      error: loadResult.error,
    };
  }

  const existing = loadResult.data!;
  const now = new Date().toISOString();

  const updated: Memory = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  const saveResult = await repository.save(updated);

  if (!saveResult.ok) {
    return {
      ok: false,
      error: saveResult.error,
    };
  }

  return {
    ok: true,
    data: updated,
    diagnostics: [`记忆已更新: ${updated.title}`],
  };
}

/**
 * 删除记忆
 */
export async function deleteMemory(
  repository: MemoryRepository,
  memoryId: string
): Promise<LocalResult<void>> {
  const result = await repository.delete(memoryId);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: undefined,
    diagnostics: [`记忆已删除: ${memoryId}`],
  };
}

/**
 * 列出项目记忆
 */
export async function listMemories(
  repository: MemoryRepository,
  projectId: string,
  filters?: {
    kind?: MemoryKind;
    scope?: MemoryScope;
    roleId?: string;
  }
): Promise<LocalResult<Memory[]>> {
  // 读取索引
  const indexResult = await repository.fileStore.readJson<{ memories: string[] }>(
    '.agentmanagement/memory/index.json'
  );

  if (!indexResult.ok) {
    return {
      ok: true,
      data: [],
    };
  }

  const memories: Memory[] = [];

  for (const memoryId of indexResult.data?.memories ?? []) {
    const result = await repository.load(memoryId);
    if (result.ok) {
      const mem = result.data!;
      // 应用过滤条件
      if (mem.projectId !== projectId) continue;
      if (filters?.kind && mem.kind !== filters.kind) continue;
      if (filters?.scope && mem.scope !== filters.scope) continue;
      if (filters?.roleId && mem.roleId !== filters.roleId) continue;

      memories.push(mem);
    }
  }

  return {
    ok: true,
    data: memories,
  };
}

/**
 * 搜索记忆
 */
export async function searchMemories(
  repository: MemoryRepository,
  keyword: string,
  projectId?: string
): Promise<LocalResult<Memory[]>> {
  const lowerKeyword = keyword.toLowerCase();

  // 读取索引
  const indexResult = await repository.fileStore.readJson<{ memories: string[] }>(
    '.agentmanagement/memory/index.json'
  );

  if (!indexResult.ok) {
    return {
      ok: true,
      data: [],
    };
  }

  const matches: Memory[] = [];

  for (const memoryId of indexResult.data?.memories ?? []) {
    const result = await repository.load(memoryId);
    if (result.ok) {
      const mem = result.data!;
      // 搜索标题和内容
      const titleMatch = mem.title.toLowerCase().includes(lowerKeyword);
      const bodyMatch = (mem.body ?? '').toLowerCase().includes(lowerKeyword);

      if (titleMatch || bodyMatch) {
        if (projectId && mem.projectId !== projectId) continue;
        matches.push(mem);
      }
    }
  }

  return {
    ok: true,
    data: matches,
  };
}
```

- [ ] **Step 3: 更新 MemoryManager 组件**

```typescript
// 在 MemoryManager.tsx 添加导入
import { useLocalServices } from '../hooks/useLocalServices';
import { createMemory, updateMemory, deleteMemory, searchMemories } from '../services/local/useCases/memoryUseCase';

// 替换 addMemory 调用
const handleCreateMemory = async (input: CreateMemoryInput) => {
  const services = useLocalServices();
  const result = await createMemory(services.repositories.memory, input);
  
  if (result.ok) {
    addMemory(result.data!); // 同步更新 reducer
  } else {
    // 显示错误
  }
};
```

- [ ] **Step 4: 运行测试**

Run: `npm --cache .npm-cache test -- src/__tests__/services/local/useCases/memoryUseCase.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/services/local/useCases/memoryUseCase.ts src/__tests__/services/local/useCases/memoryUseCase.test.ts src/components/MemoryManager.tsx
git commit -m "feat(p1-02): add memory CRUD use cases and UI integration"
```

---

## P1-03: Git 状态实时显示

### 目标
在项目卡片和工作台显示真实的 Git 分支、状态。

### Task 10: 集成 Git 状态到项目卡片

**Files:**
- Modify: `src/components/ProjectCard.tsx`

- [ ] **Step 1: 添加 Git 状态获取**

```typescript
// 在 ProjectCard.tsx 添加
import { useEffect, useState } from 'react';
import { useLocalServices } from '../hooks/useLocalServices';
import { getGitStatus, type ProjectGitStatus } from '../services/local/useCases/gitStatusUseCase';

// 在组件内
const services = useLocalServices();
const [gitStatus, setGitStatus] = useState<ProjectGitStatus | null>(null);

useEffect(() => {
  const fetchGitStatus = async () => {
    const result = await getGitStatus(services.git, project.id, project.repoPath);
    if (result.ok) {
      setGitStatus(result.data!);
    }
  };

  fetchGitStatus();
  const interval = setInterval(fetchGitStatus, 60000); // 每分钟刷新
  return () => clearInterval(interval);
}, [project.id, project.repoPath, services.git]);
```

- [ ] **Step 2: 显示 Git 状态**

```tsx
{/* 替换 mock 的分支显示 */}
<div className="project-card-git">
  <GitBranchIcon size={12} />
  <span>{gitStatus?.branch ?? 'Loading...'}</span>
  {gitStatus?.ahead ? <span className="badge primary">↑{gitStatus.ahead}</span> : null}
  {gitStatus?.behind ? <span className="badge warn">↓{gitStatus.behind}</span> : null}
</div>

{/* 状态指示器 */}
{gitStatus && (
  <div className="project-card-status">
    {gitStatus.staged > 0 && <span className="staged">{gitStatus.staged} staged</span>}
    {gitStatus.unstaged > 0 && <span className="unstaged">{gitStatus.unstaged} changed</span>}
    {gitStatus.untracked > 0 && <span className="untracked">{gitStatus.untracked} untracked</span>}
    {gitStatus.isClean && <span className="clean">Clean</span>}
  </div>
)}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/ProjectCard.tsx
git commit -m "feat(p1-03): show real git status in ProjectCard"
```

---

## P2-01: AI 助手真实对话

### 目标
AI 助手使用真实的 LLM API 进行对话。

### Task 11: 创建 AI UseCase

**Files:**
- Create: `src/services/local/useCases/aiUseCase.ts`
- Create: `src/__tests__/services/local/useCases/aiUseCase.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
// src/__tests__/services/local/useCases/aiUseCase.test.ts

import { describe, it, expect, vi } from 'vitest';
import { sendChatMessage, buildContext } from '../../../../services/local/useCases/aiUseCase';
import { LlmAdapter } from '../../../../services/local/adapters/llmAdapter';
import type { AdapterConfig } from '../../../../types/localEngineering';

describe('aiUseCase', () => {
  const config: AdapterConfig = {
    enableMock: true,
    defaultTimeout: 60000,
    projectRoot: '/test',
  };

  describe('sendChatMessage', () => {
    it('should send message and receive response', async () => {
      const llmAdapter = new LlmAdapter(config);
      llmAdapter.setMockData('chat-response', {
        content: '这是一个测试回复',
        model: 'test-model',
        usage: { inputTokens: 10, outputTokens: 20 },
      });

      const result = await sendChatMessage(llmAdapter, {
        messages: [{ role: 'user', content: '你好' }],
        modelId: 'test-model',
      });

      expect(result.ok).toBe(true);
      expect(result.data?.content).toContain('测试回复');
    });
  });

  describe('buildContext', () => {
    it('should build context from project data', async () => {
      const context = await buildContext({
        projectId: 'proj-001',
        projectName: 'Test Project',
        currentView: 'project-workspace',
        recentFiles: ['README.md', 'package.json'],
      });

      expect(context).toContain('Test Project');
      expect(context).toContain('README.md');
    });
  });
});
```

- [ ] **Step 2: 实现 AI UseCase**

```typescript
// src/services/local/useCases/aiUseCase.ts

import type { LlmAdapter } from '../adapters/llmAdapter';
import type { LocalResult } from '../../../types/localEngineering';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  modelId: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ContextInput {
  projectId: string;
  projectName: string;
  currentView: string;
  recentFiles?: string[];
  activeWorkflow?: string;
}

/**
 * 发送聊天消息
 */
export async function sendChatMessage(
  llmAdapter: LlmAdapter,
  request: ChatRequest
): Promise<LocalResult<ChatResponse>> {
  const result = await llmAdapter.chat({
    messages: request.messages,
    model: request.modelId,
    temperature: request.temperature ?? 0.7,
    maxTokens: request.maxTokens ?? 2000,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: {
      content: result.data!.content,
      model: request.modelId,
      usage: result.data!.usage,
    },
  };
}

/**
 * 构建上下文信息
 */
export async function buildContext(input: ContextInput): Promise<string> {
  const parts: string[] = [];

  parts.push(`当前项目: ${input.projectName} (${input.projectId})`);
  parts.push(`当前页面: ${input.currentView}`);

  if (input.recentFiles?.length) {
    parts.push(`最近文件: ${input.recentFiles.join(', ')}`);
  }

  if (input.activeWorkflow) {
    parts.push(`当前工作流: ${input.activeWorkflow}`);
  }

  return parts.join('\n');
}

/**
 * AI 生成项目配置
 */
export async function aiGenerateProjectConfig(
  llmAdapter: LlmAdapter,
  input: {
    description: string;
    goals: string;
    techStack?: string;
  }
): Promise<LocalResult<{
  name: string;
  description: string;
  roles: Array<{ name: string; prompt: string }>;
  workflowSteps: Array<{ name: string; roleName: string }>;
}>> {
  const systemPrompt = `你是一个项目配置生成助手。根据用户输入的项目描述和目标，生成：
1. 项目名称
2. 项目描述
3. 建议的角色列表（包含名称和角色提示）
4. 建议的工作流步骤列表

请以 JSON 格式返回结果。`;

  const result = await llmAdapter.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `项目描述: ${input.description}\n目标: ${input.goals}\n技术栈: ${input.techStack ?? '未指定'}` },
    ],
    model: 'default',
    temperature: 0.8,
    maxTokens: 2000,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  try {
    const config = JSON.parse(result.data!.content);
    return {
      ok: true,
      data: config,
    };
  } catch {
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: 'AI 返回格式错误',
        recoverable: true,
      },
    };
  }
}

/**
 * AI 生成工作流步骤
 */
export async function aiGenerateWorkflowSteps(
  llmAdapter: LlmAdapter,
  input: {
    projectPlan: string;
    existingRoles: Array<{ id: string; name: string }>;
  }
): Promise<LocalResult<Array<{ name: string; roleId: string; order: number }>>> {
  const systemPrompt = `你是一个工作流设计助手。根据项目计划，生成工作流步骤列表。
每个步骤需要指定：
- name: 步骤名称
- roleId: 使用以下角色之一: ${input.existingRoles.map(r => r.name).join(', ')}
- order: 步骤顺序（从1开始）

请以 JSON 数组格式返回。`;

  const result = await llmAdapter.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input.projectPlan },
    ],
    model: 'default',
    temperature: 0.7,
    maxTokens: 2000,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  try {
    const steps = JSON.parse(result.data!.content);
    // 验证并映射 roleId
    const validatedSteps = steps.map((step: { name: string; roleId: string; order: number }) => {
      const role = input.existingRoles.find(r => r.name === step.roleId || r.id === step.roleId);
      return {
        name: step.name,
        roleId: role?.id ?? input.existingRoles[0]?.id ?? '',
        order: step.order,
      };
    });
    return {
      ok: true,
      data: validatedSteps,
    };
  } catch {
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: 'AI 返回格式错误',
        recoverable: true,
      },
    };
  }
}
```

- [ ] **Step 3: 更新 AiChatPanel**

```typescript
// 在 AiChatPanel.tsx 替换 generateResponse
import { sendChatMessage, buildContext } from '../services/local/useCases/aiUseCase';
import { useLocalServices } from '../hooks/useLocalServices';

const services = useLocalServices();

const handleSend = async () => {
  if (!input.trim()) return;

  const userMessage = { id: nextMsgId(), role: 'user' as const, text: input };
  setMessages(prev => [...prev, userMessage]);
  setInput('');

  // 构建上下文
  const context = await buildContext({
    projectId: 'current-project',
    projectName: 'Current Project',
    currentView: view,
  });

  // 发送真实请求
  const result = await sendChatMessage(services.llm, {
    messages: [
      { role: 'system', content: `你是工程助手。上下文:\n${context}` },
      ...messages.slice(-10).map(m => ({ role: m.role, content: m.text })),
      { role: 'user', content: input },
    ],
    modelId: data.aiAssistantModel ?? 'default',
  });

  if (result.ok) {
    const assistantMessage = {
      id: nextMsgId(),
      role: 'assistant' as const,
      text: result.data!.content,
    };
    setMessages(prev => [...prev, assistantMessage]);
  } else {
    // 显示错误
    const errorMessage = {
      id: nextMsgId(),
      role: 'assistant' as const,
      text: `错误: ${result.error?.message}`,
    };
    setMessages(prev => [...prev, errorMessage]);
  }
};
```

- [ ] **Step 4: 运行测试**

Run: `npm --cache .npm-cache test -- src/__tests__/services/local/useCases/aiUseCase.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/services/local/useCases/aiUseCase.ts src/__tests__/services/local/useCases/aiUseCase.test.ts src/components/AiChatPanel.tsx
git commit -m "feat(p2-01): integrate real LLM chat in AI assistant"
```

---

## 验收清单

### P0 验收 - 核心功能

- [ ] CLI Runner 可启动/停止，日志实时显示
- [ ] 新建项目后 `.agentmanagement/projects/` 有对应 JSON 文件
- [ ] 导入项目后配置正确保存
- [ ] 工作流可启动/暂停/恢复/取消

### P1 验收 - 数据持久化

- [ ] 设置保存后重启应用配置保留
- [ ] 记忆创建后可在 `.agentmanagement/memory/` 找到
- [ ] 项目卡片显示真实 Git 分支和状态

### P2 验收 - AI 功能

- [ ] AI 助手返回真实 LLM 响应（非 mock）
- [ ] AI 建项生成合理的配置
- [ ] AI 流程设计生成可用步骤

### 全局验收

- [ ] `npm run build` 通过
- [ ] `npm test` 所有测试通过
- [ ] 无 TypeScript 类型错误

---

## 执行顺序建议

1. **P0-01**: CLI Runner 控制面板（最核心，后端已完成）
2. **P0-02**: 项目创建/导入（核心功能）
3. **P0-03**: 工作流执行控制（核心功能）
4. **P1-01**: 设置持久化
5. **P1-02**: 记忆管理 CRUD
6. **P1-03**: Git 状态显示
7. **P2-01**: AI 真实对话

---

## 注意事项

1. **浏览器环境使用 mock** - `createLocalServices()` 自动在浏览器环境启用 mock
2. **Node.js 环境使用真实命令** - Electron/CLI 环境可执行真实 shell
3. **敏感信息安全** - Git 凭证、API Key 等不直接存储，使用系统密钥链
4. **错误友好** - 所有操作有明确的成功/失败反馈
5. **渐进增强** - mock 模式可预览 UI，真实模式可执行操作
