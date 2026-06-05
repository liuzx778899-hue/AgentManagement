import { useMemo, useState } from "react";
import { CheckCircle2, Code, Eye, FileDiff, FlaskConical, FileText, ShieldCheck } from "lucide-react";
import type { GateStatus, WorkbenchData } from "../domain/workbench";
import { useWorkbenchState } from "../App";
import { IconBadge } from "./IconBadge";

interface ManualGateDecisionProps {
  data: WorkbenchData;
}

export function ManualGateDecision({ data }: ManualGateDecisionProps) {
  const [activeTab, setActiveTab] = useState<"diff" | "test" | "preview" | "log">("diff");
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

  if (!waitingGate) {
    return (
      <div className="manual-gate-page">
        <div className="empty-gate-state">
          <IconBadge icon={ShieldCheck} label="人工决策" />
          <h2>暂无待处理人工决策</h2>
          <p>当前没有需要人工确认的步骤。</p>
        </div>
      </div>
    );
  }

  if (actionStatus && actionStatus !== "waiting") {
    return (
      <div className="manual-gate-page">
        <div className="gate-result-state">
          <CheckCircle2 className="result-icon" size={44} aria-hidden="true" />
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
            <button className="btn primary" onClick={() => setActionStatus(null)}>
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="manual-gate-page">
      <header className="gate-header">
        <div className="gate-header-left">
          <IconBadge icon={ShieldCheck} label="人工决策" />
          <div className="gate-title">
            <h1>人工决策</h1>
            <span>{activeTask?.goal}</span>
          </div>
        </div>
        <div className="gate-header-right">
          <span className="badge orange">等待确认</span>
          <span className="gate-time">{new Date(waitingGate.createdAt).toLocaleString("zh-CN")}</span>
        </div>
      </header>

      {template && (
        <section className="gate-timeline">
          <div className="stepper">
            {template.steps.map((step) => {
              const stepRoleId = step.assignments?.[0]?.roleId;
              const stepRole = stepRoleId ? data.roles.find((r) => r.id === stepRoleId) : null;
              const isActive = step.id === activeRun?.currentStepId;
              const currentIndex = template.steps.findIndex((s) => s.id === activeRun?.currentStepId);
              const isPast = currentIndex > template.steps.indexOf(step);
              return (
                <div key={step.id} className={`step${isPast ? " done" : ""}${isActive ? " active" : ""}`}>
                  <small>{String(step.order).padStart(2, "0")}</small>
                  <strong>{step.name}</strong>
                  {step.gateMode === "manual" && <span className="badge orange">人工决策</span>}
                  {stepRole && <span className="badge violet">{stepRole.name}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="gate-content">
        <div className="evidence-panel">
          <div className="evidence-header">
            <div className="evidence-title">
              <IconBadge icon={FileDiff} label="证据面板" />
              <h2>证据面板</h2>
            </div>
            <div className="tab-group">
              <button className={`tab${activeTab === "diff" ? " active" : ""}`} onClick={() => setActiveTab("diff")}>
                <Code size={16} />
                <span>Diff</span>
              </button>
              <button className={`tab${activeTab === "test" ? " active" : ""}`} onClick={() => setActiveTab("test")}>
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
              <button className={`tab${activeTab === "log" ? " active" : ""}`} onClick={() => setActiveTab("log")}>
                <FileText size={16} />
                <span>日志</span>
              </button>
            </div>
          </div>

          <div className="evidence-body">
            {activeTab === "diff" && (
              <div className="diff-content">
                {waitingGate.diffEvidence.length > 0 ? (
                  waitingGate.diffEvidence.map((d, i) => (
                    <div key={i} className="diff-item">
                      <code>{d}</code>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">暂无 Diff 证据</div>
                )}
              </div>
            )}
            {activeTab === "test" && (
              <div className="test-content">
                {waitingGate.testEvidence.length > 0 ? (
                  waitingGate.testEvidence.map((t, i) => (
                    <div key={i} className="test-item">
                      <code>{t}</code>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">暂无测试证据</div>
                )}
              </div>
            )}
            {activeTab === "preview" && (
              <div className="preview-content">
                {waitingGate.previewEvidence.length > 0 ? (
                  waitingGate.previewEvidence.map((p, i) => (
                    <div key={i} className="preview-item">
                      <img src={p} alt={`预览 ${i + 1}`} />
                    </div>
                  ))
                ) : (
                  <div className="empty-state">暂无预览证据</div>
                )}
              </div>
            )}
            {activeTab === "log" && (
              <div className="terminal">{activeRun?.log ? activeRun.log.join("\n") : "暂无日志"}</div>
            )}
          </div>
        </div>

        <div className="decision-panel">
          <div className="decision-summary">
            <h2>决策摘要</h2>
            <p>{waitingGate.summary}</p>
          </div>
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
                {waitingGate.permissionUsage.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>

          {waitingGate.memorySuggestion && (
            <div className="memory-suggestion">
              <strong>记忆建议</strong>
              <p>{waitingGate.memorySuggestion}</p>
              <button
                className="btn ghost btn-sm"
                onClick={() => {
                  addMemory({
                    kind: "project",
                    scope: "project",
                    projectId: activeTask?.projectId ?? "",
                    roleId: null,
                    taskId: activeTask?.id ?? null,
                    title: `决策记忆: ${waitingGate.summary.slice(0, 30)}`,
                    body: waitingGate.memorySuggestion ?? "",
                    citation: [{ source: "人工决策", timestamp: new Date().toISOString() }],
                  });
                }}
              >
                保存记忆
              </button>
            </div>
          )}

          <div className="decision-actions">
            <h3>决策操作</h3>
            <div className="action-buttons">
              <button className="btn primary" onClick={() => handleAction("approved")}>
                继续
              </button>
              <button className="btn ghost" onClick={() => handleAction("rerun")}>
                重跑
              </button>
              <button className="btn ghost" onClick={() => handleAction("reassign")}>
                改派
              </button>
              <button className="btn danger" onClick={() => handleAction("terminate")}>
                终止
              </button>
            </div>
          </div>
        </div>
      </div>

      {showReassignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>改派角色</h3>
            <p>选择新的角色来执行当前步骤：</p>
            <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
              {data.roles.map((r) => {
                return (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                );
              })}
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
  );
}
