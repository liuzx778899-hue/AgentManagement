import { useMemo, useState } from "react";
import {
  Check,
  Code,
  Eye,
  FileDiff,
  FileText,
  FlaskConical,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import type { WorkbenchData, GateStatus } from "../domain/workbench";
import { useWorkbenchState } from "../state";
import { IconBadge } from "./IconBadge";

interface GateDecisionPanelProps {
  data: WorkbenchData;
  onClose: () => void;
}

type EvidenceTab = "diff" | "test" | "preview" | "log";

export function GateDecisionPanel({ data, onClose }: GateDecisionPanelProps) {
  const [activeTab, setActiveTab] = useState<EvidenceTab>("diff");
  const [actionStatus, setActionStatus] = useState<GateStatus | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const { updateGateStatus, addMemory, reassignAgentRun } = useWorkbenchState();

  const waitingGate = useMemo(() => data.manualGates.find((g) => g.status === "waiting"), [data]);

  const activeTask = useMemo(() => {
    if (!waitingGate) return null;
    return data.tasks.find((t) => t.id === waitingGate.taskId);
  }, [data, waitingGate]);

  const activeRun = useMemo(() => {
    if (!waitingGate) return null;
    return data.agentRuns.find((r) => r.id === waitingGate.runId);
  }, [data, waitingGate]);

  const template = useMemo(() => {
    if (!activeTask) return null;
    return data.workflowTemplates.find((t) => t.id === activeTask.workflowTemplateId);
  }, [data, activeTask]);

  const currentStep = useMemo(() => {
    if (!template || !activeRun) return null;
    return template.steps.find((s) => s.id === activeRun.currentStepId);
  }, [template, activeRun]);

  const role = useMemo(() => {
    if (!currentStep) return null;
    const roleId = currentStep.assignments?.[0]?.roleId;
    return roleId ? data.roles.find((r) => r.id === roleId) : null;
  }, [data, currentStep]);

  const handleAction = (status: GateStatus) => {
    if (!waitingGate) return;
    if (status === "reassign") {
      setShowReassignModal(true);
      const roleId = currentStep?.assignments?.[0]?.roleId;
      setSelectedRoleId(roleId ?? data.roles[0]?.id ?? "");
    } else {
      setActionStatus(status);
      updateGateStatus(waitingGate.id, status);
    }
  };

  const handleReassignConfirm = () => {
    if (!activeRun || !selectedRoleId) return;
    reassignAgentRun(activeRun.id, selectedRoleId);
    setShowReassignModal(false);
    setActionStatus("reassign");
  };

  const handleSaveMemory = () => {
    if (!waitingGate?.memorySuggestion) return;
    addMemory({
      kind: "project",
      scope: "project",
      projectId: activeTask?.projectId ?? "",
      roleId: null,
      taskId: activeTask?.id ?? null,
      title: `决策记忆: ${waitingGate.summary.slice(0, 30)}`,
      body: waitingGate.memorySuggestion,
      citation: [{ source: "人工决策", timestamp: new Date().toISOString() }],
    });
  };

  // Empty state: no waiting gate
  if (!waitingGate) {
    return (
      <div className="gate-panel-overlay" onClick={onClose}>
        <div className="gate-panel" onClick={(e) => e.stopPropagation()}>
          <div className="gate-panel-empty">
            <IconBadge icon={ShieldCheck} label="人工决策" />
            <h2>暂无待处理决策</h2>
            <p>当前没有需要人工确认的步骤。</p>
            <button className="btn primary" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Action result state
  if (actionStatus && actionStatus !== "waiting") {
    return (
      <div className="gate-panel-overlay" onClick={onClose}>
        <div className="gate-panel" onClick={(e) => e.stopPropagation()}>
          <div className="gate-panel-result">
            <Check className="result-icon" size={44} aria-hidden="true" />
            <h2>
              {actionStatus === "approved" && "已批准继续"}
              {actionStatus === "rejected" && "已拒绝"}
              {actionStatus === "rerun" && "已触发重跑"}
              {actionStatus === "reassign" && "已发起改派"}
              {actionStatus === "terminate" && "已终止任务"}
            </h2>
            <p>
              {actionStatus === "approved" && "Agent 将继续执行下一步。"}
              {actionStatus === "rejected" && "任务已标记为失败。"}
              {actionStatus === "rerun" && "当前步骤将重新执行。"}
              {actionStatus === "reassign" && "当前步骤需要重新指定角色。"}
              {actionStatus === "terminate" && "任务已终止。"}
            </p>
            <div className="result-actions">
              <button className="btn ghost" onClick={() => setActionStatus(null)}>
                返回
              </button>
              <button className="btn primary" onClick={onClose}>
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gate-panel-overlay" onClick={onClose}>
      <div className="gate-panel" onClick={(e) => e.stopPropagation()}>
        {/* Left: Evidence panel with tabs */}
        <div className="gate-panel-left">
          <header className="gate-panel-header">
            <div className="gate-panel-header-left">
              <IconBadge icon={FileDiff} label="证据面板" />
              <div className="gate-panel-title">
                <h2>证据面板</h2>
                <span>{activeTask?.goal}</span>
              </div>
            </div>
            <button className="btn-icon" onClick={onClose} aria-label="关闭">
              <X size={18} />
            </button>
          </header>

          <div className="gate-panel-tabs">
            <button
              className={`tab${activeTab === "diff" ? " active" : ""}`}
              onClick={() => setActiveTab("diff")}
            >
              <Code size={16} />
              <span>Diff</span>
            </button>
            <button
              className={`tab${activeTab === "test" ? " active" : ""}`}
              onClick={() => setActiveTab("test")}
            >
              <FlaskConical size={16} />
              <span>测试</span>
            </button>
            <button
              className={`tab${activeTab === "preview" ? " active" : ""}`}
              onClick={() => setActiveTab("preview")}
            >
              <Eye size={16} />
              <span>预览</span>
            </button>
            <button
              className={`tab${activeTab === "log" ? " active" : ""}`}
              onClick={() => setActiveTab("log")}
            >
              <FileText size={16} />
              <span>日志</span>
            </button>
          </div>

          <div className="gate-panel-content">
            {activeTab === "diff" && (
              <div className="evidence-diff">
                {waitingGate.diffEvidence.length > 0 ? (
                  waitingGate.diffEvidence.map((d, i) => (
                    <div key={i} className="diff-item">
                      <code>{d}</code>
                    </div>
                  ))
                ) : (
                  <div className="evidence-empty">暂无 Diff 证据</div>
                )}
              </div>
            )}
            {activeTab === "test" && (
              <div className="evidence-test">
                {waitingGate.testEvidence.length > 0 ? (
                  waitingGate.testEvidence.map((t, i) => (
                    <div key={i} className="test-item">
                      <code>{t}</code>
                    </div>
                  ))
                ) : (
                  <div className="evidence-empty">暂无测试证据</div>
                )}
              </div>
            )}
            {activeTab === "preview" && (
              <div className="evidence-preview">
                {waitingGate.previewEvidence.length > 0 ? (
                  waitingGate.previewEvidence.map((p, i) => (
                    <div key={i} className="preview-item">
                      <img src={p} alt={`预览 ${i + 1}`} />
                    </div>
                  ))
                ) : (
                  <div className="evidence-empty">暂无预览证据</div>
                )}
              </div>
            )}
            {activeTab === "log" && (
              <div className="evidence-log">
                <div className="terminal">
                  {activeRun?.log ? activeRun.log.join("\n") : waitingGate.logSummary || "暂无日志"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Decision panel */}
        <div className="gate-panel-right">
          <div className="decision-section">
            <h3>决策摘要</h3>
            <p>{waitingGate.summary}</p>
          </div>

          <div className="decision-section">
            <h3>决策详情</h3>
            <div className="decision-meta">
              <div className="meta-item">
                <strong>当前步骤</strong>
                <span>{currentStep?.name ?? "-"}</span>
              </div>
              <div className="meta-item">
                <strong>执行角色</strong>
                <span>{role?.name ?? "-"}</span>
              </div>
              <div className="meta-item">
                <strong>权限使用</strong>
                <ul>
                  {waitingGate.permissionUsage.length > 0 ? (
                    waitingGate.permissionUsage.map((p, i) => <li key={i}>{p}</li>)
                  ) : (
                    <li>无</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {waitingGate.memorySuggestion && (
            <div className="decision-section memory-suggestion">
              <h3>
                <Plus size={16} />
                记忆建议
              </h3>
              <p>{waitingGate.memorySuggestion}</p>
              <button className="btn ghost btn-sm" onClick={handleSaveMemory}>
                保存记忆
              </button>
            </div>
          )}

          <div className="decision-section decision-actions">
            <h3>决策操作</h3>
            <div className="action-buttons">
              <button className="btn primary" onClick={() => handleAction("approved")}>
                <Check size={16} />
                同意
              </button>
              <button className="btn ghost" onClick={() => handleAction("rerun")}>
                <RefreshCw size={16} />
                重跑
              </button>
              <button className="btn ghost" onClick={() => handleAction("reassign")}>
                <UserPlus size={16} />
                改派
              </button>
              <button className="btn danger" onClick={() => handleAction("terminate")}>
                <X size={16} />
                终止
              </button>
            </div>
          </div>
        </div>

        {/* Reassign Modal */}
        {showReassignModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>改派角色</h3>
              <p>选择新的角色来执行当前步骤：</p>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
              >
                {data.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <div className="modal-actions">
                <button className="btn ghost" onClick={() => setShowReassignModal(false)}>
                  取消
                </button>
                <button className="btn primary" onClick={handleReassignConfirm}>
                  确认改派
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
