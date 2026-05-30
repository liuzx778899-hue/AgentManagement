import { Activity, CheckCircle2, ShieldCheck } from "lucide-react";
import type { Project } from "../domain/project";

interface PhaseData {
  phases: { id: string; name: string; status: "done" | "active" | "pending"; pct: number; note: string }[];
  gates: { label: string; desc: string; state: "done" | "pending" }[];
}

interface PwProgressDashboardProps {
  show: boolean;
  onClose: () => void;
  project: Project | undefined;
  phaseData?: PhaseData;
}

const DEFAULT_PHASES: PhaseData = {
  phases: [],
  gates: [],
};

function phaseStatusLabel(s: "done" | "active" | "pending"): string {
  if (s === "done") return "完成";
  if (s === "pending") return "待处理";
  return "推进中";
}

function phaseStatusClass(s: "done" | "active" | "pending"): string {
  if (s === "done") return "pw-pd-s-done";
  if (s === "active") return "pw-pd-s-prog";
  return "pw-pd-s-pend";
}

function phaseBarFillClass(s: "done" | "active" | "pending"): string {
  if (s === "done") return "d";
  return s === "active" ? "p" : "";
}

export function PwProgressDashboard({ show, onClose, project, phaseData = DEFAULT_PHASES }: PwProgressDashboardProps) {
  if (!show) return null;

  const phaseItems = phaseData.phases || [];
  const phaseGates = phaseData.gates || [];

  const phaseDoneCount = phaseItems.filter((phase) => phase.status === "done").length;
  const phaseActiveCount = phaseItems.filter((phase) => phase.status === "active").length;
  const phaseOverallPct = phaseItems.length > 0
    ? Math.round(phaseItems.reduce((sum, phase) => sum + phase.pct, 0) / phaseItems.length)
    : 0;

  // Empty state when no phase data
  if (phaseItems.length === 0) {
    return (
      <div className="pw-progress-overlay" onClick={onClose}>
        <div className="pw-progress-dashboard" onClick={(e) => e.stopPropagation()}>
          <header className="pw-pd-header">
            <div className="pw-pd-title">
              <Activity size={18} />
              <strong>{project?.name ?? "项目"} — 总体进度</strong>
            </div>
            <button
              className="btn ghost btn-sm"
              onClick={onClose}
              type="button"
            >
              ✕ 关闭
            </button>
          </header>

          <div className="pw-pd-body">
            <section className="pw-pd-hero">
              <div className="pw-pd-hero-ring" aria-label="暂无进度数据">
                <svg viewBox="0 0 86 86">
                  <circle cx="43" cy="43" r="34" />
                </svg>
                <strong>--</strong>
                <span>暂无数据</span>
              </div>
              <div className="pw-pd-hero-copy">
                <span className="pw-pd-kicker">进度跟踪</span>
                <h3>暂无阶段进度数据</h3>
                <p>项目创建后，阶段进度将自动计算并显示在此。</p>
              </div>
              <div className="pw-pd-hero-stats">
                <div>
                  <strong>0</strong>
                  <span>已完成阶段</span>
                </div>
                <div>
                  <strong>0</strong>
                  <span>推进中</span>
                </div>
              </div>
            </section>

            <section>
              <div className="pw-pd-empty-message">
                <p>进度数据将从项目的任务执行状态中自动计算。当前项目尚未配置阶段进度跟踪。</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pw-progress-overlay" onClick={onClose}>
      <div className="pw-progress-dashboard" onClick={(e) => e.stopPropagation()}>
        <header className="pw-pd-header">
          <div className="pw-pd-title">
            <Activity size={18} />
            <strong>{project?.name ?? "项目"} — 总体进度</strong>
          </div>
          <button
            className="btn ghost btn-sm"
            onClick={onClose}
            type="button"
          >
            ✕ 关闭
          </button>
        </header>

        <div className="pw-pd-body">
          <section className="pw-pd-hero">
            <div className="pw-pd-hero-ring" aria-label={`Phase 1 完成度 ${phaseOverallPct}%`}>
              <svg viewBox="0 0 86 86">
                <circle cx="43" cy="43" r="34" />
                <circle
                  className="value"
                  cx="43"
                  cy="43"
                  r="34"
                  style={{ strokeDashoffset: 213.6 - (phaseOverallPct / 100) * 213.6 }}
                />
              </svg>
              <strong>{phaseOverallPct}%</strong>
              <span>Phase 1</span>
            </div>
            <div className="pw-pd-hero-copy">
              <span className="pw-pd-kicker">进度跟踪</span>
              <h3>{phaseDoneCount} 个阶段已完成，{phaseActiveCount} 个推进中</h3>
              <p>项目进度数据基于任务执行状态自动计算。</p>
            </div>
            <div className="pw-pd-hero-stats">
              <div>
                <strong>{phaseDoneCount}</strong>
                <span>已完成阶段</span>
              </div>
              <div>
                <strong>{phaseActiveCount}</strong>
                <span>推进中</span>
              </div>
              <div>
                <strong>{phaseItems.length}</strong>
                <span>总阶段数</span>
              </div>
            </div>
          </section>

          <section className="pw-pd-phase-road">
            <div className="pw-pd-phase-card current">
              <h4>当前进度</h4>
              <span className="pw-pd-phase-pct">{phaseOverallPct}%</span>
              <p>基于项目任务执行状态计算。</p>
            </div>
            <div className="pw-pd-arrow">→</div>
            <div className="pw-pd-phase-card future">
              <h4>下一阶段</h4>
              <span className="pw-pd-phase-pct">待定</span>
              <p>完成当前阶段后自动进入。</p>
            </div>
            <div className="pw-pd-arrow">→</div>
            <div className="pw-pd-phase-card future">
              <h4>后续规划</h4>
              <span className="pw-pd-phase-pct">规划中</span>
              <p>根据项目需求逐步推进。</p>
            </div>
          </section>

          <section>
            <div className="pw-pd-section-title">阶段明细</div>
            <div className="pw-pd-phase-grid">
              {phaseItems.map((phase) => (
                <article key={phase.id} className={`pw-pd-phase-detail-card ${phase.status}`}>
                  <div className="pw-pd-phase-detail-head">
                    <span className="pw-pd-pt-id">{phase.id}</span>
                    <span className={`pw-pd-pt-status ${phaseStatusClass(phase.status)}`}>
                      {phaseStatusLabel(phase.status)}
                    </span>
                  </div>
                  <strong>{phase.name}</strong>
                  <p>{phase.note}</p>
                  <div className="pw-pd-pt-bar">
                    <div
                      className={`pw-pd-pt-fill ${phaseBarFillClass(phase.status)}`}
                      style={{ width: `${phase.pct}%` }}
                    />
                  </div>
                  <span className="pw-pd-phase-detail-pct">{phase.pct}%</span>
                </article>
              ))}
            </div>
          </section>

          <section className="pw-pd-bottom-grid">
            <div>
              <div className="pw-pd-section-title">判定条件</div>
              <div className="pw-pd-gate-grid">
                {phaseGates.map((gate) => (
                  <div key={gate.label} className={`pw-pd-gate-item ${gate.state === "done" ? "done" : "pend"}`}>
                    <span className="pw-pd-gate-icon">
                      {gate.state === "done" ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
                    </span>
                    <span className="pw-pd-gate-label">{gate.label}</span>
                    <span className="pw-pd-gate-desc">{gate.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="pw-pd-section-title">下一步执行路径</div>
              <div className="pw-pd-path">
                <div className="pw-pd-path-step">
                  <span className="pw-pd-path-dot g" />
                  <div>
                    <strong>浏览器全流程验收</strong>
                    <p>项目管理 → 工作区 → 流程编排 → 设置 → AI 助手完整走查。</p>
                  </div>
                </div>
                <div className="pw-pd-path-conn" />
                <div className="pw-pd-path-step">
                  <span className="pw-pd-path-dot a" />
                  <div>
                    <strong>标注 Phase 1 模拟交互</strong>
                    <p>对所有 alert/mock 的地方明确标注"Phase 2 接入真实 API"。</p>
                  </div>
                </div>
                <div className="pw-pd-path-conn" />
                <div className="pw-pd-path-step">
                  <span className="pw-pd-path-dot g" />
                  <div>
                    <strong>进入 Phase 2</strong>
                    <p>开始 Runner Provider、CLI 工程执行和真实 worktree 调度。</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
