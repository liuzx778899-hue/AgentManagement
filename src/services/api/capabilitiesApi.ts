/**
 * Capabilities API - MCP Servers, Skills, Plugins, Agents
 */
import { apiCall, type ApiResponse } from './client';
import type { McpServerCapability, SkillCapability, PluginCapability, AgentCapability } from '../../domain/workbench';

export interface CapabilitiesData {
  mcpServers: McpServerCapability[];
  skills: SkillCapability[];
  plugins: PluginCapability[];
  agents: AgentCapability[];
}

export const capabilitiesApi = {
  /**
   * Get all capabilities in one request
   */
  async getAll(): Promise<ApiResponse<CapabilitiesData>> {
    return apiCall<CapabilitiesData>('GET', '/capabilities/all');
  },

  /**
   * Get MCP servers
   */
  async getMcpServers(): Promise<ApiResponse<McpServerCapability[]>> {
    return apiCall<McpServerCapability[]>('GET', '/capabilities/mcp-servers');
  },

  /**
   * Get skills
   */
  async getSkills(): Promise<ApiResponse<SkillCapability[]>> {
    return apiCall<SkillCapability[]>('GET', '/capabilities/skills');
  },

  /**
   * Get plugins
   */
  async getPlugins(): Promise<ApiResponse<PluginCapability[]>> {
    return apiCall<PluginCapability[]>('GET', '/capabilities/plugins');
  },

  /**
   * Get agents
   */
  async getAgents(): Promise<ApiResponse<AgentCapability[]>> {
    return apiCall<AgentCapability[]>('GET', '/capabilities/agents');
  },
};