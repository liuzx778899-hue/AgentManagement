import { type ReactNode, useState } from "react";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  GitBranch,
  Home,
  MemoryStick,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { WorkbenchView } from "../domain/workbench";
import { PRODUCT_NAME } from "../config/product";

const NAV_ITEMS: {
  view: WorkbenchView;
  label: string;
  icon: LucideIcon;
}[] = [
  { view: "project-management", label: "项目管理", icon: FolderGit2 },
  { view: "workflow-management", label: "流程管理", icon: GitBranch },
  { view: "workbench", label: "工作台", icon: Home },
  { view: "memory", label: "记忆管理", icon: MemoryStick },
  { view: "settings", label: "设置中心", icon: Settings },
];

export function AppShell({
  activeView,
  onNavigate,
  children,
}: {
  activeView: WorkbenchView;
  onNavigate: (view: WorkbenchView) => void;
  children: ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="shell">
      <aside className={`sidebar${sidebarCollapsed ? " collapsed" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">
            <Bot size={18} strokeWidth={2.4} aria-hidden="true" />
          </span>
          {!sidebarCollapsed && <span className="sidebar-title">{PRODUCT_NAME}</span>}
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                className={`nav-item${activeView === item.view || (item.view === "project-management" && activeView === "ai-briefing") || (item.view === "workflow-management" && (activeView === "workflows" || activeView === "ai-workflow-design")) ? " current" : ""}`}
                aria-current={activeView === item.view || (item.view === "project-management" && activeView === "ai-briefing") || (item.view === "workflow-management" && (activeView === "workflows" || activeView === "ai-workflow-design")) ? "page" : undefined}
                onClick={() => onNavigate(item.view)}
                title={item.label}
              >
                <span className="nav-shortcut" aria-hidden="true">
                  <Icon size={15} strokeWidth={2.2} />
                </span>
                {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <button
          className="collapse-btn"
          onClick={() => setSidebarCollapsed((c) => !c)}
          title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
          aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-breadcrumb">AgentManagement</span>
            <span className="topbar-separator">/</span>
            <span className="topbar-view-label">
              {NAV_ITEMS.find((n) => n.view === activeView)?.label ?? (activeView === "project-workspace" ? "项目工作区" : activeView === "project-detail" ? "项目详情" : activeView === "ai-briefing" ? "AI 建项" : activeView === "workflows" ? "流程设计" : activeView === "ai-workflow-design" ? "AI 流程设计" : activeView)}
            </span>
          </div>
          <div className="topbar-right">
            <span className="topbar-status">个人本地版</span>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
