export type RunnerKind = "claude-code" | "codex-cli" | "cursor-cli" | "gemini-cli" | "custom";

export interface RunnerProfile {
  id: string;
  kind: RunnerKind;
  displayName: string;
  command: string;
  defaultArgs?: string[];
  envVars?: Record<string, string>;
  description?: string;
  enabled: boolean;
}
