export type GateStatus = "waiting" | "approved" | "rejected" | "rerun" | "reassign" | "terminate";

export interface ManualGate {
  id: string;
  taskId: string;
  runId: string;
  stepId: string;
  status: GateStatus;
  summary: string;
  diffEvidence: string[];
  testEvidence: string[];
  previewEvidence: string[];
  logSummary: string;
  permissionUsage: string[];
  memorySuggestion: string | null;
  createdAt: string;
  resolvedAt: string | null;
}