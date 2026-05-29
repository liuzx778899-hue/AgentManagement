/**
 * Workflow Management Overview fixtures
 * Mock data for the workflow management overview page
 */

// Workflow category types
export type WorkflowCategory = "all" | "dev" | "design" | "review" | "release";

// Workflow status types
export type WorkflowStatus = "enabled" | "draft" | "disabled" | "high-risk";

// Health status types
export type HealthStatus = "healthy" | "warning" | "error" | "pending";

// Role coverage avatar
export interface RoleAvatar {
  initials: string;
  color: "green" | "purple" | "orange" | "blue" | "muted";
}

// Workflow step display
export interface WorkflowStepDisplay {
  no: string;
  name: string;
}

// Workflow asset card
export interface WorkflowAsset {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  version: string;
  stepCount: number;
  steps: WorkflowStepDisplay[];
  roleCoverage: RoleAvatar[];
  runnerCoverage: number;
  capabilityAuth: string;
  riskGap: string | null;
  healthStatus: HealthStatus;
  healthLabel: string;
  maturity: number;
  maturityLabel: string;
  category: WorkflowCategory;
  boundProjects: number;
  lastUpdated: string;
}

// Category statistics
export interface CategoryStats {
  id: WorkflowCategory;
  name: string;
  count: number;
  description: string;
  healthPercent: number;
  status: HealthStatus;
}

// KPI stats
export interface WorkflowKPIs {
  total: number;
  enabled: number;
  boundProjects: number;
  pendingValidation: number;
  highRisk: number;
}

// Capability authorization gap
export interface CapabilityGap {
  workflowName: string;
  missingCapability: string;
  severity: "high" | "medium" | "low";
}

// Role binding gap
export interface RoleBindingGap {
  workflowName: string;
  missingRole: string;
  status: "pending" | "unconfirmed";
}

// Recent change
export interface RecentChange {
  workflowName: string;
  description: string;
  timestamp: string;
}

// AI recommendation
export interface AIRecommendation {
  message: string;
  priority: "high" | "medium" | "low";
}

// Health panel data
export interface HealthPanelData {
  categories: CategoryStats[];
  capabilityGaps: CapabilityGap[];
  roleBindingGaps: RoleBindingGap[];
  recentChanges: RecentChange[];
  aiRecommendation: AIRecommendation;
}

// Full overview data
export interface WorkflowManagementOverviewData {
  kpis: WorkflowKPIs;
  workflows: WorkflowAsset[];
  healthPanel: HealthPanelData;
  loading: boolean;
  error: string | null;
  validating: boolean;
}

// Mock data
export const workflowManagementOverviewFixture: WorkflowManagementOverviewData = {
  kpis: {
    total: 12,
    enabled: 7,
    boundProjects: 4,
    pendingValidation: 3,
    highRisk: 1,
  },
  workflows: [
    {
      id: "wf-001",
      name: "软件开发完整流程",
      description: "覆盖需求分析、UI/UX、前端开发、代码审查与测试验收，当前用于 3 个项目。",
      status: "enabled",
      version: "v1.3",
      stepCount: 5,
      steps: [
        { no: "01", name: "需求分析" },
        { no: "02", name: "UI/UX" },
        { no: "03", name: "开发" },
        { no: "04", name: "审查" },
        { no: "05", name: "验收" },
      ],
      roleCoverage: [
        { initials: "产", color: "green" },
        { initials: "UI", color: "purple" },
        { initials: "前", color: "blue" },
        { initials: "审", color: "orange" },
        { initials: "测", color: "green" },
      ],
      runnerCoverage: 100,
      capabilityAuth: "MCP / Skills",
      riskGap: null,
      healthStatus: "warning",
      healthLabel: "待确认 1",
      maturity: 86,
      maturityLabel: "最近应用成熟度",
      category: "dev",
      boundProjects: 3,
      lastUpdated: "10分钟前",
    },
    {
      id: "wf-002",
      name: "设计评审流程",
      description: "用于方案评审、视觉一致性检查和交互验收，适合 UI 密集型项目。",
      status: "enabled",
      version: "v0.9",
      stepCount: 4,
      steps: [
        { no: "01", name: "方案收集" },
        { no: "02", name: "设计审查" },
        { no: "03", name: "可用性" },
        { no: "04", name: "确认" },
      ],
      roleCoverage: [
        { initials: "UI", color: "purple" },
        { initials: "产", color: "green" },
        { initials: "审", color: "orange" },
        { initials: "前", color: "blue" },
      ],
      runnerCoverage: 75,
      capabilityAuth: "Skills",
      riskGap: "Skills",
      healthStatus: "healthy",
      healthLabel: "健康",
      maturity: 72,
      maturityLabel: "评审覆盖率",
      category: "design",
      boundProjects: 2,
      lastUpdated: "今天",
    },
    {
      id: "wf-003",
      name: "Bug 修复流程",
      description: "面向缺陷定位、修复实现、回归测试和交付确认，仍缺测试角色绑定。",
      status: "draft",
      version: "v0.4",
      stepCount: 4,
      steps: [
        { no: "01", name: "复现" },
        { no: "02", name: "定位" },
        { no: "03", name: "修复" },
        { no: "04", name: "回归" },
      ],
      roleCoverage: [
        { initials: "前", color: "blue" },
        { initials: "审", color: "orange" },
        { initials: "产", color: "green" },
      ],
      runnerCoverage: 50,
      capabilityAuth: "",
      riskGap: "测试角色",
      healthStatus: "warning",
      healthLabel: "待校验",
      maturity: 48,
      maturityLabel: "闭环完整度",
      category: "dev",
      boundProjects: 0,
      lastUpdated: "2天前",
    },
    {
      id: "wf-004",
      name: "发布验收流程",
      description: "用于上线前验收、风险确认、版本冻结和发布回滚准备，Git 授权未完成。",
      status: "high-risk",
      version: "v1.0",
      stepCount: 6,
      steps: [
        { no: "01", name: "冻结" },
        { no: "02", name: "验收" },
        { no: "03", name: "安全" },
        { no: "04", name: "发布" },
        { no: "05", name: "回滚" },
      ],
      roleCoverage: [
        { initials: "产", color: "green" },
        { initials: "前", color: "blue" },
        { initials: "运", color: "purple" },
        { initials: "审", color: "orange" },
        { initials: "测", color: "green" },
      ],
      runnerCoverage: 67,
      capabilityAuth: "",
      riskGap: "Git 授权",
      healthStatus: "error",
      healthLabel: "授权缺口",
      maturity: 61,
      maturityLabel: "发布可用度",
      category: "release",
      boundProjects: 1,
      lastUpdated: "昨天",
    },
    {
      id: "wf-005",
      name: "代码审查流程",
      description: "标准化代码审查流程，包含静态分析、安全检查和最佳实践验证。",
      status: "enabled",
      version: "v1.2",
      stepCount: 3,
      steps: [
        { no: "01", name: "静态分析" },
        { no: "02", name: "安全检查" },
        { no: "03", name: "最佳实践" },
      ],
      roleCoverage: [
        { initials: "审", color: "orange" },
        { initials: "前", color: "blue" },
      ],
      runnerCoverage: 90,
      capabilityAuth: "MCP / Git",
      riskGap: null,
      healthStatus: "healthy",
      healthLabel: "健康",
      maturity: 85,
      maturityLabel: "审查覆盖度",
      category: "review",
      boundProjects: 4,
      lastUpdated: "今天",
    },
    {
      id: "wf-006",
      name: "需求分析流程",
      description: "产品需求分析标准化流程，包含需求收集、优先级排序和规格输出。",
      status: "enabled",
      version: "v1.1",
      stepCount: 4,
      steps: [
        { no: "01", name: "需求收集" },
        { no: "02", name: "优先级" },
        { no: "03", name: "规格输出" },
        { no: "04", name: "评审" },
      ],
      roleCoverage: [
        { initials: "产", color: "green" },
        { initials: "审", color: "orange" },
      ],
      runnerCoverage: 95,
      capabilityAuth: "MCP / Skills",
      riskGap: null,
      healthStatus: "healthy",
      healthLabel: "健康",
      maturity: 90,
      maturityLabel: "需求准确度",
      category: "dev",
      boundProjects: 3,
      lastUpdated: "今天",
    },
    {
      id: "wf-007",
      name: "产品验收流程",
      description: "产品功能验收流程，包含功能测试、验收标准和发布确认。",
      status: "enabled",
      version: "v1.0",
      stepCount: 3,
      steps: [
        { no: "01", name: "功能测试" },
        { no: "02", name: "验收标准" },
        { no: "03", name: "发布确认" },
      ],
      roleCoverage: [
        { initials: "产", color: "green" },
        { initials: "测", color: "green" },
      ],
      runnerCoverage: 80,
      capabilityAuth: "MCP",
      riskGap: null,
      healthStatus: "healthy",
      healthLabel: "健康",
      maturity: 78,
      maturityLabel: "验收通过率",
      category: "review",
      boundProjects: 2,
      lastUpdated: "昨天",
    },
    {
      id: "wf-008",
      name: "原型设计流程",
      description: "快速原型设计流程，包含概念草图、交互原型和视觉设计。",
      status: "draft",
      version: "v0.5",
      stepCount: 3,
      steps: [
        { no: "01", name: "概念草图" },
        { no: "02", name: "交互原型" },
        { no: "03", name: "视觉设计" },
      ],
      roleCoverage: [
        { initials: "UI", color: "purple" },
        { initials: "产", color: "green" },
      ],
      runnerCoverage: 60,
      capabilityAuth: "",
      riskGap: null,
      healthStatus: "pending",
      healthLabel: "草稿",
      maturity: 40,
      maturityLabel: "设计完成度",
      category: "design",
      boundProjects: 0,
      lastUpdated: "3天前",
    },
    {
      id: "wf-009",
      name: "技术评审流程",
      description: "技术方案评审流程，包含架构评审、性能评估和安全审查。",
      status: "enabled",
      version: "v1.0",
      stepCount: 4,
      steps: [
        { no: "01", name: "架构评审" },
        { no: "02", name: "性能评估" },
        { no: "03", name: "安全审查" },
        { no: "04", name: "确认" },
      ],
      roleCoverage: [
        { initials: "审", color: "orange" },
        { initials: "前", color: "blue" },
        { initials: "运", color: "purple" },
      ],
      runnerCoverage: 85,
      capabilityAuth: "Git / MCP",
      riskGap: null,
      healthStatus: "healthy",
      healthLabel: "健康",
      maturity: 82,
      maturityLabel: "评审通过率",
      category: "review",
      boundProjects: 1,
      lastUpdated: "今天",
    },
    {
      id: "wf-010",
      name: "持续集成流程",
      description: "CI/CD 流程模板，包含构建、测试、部署和监控。",
      status: "draft",
      version: "v0.8",
      stepCount: 4,
      steps: [
        { no: "01", name: "构建" },
        { no: "02", name: "测试" },
        { no: "03", name: "部署" },
        { no: "04", name: "监控" },
      ],
      roleCoverage: [
        { initials: "运", color: "purple" },
        { initials: "测", color: "green" },
      ],
      runnerCoverage: 70,
      capabilityAuth: "Shell",
      riskGap: "部署授权",
      healthStatus: "warning",
      healthLabel: "待校验",
      maturity: 55,
      maturityLabel: "CI 成功率",
      category: "release",
      boundProjects: 0,
      lastUpdated: "2天前",
    },
    {
      id: "wf-011",
      name: "文档生成流程",
      description: "自动化文档生成流程，从代码注释提取并生成 API 文档。",
      status: "enabled",
      version: "v1.0",
      stepCount: 2,
      steps: [
        { no: "01", name: "提取注释" },
        { no: "02", name: "生成文档" },
      ],
      roleCoverage: [
        { initials: "前", color: "blue" },
      ],
      runnerCoverage: 100,
      capabilityAuth: "Shell / Git",
      riskGap: null,
      healthStatus: "healthy",
      healthLabel: "健康",
      maturity: 95,
      maturityLabel: "文档覆盖率",
      category: "dev",
      boundProjects: 2,
      lastUpdated: "今天",
    },
    {
      id: "wf-012",
      name: "安全审计流程",
      description: "安全审计流程，包含漏洞扫描、权限检查和安全报告。",
      status: "draft",
      version: "v0.6",
      stepCount: 3,
      steps: [
        { no: "01", name: "漏洞扫描" },
        { no: "02", name: "权限检查" },
        { no: "03", name: "安全报告" },
      ],
      roleCoverage: [
        { initials: "审", color: "orange" },
        { initials: "运", color: "purple" },
      ],
      runnerCoverage: 45,
      capabilityAuth: "",
      riskGap: "扫描授权",
      healthStatus: "warning",
      healthLabel: "待校验",
      maturity: 35,
      maturityLabel: "审计覆盖率",
      category: "review",
      boundProjects: 0,
      lastUpdated: "4天前",
    },
  ],
  healthPanel: {
    categories: [
      {
        id: "dev",
        name: "开发类",
        count: 4,
        description: "需求、开发、修复、测试闭环",
        healthPercent: 82,
        status: "healthy",
      },
      {
        id: "design",
        name: "设计类",
        count: 3,
        description: "方案、原型、视觉和交互评审",
        healthPercent: 68,
        status: "warning",
      },
      {
        id: "review",
        name: "评审类",
        count: 3,
        description: "代码审查、产品验收、风险确认",
        healthPercent: 56,
        status: "warning",
      },
      {
        id: "release",
        name: "发布类",
        count: 2,
        description: "发布冻结、上线验收、回滚预案",
        healthPercent: 48,
        status: "error",
      },
    ],
    capabilityGaps: [
      {
        workflowName: "发布验收流程",
        missingCapability: "Git",
        severity: "high",
      },
      {
        workflowName: "设计评审流程",
        missingCapability: "Skills",
        severity: "medium",
      },
    ],
    roleBindingGaps: [
      {
        workflowName: "Bug 修复流程",
        missingRole: "测试工程师",
        status: "pending",
      },
      {
        workflowName: "发布验收流程",
        missingRole: "发布负责人",
        status: "unconfirmed",
      },
    ],
    recentChanges: [
      {
        workflowName: "软件开发完整流程",
        description: "v1.3",
        timestamp: "10分钟前",
      },
      {
        workflowName: "AI 生成设计评审",
        description: "草稿",
        timestamp: "今天",
      },
    ],
    aiRecommendation: {
      message:
        "先修复发布验收流程的 Git 授权，再把 Bug 修复流程补齐测试角色，否则应用到项目后会产生 Gate 阻塞。",
      priority: "high",
    },
  },
  loading: false,
  error: null,
  validating: false,
};

// Helper function to filter workflows by category
export function filterWorkflowsByCategory(
  workflows: WorkflowAsset[],
  category: WorkflowCategory
): WorkflowAsset[] {
  if (category === "all") return workflows;
  return workflows.filter((w) => w.category === category);
}

// Helper function to get category stats with counts
export function getCategoryStatsWithCounts(
  workflows: WorkflowAsset[],
  categories: CategoryStats[]
): CategoryStats[] {
  return categories.map((cat) => ({
    ...cat,
    count: cat.id === "all" ? workflows.length : workflows.filter((w) => w.category === cat.id).length,
  }));
}