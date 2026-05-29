import type { MemoryKind } from "./memory";

export interface EngineeringFeedback {
  diff: { file: string; patch: string }[];
  testResults: { passed: number; failed: number; output: string };
  previewUrl: string | null;
  artifactPath: string | null;
  log: string[];
  memorySuggestion: { kind: MemoryKind; title: string; body: string } | null;
  permissionRecord: { tool: string; scope: string; count: number }[];
  commitReady: boolean;
}