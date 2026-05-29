export interface AgentRole {
  id: string;
  projectId: string | null;
  name: string;
  description: string;
  roleMarkdown?: string;
  isBuiltIn: boolean;
  defaultCapabilities: string[];
}