import { useMemo } from "react";
import { ListChecks, ScrollText } from "lucide-react";
import type { WorkbenchData } from "../domain/workbench";
import { IconBadge } from "./IconBadge";

interface RunnerLogsProps {
  data: WorkbenchData;
}

function formatLogTimestamp(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function parseLogEvent(log: string): { time: string; event: string } {
  const [ts, ...rest] = log.split(" ");
  return { time: formatLogTimestamp(ts), event: rest.join(" ") || log };
}

export function RunnerLogs({ data }: RunnerLogsProps) {
  const activeRun = useMemo(() => {
    const activeTask = data.tasks.find((t) => t.status === "running" || t.status === "gate");
    if (!activeTask?.activeRunId) return null;
    return data.agentRuns.find((r) => r.id === activeTask.activeRunId);
  }, [data]);

  const activeTask = useMemo(() => {
    if (!activeRun) return null;
    return data.tasks.find((t) => t.id === activeRun.taskId);
  }, [data, activeRun]);

  const activeProject = useMemo(() => {
    if (!activeTask) return null;
    return data.projects.find((p) => p.id === activeTask.projectId);
  }, [data, activeTask]);

  const role = useMemo(() => {
    if (!activeRun) return null;
    return data.roles.find((r) => r.id === activeRun.roleId);
  }, [data, activeRun]);

  const logs = useMemo(() => activeRun?.log.map(parseLogEvent) ?? [], [activeRun]);

  return (
    <div className="runner-logs">
      <div className="logs-panel">
        <div className="logs-panel-header">
          <IconBadge icon={ScrollText} label="运行日志" />
          <div className="logs-panel-title">
            <h2>运行日志</h2>
            {activeRun && (
              <span>
                {activeProject?.name} /{" "}
                {(activeTask?.goal?.length ?? 0) > 30 ? `${activeTask?.goal?.slice(0, 30)}...` : activeTask?.goal}
              </span>
            )}
          </div>
          <div className="logs-status-badge">
            {activeRun?.status === "waiting_gate" && <span className="badge warn">等待人工决策</span>}
            {activeRun?.status === "running" && <span className="badge blue">运行中</span>}
            {activeRun?.status === "done" && <span className="badge green">已完成</span>}
            {!activeRun && <span className="badge">空闲</span>}
          </div>
        </div>

        <div className="logs-meta">
          {activeProject && (
            <div className="log-meta-item">
              <span className="meta-label">项目：</span>
              <span className="meta-value">{activeProject.name}</span>
            </div>
          )}
          {activeTask && (
            <div className="log-meta-item">
              <span className="meta-label">任务：</span>
              <span className="meta-value">{activeTask.goal}</span>
            </div>
          )}
          {role && (
            <div className="log-meta-item">
              <span className="meta-label">Agent：</span>
              <span className="meta-value">
                {role.name} / {activeRun?.modelName}
              </span>
            </div>
          )}
        </div>

        <div className="logs-terminal">
          {logs.length === 0 ? (
            <div className="logs-empty">
              <span>暂无运行日志</span>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="log-line">
                <span className="log-time">{log.time}</span>
                <span className="log-event">{log.event}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="logs-suggestions">
        <div className="suggestions-panel">
          <div className="suggestions-header">
            <IconBadge icon={ListChecks} label="下一步" />
            <h3>下一步</h3>
          </div>
          <div className="suggestions-body">
            {activeRun?.status === "waiting_gate" && (
              <div className="suggestion-item">
                <strong>等待人工决策</strong>
                <span>进入“人工决策”页面查看证据并批准继续。</span>
              </div>
            )}
            {activeRun?.status === "running" && (
              <div className="suggestion-item">
                <strong>Agent 正在运行</strong>
                <span>在上方日志中观察执行进度。</span>
              </div>
            )}
            {!activeRun && (
              <div className="suggestion-item">
                <strong>没有运行中的任务</strong>
                <span>创建新任务即可启动一次 Agent 执行。</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
