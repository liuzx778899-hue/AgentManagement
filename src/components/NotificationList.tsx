import { useState, useCallback, useEffect, useRef } from "react";
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  X,
  MoreHorizontal,
  Check,
  Trash2,
} from "lucide-react";
import type { WorkflowEvent } from "../domain/workflowEvent";

// Notification item interface
export interface NotificationItem {
  id: string;
  type: "success" | "error" | "warning" | "info" | "gate" | "task";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  projectId?: string;
  projectName?: string;
  runId?: string;
  stepId?: string;
  workflowEvent?: WorkflowEvent;
}

// Mock notifications for initial display
const mockNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    type: "success",
    title: "步骤完成",
    message: "前端开发步骤已完成",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    read: false,
    projectId: "proj-1",
    projectName: "AgentDevelop",
    stepId: "step-3",
  },
  {
    id: "notif-2",
    type: "gate",
    title: "Gate 待决策",
    message: "代码审查 Gate 等待您的决策",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    read: false,
    projectId: "proj-1",
    projectName: "AgentDevelop",
    stepId: "step-4",
  },
  {
    id: "notif-3",
    type: "warning",
    title: "运行警告",
    message: "Runner 进程内存使用率较高",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    read: true,
    projectId: "proj-1",
    projectName: "AgentDevelop",
    runId: "run-1",
  },
  {
    id: "notif-4",
    type: "info",
    title: "任务创建",
    message: "新任务「流程编排画布 V2」已创建",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: true,
    projectId: "proj-1",
    projectName: "AgentDevelop",
  },
  {
    id: "notif-5",
    type: "error",
    title: "步骤失败",
    message: "测试验证步骤执行失败：断言错误",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    read: true,
    projectId: "proj-1",
    projectName: "AgentDevelop",
    stepId: "step-5",
  },
];

interface NotificationListProps {
  onNavigate?: (view: string, params?: Record<string, string>) => void;
}

export function NotificationList({ onNavigate }: NotificationListProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleNotificationClick = useCallback(
    (notification: NotificationItem) => {
      markAsRead(notification.id);
      if (notification.projectId && onNavigate) {
        onNavigate("project-workspace", { projectId: notification.projectId });
      }
      setIsOpen(false);
    },
    [markAsRead, onNavigate]
  );

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={16} className="notif-icon success" />;
      case "error":
        return <XCircle size={16} className="notif-icon error" />;
      case "warning":
        return <AlertTriangle size={16} className="notif-icon warning" />;
      case "gate":
        return <AlertTriangle size={16} className="notif-icon gate" />;
      case "task":
        return <CheckCircle2 size={16} className="notif-icon task" />;
      default:
        return <Info size={16} className="notif-icon info" />;
    }
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString("zh-CN");
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  return (
    <div className="notification-list-container">
      <button
        ref={buttonRef}
        className="notification-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`通知 ${unreadCount > 0 ? `(${unreadCount} 条未读)` : ""}`}
        aria-expanded={isOpen}
        type="button"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div ref={panelRef} className="notification-panel">
          <div className="notification-panel-header">
            <h3>通知</h3>
            <div className="notification-panel-actions">
              {unreadCount > 0 && (
                <button
                  className="notification-action-btn"
                  onClick={markAllAsRead}
                  title="全部标为已读"
                  type="button"
                >
                  <Check size={14} />
                </button>
              )}
              <button
                className="notification-action-btn"
                onClick={clearAll}
                title="清空通知"
                type="button"
              >
                <Trash2 size={14} />
              </button>
              <button
                className="notification-action-btn close"
                onClick={() => setIsOpen(false)}
                title="关闭"
                type="button"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="notification-filter">
            <button
              className={`notification-filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
              type="button"
            >
              全部
            </button>
            <button
              className={`notification-filter-btn ${filter === "unread" ? "active" : ""}`}
              onClick={() => setFilter("unread")}
              type="button"
            >
              未读 {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          <div className="notification-list">
            {filteredNotifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={24} className="notification-empty-icon" />
                <p>暂无{filter === "unread" ? "未读" : ""}通知</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? "read" : "unread"}`}
                  onClick={() => handleNotificationClick(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <div className="notification-item-icon">
                    {getIcon(notification.type)}
                  </div>
                  <div className="notification-item-content">
                    <div className="notification-item-header">
                      <span className="notification-item-title">
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="notification-unread-dot" />
                      )}
                    </div>
                    <p className="notification-item-message">
                      {notification.message}
                    </p>
                    <div className="notification-item-meta">
                      {notification.projectName && (
                        <span className="notification-item-project">
                          {notification.projectName}
                        </span>
                      )}
                      <span className="notification-item-time">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="notification-item-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    title="删除"
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-panel-footer">
              <button
                className="notification-view-all"
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.("notification-history");
                }}
                type="button"
              >
                查看全部通知
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
