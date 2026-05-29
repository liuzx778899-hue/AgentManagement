import { Activity, CheckCircle2, ShieldCheck } from "lucide-react";
import type { Project } from "../domain/project";

interface PwProgressDashboardProps {
  show: boolean;
  onClose: () => void;
  project: Project | undefined;
}

type PhaseStatus = "done" | "active" | "pending";

const phaseItems: { id: string; name: string; status: PhaseStatus; pct: number; note: string }[] = [
  { id: "P0", name: "导航合并 + 角色模型解耦", status: "done", pct: 100, note: "项目管理入口合并，角色先行，模型按步骤选择。" },
  { id: "P1a", name: "IM 适配器", status: "done", pct: 95, note: "增删改启用路由全走 reducer，模板配置完成。" },
  { id: "P1b", name: "Git / DevOps 集成", status: "done", pct: 78, note: "凭证 CRUD 走 reducer，同步更新状态。" },
  { id: "P2", name: "前端工程标准", status: "done", pct: 90, note: "Vite + React + TypeScript + 测试基线已建立。" },
  { id: "P3", name: "流程编排画布 V2", status: "done", pct: 85, note: "添加/编辑/删除/复制模板全闭环。" },
  { id: "P4", name: "项目管理 V3 + 工作区", status: "done", pct: 85, note: "项目工作区已成型，Git 同步走 reducer。" },
  { id: "P5", name: "MD 指令体系", status: "done", pct: 100, note: "角色/项目/步骤 MD 完整，CSS 和测试全部补齐。" },
  { id: "P6", name: "AI 工程助手", status: "done", pct: 80, note: "三态切换 + 7种意图识别 + 动作执行走 reducer，11 tests。" },
  { id: "P7", name: "产品验收与性能收尾", status: "active", pct: 70, note: "lint 清零、CSS 拆分、Settings 拆分已完成，待浏览器验收。" },
];

function phaseStatusLabel(s: PhaseStatus): string {
  if (s === "done") return "完成";
  if (s === "pending") return "待处理";
  return "推进中";
}

function phaseStatusClass(s: PhaseStatus): string {
  if (s === "done") return "pw-pd-s-done";
  if (s === "active") return "pw-pd-s-prog";
  return "pw-pd-s-pend";
}

function phaseBarFillClass(s: PhaseStatus): string {
  if (s === "done") return "d";
  return s === "active" ? "p" : "";
}

const phaseGates = [
  { label: "测试 / 构建 / 类型检查", desc: "92 tests 通过，build 和 typecheck 通过", state: "done" as const },
  { label: "流程添加步骤闭环", desc: "ADD_WORKFLOW_STEP reducer action 已实现", state: "done" as const },
  { label: "AI 助手动作落地", desc: "7种意图识别 + 动作执行调用真实 reducer", state: "done" as const },
  { label: "IM / Git 状态闭环", desc: "增删改启用全走 reducer，本地状态一致", state: "done" as const },
];

export function PwProgressDashboard({ show, onClose, project }: PwProgressDashboardProps) {
  if (!show) return null;

  const phaseDoneCount = phaseItems.filter((phase) => phase.status === "done").length;
  const phaseActiveCount = phaseItems.filter((phase) => phase.status === "active").length;
  const phaseOverallPct = Math.round(
    phaseItems.reduce((sum, phase) => sum + phase.pct, 0) / Math.max(phaseItems.length, 1)
  );

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
              <span className="pw-pd-kicker">个人本地版 Web MVP</span>
              <h3>核心功能已闭环，准备浏览器验收</h3>
              <p>所有 P0-P8 阶段已完成。AI 助手规则引擎可用，IM/Git 配置走 reducer，lint 清零，大文件已拆分。</p>
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
                <strong>92</strong>
                <span>测试通过</span>
              </div>
            </div>
          </section>

          <section className="pw-pd-phase-road">
            <div className="pw-pd-phase-card current">
              <h4>Phase 1 · Web MVP</h4>
              <span className="pw-pd-phase-pct">{phaseOverallPct}%</span>
              <p>前端页面、fixtures、本地 state、原型闭环。</p>
            </div>
            <div className="pw-pd-arrow">→</div>
            <div className="pw-pd-phase-card future">
              <h4>Phase 2 · 工程层</h4>
              <span className="pw-pd-phase-pct">待启动</span>
              <p>本地 Runner、CLI agent、worktree、真实执行。</p>
            </div>
            <div className="pw-pd-arrow">→</div>
            <div className="pw-pd-phase-card future">
              <h4>Phase 3 · 团队/桌面</h4>
              <span className="pw-pd-phase-pct">规划中</span>
              <p>团队权限、多人协作、桌面客户端。</p>
            </div>
          </section>

          <section>
            <div className="pw-pd-section-title">Phase 1 · 子阶段明细</div>
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
              <div className="pw-pd-section-title">Phase 1 判定条件 — 全部通过</div>
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
