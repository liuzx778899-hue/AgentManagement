export type CapabilitySource = "built-in" | "project" | "user" | "plugin";
export type CapabilityStatus = "enabled" | "disabled" | "missing-config" | "error";

export interface McpServerCapability {
  id: string;
  name: string;
  source: CapabilitySource;
  status: CapabilityStatus;
  transport: "stdio" | "http" | "sse";
  toolCount: number;
  resourceCount: number;
  requiredEnv: string[];
  usedByRoleIds: string[];
  usedByWorkflowStepIds: string[];
}

export interface SkillCapability {
  id: string;
  name: string;
  source: CapabilitySource;
  status: CapabilityStatus;
  description: string;
  triggerRules: string[];
  requiredToolIds: string[];
  recommendedRoleIds: string[];
  pluginId: string | null;
}

export interface PluginCapability {
  id: string;
  name: string;
  version: string;
  source: CapabilitySource;
  status: CapabilityStatus;
  includedSkillIds: string[];
  includedMcpIds: string[];
  permissions: string[];
}

export interface AgentCapability {
  id: string;
  name: string;
  source: CapabilitySource;
  status: CapabilityStatus;
  description: string;
  modelProvider: string;
  modelName: string;
  reasoningLevel: string;
  toolIds: string[];
  mcpIds: string[];
  skillIds: string[];
  pluginIds: string[];
  roleIds: string[];
}

export interface CapabilityPack {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requiredGrants: string[];
}