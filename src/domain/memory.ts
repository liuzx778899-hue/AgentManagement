export type MemoryKind = "project" | "role" | "task";
export type MemoryScope = "project" | "workflow" | "task" | "global";
export type MemoryStatus = "pending_confirmation" | "confirmed" | "reused" | "stale" | "expired";

export interface Memory {
  id: string;
  kind?: MemoryKind;
  type?: string;
  scope?: MemoryScope;
  status?: MemoryStatus;
  projectId?: string;
  roleId?: string | null;
  taskId?: string | null;
  title: string;
  content?: string;
  body?: string;
  citation?: { source: string; timestamp: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryItem {
  id: string;
  kind: MemoryKind;
  scope: MemoryScope;
  projectId: string;
  roleId: string | null;
  taskId: string | null;
  title: string;
  body: string;
  citation: { source: string; timestamp: string }[];
  createdAt: string;
  updatedAt: string;
}