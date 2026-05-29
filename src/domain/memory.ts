export type MemoryKind = "project" | "role" | "task";
export type MemoryScope = "project" | "workflow" | "task" | "global";

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