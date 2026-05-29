export type ImPlatform = "wechat" | "dingtalk" | "telegram" | "feishu";
export type ImEventType = "gate_approval" | "task_complete" | "agent_error" | "direct_chat";

export interface ImMessageTemplate {
  title: string;
  body: string;
  buttons: string[];
}

export interface ImRouteRule {
  eventType: ImEventType;
  enabled: boolean;
  targetRoleIds: string[];
  requireResponse: boolean;
}

export interface ImAdapter {
  id: string;
  name: string;
  platform: ImPlatform;
  enabled: boolean;
  webhookUrl: string;
  appId: string;
  appSecret: string;
  verifyToken: string;
  templates: Record<ImEventType, ImMessageTemplate>;
  routeRules: ImRouteRule[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectImBinding {
  projectId: string;
  adapterId: string;
  enabled: boolean;
  overrideTemplates: Partial<Record<ImEventType, ImMessageTemplate>>;
}