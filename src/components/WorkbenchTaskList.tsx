import { Clock, Play, Users, AlertCircle } from "lucide-react";
import type { Task, AgentRole } from "../domain/workbench";

interface TaskWithWaiting {
  task: Task;
  waitingFor: Task[];
}

interface WorkbenchTaskListProps {
  /** 当前角色待办 */
  myTasks: Task[];
  /** 等待依赖的任务 */
  waitingTasks: TaskWithWaiting[];
  /** 可开始的任务 */
  readyTasks: Task[];
  /** 角色映射 */
  roles: AgentRole[];
  /** 点击任务回调 */
  onTaskClick?: (task: Task) => void;
}

/**
 * 工作台任务列表组件
 *
 * 展示四个区域：
 * 1. 当前角色待办
 * 2. 收到的交接（TODO: 需要事件数据支持）
 * 3. 等待谁完成
 * 4. 可开始任务
 */
export function WorkbenchTaskList({
  myTasks,
  waitingTasks,
  readyTasks,
  roles,
  onTaskClick,
}: WorkbenchTaskListProps) {
  const getRoleName = (roleId?: string) => {
    if (!roleId) return "未分配";
    return roles.find((r) => r.id === roleId)?.name ?? "未知角色";
  };

  const getStatusLabel = (status: Task["status"]) => {
    const labels: Record<Task["status"], string> = {
      draft: "草稿",
      queued: "排队中",
      running: "运行中",
      gate: "等待 Gate",
      done: "已完成",
      failed: "失败",
    };
    return labels[status];
  };

  const getStatusClass = (status: Task["status"]) => {
    const classes: Record<Task["status"], string> = {
      draft: "status-draft",
      queued: "status-queued",
      running: "status-running",
      gate: "status-gate",
      done: "status-done",
      failed: "status-failed",
    };
    return classes[status];
  };

  return (
    <div className="wb-task-list">
      {/* 当前角色待办 */}
      <div className="wb-task-section">
        <div className="wb-task-section-header">
          <Users size={14} />
          <span>当前角色待办</span>
          <span className="wb-task-count">{myTasks.length}</span>
        </div>
        <div className="wb-task-section-content">
          {myTasks.length === 0 ? (
            <p className="wb-task-empty">暂无待办任务</p>
          ) : (
            myTasks.map((task) => (
              <button
                key={task.id}
                className="wb-task-item"
                onClick={() => onTaskClick?.(task)}
                type="button"
              >
                <div className="wb-task-item-header">
                  <span className={`wb-task-status ${getStatusClass(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </span>
                  <span className="wb-task-priority">{task.priority ?? "P0"}</span>
                </div>
                <div className="wb-task-item-goal">{task.goal}</div>
                {task.acceptanceCriteria.length > 0 && (
                  <div className="wb-task-item-criteria">
                    验收: {task.acceptanceCriteria[0]}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* 等待谁完成 */}
      <div className="wb-task-section">
        <div className="wb-task-section-header">
          <Clock size={14} />
          <span>等待谁完成</span>
          <span className="wb-task-count">{waitingTasks.length}</span>
        </div>
        <div className="wb-task-section-content">
          {waitingTasks.length === 0 ? (
            <p className="wb-task-empty">无等待中的任务</p>
          ) : (
            waitingTasks.map(({ task, waitingFor }) => (
              <div key={task.id} className="wb-task-item wb-task-waiting">
                <div className="wb-task-item-header">
                  <span className={`wb-task-status ${getStatusClass(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </span>
                  <span className="wb-task-priority">{task.priority ?? "P0"}</span>
                </div>
                <div className="wb-task-item-goal">{task.goal}</div>
                <div className="wb-task-waiting-info">
                  <AlertCircle size={12} />
                  <span>
                    等待: {waitingFor.map((t) => getRoleName(t.roleId)).join(", ")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 可开始任务 */}
      <div className="wb-task-section">
        <div className="wb-task-section-header">
          <Play size={14} />
          <span>可开始任务</span>
          <span className="wb-task-count wb-task-count-ready">{readyTasks.length}</span>
        </div>
        <div className="wb-task-section-content">
          {readyTasks.length === 0 ? (
            <p className="wb-task-empty">暂无可开始的任务</p>
          ) : (
            readyTasks.map((task) => (
              <button
                key={task.id}
                className="wb-task-item wb-task-ready"
                onClick={() => onTaskClick?.(task)}
                type="button"
              >
                <div className="wb-task-item-header">
                  <span className="wb-task-status status-ready">可启动</span>
                  <span className="wb-task-priority">{task.priority ?? "P0"}</span>
                </div>
                <div className="wb-task-item-goal">{task.goal}</div>
                <div className="wb-task-ready-role">
                  <Users size={12} />
                  <span>{getRoleName(task.roleId)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
