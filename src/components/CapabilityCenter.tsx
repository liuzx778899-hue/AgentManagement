import { useMemo, useState } from "react";
import { AgentCapability, McpServerCapability, PluginCapability, SkillCapability } from "../domain/workbench";
import { IconBadge } from "./IconBadge";
import { Bot, ChevronRight, Package, Plug, Puzzle, Search, Server, Zap } from "lucide-react";

type CapabilityTab = "mcp" | "skills" | "plugins" | "agents";

interface CapabilityCenterProps {
  mcpServers: McpServerCapability[];
  skills: SkillCapability[];
  plugins: PluginCapability[];
  agents: AgentCapability[];
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="stat-card">
      <span className={`stat-value ${color}`}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function CapabilitySourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    "built-in": "blue",
    project: "violet",
    user: "green",
    plugin: "orange",
  };
  const labels: Record<string, string> = {
    "built-in": "内置",
    project: "项目",
    user: "用户",
    plugin: "插件",
  };
  return <span className={`badge ${colors[source] ?? ""}`}>{labels[source] ?? source}</span>;
}

function CapabilityStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    enabled: "green",
    disabled: "",
    "missing-config": "orange",
    error: "red",
  };
  const labels: Record<string, string> = {
    enabled: "已启用",
    disabled: "已禁用",
    "missing-config": "缺配置",
    error: "异常",
  };
  return <span className={`badge ${colors[status] ?? ""}`}>{labels[status] ?? status}</span>;
}

export function CapabilityCenter({ mcpServers, skills, plugins, agents }: CapabilityCenterProps) {
  const [activeTab, setActiveTab] = useState<CapabilityTab>("mcp");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tabs = [
    { key: "mcp" as const, label: "MCP", icon: Server },
    { key: "skills" as const, label: "Skills", icon: Zap },
    { key: "plugins" as const, label: "Plugins", icon: Package },
    { key: "agents" as const, label: "Agents", icon: Bot },
  ];

  // Stats
  const mcpStats = useMemo(
    () => ({
      total: mcpServers.length,
      enabled: mcpServers.filter((m) => m.status === "enabled").length,
      sources: new Set(mcpServers.map((m) => m.source)).size,
      issues: mcpServers.filter((m) => m.status === "error" || m.status === "missing-config").length,
    }),
    [mcpServers]
  );

  const skillStats = useMemo(
    () => ({
      total: skills.length,
      enabled: skills.filter((s) => s.status === "enabled").length,
      sources: new Set(skills.map((s) => s.source)).size,
      issues: skills.filter((s) => s.status === "error" || s.status === "missing-config").length,
    }),
    [skills]
  );

  const pluginStats = useMemo(
    () => ({
      total: plugins.length,
      enabled: plugins.filter((p) => p.status === "enabled").length,
      sources: new Set(plugins.map((p) => p.source)).size,
      issues: plugins.filter((p) => p.status === "error" || p.status === "missing-config").length,
    }),
    [plugins]
  );

  const agentStats = useMemo(
    () => ({
      total: agents.length,
      enabled: agents.filter((a) => a.status === "enabled").length,
      sources: new Set(agents.map((a) => a.source)).size,
      issues: agents.filter((a) => a.status === "error" || a.status === "missing-config").length,
    }),
    [agents]
  );

  const currentStats = useMemo(() => {
    switch (activeTab) {
      case "mcp":
        return mcpStats;
      case "skills":
        return skillStats;
      case "plugins":
        return pluginStats;
      case "agents":
        return agentStats;
    }
  }, [activeTab, mcpStats, skillStats, pluginStats, agentStats]);

  const filteredMcp = useMemo(
    () => mcpServers.filter((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [mcpServers, searchTerm]
  );

  const filteredSkills = useMemo(
    () => skills.filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [skills, searchTerm]
  );

  const filteredPlugins = useMemo(
    () => plugins.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [plugins, searchTerm]
  );

  const filteredAgents = useMemo(
    () => agents.filter((a) => a.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [agents, searchTerm]
  );

  const selectedMcp = useMemo(() => mcpServers.find((m) => m.id === selectedId), [mcpServers, selectedId]);

  const selectedSkill = useMemo(() => skills.find((s) => s.id === selectedId), [skills, selectedId]);

  const selectedPlugin = useMemo(() => plugins.find((p) => p.id === selectedId), [plugins, selectedId]);

  const selectedAgent = useMemo(() => agents.find((a) => a.id === selectedId), [agents, selectedId]);

  return (
    <div className="capability-center">
      <header className="cap-header">
        <div className="cap-title">
          <IconBadge icon={Puzzle} label="能力中心" />
          <div>
            <h2>能力中心</h2>
            <span>管理系统可调度的 MCP、Skills、Plugins 和 Agents。</span>
          </div>
        </div>
      </header>

      <div className="tab-group">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`tab${activeTab === tab.key ? " active" : ""}`}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedId(null);
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="cap-stats">
        <StatCard label="总数" value={currentStats.total} color="blue" />
        <StatCard label="已启用" value={currentStats.enabled} color="green" />
        <StatCard label="来源类型" value={currentStats.sources} color="violet" />
        <StatCard label="需关注" value={currentStats.issues} color="orange" />
      </div>

      <div className="cap-search">
        <Search size={14} />
        <input placeholder="搜索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="cap-content">
        <div className="cap-list">
          {activeTab === "mcp" &&
            filteredMcp.map((mcp) => (
              <button
                key={mcp.id}
                className={`cap-item${selectedId === mcp.id ? " selected" : ""}`}
                onClick={() => setSelectedId(mcp.id)}
              >
                <div className="item-left">
                  <Plug size={16} className="item-icon" />
                  <div className="item-info">
                    <strong>{mcp.name}</strong>
                    <div className="item-badges">
                      <CapabilitySourceBadge source={mcp.source} />
                      <CapabilityStatusBadge status={mcp.status} />
                    </div>
                  </div>
                </div>
                <div className="item-right">
                  <span className="badge">{mcp.toolCount} 个工具</span>
                  <ChevronRight size={14} />
                </div>
              </button>
            ))}

          {activeTab === "skills" &&
            filteredSkills.map((skill) => (
              <button
                key={skill.id}
                className={`cap-item${selectedId === skill.id ? " selected" : ""}`}
                onClick={() => setSelectedId(skill.id)}
              >
                <div className="item-left">
                  <Zap size={16} className="item-icon" />
                  <div className="item-info">
                    <strong>{skill.name}</strong>
                    <div className="item-badges">
                      <CapabilitySourceBadge source={skill.source} />
                      <CapabilityStatusBadge status={skill.status} />
                      {skill.pluginId && <span className="badge violet">{skill.pluginId}</span>}
                    </div>
                  </div>
                </div>
                <div className="item-right">
                  <ChevronRight size={14} />
                </div>
              </button>
            ))}

          {activeTab === "plugins" &&
            filteredPlugins.map((plugin) => (
              <button
                key={plugin.id}
                className={`cap-item${selectedId === plugin.id ? " selected" : ""}`}
                onClick={() => setSelectedId(plugin.id)}
              >
                <div className="item-left">
                  <Package size={16} className="item-icon" />
                  <div className="item-info">
                    <strong>{plugin.name}</strong>
                    <div className="item-badges">
                      <span className="badge blue">v{plugin.version}</span>
                      <CapabilitySourceBadge source={plugin.source} />
                      <CapabilityStatusBadge status={plugin.status} />
                    </div>
                  </div>
                </div>
                <div className="item-right">
                  <span className="badge">{plugin.includedSkillIds.length + plugin.includedMcpIds.length} 项能力</span>
                  <ChevronRight size={14} />
                </div>
              </button>
            ))}

          {activeTab === "agents" &&
            filteredAgents.map((agent) => (
              <button
                key={agent.id}
                className={`cap-item${selectedId === agent.id ? " selected" : ""}`}
                onClick={() => setSelectedId(agent.id)}
              >
                <div className="item-left">
                  <Bot size={16} className="item-icon" />
                  <div className="item-info">
                    <strong>{agent.name}</strong>
                    <div className="item-badges">
                      <span className="badge blue">
                        {agent.modelProvider}/{agent.modelName}
                      </span>
                      <CapabilitySourceBadge source={agent.source} />
                      <CapabilityStatusBadge status={agent.status} />
                    </div>
                  </div>
                </div>
                <div className="item-right">
                  <span className="badge">{agent.toolIds.length} 个工具</span>
                  <span className="badge violet">{agent.skillIds.length} 个技能</span>
                  <ChevronRight size={14} />
                </div>
              </button>
            ))}
        </div>

        {selectedId && (
          <div className="cap-detail">
            {activeTab === "mcp" && selectedMcp && (
              <div className="detail-panel">
                <h3>{selectedMcp.name}</h3>
                <div className="detail-section">
                  <label>来源</label>
                  <CapabilitySourceBadge source={selectedMcp.source} />
                </div>
                <div className="detail-section">
                  <label>状态</label>
                  <CapabilityStatusBadge status={selectedMcp.status} />
                </div>
                <div className="detail-section">
                  <label>传输类型</label>
                  <code>{selectedMcp.transport}</code>
                </div>
                <div className="detail-section">
                  <label>工具数量</label>
                  <span className="badge blue">{selectedMcp.toolCount}</span>
                </div>
                <div className="detail-section">
                  <label>资源数量</label>
                  <span className="badge">{selectedMcp.resourceCount}</span>
                </div>
                {selectedMcp.requiredEnv.length > 0 && (
                  <div className="detail-section">
                    <label>必需环境变量</label>
                    <div className="badge-row">
                      {selectedMcp.requiredEnv.map((e) => (
                        <span key={e} className="badge orange">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedMcp.usedByRoleIds.length > 0 && (
                  <div className="detail-section">
                    <label>被角色使用</label>
                    <div className="badge-row">
                      {selectedMcp.usedByRoleIds.map((r) => (
                        <span key={r} className="badge violet">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "skills" && selectedSkill && (
              <div className="detail-panel">
                <h3>{selectedSkill.name}</h3>
                <p className="detail-desc">{selectedSkill.description}</p>
                <div className="detail-section">
                  <label>来源</label>
                  <CapabilitySourceBadge source={selectedSkill.source} />
                </div>
                <div className="detail-section">
                  <label>状态</label>
                  <CapabilityStatusBadge status={selectedSkill.status} />
                </div>
                {selectedSkill.pluginId && (
                  <div className="detail-section">
                    <label>所属插件</label>
                    <span className="badge violet">{selectedSkill.pluginId}</span>
                  </div>
                )}
                {selectedSkill.requiredToolIds.length > 0 && (
                  <div className="detail-section">
                    <label>依赖工具</label>
                    <div className="badge-row">
                      {selectedSkill.requiredToolIds.map((t) => (
                        <span key={t} className="badge">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedSkill.recommendedRoleIds.length > 0 && (
                  <div className="detail-section">
                    <label>推荐角色</label>
                    <div className="badge-row">
                      {selectedSkill.recommendedRoleIds.map((r) => (
                        <span key={r} className="badge violet">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "plugins" && selectedPlugin && (
              <div className="detail-panel">
                <h3>{selectedPlugin.name}</h3>
                <div className="detail-section">
                  <label>版本</label>
                  <span className="badge blue">v{selectedPlugin.version}</span>
                </div>
                <div className="detail-section">
                  <label>来源</label>
                  <CapabilitySourceBadge source={selectedPlugin.source} />
                </div>
                <div className="detail-section">
                  <label>状态</label>
                  <CapabilityStatusBadge status={selectedPlugin.status} />
                </div>
                {selectedPlugin.includedSkillIds.length > 0 && (
                  <div className="detail-section">
                    <label>包含技能</label>
                    <div className="badge-row">
                      {selectedPlugin.includedSkillIds.map((s) => (
                        <span key={s} className="badge violet">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedPlugin.includedMcpIds.length > 0 && (
                  <div className="detail-section">
                    <label>包含 MCP</label>
                    <div className="badge-row">
                      {selectedPlugin.includedMcpIds.map((m) => (
                        <span key={m} className="badge">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="detail-section">
                  <label>权限声明</label>
                  <div className="badge-row">
                    {selectedPlugin.permissions.map((p) => (
                      <span key={p} className="badge orange">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "agents" && selectedAgent && (
              <div className="detail-panel">
                <h3>{selectedAgent.name}</h3>
                <p className="detail-desc">{selectedAgent.description}</p>
                <div className="detail-section">
                  <label>模型</label>
                  <div className="badge-row">
                    <span className="badge blue">{selectedAgent.modelProvider}</span>
                    <span className="badge violet">{selectedAgent.modelName}</span>
                    <span className="badge">{selectedAgent.reasoningLevel}</span>
                  </div>
                </div>
                <div className="detail-section">
                  <label>来源</label>
                  <CapabilitySourceBadge source={selectedAgent.source} />
                </div>
                <div className="detail-section">
                  <label>状态</label>
                  <CapabilityStatusBadge status={selectedAgent.status} />
                </div>
                {selectedAgent.mcpIds.length > 0 && (
                  <div className="detail-section">
                    <label>可用 MCP</label>
                    <div className="badge-row">
                      {selectedAgent.mcpIds.map((m) => (
                        <span key={m} className="badge">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedAgent.skillIds.length > 0 && (
                  <div className="detail-section">
                    <label>绑定技能</label>
                    <div className="badge-row">
                      {selectedAgent.skillIds.map((s) => (
                        <span key={s} className="badge violet">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedAgent.pluginIds.length > 0 && (
                  <div className="detail-section">
                    <label>依赖插件</label>
                    <div className="badge-row">
                      {selectedAgent.pluginIds.map((p) => (
                        <span key={p} className="badge orange">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedAgent.roleIds.length > 0 && (
                  <div className="detail-section">
                    <label>绑定角色</label>
                    <div className="badge-row">
                      {selectedAgent.roleIds.map((r) => (
                        <span key={r} className="badge violet">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
