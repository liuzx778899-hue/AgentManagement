import type { WorkbenchView, WorkbenchData } from "../domain/workbench";

export interface AiAction {
  id: string;
  label: string;
  description: string;
  applicablePages: WorkbenchView[];
  getCard: (context: ActionContext) => ActionCard | null;
}

export interface ActionContext {
  view: WorkbenchView;
  data: WorkbenchData;
}

export interface ActionCard {
  title: string;
  message: string;
  suggestions: string[];
  actionLabel: string;
  action: () => void;
}

export function checkMissingConfigs(ctx: ActionContext): string[] {
  const missing: string[] = [];
  if (ctx.view === "workflows") {
    const template = ctx.data.workflowTemplates[0];
    if (template) {
      const stepsWithoutMd = template.steps.filter((s) => !s.stepMarkdown?.trim());
      if (stepsWithoutMd.length > 0) {
        missing.push(`${stepsWithoutMd.length} 个步骤缺少规则 MD`);
      }
    }
    const rolesWithoutMd = ctx.data.roles.filter((r) => !r.roleMarkdown?.trim());
    if (rolesWithoutMd.length > 0) {
      missing.push(`${rolesWithoutMd.length} 个角色缺少 Prompt`);
    }
  }
  if (ctx.view === "project-workspace") {
    const project = ctx.data.projects[0];
    if (project && !project.projectMarkdown?.trim()) {
      missing.push("项目缺少上下文 MD");
    }
  }
  return missing;
}

export function AiActions(_props: { context: ActionContext; dispatch: (card: ActionCard) => void }) {
  return null;
}
