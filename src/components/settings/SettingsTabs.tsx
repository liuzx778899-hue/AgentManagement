import { Cpu, FolderCog, Key, MessageSquare, Puzzle, Terminal, UserCog } from "lucide-react";

export type SettingsTab = "user" | "project" | "models" | "capabilities" | "cli-runners" | "im-adapters" | "git-auth";

export interface SettingsTabConfig {
  key: SettingsTab;
  label: string;
  icon: typeof UserCog;
  desc: string;
}

export const settingsTabs: SettingsTabConfig[] = [
  { key: "user", label: "用户偏好", icon: UserCog, desc: "语言、模式和默认行为" },
  { key: "project", label: "项目设置", icon: FolderCog, desc: "命令、路径和风险策略" },
  { key: "models", label: "模型配置", icon: Cpu, desc: "供应商、模型和 API Key" },
  { key: "capabilities", label: "能力中心", icon: Puzzle, desc: "MCP、Skills、插件和 Agent" },
  { key: "cli-runners", label: "CLI Runner", icon: Terminal, desc: "Claude Code、Codex CLI 等" },
  { key: "im-adapters", label: "IM 适配器", icon: MessageSquare, desc: "飞书、钉钉、微信、Telegram" },
  { key: "git-auth", label: "Git 认证", icon: Key, desc: "GitHub、GitLab、Gitee" },
];
