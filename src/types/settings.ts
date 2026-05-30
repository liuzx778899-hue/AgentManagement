/**
 * App Settings type definition
 */
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  autoSave: boolean;
  editorFontSize: number;
  editorFontFamily: string;
  runner: {
    defaultTimeout: number;
    autoRestart: boolean;
  };
  git: {
    autoFetch: boolean;
    fetchInterval: number;
  };
  updatedAt?: string;
}
