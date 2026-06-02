import { IconBadge } from "../IconBadge";
import { UserCog } from "lucide-react";
import type { AppSettings } from "../../types/settings";

interface UserPanelProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
}

export function UserPanel({ settings, onUpdate }: UserPanelProps) {
  return (
    <div className="settings-panel">
      <div className="panel-header">
        <div className="panel-title">
          <IconBadge icon={UserCog} label="用户偏好" />
          <h3>用户偏好</h3>
        </div>
        <span className="badge green">个人模式</span>
      </div>
      <div className="panel-body">
        <div className="settings-section">
          <div className="settings-section-title">通用</div>
          <div className="form-grid">
            <div className="form-field">
              <label>默认使用模式</label>
              <select defaultValue="personal">
                <option value="personal">个人本地模式</option>
                <option value="team">团队协作模式（后续）</option>
              </select>
            </div>
            <div className="form-field">
              <label>界面语言</label>
              <select
                value={settings.language}
                onChange={(e) => onUpdate({ language: e.target.value })}
              >
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-section-title">开发环境</div>
          <div className="form-grid">
            <div className="form-field">
              <label>默认 worktree 根目录</label>
              <input defaultValue="D:\\agent-worktrees" />
            </div>
            <div className="form-field">
              <label>高风险步骤默认 Gate</label>
              <select defaultValue="manual">
                <option value="manual">人工确认后继续</option>
                <option value="auto">自动继续并通知</option>
              </select>
            </div>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-section-title">编辑器</div>
          <div className="form-grid">
            <div className="form-field">
              <label>字体大小</label>
              <input
                type="number"
                value={settings.editorFontSize}
                onChange={(e) => onUpdate({ editorFontSize: Number(e.target.value) })}
              />
            </div>
            <div className="form-field">
              <label>字体族</label>
              <input
                value={settings.editorFontFamily}
                onChange={(e) => onUpdate({ editorFontFamily: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-section-title">行为</div>
          <div className="form-grid">
            <div className="form-field">
              <label>主题</label>
              <select
                value={settings.theme}
                onChange={(e) => onUpdate({ theme: e.target.value as AppSettings['theme'] })}
              >
                <option value="system">跟随系统</option>
                <option value="dark">深色</option>
                <option value="light">浅色</option>
              </select>
            </div>
            <div className="form-field">
              <label>自动保存</label>
              <select
                value={settings.autoSave ? 'yes' : 'no'}
                onChange={(e) => onUpdate({ autoSave: e.target.value === 'yes' })}
              >
                <option value="yes">开启</option>
                <option value="no">关闭</option>
              </select>
            </div>
            <div className="form-field">
              <label>通知</label>
              <select
                value={settings.notifications ? 'yes' : 'no'}
                onChange={(e) => onUpdate({ notifications: e.target.value === 'yes' })}
              >
                <option value="yes">开启</option>
                <option value="no">关闭</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
