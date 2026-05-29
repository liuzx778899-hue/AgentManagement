import { useState, useMemo, useCallback, useEffect } from "react";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ShieldCheck,
  GitCompare,
  Check,
  X,
} from "lucide-react";
import type { WorkbenchData, Project } from "../domain/workbench";

/**
 * Progress Check Status
 * - idle: Initial state, no check in progress
 * - checking: Check is running
 * - found-changes: Changes detected, waiting for confirmation
 * - synced: No changes, everything is synced
 * - needs-confirmation: Requires user action
 * - failed: Check failed due to error
 */
export type ProgressCheckStatus =
  | "idle"
  | "checking"
  | "found-changes"
  | "synced"
  | "needs-confirmation"
  | "failed";

/**
 * Progress Diff Item - represents a single change discovered
 */
export interface ProgressDiffItem {
  id: string;
  projectId: string;
  projectName: string;
  type: "progress" | "risk" | "blocker" | "gate" | "sync";
  direction: "up" | "down" | "neutral";
  previous: string;
  current: string;
  description: string;
  severity: "info" | "warning" | "critical";
  requiresConfirmation: boolean;
}

/**
 * Progress Check Result
 */
export interface ProgressCheckResult {
  checkedAt: string;
  status: ProgressCheckStatus;
  diffs: ProgressDiffItem[];
  summary: {
    totalChanges: number;
    criticalChanges: number;
    newBlockers: number;
    pendingGates: number;
  };
}

interface ProgressCheckPanelProps {
  data: WorkbenchData;
  onApplyChanges?: (diffs: ProgressDiffItem[]) => void;
  onClose?: () => void;
}

/**
 * Generate mock progress diffs for Phase 1 demo
 */
function generateMockProgressDiffs(data: WorkbenchData): ProgressDiffItem[] {
  const diffs: ProgressDiffItem[] = [];
  const now = new Date().toISOString();

  // Sample from projects to create varied diffs
  data.projects.slice(0, 3).forEach((project, index) => {
    // Progress change
    if (index === 0) {
      diffs.push({
        id: `diff-${diffs.length + 1}`,
        projectId: project.id,
        projectName: project.name,
        type: "progress",
        direction: "up",
        previous: "65%",
        current: "72%",
        description: "Phase 1 Web MVP 收尾进度更新",
        severity: "info",
        requiresConfirmation: false,
      });
    }

    // Risk change
    if (index === 1) {
      diffs.push({
        id: `diff-${diffs.length + 1}`,
        projectId: project.id,
        projectName: project.name,
        type: "risk",
        direction: "up",
        previous: "medium",
        current: "high",
        description: "测试覆盖率下降至 45%，低于阈值",
        severity: "warning",
        requiresConfirmation: true,
      });
    }

    // New blocker
    if (index === 2) {
      diffs.push({
        id: `diff-${diffs.length + 1}`,
        projectId: project.id,
        projectName: project.name,
        type: "blocker",
        direction: "neutral",
        previous: "无",
        current: "依赖服务超时",
        description: "外部依赖 API 响应超时，影响集成测试",
        severity: "critical",
        requiresConfirmation: true,
      });
    }
  });

  // Gate status changes
  const waitingGates = data.manualGates.filter(g => g.status === "waiting");
  if (waitingGates.length > 0) {
    diffs.push({
      id: `diff-${diffs.length + 1}`,
      projectId: waitingGates[0].taskId,
      projectName: "AgentManagement",
      type: "gate",
      direction: "neutral",
      previous: "运行中",
      current: "待决策",
      description: `${waitingGates.length} 个 Gate 等待人工确认`,
      severity: "warning",
      requiresConfirmation: true,
    });
  }

  return diffs;
}

export function ProgressCheckPanel({ data, onApplyChanges, onClose }: ProgressCheckPanelProps) {
  const [status, setStatus] = useState<ProgressCheckStatus>("idle");
  const [checkResult, setCheckResult] = useState<ProgressCheckResult | null>(null);
  const [selectedDiffs, setSelectedDiffs] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalProjects = data.projects.length;
    const runningTasks = data.tasks.filter(t => t.status === "running").length;
    const waitingGates = data.manualGates.filter(g => g.status === "waiting").length;
    const highRisk = data.projects.filter(p => p.riskLevel === "high" || p.riskLevel === "critical").length;

    return { totalProjects, runningTasks, waitingGates, highRisk };
  }, [data]);

  // Run progress check
  const runCheck = useCallback(async () => {
    setStatus("checking");
    setCheckResult(null);
    setSelectedDiffs(new Set());

    // Simulate async check (Phase 1: mock data)
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const diffs = generateMockProgressDiffs(data);

      const result: ProgressCheckResult = {
        checkedAt: new Date().toISOString(),
        status: diffs.length > 0 ? "found-changes" : "synced",
        diffs,
        summary: {
          totalChanges: diffs.length,
          criticalChanges: diffs.filter(d => d.severity === "critical").length,
          newBlockers: diffs.filter(d => d.type === "blocker").length,
          pendingGates: diffs.filter(d => d.type === "gate").length,
        },
      };

      setCheckResult(result);
      setStatus(result.status);

      // Auto-select items that don't require confirmation
      const autoSelect = new Set(
        diffs.filter(d => !d.requiresConfirmation).map(d => d.id)
      );
      setSelectedDiffs(autoSelect);
    } catch (error) {
      setStatus("failed");
      setCheckResult({
        checkedAt: new Date().toISOString(),
        status: "failed",
        diffs: [],
        summary: { totalChanges: 0, criticalChanges: 0, newBlockers: 0, pendingGates: 0 },
      });
    }
  }, [data]);

  // Toggle diff selection
  const toggleDiff = useCallback((diffId: string) => {
    setSelectedDiffs(prev => {
      const next = new Set(prev);
      if (next.has(diffId)) {
        next.delete(diffId);
      } else {
        next.add(diffId);
      }
      return next;
    });
  }, []);

  // Apply selected changes
  const applyChanges = useCallback(async () => {
    if (!checkResult) return;

    setApplying(true);

    // Simulate async apply
    await new Promise(resolve => setTimeout(resolve, 500));

    const selectedItems = checkResult.diffs.filter(d => selectedDiffs.has(d.id));

    if (onApplyChanges) {
      onApplyChanges(selectedItems);
    }

    setApplying(false);
    setStatus("synced");

    // Auto close after success
    setTimeout(() => {
      onClose?.();
    }, 1000);
  }, [checkResult, selectedDiffs, onApplyChanges, onClose]);

  // Handle escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "checking") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [status, onClose]);

  // Get icon for diff type
  const getDiffIcon = (diff: ProgressDiffItem) => {
    switch (diff.type) {
      case "progress":
        return diff.direction === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />;
      case "risk":
        return <AlertTriangle size={14} />;
      case "blocker":
        return <XCircle size={14} />;
      case "gate":
        return <ShieldCheck size={14} />;
      case "sync":
        return <GitCompare size={14} />;
      default:
        return <Minus size={14} />;
    }
  };

  // Get color class for severity
  const getSeverityClass = (severity: ProgressDiffItem["severity"]) => {
    switch (severity) {
      case "critical":
        return "pc-diff-critical";
      case "warning":
        return "pc-diff-warning";
      default:
        return "pc-diff-info";
    }
  };

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-overlay-panel pc-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="pm-overlay-header">
          <div className="pc-header-left">
            <h2>进度检查</h2>
            <span className={`pc-status-badge pc-status-${status}`}>
              {status === "idle" && "待检查"}
              {status === "checking" && "检查中..."}
              {status === "found-changes" && "发现变更"}
              {status === "synced" && "已同步"}
              {status === "needs-confirmation" && "需确认"}
              {status === "failed" && "检查失败"}
            </span>
          </div>
          <button className="pm-overlay-close" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="pm-overlay-content pc-content">
          {/* Check Status Display */}
          {status === "idle" && (
            <div className="pc-idle-state">
              <div className="pc-idle-icon">
                <RefreshCw size={32} />
              </div>
              <h3>开始进度检查</h3>
              <p>检查协同文件、工作台 TODO、测试/build/lint/typecheck 结果和 Gate 状态</p>
              <div className="pc-idle-stats">
                <div className="pc-stat">
                  <span className="pc-stat-value">{stats.totalProjects}</span>
                  <span className="pc-stat-label">项目</span>
                </div>
                <div className="pc-stat">
                  <span className="pc-stat-value">{stats.runningTasks}</span>
                  <span className="pc-stat-label">运行中</span>
                </div>
                <div className="pc-stat">
                  <span className="pc-stat-value">{stats.waitingGates}</span>
                  <span className="pc-stat-label">待决策</span>
                </div>
                <div className="pc-stat">
                  <span className="pc-stat-value">{stats.highRisk}</span>
                  <span className="pc-stat-label">高风险</span>
                </div>
              </div>
              <button className="pm-v2-btn pm-v2-btn-primary pc-check-btn" onClick={runCheck} type="button">
                <RefreshCw size={14} />
                开始检查
              </button>
            </div>
          )}

          {status === "checking" && (
            <div className="pc-checking-state">
              <div className="pc-spinner">
                <RefreshCw size={48} className="pc-spinner-icon" />
              </div>
              <h3>正在检查进度...</h3>
              <div className="pc-checking-steps">
                <div className="pc-checking-step">
                  <CheckCircle2 size={14} className="pc-step-done" />
                  <span>读取协同文件</span>
                </div>
                <div className="pc-checking-step">
                  <CheckCircle2 size={14} className="pc-step-done" />
                  <span>检查工作台 TODO</span>
                </div>
                <div className="pc-checking-step">
                  <RefreshCw size={14} className="pc-step-active" />
                  <span>运行测试/build/lint</span>
                </div>
                <div className="pc-checking-step">
                  <Clock size={14} className="pc-step-pending" />
                  <span>检查 Gate 状态</span>
                </div>
                <div className="pc-checking-step">
                  <Clock size={14} className="pc-step-pending" />
                  <span>生成进度差异</span>
                </div>
              </div>
            </div>
          )}

          {(status === "found-changes" || status === "synced") && checkResult && (
            <div className="pc-result-state">
              {/* Summary */}
              <div className="pc-result-summary">
                <div className="pc-summary-title">
                  {status === "synced" ? (
                    <>
                      <CheckCircle2 size={18} className="pc-icon-success" />
                      <span>所有项目已同步</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={18} className="pc-icon-warning" />
                      <span>发现 {checkResult.summary.totalChanges} 项变更</span>
                    </>
                  )}
                </div>
                <div className="pc-summary-chips">
                  {checkResult.summary.criticalChanges > 0 && (
                    <span className="pc-chip pc-chip-critical">
                      {checkResult.summary.criticalChanges} 严重
                    </span>
                  )}
                  {checkResult.summary.newBlockers > 0 && (
                    <span className="pc-chip pc-chip-blocker">
                      {checkResult.summary.newBlockers} 新阻塞
                    </span>
                  )}
                  {checkResult.summary.pendingGates > 0 && (
                    <span className="pc-chip pc-chip-gate">
                      {checkResult.summary.pendingGates} 待确认 Gate
                    </span>
                  )}
                </div>
              </div>

              {/* Diff List */}
              {checkResult.diffs.length > 0 ? (
                <div className="pc-diff-list">
                  {checkResult.diffs.map(diff => (
                    <div
                      key={diff.id}
                      className={`pc-diff-item ${getSeverityClass(diff.severity)} ${selectedDiffs.has(diff.id) ? "pc-diff-selected" : ""}`}
                      onClick={() => diff.requiresConfirmation && toggleDiff(diff.id)}
                    >
                      <div className="pc-diff-check">
                        {diff.requiresConfirmation ? (
                          <input
                            type="checkbox"
                            checked={selectedDiffs.has(diff.id)}
                            onChange={() => toggleDiff(diff.id)}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <Check size={14} className="pc-check-auto" />
                        )}
                      </div>
                      <div className="pc-diff-icon">{getDiffIcon(diff)}</div>
                      <div className="pc-diff-content">
                        <div className="pc-diff-header">
                          <span className="pc-diff-project">{diff.projectName}</span>
                          <span className="pc-diff-type">{diff.type}</span>
                        </div>
                        <div className="pc-diff-desc">{diff.description}</div>
                      </div>
                      <div className="pc-diff-values">
                        <span className="pc-diff-prev">{diff.previous}</span>
                        <ArrowRight size={12} className="pc-diff-arrow" />
                        <span className="pc-diff-curr">{diff.current}</span>
                      </div>
                      {diff.requiresConfirmation && (
                        <span className="pc-diff-badge">需确认</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pc-no-diff">
                  <CheckCircle2 size={24} />
                  <span>无进度差异</span>
                </div>
              )}

              {/* Actions */}
              <div className="pc-result-actions">
                <button className="pm-v2-btn" onClick={runCheck} type="button">
                  <RefreshCw size={14} />
                  重新检查
                </button>
                {checkResult.diffs.length > 0 && (
                  <button
                    className="pm-v2-btn pm-v2-btn-ok"
                    onClick={applyChanges}
                    disabled={selectedDiffs.size === 0 || applying}
                    type="button"
                  >
                    {applying ? (
                      <>
                        <RefreshCw size={14} className="pc-spinner-icon" />
                        应用中...
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        应用选中变更 ({selectedDiffs.size})
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="pc-failed-state">
              <XCircle size={48} className="pc-icon-failed" />
              <h3>检查失败</h3>
              <p>无法完成进度检查，请检查网络连接或稍后重试</p>
              <button className="pm-v2-btn pm-v2-btn-primary" onClick={runCheck} type="button">
                <RefreshCw size={14} />
                重试
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProgressCheckPanel;
