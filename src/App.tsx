import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { WorkbenchHome } from "./components/WorkbenchHome";
import { ProjectManagement } from "./components/ProjectManagement";
import { ProjectDetailPage } from "./components/ProjectDetailPage";
import { ProjectWorkspace } from "./components/ProjectWorkspace";
import { WorkflowBuilder } from "./components/WorkflowBuilder";
import { AiWorkflowDesign } from "./components/AiWorkflowDesign";
import { MemoryManager } from "./components/MemoryManager";
import { Settings } from "./components/Settings";
import { AiAssistant } from "./components/AiAssistant";
import { AiProjectBriefing } from "./components/AiProjectBriefing";
import { WorkflowManagementOverview } from "./components/WorkflowManagementOverview";
import { WorkbenchProvider, useWorkbenchState } from "./state";
import type { WorkbenchView } from "./domain/workbench";

// Re-export for backward compatibility
export { useWorkbenchState, WorkbenchProvider, WorkbenchContext } from "./state";

const workflowTemplateIdByAssetId: Record<string, string> = {
  "wf-001": "software-dev-v1",
  "wf-002": "design-review-v1",
  "wf-003": "bug-fix-v1",
};

function getHashView(): WorkbenchView {
  const hash = window.location.hash.replace("#", "").split("?")[0];
  const valid: WorkbenchView[] = ["workbench","project-management","project-workspace","project-detail","workflow-management","workflows","ai-workflow-design","memory","settings","ai-briefing"];
  return valid.includes(hash as WorkbenchView) ? (hash as WorkbenchView) : "workbench";
}

function AppContent() {
  const [view, setView] = useState<WorkbenchView>(getHashView);

  // Sync view to URL hash (preserve query params for sub-pages like workflows?mode=ai)
  useEffect(() => {
    const currentParams = window.location.hash.includes("?") ? "?" + window.location.hash.split("?")[1] : "";
    const newHash = "#" + view + currentParams;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", window.location.pathname + newHash);
    }
  }, [view]);

  // Listen for custom navigate events (used by child components)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.view) setView(e.detail.view as WorkbenchView);
    };
    window.addEventListener("navigate", handler as EventListener);
    return () => window.removeEventListener("navigate", handler as EventListener);
  }, []);
  const [workspaceProjectId, setWorkspaceProjectId] = useState<string | null>(null);
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);
  const [activeWorkbenchProjectId, setActiveWorkbenchProjectId] = useState<string | undefined>(undefined);
  const [selectedWorkflowTemplateId, setSelectedWorkflowTemplateId] = useState<string | undefined>(undefined);
  const { data, deleteWorkflowTemplate } = useWorkbenchState();
  const fallbackProjectId = data.projects[0]?.id;
  const resolvedDetailProjectId = detailProjectId ?? fallbackProjectId;

  const enterWorkbench = (pid: string) => {
    setActiveWorkbenchProjectId(pid);
    setView("workbench");
  };

  const enterWorkflowDesign = (workflowId: string) => {
    // workflowId is the template.id directly (from workflowTemplateToAsset)
    const templateId = data.workflowTemplates.find(t => t.id === workflowId)?.id ?? data.workflowTemplates[0]?.id;
    setSelectedWorkflowTemplateId(templateId);
    setView("workflows");
  };

  const contextMode = view === "workflows" ? "流程设计模式" : undefined;

  return (
    <>
      <AppShell activeView={view} onNavigate={setView}>
        {view === "workbench" && <WorkbenchHome data={data} onNavigate={setView} activeProjectId={activeWorkbenchProjectId} />}
        {view === "project-management" && (
          <ProjectManagement
            data={data}
            onEnterProject={(pid) => {
              setWorkspaceProjectId(pid);
              setView("project-workspace");
            }}
            onEnterDetail={(pid) => {
              setDetailProjectId(pid);
              setView("project-detail");
            }}
            onEnterWorkbench={(pid) => enterWorkbench(pid)}
            onAiBriefing={() => setView("ai-briefing")}
          />
        )}
        {view === "project-detail" && resolvedDetailProjectId && (
          <ProjectDetailPage
            data={data}
            projectId={resolvedDetailProjectId}
            onBack={() => setView("project-management")}
            onEnterWorkbench={(pid) => enterWorkbench(pid)}
          />
        )}
        {view === "project-workspace" && workspaceProjectId && (
          <ProjectWorkspace
            data={data}
            projectId={workspaceProjectId}
            onBack={() => setView("project-management")}
          />
        )}
        {view === "workflow-management" && (
          <WorkflowManagementOverview
            data={data}
            onNavigate={setView}
            onEnterWorkflowDesign={enterWorkflowDesign}
            onDeleteTemplate={deleteWorkflowTemplate}
          />
        )}
        {view === "workflows" && (
          <WorkflowBuilder
            data={data}
            selectedTemplateId={selectedWorkflowTemplateId}
            onBack={() => setView("workflow-management")}
          />
        )}
        {view === "ai-workflow-design" && <AiWorkflowDesign data={data} />}
        {view === "memory" && <MemoryManager data={data} />}
        {view === "settings" && <Settings data={data} />}
        {view === "ai-briefing" && (
          <AiProjectBriefing
            data={data}
            onBack={() => setView("project-management")}
          />
        )}
      </AppShell>
      <AiAssistant view={view} data={data} onNavigate={setView} contextMode={contextMode} />
    </>
  );
}

export function App() {
  return (
    <WorkbenchProvider>
      <AppContent />
    </WorkbenchProvider>
  );
}
