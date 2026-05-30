export type GateMode = "auto" | "manual";
export type FailureStrategy = "stop" | "skip" | "retry" | "fallback";

export interface WorkflowVersion {
  label: "draft" | "applied" | "changed";
  version: number;
  updatedAt: string;
  changedSteps?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: 'active' | 'archived' | 'draft';
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  version: number;
  status?: "enabled" | "disabled" | "draft";
  steps: WorkflowStep[];
  workflowMarkdown?: string;
  versions?: WorkflowVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  roleId: string;
  modelProviderId: string;
  modelName: string;
  inputs: string[];
  outputs: string[];
  gateMode: GateMode;
  gateType?: 'manual' | 'auto';
  failureStrategy: FailureStrategy;
  stepMarkdown?: string;
  projectOverride: boolean;
  runnerId?: string;
}