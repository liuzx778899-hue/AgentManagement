import type { RunnerProfile } from "../../domain/workbench";
import { IconBadge } from "../IconBadge";
import { Terminal } from "lucide-react";

interface CliRunnerPanelProps {
  runnerProfiles: RunnerProfile[];
  defaultRunner?: string;
  /** Toggle runner enabled status - directly mutates data for now */
  onToggleRunner: (runnerId: string) => void;
  /** Set default runner - directly mutates data for now */
  onSetDefaultRunner: (runnerId: string | undefined) => void;
}

export function CliRunnerPanel({ runnerProfiles, defaultRunner, onToggleRunner, onSetDefaultRunner }: CliRunnerPanelProps) {
  const profiles = runnerProfiles ?? [];

  return (
    <div className="settings-panel runner-panel">
      <div className="panel-header">
        <div className="panel-title">
          <IconBadge icon={Terminal} label="CLI Runner" />
          <h3>CLI Runner</h3>
        </div>
        <span className="badge green">{profiles.filter((r) => r.enabled).length} 个已启用</span>
      </div>
      <div className="panel-body">
        <div className="runner-list">
          {profiles.map((runner) => (
            <div key={runner.id} className={`runner-card${runner.enabled ? "" : " disabled"}`}>
              <div className="runner-card-header">
                <div className="runner-card-left">
                  <div className="runner-avatar">{runner.displayName.slice(0, 1)}</div>
                  <div className="runner-card-name">
                    <strong>{runner.displayName}</strong>
                    <span className="runner-kind">{runner.kind}</span>
                  </div>
                </div>
                <div className="runner-card-right">
                  <code className="runner-command">{runner.command}</code>
                  <button
                    className={`btn btn-sm ${runner.enabled ? "btn-primary" : "ghost"}`}
                    onClick={() => onToggleRunner(runner.id)}
                  >
                    {runner.enabled ? "已启用" : "已禁用"}
                  </button>
                </div>
              </div>
              {runner.description && (
                <div className="runner-card-desc">{runner.description}</div>
              )}
              {runner.defaultArgs && runner.defaultArgs.length > 0 && (
                <div className="runner-card-args">
                  <span className="runner-args-label">默认参数：</span>
                  <code>{runner.defaultArgs.join(" ")}</code>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="runner-default-section">
          <div className="form-field">
            <label>默认 CLI Runner</label>
            <select
              value={defaultRunner ?? ""}
              onChange={(e) => onSetDefaultRunner(e.target.value || undefined)}
            >
              <option value="">— 选择默认 Runner —</option>
              {profiles.filter((r) => r.enabled).map((r) => (
                <option key={r.id} value={r.id}>{r.displayName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
