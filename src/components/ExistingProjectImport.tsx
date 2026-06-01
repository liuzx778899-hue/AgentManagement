import { useState, useEffect, useMemo } from "react";
import { Check, Code2, FolderOpen, FolderSearch, Loader2, Search, ServerCog, AlertTriangle, Info, FileText, Layers, Bug, Wrench, FileCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import type { WorkbenchData, AgentRole } from "../domain/workbench";
import type { ProjectSourceType } from "../domain/project";
import { useWorkbenchState } from "../App";
import { useLocalServices } from "../hooks/useLocalServices";

interface ExistingProjectImportProps {
  data: WorkbenchData;
}

interface DetectedData {
  projectName: string;
  techStack: string;
  installCommand: string;
  testCommand: string;
  buildCommand: string;
  defaultBranch: string;
  roles: AgentRole[];
  skills: string[];
  mcpServers: string[];
  workflow: string;
}

type DetectedType = "claude-code" | "codex" | "generic" | "mixed" | null;

// 流程模板分类
type TemplateCategory = "all" | "development" | "review" | "fix" | "refactor";

const categoryConfig: Record<TemplateCategory, { label: string; icon: React.ReactNode; keywords: string[] }> = {
  all: { label: "全部", icon: <Layers size={16} />, keywords: [] },
  development: { label: "开发流程", icon: <Code2 size={16} />, keywords: ["开发", "软件", "完整"] },
  review: { label: "评审流程", icon: <FileCheck size={16} />, keywords: ["评审", "设计"] },
  fix: { label: "修复流程", icon: <Bug size={16} />, keywords: ["Bug", "修复", "问题"] },
  refactor: { label: "重构流程", icon: <Wrench size={16} />, keywords: ["重构"] },
};

type DetectionStatus = "idle" | "loading" | "success" | "partial" | "error";

interface InferredProjectMetadata {
  techStack: string;
  installCommand: string;
  testCommand: string;
  buildCommand: string;
}

interface SupplementForm {
  projectGoals: string;
  currentProgress: string;
  painPoints: string;
  techStack: string;
  installCmd: string;
  testCmd: string;
  buildCmd: string;
  moduleBoundaries: string;
  aiIntegrationMethod: string;
}

// Project type detection markers
interface ProjectMarkers {
  claudeCode: boolean;
  codex: boolean;
  generic: boolean;
  details: {
    claudeCodeFiles: string[];
    codexFiles: string[];
    genericFiles: string[];
  };
}

// Claude Code project markers
const CLAUDE_CODE_MARKERS = [
  "CLAUDE.md",
  ".claude",
  "agents",
  "skills",
  "worktrees",
  ".claude/settings.json",
  ".claude/commands",
];

// Codex project markers
const CODEX_MARKERS = [
  ".codex",
  "threads",
  "plans",
  "handoff",
  ".codex/config",
];

// Generic project markers (traditional projects)
const GENERIC_MARKERS = [
  "README.md",
  "package.json",
  "docs",
  "tests",
  "test",
  "src",
  "Makefile",
  "Cargo.toml",
  "go.mod",
  "requirements.txt",
];

// Async function to scan directory for project markers using File System Access API
async function scanProjectMarkers(dirHandle: FileSystemDirectoryHandle): Promise<ProjectMarkers> {
  const result: ProjectMarkers = {
    claudeCode: false,
    codex: false,
    generic: false,
    details: {
      claudeCodeFiles: [],
      codexFiles: [],
      genericFiles: [],
    },
  };

  const entries: string[] = [];

  // Get all top-level entries using type assertion for File System Access API
  const iterator = (dirHandle as unknown as { values: () => AsyncIterable<FileSystemHandle> }).values();
  for await (const entry of iterator) {
    entries.push(entry.name);
  }

  // Check for Claude Code markers
  for (const marker of CLAUDE_CODE_MARKERS) {
    const markerName = marker.split("/")[0];
    if (entries.includes(markerName)) {
      result.claudeCode = true;
      result.details.claudeCodeFiles.push(marker);
    }
  }

  // Check for Codex markers
  for (const marker of CODEX_MARKERS) {
    const markerName = marker.split("/")[0];
    if (entries.includes(markerName)) {
      result.codex = true;
      result.details.codexFiles.push(marker);
    }
  }

  // Check for Generic project markers
  for (const marker of GENERIC_MARKERS) {
    if (entries.includes(marker)) {
      result.generic = true;
      result.details.genericFiles.push(marker);
    }
  }

  return result;
}

// Synchronous fallback for path-based detection (when folder picker not used)
function detectProjectTypeFromPath(path: string): DetectedType {
  const lower = path.toLowerCase();
  const hasClaude = lower.includes("claude");
  const hasCodex = lower.includes("codex");
  if (hasClaude && hasCodex) return "mixed";
  if (hasClaude) return "claude-code";
  if (hasCodex) return "codex";
  return "generic";
}

// Determine project type from markers
function determineProjectType(markers: ProjectMarkers): DetectedType {
  const { claudeCode, codex } = markers;

  // Mixed: has both Claude Code and Codex markers
  if (claudeCode && codex) {
    return "mixed";
  }

  // Claude Code project
  if (claudeCode) {
    return "claude-code";
  }

  // Codex project
  if (codex) {
    return "codex";
  }

  // Default to generic for traditional projects
  return "generic";
}

const TYPE_LABELS: Record<string, string> = {
  "claude-code": "Claude Code 项目",
  "codex": "Codex 项目",
  "generic": "传统项目",
  "mixed": "混合项目",
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  "claude-code": "blue",
  "codex": "green",
  "generic": "gray",
  "mixed": "violet",
};

function inferProjectMetadata(path: string, type: DetectedType): InferredProjectMetadata {
  const lower = path.toLowerCase();
  const looksLikeReact = /react|vite|frontend|web|agentmanagement|agent-develop/.test(lower);
  const looksLikeNode = /node|npm|package/.test(lower);

  if (looksLikeReact || type === "claude-code" || type === "codex" || type === "mixed") {
    return {
      techStack: "Vite + React + TypeScript",
      installCommand: "npm install",
      testCommand: "npm test",
      buildCommand: "npm run build",
    };
  }

  if (looksLikeNode) {
    return {
      techStack: "Node.js",
      installCommand: "npm install",
      testCommand: "npm test",
      buildCommand: "npm run build",
    };
  }

  return {
    techStack: "",
    installCommand: "",
    testCommand: "",
    buildCommand: "",
  };
}

function normalizeCapabilityName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function ExistingProjectImport({ data }: ExistingProjectImportProps) {
  const { addProject } = useWorkbenchState();
  const services = useLocalServices();
  const [repoPath, setRepoPath] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>("idle");
  const [detected, setDetected] = useState<DetectedData | null>(null);
  const [detectedType, setDetectedType] = useState<DetectedType>(null);
  const [isFolderPickerSupported, setIsFolderPickerSupported] = useState(false);
  const [showSupplement, setShowSupplement] = useState(false);
  const [supplementForm, setSupplementForm] = useState<SupplementForm>({
    projectGoals: "",
    currentProgress: "",
    painPoints: "",
    techStack: "",
    installCmd: "",
    testCmd: "",
    buildCmd: "",
    moduleBoundaries: "",
    aiIntegrationMethod: "",
  });
  const [generateCollaboration, setGenerateCollaboration] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [previewWorkflowId, setPreviewWorkflowId] = useState<string | null>(null);
  const [workflowSearchQuery, setWorkflowSearchQuery] = useState<string>("");
  const [activeWorkflowCategory, setActiveWorkflowCategory] = useState<TemplateCategory>("all");
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [selectedMcpIds, setSelectedMcpIds] = useState<Set<string>>(new Set());
  const [selectedPluginIds, setSelectedPluginIds] = useState<Set<string>>(new Set());
  const [showCapabilityModal, setShowCapabilityModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Check if File System Access API is supported
  useEffect(() => {
    setIsFolderPickerSupported("showDirectoryPicker" in window);
  }, []);

  // 过滤后的模板列表
  const filteredTemplates = useMemo(() => {
    return data.workflowTemplates.filter((t) => {
      if (activeWorkflowCategory !== "all") {
        const keywords = categoryConfig[activeWorkflowCategory].keywords;
        const matchesCategory = keywords.some(kw => t.name.includes(kw));
        if (!matchesCategory) return false;
      }
      if (workflowSearchQuery.trim()) {
        const query = workflowSearchQuery.toLowerCase();
        const matchesSearch = t.name.toLowerCase().includes(query) ||
          t.steps.some(s => s.name.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [data.workflowTemplates, activeWorkflowCategory, workflowSearchQuery]);

  // 分类计数
  const categoryCounts = useMemo(() => {
    const counts: Record<TemplateCategory, number> = { all: 0, development: 0, review: 0, fix: 0, refactor: 0 };
    counts.all = data.workflowTemplates.length;
    data.workflowTemplates.forEach((t) => {
      Object.entries(categoryConfig).forEach(([cat, config]) => {
        if (cat !== "all" && config.keywords.some(kw => t.name.includes(kw))) {
          counts[cat as TemplateCategory]++;
        }
      });
    });
    return counts;
  }, [data.workflowTemplates]);

  // 预览的模板
  const previewTemplate = useMemo(() => {
    return data.workflowTemplates.find(t => t.id === previewWorkflowId) ?? null;
  }, [data.workflowTemplates, previewWorkflowId]);

  // 选中的模板
  const selectedTemplate = useMemo(() => {
    return data.workflowTemplates.find(t => t.id === selectedWorkflowId) ?? null;
  }, [data.workflowTemplates, selectedWorkflowId]);

  // When detectionStatus changes to error but detected data already loaded, show partial
  useEffect(() => {
    if (detectionStatus === "error" && detected) {
      setDetectionStatus("partial");
    }
  }, [detectionStatus, detected]);

  const handleFolderPick = async () => {
    try {
      const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      if (dirHandle) {
        setRepoPath(dirHandle.name);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Folder picker error:", err);
      }
    }
  };

  const validatePath = (path: string): string | null => {
    const trimmed = path.trim();
    if (!trimmed) return "请输入仓库路径";
    if (trimmed.length < 2) return "路径太短，请输入有效的仓库路径";
    // Mock validation: paths that look completely invalid
    if (trimmed.startsWith("@@") || /^[<>|*?]+$/.test(trimmed)) return "无效的路径格式";
    return null;
  };

  const handleDetect = () => {
    if (!repoPath) return;

    const error = validatePath(repoPath);
    if (error) {
      setDetectionStatus("error");
      setDetected(null);
      setDetectedType(null);
      return;
    }

    setDetecting(true);
    setDetectionStatus("loading");
    setDetected(null);
    setDetectedType(null);
    setShowSupplement(false);

    // 模拟检测过程 (1.5s)
    setTimeout(() => {
      const type = detectProjectTypeFromPath(repoPath);
      setDetectedType(type);
      const inferred = inferProjectMetadata(repoPath, type);

      // Use supplement form values if available, otherwise defaults
      const effectiveInstall = supplementForm.installCmd || inferred.installCommand;
      const effectiveTest = supplementForm.testCmd || inferred.testCommand;
      const effectiveBuild = supplementForm.buildCmd || inferred.buildCommand;
      const suggestedSkills = ["ui-ux-pro-max", "code-simplifier"];
      const suggestedMcps = ["browser", "local-shell"];

      setDetected({
        projectName: repoPath.split(/[\\/]/).pop() ?? "Unknown",
        techStack: inferred.techStack,
        installCommand: effectiveInstall,
        testCommand: effectiveTest,
        buildCommand: effectiveBuild,
        defaultBranch: "main",
        roles: [
          {
            id: "role-pm",
            projectId: null,
            name: "产品经理",
            description: "负责需求分析和产品决策。",
            isBuiltIn: false,
            defaultCapabilities: ["browser"],
          },
          {
            id: "role-fe",
            projectId: null,
            name: "前端工程师",
            description: "负责前端开发和组件实现。",
            isBuiltIn: false,
            defaultCapabilities: ["browser", "local-shell"],
          },
          {
            id: "role-qa",
            projectId: null,
            name: "测试工程师",
            description: "负责测试验证和质量保障。",
            isBuiltIn: false,
            defaultCapabilities: ["browser", "local-shell"],
          },
        ],
        skills: suggestedSkills,
        mcpServers: suggestedMcps,
        workflow: "软件开发完整流程",
      });

      const suggestedSkillKeys = new Set(suggestedSkills.map(normalizeCapabilityName));
      setSelectedSkillIds(new Set(
        data.skills
          .filter((skill) => suggestedSkillKeys.has(normalizeCapabilityName(skill.name)))
          .map((skill) => skill.id)
      ));

      const suggestedMcpKeys = new Set(suggestedMcps.map(normalizeCapabilityName));
      setSelectedMcpIds(new Set(
        data.mcpServers
          .filter((mcp) => suggestedMcpKeys.has(normalizeCapabilityName(mcp.name)) || suggestedMcpKeys.has(normalizeCapabilityName(mcp.id)))
          .map((mcp) => mcp.id)
      ));
      setSelectedPluginIds(new Set(
        data.plugins
          .filter((plugin) => plugin.includedSkillIds.some((skillId) =>
            data.skills.some((skill) => skill.id === skillId && suggestedSkillKeys.has(normalizeCapabilityName(skill.name)))
          ))
          .map((plugin) => plugin.id)
      ));

      // 自动将检测结果填入补充表单
      setSupplementForm(prev => ({
        ...prev,
        techStack: inferred.techStack,
        installCmd: effectiveInstall,
        testCmd: effectiveTest,
        buildCmd: effectiveBuild,
      }));

      if (type === "generic") {
        setDetectionStatus("partial");
        setShowSupplement(true);
      } else {
        setDetectionStatus("success");
      }

      setDetecting(false);
    }, 1500);
  };

  const handleSupplementChange = (field: keyof SupplementForm, value: string) => {
    setSupplementForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplySupplement = () => {
    if (!detected) return;

    const validSupplements: Partial<SupplementForm> = {};
    for (const [k, v] of Object.entries(supplementForm)) {
      if (v.trim()) validSupplements[k as keyof SupplementForm] = v.trim();
    }

    if (Object.keys(validSupplements).length === 0) {
      // No supplement data entered, move to success
      setDetectionStatus("success");
      setShowSupplement(false);
      return;
    }

    setDetected({
      ...detected,
      installCommand: supplementForm.installCmd.trim() || detected.installCommand,
      testCommand: supplementForm.testCmd.trim() || detected.testCommand,
      buildCommand: supplementForm.buildCmd.trim() || detected.buildCommand,
    });

    setDetectionStatus("success");
    setShowSupplement(false);
  };

  const handleImport = async () => {
    if (!detected) return;

    setImporting(true);
    setImportError(null);

    const sourceType: ProjectSourceType = detectedType === "generic" && showSupplement
      ? "generic"
      : (detectedType ?? "generic");

    try {
      if (!services.importProject) {
        throw new Error('服务不可用');
      }
      // Call importProject UseCase with additional options from detection results
      const result = await services.importProject(repoPath, {
        name: detected.projectName,
        sourceType,
        detectSettings: true,
      });

      if (result.ok && result.data) {
        addProject({
          name: result.data.name,
          repoPath: result.data.repoPath,
          defaultBranch: result.data.defaultBranch,
          worktreeRoot: result.data.worktreeRoot,
          scope: result.data.scope,
          desktopIntegrationStatus: result.data.desktopIntegrationStatus,
          permissions: result.data.permissions,
          settings: result.data.settings,
          workflowTemplateId: selectedWorkflowId || result.data.workflowTemplateId || (data.workflowTemplates[0]?.id ?? ""),
          sourceType,
        });
        // Reset state
        setDetected(null);
        setDetectedType(null);
        setDetectionStatus("idle");
        setRepoPath("");
        setShowSupplement(false);
        setSupplementForm({
          projectGoals: "",
          currentProgress: "",
          painPoints: "",
          techStack: "",
          installCmd: "",
          testCmd: "",
          buildCmd: "",
          moduleBoundaries: "",
          aiIntegrationMethod: "",
        });
        setGenerateCollaboration(false);
        setSelectedWorkflowId("");
        setPreviewWorkflowId(null);
        setActiveWorkflowCategory("all");
        setWorkflowSearchQuery("");
        setSelectedSkillIds(new Set());
        setSelectedMcpIds(new Set());
        setSelectedPluginIds(new Set());
        setShowCapabilityModal(false);
      } else {
        setImportError(result.error?.message || '导入项目失败');
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '导入项目失败');
    }

    setImporting(false);
  };

  const getBadgeClass = (type: DetectedType): string => {
    if (!type) return "gray";
    return TYPE_BADGE_CLASS[type] ?? "gray";
  };

  const getTypeLabel = (type: DetectedType): string => {
    if (!type) return "未知类型";
    return TYPE_LABELS[type] ?? "未知类型";
  };

  const scanStepClass = (index: number) => {
    const activeIndex = detectionStatus === "idle" || detectionStatus === "error"
      ? 0
      : detectionStatus === "loading"
        ? 0
        : 1;
    const doneIndex = detected && detectionStatus === "success" ? 2 : detected ? 1 : -1;
    return [
      "import-flow-step",
      index === activeIndex ? "active" : "",
      index <= doneIndex ? "done" : "",
    ].filter(Boolean).join(" ");
  };

  return (
    <div className="import-panel">
      <div className="import-flow-steps" aria-label="导入已有项目流程">
        <div className={scanStepClass(0)}>
          <strong>01 扫描路径</strong>
          <span>选择仓库并读取工程结构</span>
        </div>
        <div className={scanStepClass(1)}>
          <strong>02 检测结果</strong>
          <span>识别项目类型、命令、角色和流程</span>
        </div>
        <div className={scanStepClass(2)}>
          <strong>03 确认导入</strong>
          <span>补齐配置后写入项目管理</span>
        </div>
      </div>

      <div className="import-command-card">
        <div className="import-command-copy">
          <span className="badge blue">推荐路径</span>
          <h3>扫描一个本地仓库</h3>
          <p>系统会读取项目结构并生成技术栈、运行命令、角色建议、Capability 授权和默认 workflow。</p>
        </div>
        <div className="import-input-row">
          <label className="input-with-icon">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">仓库路径</span>
            <input
              type="text"
              placeholder="输入或粘贴仓库路径，例如 D:/work/agent-develop"
              value={repoPath}
              onChange={(e) => {
                setRepoPath(e.target.value);
                if (detectionStatus === "error") setDetectionStatus("idle");
              }}
            />
          </label>
          {isFolderPickerSupported && (
            <button className="btn btn-lg" onClick={handleFolderPick} title="选择本地文件夹（获取文件夹名称）">
              <FolderOpen size={15} />
              选择文件夹
            </button>
          )}
          <button className="btn primary btn-lg" onClick={handleDetect} disabled={!repoPath || detecting}>
            {detecting ? <Loader2 size={15} className="spin" /> : <FolderSearch size={15} />}
            {detecting ? "检测中..." : "开始检测"}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {detectionStatus === "loading" && (
        <div className="detection-result">
          <div className="detection-loading">
            <Loader2 size={32} className="spin" />
            <span>正在扫描仓库结构...</span>
            <p className="loading-sub">分析项目类型、识别技术栈和构建命令</p>
          </div>
          <div className="detection-loading-skeleton">
            <div className="skeleton-row"><div className="skeleton-block w-60" /><div className="skeleton-block w-40" /></div>
            <div className="skeleton-row"><div className="skeleton-block w-80" /></div>
            <div className="skeleton-grid">
              <div className="skeleton-block" />
              <div className="skeleton-block" />
              <div className="skeleton-block" />
              <div className="skeleton-block" />
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {detectionStatus === "error" && (
        <div className="detection-result detection-error">
          <div className="detection-error-content">
            <AlertTriangle size={32} />
            <h3>路径检测失败</h3>
            <p>输入的路径格式无效或无法访问。请检查后重新输入。</p>
            <div className="detection-error-actions">
              <button className="btn primary" onClick={() => setDetectionStatus("idle")}>
                重新输入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success / Partial State */}
      {detected && (detectionStatus === "success" || detectionStatus === "partial") && (
        <div className="detection-result">
          <div className="detection-summary">
            <div>
              <span>检测结果</span>
              <h3>{detected.projectName}</h3>
              {detectedType && (
                <span className={`badge ${getBadgeClass(detectedType)} type-badge`}>
                  {getTypeLabel(detectedType)}
                </span>
              )}
            </div>
            <span className={`badge ${detectionStatus === "partial" ? "warn" : "green"}`}>
              {detectionStatus === "partial" ? "需补充信息" : "可导入"}
            </span>
          </div>

          {/* Partial warning banner for generic projects */}
          {detectionStatus === "partial" && !showSupplement && (
            <div className="partial-banner">
              <Info size={16} />
              <span>该项目缺少标准协同文件，建议补充项目信息以获得更好的 AI 协作体验。</span>
            </div>
          )}

          {/* Supplement Form for generic projects */}
          {showSupplement && (
            <div className="supplement-form-section">
              <div className="section-header">
                <h3>
                  <FileText size={16} /> 补充项目信息
                </h3>
                <span className="muted-hint">传统项目缺少协同配置，请填写以下信息以生成标准协作文件</span>
              </div>
              <div className="supplement-grid">
                <div className="supplement-field">
                  <label htmlFor="supp-goals">项目目标</label>
                  <textarea
                    id="supp-goals"
                    placeholder="描述项目的核心目标和预期交付物"
                    value={supplementForm.projectGoals}
                    onChange={(e) => handleSupplementChange("projectGoals", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="supplement-field">
                  <label htmlFor="supp-progress">当前进度</label>
                  <textarea
                    id="supp-progress"
                    placeholder="已完成的功能模块和当前开发进度"
                    value={supplementForm.currentProgress}
                    onChange={(e) => handleSupplementChange("currentProgress", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="supplement-field">
                  <label htmlFor="supp-pain">当前痛点</label>
                  <textarea
                    id="supp-pain"
                    placeholder="当前遇到的瓶颈或需要 AI 协助解决的问题"
                    value={supplementForm.painPoints}
                    onChange={(e) => handleSupplementChange("painPoints", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="supplement-field">
                  <label htmlFor="supp-tech">技术栈</label>
                  <input
                    id="supp-tech"
                    type="text"
                    placeholder="Vite + React + TypeScript"
                    value={supplementForm.techStack}
                    onChange={(e) => handleSupplementChange("techStack", e.target.value)}
                  />
                </div>
                <div className="supplement-field">
                  <label htmlFor="supp-install">构建命令 — 安装</label>
                  <input
                    id="supp-install"
                    type="text"
                    placeholder="npm install"
                    value={supplementForm.installCmd}
                    onChange={(e) => handleSupplementChange("installCmd", e.target.value)}
                  />
                </div>
                <div className="supplement-field">
                  <label htmlFor="supp-test">构建命令 — 测试</label>
                  <input
                    id="supp-test"
                    type="text"
                    placeholder="npm test"
                    value={supplementForm.testCmd}
                    onChange={(e) => handleSupplementChange("testCmd", e.target.value)}
                  />
                </div>
                <div className="supplement-field">
                  <label htmlFor="supp-build">构建命令 — 构建</label>
                  <input
                    id="supp-build"
                    type="text"
                    placeholder="npm run build"
                    value={supplementForm.buildCmd}
                    onChange={(e) => handleSupplementChange("buildCmd", e.target.value)}
                  />
                </div>
                <div className="supplement-field">
                  <label htmlFor="supp-modules">模块边界</label>
                  <textarea
                    id="supp-modules"
                    placeholder="项目模块划分和边界描述，例如：src/components, src/services"
                    value={supplementForm.moduleBoundaries}
                    onChange={(e) => handleSupplementChange("moduleBoundaries", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="supplement-field">
                  <label htmlFor="supp-ai-method">期望 AI 介入方式</label>
                  <select
                    id="supp-ai-method"
                    value={supplementForm.aiIntegrationMethod}
                    onChange={(e) => handleSupplementChange("aiIntegrationMethod", e.target.value)}
                  >
                    <option value="">请选择...</option>
                    <option value="code-gen">代码生成</option>
                    <option value="code-review">代码审查</option>
                    <option value="test-gen">测试生成</option>
                    <option value="full-flow">全流程</option>
                  </select>
                </div>
              </div>
              <div className="supplement-footer">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={generateCollaboration}
                    onChange={(e) => setGenerateCollaboration(e.target.checked)}
                  />
                  <span>生成标准协同文件（CLAUDE.md, .claude/ 目录）</span>
                </label>
                <div className="supplement-actions">
                  <button className="btn primary" onClick={handleApplySupplement}>
                    <Check size={14} /> 应用补充信息
                  </button>
                  <button className="btn ghost" onClick={() => { setDetectionStatus("success"); setShowSupplement(false); }}>
                    跳过
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="result-section">
            <div className="section-header">
              <h3>
                <Code2 size={16} /> 构建命令
              </h3>
            </div>
            <div className="result-grid">
              {/* 对于传统项目，命令在补充表单中显示，这里不重复 */}
              {!showSupplement && (
                <>
                  <div className="result-item">
                    <strong>安装命令</strong>
                    <code>{detected.installCommand}</code>
                  </div>
                  <div className="result-item">
                    <strong>测试命令</strong>
                    <code>{detected.testCommand}</code>
                  </div>
                  <div className="result-item">
                    <strong>构建命令</strong>
                    <code>{detected.buildCommand}</code>
                  </div>
                </>
              )}
              <div className="result-item">
                <strong>默认分支</strong>
                <span className="badge blue">{detected.defaultBranch}</span>
              </div>
            </div>
          </div>

          <div className="result-section">
            <div className="capability-auth-summary">
              <div>
                <h3>
                  <ServerCog size={16} /> 能力授权
                </h3>
                <p>已选择 {selectedSkillIds.size} 个 Skill、{selectedMcpIds.size} 个 MCP、{selectedPluginIds.size} 个 Plugin，可在独立窗口中调整。</p>
              </div>
              <button className="btn primary" onClick={() => setShowCapabilityModal(true)} type="button">
                配置能力授权
              </button>
            </div>
          </div>

          {showCapabilityModal && (
            <div className="pm-overlay import-capability-modal" onClick={() => setShowCapabilityModal(false)}>
              <div className="pm-overlay-panel import-capability-panel" onClick={(e) => e.stopPropagation()}>
                <div className="pm-overlay-header">
                  <h2>能力授权</h2>
                  <button className="pm-overlay-close" onClick={() => setShowCapabilityModal(false)} type="button">×</button>
                </div>
                <div className="pm-overlay-content wizard-step-content import-capability-content">
                  <div className="capabilities-section">
                    <h3 className="cap-section-title">MCP Servers</h3>
                    <div className="capability-grid">
                      {data.mcpServers.map((mcp) => (
                        <div
                          key={mcp.id}
                          className={`cap-item${selectedMcpIds.has(mcp.id) ? " selected" : ""}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedMcpIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(mcp.id)) next.delete(mcp.id); else next.add(mcp.id);
                              return next;
                            });
                          }}
                        >
                          <div className="item-left">
                            <span className="item-icon hardware">MCP</span>
                            <div className="item-info">
                              <strong>{mcp.name}</strong>
                              <div className="item-badges">
                                <span className="badge">{mcp.toolCount} 个工具</span>
                                {mcp.status !== "enabled" && <span className="badge warn">需配置</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            className={`cap-select-btn${selectedMcpIds.has(mcp.id) ? " selected" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMcpIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(mcp.id)) next.delete(mcp.id); else next.add(mcp.id);
                                return next;
                              });
                            }}
                            type="button"
                          >
                            {selectedMcpIds.has(mcp.id) ? "已选择" : "选择"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="capabilities-section">
                    <h3 className="cap-section-title">Skills</h3>
                    <div className="capability-grid">
                      {data.skills.map((skill) => (
                        <div
                          key={skill.id}
                          className={`cap-item${selectedSkillIds.has(skill.id) ? " selected" : ""}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedSkillIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(skill.id)) next.delete(skill.id); else next.add(skill.id);
                              return next;
                            });
                          }}
                        >
                          <div className="item-left">
                            <span className="item-icon violet">SK</span>
                            <div className="item-info">
                              <strong>{skill.name}</strong>
                              <div className="item-badges">
                                <span className="badge violet">{skill.description?.slice(0, 40)}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            className={`cap-select-btn${selectedSkillIds.has(skill.id) ? " selected" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSkillIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(skill.id)) next.delete(skill.id); else next.add(skill.id);
                                return next;
                              });
                            }}
                            type="button"
                          >
                            {selectedSkillIds.has(skill.id) ? "已选择" : "选择"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="capabilities-section">
                    <h3 className="cap-section-title">Plugins</h3>
                    {data.plugins.length === 0 ? (
                      <p className="muted-text">暂无 Plugin</p>
                    ) : (
                      <div className="capability-grid">
                        {data.plugins.map((plugin) => (
                          <div
                            key={plugin.id}
                            className={`cap-item${selectedPluginIds.has(plugin.id) ? " selected" : ""}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedPluginIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(plugin.id)) next.delete(plugin.id); else next.add(plugin.id);
                                return next;
                              });
                            }}
                          >
                            <div className="item-left">
                              <span className="item-icon blue">PL</span>
                              <div className="item-info">
                                <strong>{plugin.name}</strong>
                                <div className="item-badges">
                                  <span className="badge blue">{"v" + plugin.version}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              className={`cap-select-btn${selectedPluginIds.has(plugin.id) ? " selected" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPluginIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(plugin.id)) next.delete(plugin.id); else next.add(plugin.id);
                                  return next;
                                });
                              }}
                              type="button"
                            >
                              {selectedPluginIds.has(plugin.id) ? "已选择" : "选择"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="import-capability-footer">
                  <span>{selectedSkillIds.size} Skills · {selectedMcpIds.size} MCP · {selectedPluginIds.size} Plugin 已授权</span>
                  <button className="btn primary" onClick={() => setShowCapabilityModal(false)} type="button">
                    完成
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="result-section workflow-selector-b" style={{ marginTop: '16px' }}>
            <div className="ws-sidebar">
              <div className="ws-sidebar-title">分类</div>
              {(Object.keys(categoryConfig) as TemplateCategory[]).map((cat) => (
                <button
                  key={cat}
                  className={`ws-category-item${activeWorkflowCategory === cat ? " active" : ""}`}
                  onClick={() => setActiveWorkflowCategory(cat)}
                >
                  {categoryConfig[cat].icon}
                  <span>{categoryConfig[cat].label}</span>
                  <span className="ws-category-count">{categoryCounts[cat]}</span>
                </button>
              ))}
            </div>

            <div className="ws-list-panel">
              <div className="ws-search-bar">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="搜索模板..."
                  value={workflowSearchQuery}
                  onChange={(e) => setWorkflowSearchQuery(e.target.value)}
                />
              </div>
              <div className="ws-template-list">
                {filteredTemplates.length === 0 ? (
                  <div className="ws-empty">暂无匹配的模板</div>
                ) : (
                  filteredTemplates.map((t) => (
                    <button
                      key={t.id}
                      className={`ws-list-item${previewWorkflowId === t.id ? " active" : ""}`}
                      onClick={() => setPreviewWorkflowId(t.id)}
                    >
                      <div className="ws-list-item-title">{t.name}</div>
                      <div className="ws-list-item-desc">
                        {t.steps.slice(0, 3).map(s => s.name).join(' → ')}
                        {t.steps.length > 3 && ' ...'}
                      </div>
                      <div className="ws-list-item-meta">
                        <span>{t.steps.length} 步骤</span>
                        <span>v{t.version}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="ws-detail-panel">
              {previewTemplate ? (
                <>
                  <div className="ws-detail-header">
                    <div className="ws-detail-icon">▣</div>
                    <div className="ws-detail-info">
                      <h3>{previewTemplate.name}</h3>
                      <p>{previewTemplate.steps.length} 个步骤 · v{previewTemplate.version}</p>
                    </div>
                  </div>

                  <div className="ws-detail-stats">
                    <div className="ws-stat">
                      <span className="ws-stat-value">{previewTemplate.steps.length}</span>
                      <span className="ws-stat-label">步骤</span>
                    </div>
                    <div className="ws-stat">
                      <span className="ws-stat-value">{previewTemplate.steps.filter(s => s.gateMode === 'manual').length}</span>
                      <span className="ws-stat-label">人工决策</span>
                    </div>
                    <div className="ws-stat">
                      <span className="ws-stat-value">{previewTemplate.steps.filter(s => s.gateMode === 'auto').length}</span>
                      <span className="ws-stat-label">自动继续</span>
                    </div>
                  </div>

                  <div className="ws-detail-steps">
                    <h4>流程步骤</h4>
                    <div className="ws-steps-flow">
                      {previewTemplate.steps.map((s, idx) => {
                        const role = data.roles.find(r => r.id === s.roleId);
                        return (
                          <div key={s.id} className="ws-flow-step">
                            <div className="ws-flow-step-no">{idx + 1}</div>
                            <div className="ws-flow-step-content">
                              <div className="ws-flow-step-name">{s.name}</div>
                              <div className="ws-flow-step-role">{role?.name ?? '—'}</div>
                            </div>
                            {idx < previewTemplate.steps.length - 1 && <ArrowRight size={14} className="ws-flow-arrow" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="ws-detail-actions">
                    <button
                      className={`btn primary${selectedWorkflowId === previewTemplate.id ? " selected" : ""}`}
                      onClick={() => {
                        setSelectedWorkflowId(previewTemplate.id);
                      }}
                    >
                      {selectedWorkflowId === previewTemplate.id ? (
                        <><CheckCircle2 size={14} /> 已选择</>
                      ) : (
                        "选择此流程"
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="ws-detail-empty">
                  <Layers size={32} />
                  <p>选择左侧模板查看详情</p>
                </div>
              )}
            </div>
          </div>

          {importError && (
            <div className="wizard-error-banner">
              <AlertTriangle size={16} />
              <span>{importError}</span>
            </div>
          )}

          <div className="import-actions">
            <button className="btn primary" onClick={handleImport} disabled={importing}>
              {importing ? <Loader2 size={14} className="spin" /> : null}
              {importing ? '导入中...' : '导入适配'}
            </button>
            <button className="btn ghost" onClick={() => {
              setDetected(null);
              setDetectedType(null);
              setDetectionStatus("idle");
              setShowSupplement(false);
              setSelectedSkillIds(new Set());
              setSelectedMcpIds(new Set());
              setSelectedPluginIds(new Set());
              setShowCapabilityModal(false);
              setImportError(null);
            }}>
              取消
            </button>
          </div>
        </div>
      )}

      {!detected && detectionStatus === "idle" && (
        <div className="import-empty-grid">
          <div className="import-empty-card">
            <strong>01 · 读取工程结构</strong>
            <span>识别 package、测试命令、构建命令、预览入口和默认分支。</span>
          </div>
          <div className="import-empty-card">
            <strong>02 · 识别项目类型</strong>
            <span>自动检测 Claude Code、Codex、传统项目或混合项目类型。</span>
          </div>
          <div className="import-empty-card">
            <strong>03 · 生成角色建议</strong>
            <span>默认给出产品、前端、测试角色，后续可绑定更多专业 Agent。</span>
          </div>
          <div className="import-empty-card">
            <strong>04 · 建立项目记忆</strong>
            <span>导入后会保存项目约定，后续任务可直接引用。传统项目可补充协同文件。</span>
          </div>
        </div>
      )}
    </div>
  );
}
