import { useState, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Play,
  Square,
  Trash2,
  Edit3,
} from "lucide-react";
import type { Task } from "../domain/task";
import type { WorkbenchData } from "../domain/workbench";

interface TaskTodoPanelProps {
  tasks: Task[];
  workflowTemplates: WorkbenchData["workflowTemplates"];
  roles: WorkbenchData["roles"];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  maxVisible?: number;
}

type TaskStatus = "draft" | "queued" | "running" | "gate" | "done" | "failed";

const statusConfig: Record<TaskStatus, { icon: typeof CheckCircle2; label: string; color: string }> = {
  draft: { icon: Circle, label: "草稿", color: "var(--text-muted)" },
  queued: { icon: Clock, label: "排队中", color: "var(--accent-orange)" },
  running: { icon: Play, label: "运行中", color: "var(--accent-blue)" },
  gate: { icon: AlertCircle, label: "等待决策", color: "var(--accent-orange)" },
  done: { icon: CheckCircle2, label: "已完成", color: "var(--accent-green)" },
  failed: { icon: Square, label: "失败", color: "var(--accent-red)" },
};

function getWorkflowTemplateName(templateId: string, templates: WorkbenchData["workflowTemplates"]): string {
  const template = templates.find((t) => t.id === templateId);
  return template?.name ?? "未关联流程";
}

export function TaskTodoPanel({
  tasks,
  workflowTemplates,
  roles,
  onUpdateTask,
  onDeleteTask,
  maxVisible = 4,
}: TaskTodoPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editGoal, setEditGoal] = useState("");

  // Filter out done tasks for TODO display
  const pendingTasks = tasks.filter((task) => task.status !== "done");
  const completedTasks = tasks.filter((task) => task.status === "done");

  const visibleTasks = expanded ? pendingTasks : pendingTasks.slice(0, maxVisible);
  const hasMore = pendingTasks.length > maxVisible;

  const handleToggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleToggleMenu = useCallback((taskId: string) => {
    setActiveMenuTaskId((prev) => (prev === taskId ? null : taskId));
  }, []);

  const handleMarkDone = useCallback(
    (taskId: string) => {
      onUpdateTask(taskId, { status: "done" });
      setActiveMenuTaskId(null);
    },
    [onUpdateTask]
  );

  const handleMarkQueued = useCallback(
    (taskId: string) => {
      onUpdateTask(taskId, { status: "queued" });
      setActiveMenuTaskId(null);
    },
    [onUpdateTask]
  );

  const handleDelete = useCallback(
    (taskId: string) => {
      if (window.confirm("确定删除此任务?")) {
        onDeleteTask(taskId);
        setActiveMenuTaskId(null);
      }
    },
    [onDeleteTask]
  );

  const handleStartEdit = useCallback((task: Task) => {
    setEditingTaskId(task.id);
    setEditGoal(task.goal);
    setActiveMenuTaskId(null);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingTaskId && editGoal.trim()) {
      onUpdateTask(editingTaskId, { goal: editGoal.trim() });
      setEditingTaskId(null);
      setEditGoal("");
    }
  }, [editingTaskId, editGoal, onUpdateTask]);

  const handleCancelEdit = useCallback(() => {
    setEditingTaskId(null);
    setEditGoal("");
  }, []);

  const renderTaskItem = (task: Task) => {
    const status = statusConfig[task.status];
    const StatusIcon = status.icon;
    const isEditing = editingTaskId === task.id;

    return (
      <div key={task.id} className="wb-todo-item-enhanced">
        <div className="wb-todo-status">
          <StatusIcon size={14} style={{ color: status.color }} />
          <span className="wb-todo-status-label">{status.label}</span>
        </div>

        {isEditing ? (
          <div className="wb-todo-edit-area">
            <input
              type="text"
              value={editGoal}
              onChange={(e) => setEditGoal(e.target.value)}
              className="wb-todo-edit-input"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") handleCancelEdit();
              }}
            />
            <button className="wb-todo-edit-btn save" onClick={handleSaveEdit} type="button">
              保存
            </button>
            <button className="wb-todo-edit-btn cancel" onClick={handleCancelEdit} type="button">
              取消
            </button>
          </div>
        ) : (
          <>
            <div className="wb-todo-content">
              <span className="wb-todo-goal">{task.goal}</span>
              <span className="wb-todo-meta">
                {getWorkflowTemplateName(task.workflowTemplateId, workflowTemplates)}
              </span>
            </div>

            <div className="wb-todo-actions">
              <button
                className="wb-todo-more-btn"
                onClick={() => handleToggleMenu(task.id)}
                type="button"
                aria-label="更多操作"
              >
                <MoreHorizontal size={14} />
              </button>

              {activeMenuTaskId === task.id && (
                <div className="wb-todo-menu">
                  {task.status !== "done" && (
                    <button onClick={() => handleMarkDone(task.id)} type="button">
                      <CheckCircle2 size={12} />
                      标记完成
                    </button>
                  )}
                  {task.status === "draft" && (
                    <button onClick={() => handleMarkQueued(task.id)} type="button">
                      <Clock size={12} />
                      加入队列
                    </button>
                  )}
                  <button onClick={() => handleStartEdit(task)} type="button">
                    <Edit3 size={12} />
                    编辑
                  </button>
                  <button className="danger" onClick={() => handleDelete(task.id)} type="button">
                    <Trash2 size={12} />
                    删除
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="wb-panel-box">
      <div className="wb-box-title">
        <span>TODO LIST</span>
        <span className="wb-model-pill">{pendingTasks.length}</span>
        {completedTasks.length > 0 && (
          <span className="wb-todo-completed-count">已完成 {completedTasks.length}</span>
        )}
      </div>

      <div className="wb-box-list wb-todo-list">
        {visibleTasks.length === 0 ? (
          <p className="wb-panel-empty">暂无待办任务</p>
        ) : (
          <>
            {visibleTasks.map(renderTaskItem)}
            {hasMore && !expanded && (
              <button className="wb-todo-expand-btn" onClick={handleToggleExpand} type="button">
                <ChevronDown size={14} />
                显示更多 ({pendingTasks.length - maxVisible} 项)
              </button>
            )}
            {expanded && hasMore && (
              <button className="wb-todo-expand-btn" onClick={handleToggleExpand} type="button">
                <ChevronRight size={14} />
                收起
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}