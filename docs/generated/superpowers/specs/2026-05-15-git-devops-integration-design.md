# Git/DevOps Integration Design

日期：2026-05-15
状态：设计方案
关联：`docs/HANDOFF_NEXT_TASKS.md`

## 目标

在 Agent Management 中集成 Git 平台认证和 DevOps 功能，支持 GitHub、GitLab、Gitee 三个平台，配置界面在设置中心，Issues/PR/CI 面板聚合到项目管理页面。

## 定位原则

- Phase 1 前端 MVP：配置壳 + fixtures 数据展示，不做真实 API 调用
- Git 认证全局配置在设置中心
- 项目级绑定仓库、Issues/PR/CI 展示在项目管理页面

## 平台支持

| 平台 | 显示名 | API Base | 说明 |
|------|--------|----------|------|
| GitHub | GitHub | `api.github.com` | 包括 github.com 和 GHE |
| GitLab | GitLab | `gitlab.com` | 包括 gitlab.com 和自托管 |
| Gitee | Gitee | `gitee.com` | 国内常用 |

每个平台可配置多套认证（如公司 GitLab + 个人 GitLab），每套认证有独立的 token 和自定义名称。

## 导航布局

```
设置中心
├── 用户偏好
├── 项目设置
├── 模型配置
├── 能力中心
├── IM 适配器
└── Git 认证          ← 新 tab
    ├── 平台列表（GitHub / GitLab / Gitee）
    │   ├── 添加认证（名称 + token + API URL）
    │   ├── 编辑认证
    │   └── 删除认证
    └── 连接测试按钮

项目管理页面（P0 新建）
├── 项目信息
├── 工作流绑定
├── 远程仓库绑定       ← 选择已配置的平台认证 + 输入仓库路径
├── Issues 面板         ← fixtures 数据，按项目筛选
├── Pull Requests 面板  ← fixtures 数据，按项目筛选
└── CI/CD 状态面板      ← fixtures 数据，最近流水线状态
```

## Domain 模型

### 新增类型

```typescript
// Git 平台提供商
export type GitPlatform = "github" | "gitlab" | "gitee";

// 一套认证配置
export interface GitCredential {
  id: string;
  platform: GitPlatform;
  name: string;           // 自定义名称，如"公司 GitLab"
  token: string;          // Personal Access Token（Phase 1 存 fixtures 占位）
  apiUrl: string;         // API 地址，默认 github.com/gitlab.com/gitee.com
  verified: boolean;      // token 是否验证通过
  createdAt: string;
  updatedAt: string;
}

// Issue（聚合到项目详情）
export interface RepoIssue {
  id: string;
  platform: GitPlatform;
  credentialId: string;   // 使用哪套认证
  repoOwner: string;
  repoName: string;
  issueNumber: number;
  title: string;
  state: "open" | "closed";
  labels: string[];
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
}

// Pull Request（聚合到项目详情）
export interface RepoPullRequest {
  id: string;
  platform: GitPlatform;
  credentialId: string;
  repoOwner: string;
  repoName: string;
  prNumber: number;
  title: string;
  state: "open" | "merged" | "closed";
  sourceBranch: string;
  targetBranch: string;
  author: string;
  reviewStatus: "pending" | "approved" | "changes_requested";
  createdAt: string;
  updatedAt: string;
}

// CI/CD 流水线状态
export interface CiPipeline {
  id: string;
  platform: GitPlatform;
  credentialId: string;
  repoOwner: string;
  repoName: string;
  pipelineName: string;
  status: "running" | "success" | "failed" | "pending" | "canceled";
  branch: string;
  commitSha: string;
  commitMessage: string;
  duration: string;
  createdAt: string;
}
```

### 扩展已有类型

```typescript
// Project 扩展
export interface Project {
  // ... 已有字段
  remoteRepo?: {                          // 新增：项目绑定的远程仓库
    platform: GitPlatform;
    credentialId: string;                 // 引用的认证配置 id
    repoOwner: string;
    repoName: string;
    defaultBranch: string;                // 复用已有的 defaultBranch
  };
}
```

### WorkbenchData 扩展

```typescript
export interface WorkbenchData {
  // ... 已有字段
  gitCredentials: GitCredential[];        // 新增
  repoIssues: RepoIssue[];               // 新增
  repoPullRequests: RepoPullRequest[];    // 新增
  ciPipelines: CiPipeline[];             // 新增
}
```

## 设置中心 Git 认证 Tab 设计

### UI 布局

```
┌──────────────────────────────────────────────────┐
│  Git 认证配置                                     │
│  管理 GitHub、GitLab、Gitee 平台的认证凭据。       │
│  [+ 添加认证]                                     │
├──────────────────────────────────────────────────┤
│  ▼ GitHub                             2 套认证   │
│  ┌──────────────────────────────────────────────┐ │
│  │ 个人 GitHub         ● 已验证  [编辑] [删除]  │ │
│  │ api.github.com      token: ghp_****          │ │
│  └──────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────┐ │
│  │ 公司 GitHub (GHE)    ● 已验证  [编辑] [删除]  │ │
│  │ gh.company.com      token: ghp_****          │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ▼ GitLab                             1 套认证    │
│  ┌──────────────────────────────────────────────┐ │
│  │ 公司 GitLab          ○ 未验证   [编辑] [删除] │ │
│  │ gitlab.company.com  token: glpat-****        │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ▼ Gitee                              1 套认证    │
│  ┌──────────────────────────────────────────────┐ │
│  │ 个人 Gitee           ● 已验证   [编辑] [删除] │ │
│  │ gitee.com           token: ****              │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 添加/编辑认证表单

```
┌─────────────────────────────────────┐
│ 新增认证                            │
├─────────────────────────────────────┤
│ 平台      [GitHub ▼]               │
│ 认证名称  [________________]        │
│ Token     [________________]        │
│ API URL   [api.github.com       ]   │
│                                      │
│ 显示名称映射：                        │
│ - GitHub  → api.github.com          │
│ - GitLab  → gitlab.com              │
│ - Gitee   → gitee.com              │
│                                      │
│ [连接测试]        [保存] [取消]      │
└─────────────────────────────────────┘
```

- 切换平台时默认 API URL 自动变化
- Token 编辑时保持脱敏显示（输入框为空，需重新填写）
- "连接测试" 按钮在 Phase 1 显示 toast "Phase 2 支持真实 API 调用"，不执行真实验证

## 项目管理页面 - 远程仓库绑定

### UI 布局

```
┌──────────────────────────────────────────────────┐
│  远程仓库                                         │
│  ┌──────────────────────────────────────────────┐ │
│  │ 平台      [GitHub ▼]                         │ │
│  │ 认证凭据   [个人 GitHub ▼]                    │ │
│  │ 仓库路径   [owner           / repo-name]       │ │
│  │ 默认分支   [main                     ▼]       │ │
│  │                                                │ │
│  │ 当前绑定：GitHub / anthropic/claude-code       │ │
│  │ 默认分支：main                                  │ │
│  │                                 [保存]        │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

- 平台下拉自动过滤有认证凭据的平台
- 认证凭据下拉只显示已选平台下的配置（如选了 GitHub，只显示 GitHub 认证）
- 无可用凭据时显示："请先在设置中心配置 Git 认证"

## 项目管理页面 - Issues 面板

### UI 布局

```
┌──────────────────────────────────────────────────┐
│  Issues                                          │
│  [全部 ▼] [打开 ▼]  [🔍 搜索...]                 │
├──────────────────────────────────────────────────┤
│  #12  feat: 支持工作流步骤覆盖    🔵 enhancement  │
│  #11  fix: 人工决策面板暗色主题显示异常  🔴 bug  │
│  #10  docs: 更新 README            🟢 docs       │
│  #8   feat: 内存管理 CRUD 完成     ✅ closed     │
└──────────────────────────────────────────────────┘
```

- 列表条目：编号 + 标题 + 标签 + 状态
- 状态筛选：全部 / 打开 / 已关闭
- Phase 1 fixtures 数据硬编码 4-5 条示例 Issue

## 项目管理页面 - Pull Requests 面板

### UI 布局

```
┌──────────────────────────────────────────────────┐
│  Pull Requests                                    │
│  [全部 ▼] [🔍 搜索...]                            │
├──────────────────────────────────────────────────┤
│  PR #5  fix: gate-decision 重构   ✅ 已合并       │
│         main ← fix/gate-refactor                  │
│  PR #4  feat: AppShell 导航合并   🔍 待审查       │
│         main ← feat/nav-merge                     │
│  PR #3  feat: 记忆管理 CRUD       ❌ 需修改        │
│         main ← feat/memory-crud                   │
└──────────────────────────────────────────────────┘
```

- 列表条目：PR 编号 + 标题 + 状态 + 源→目标分支
- 审查状态图标：approved / pending / changes_requested
- Phase 1 fixtures 数据硬编码 3-4 条示例 PR

## 项目管理页面 - CI/CD 状态面板

### UI 布局

```
┌──────────────────────────────────────────────────┐
│  CI/CD 流水线                                     │
├──────────────────────────────────────────────────┤
│  ✅ Build & Test      main    #abc1234   2m 15s  │
│     feat: AppShell 导航合并                        │
│  ❌ Lint & Check      main    #def5678   45s     │
│     fix: 暗色主题修正                               │
│  ⏳ Deploy Preview    main    #ghi9012   运行中   │
│     docs: 更新 README                             │
└──────────────────────────────────────────────────┘
```

- 列表条目：状态图标 + 流水线名 + 分支 + commit SHA + 耗时
- Phase 1 fixtures：3 条示例，覆盖 running/success/failed 三种状态

## 代码变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| MODIFY | `src/domain/workbench.ts` | 新增 GitCredential、RepoIssue、RepoPullRequest、CiPipeline 类型；Project 加 remoteRepo；WorkbenchData 加 4 个字段；SettingsTab 加 git-auth |
| MODIFY | `src/data/fixtures.ts` | 添加 gitCredentials、repoIssues、repoPullRequests、ciPipelines 示例数据 |
| NEW | `src/components/GitAuthConfig.tsx` | 设置中心 Git 认证 tab — 平台分组、认证 CRUD、连接测试 |
| NEW | `src/components/GitRepoBinding.tsx` | 项目管理中远程仓库绑定表单（平台选择 → 凭据选择 → 仓库路径输入） |
| NEW | `src/components/IssueList.tsx` | Issues 列表面板（状态筛选、搜索） |
| NEW | `src/components/PullRequestList.tsx` | PR 列表面板（审查状态展示） |
| NEW | `src/components/CiPipelinePanel.tsx` | CI/CD 流水线状态面板 |
| MODIFY | `src/components/Settings.tsx` | SettingsTab 加 `"git-auth"`；渲染 GitAuthConfig 组件 |
| MODIFY | `src/components/ProjectManagement.tsx` | P0 新建时引用 GitRepoBinding + IssueList + PullRequestList + CiPipelinePanel |
| NEW | `src/__tests__/git-auth-config.test.tsx` | Git 认证 tab 测试 |
| NEW | `src/__tests__/git-repo-binding.test.tsx` | 仓库绑定表单测试 |

## 验收标准

- [ ] 设置中心有「Git 认证」tab，能添加/编辑/删除 GitHub、GitLab、Gitee 认证
- [ ] 每个平台可配置多套认证，各有独立 token 和自定义名称
- [ ] 项目管理页面能绑定远程仓库（选择平台 → 选择凭据 → 输入 owner/repo）
- [ ] Issues 面板显示 fixture Issues 列表，支持状态筛选
- [ ] Pull Requests 面板显示 fixture PR 列表，含审查状态图标
- [ ] CI/CD 面板显示 3 条示例流水线（success/failed/running）
- [ ] `npm test` 全部通过
- [ ] `npm run build` 通过
