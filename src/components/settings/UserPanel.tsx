import { IconBadge } from "../IconBadge";
import { UserCog } from "lucide-react";

export function UserPanel() {
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
              <select defaultValue="zh-CN">
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
      </div>
    </div>
  );
}
