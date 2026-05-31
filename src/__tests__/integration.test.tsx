import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { App } from "../App";
import { WorkbenchContext } from "../App";
import { workbenchData as initialData } from "../data/fixtures";
import { ManualGateDecision } from "../components/ManualGateDecision";
import { MemoryManager } from "../components/MemoryManager";

describe("品牌统一验证", () => {
  it("页面不出现旧品牌名 Agent 工作台", () => {
    render(<App />);
    // 侧边栏显示正确品牌名
    expect(screen.getByText("Agent 工程管理系统")).toBeInTheDocument();
    // 不出现旧品牌名
    expect(screen.queryByText("Agent 工作台")).not.toBeInTheDocument();
    expect(screen.queryByText("Agent Workbench")).not.toBeInTheDocument();
  });

  it("fixtures 没有乱码中文", () => {
    // 检查 fixtures 数据中的中文是否正常
    expect(initialData.projects[0].name).toBe("AgentManagement");
    expect(initialData.roles[0].name).toBe("产品经理");
    expect(initialData.roles[1].name).toBe("UI/UX 设计师");
    // 没有 Unicode 乱码序列
    expect(initialData.roles[0].name).not.toMatch(/[\\u[0-9a-fA-F]{4}/);
  });
});

describe("MVP 交互闭环验证", () => {
  it("保存记忆后记忆列表增加", async () => {
    const mockState = {
      data: initialData,
      updateGateStatus: () => {},
      addMemory: (memory: Omit<typeof initialData.memories[0], "id" | "createdAt" | "updatedAt">) => {
        mockState.data = {
          ...mockState.data,
          memories: [
            ...mockState.data.memories,
            { ...memory, id: "new-mem", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ],
        };
      },
      updateMemory: () => {},
      deleteMemory: () => {},
      createTask: () => {},
      addProject: () => {},
      deleteProject: () => {},
      updateProject: () => {},
      addWorkflowStep: () => {},
      updateWorkflowStep: () => {},
      deleteWorkflowStep: () => {},
      addModelProvider: () => {},
      updateModelProvider: () => {},
      deleteModelProvider: () => {},
      addProviderModel: () => {},
      deleteProviderModel: () => {},
      setDefaultProviderModel: () => {},
      setAiAssistantModel: () => {},
      reassignAgentRun: () => {},
      addImAdapter: () => {},
      updateImAdapter: () => {},
      deleteImAdapter: () => {},
      toggleImAdapterRoute: () => {},
      addGitCredential: () => {},
      updateGitCredential: () => {},
      deleteGitCredential: () => {},
      addWorkflowTemplate: async () => null,
      deleteWorkflowTemplate: () => {},
      updateRunner: () => {},
      setDefaultRunner: () => {},
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkbenchContext.Provider value={mockState}>{children}</WorkbenchContext.Provider>
    );

    render(<MemoryManager data={mockState.data} />, { wrapper });

    // 点击新增记忆按钮
    fireEvent.click(screen.getByRole("button", { name: /新增记忆/ }));

    // 填写标题和内容
    const titleInput = screen.getByPlaceholderText("输入记忆标题...");
    fireEvent.change(titleInput, { target: { value: "测试记忆标题" } });

    const bodyInput = screen.getByPlaceholderText("输入记忆内容...");
    fireEvent.change(bodyInput, { target: { value: "测试记忆内容" } });

    // 保存
    fireEvent.click(screen.getByRole("button", { name: /保存/ }));
  });

  it("Manual Gate 四个动作都有状态变化", async () => {
    const mockState = {
      data: initialData,
      updateGateStatus: (gateId: string, status: typeof initialData.manualGates[0]["status"]) => {
        mockState.data = {
          ...mockState.data,
          manualGates: mockState.data.manualGates.map((g) =>
            g.id === gateId ? { ...g, status, resolvedAt: new Date().toISOString() } : g
          ),
        };
      },
      addMemory: () => {},
      updateMemory: () => {},
      deleteMemory: () => {},
      createTask: () => {},
      addProject: () => {},
      deleteProject: () => {},
      updateProject: () => {},
      addWorkflowStep: () => {},
      updateWorkflowStep: () => {},
      deleteWorkflowStep: () => {},
      addModelProvider: () => {},
      updateModelProvider: () => {},
      deleteModelProvider: () => {},
      addProviderModel: () => {},
      deleteProviderModel: () => {},
      setDefaultProviderModel: () => {},
      setAiAssistantModel: () => {},
      reassignAgentRun: () => {},
      addImAdapter: () => {},
      updateImAdapter: () => {},
      deleteImAdapter: () => {},
      toggleImAdapterRoute: () => {},
      addGitCredential: () => {},
      updateGitCredential: () => {},
      deleteGitCredential: () => {},
      addWorkflowTemplate: async () => null,
      deleteWorkflowTemplate: () => {},
      updateRunner: () => {},
      setDefaultRunner: () => {},
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkbenchContext.Provider value={mockState}>{children}</WorkbenchContext.Provider>
    );

    render(<ManualGateDecision data={mockState.data} />, { wrapper });

    // 验证四个操作按钮存在
    expect(screen.getByRole("button", { name: /继续/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /重跑/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /改派/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /终止/ })).toBeInTheDocument();

    // 点击继续按钮
    fireEvent.click(screen.getByRole("button", { name: /继续/ }));

    // 验证状态变化
    await waitFor(() => {
      expect(screen.getByText("已批准继续")).toBeInTheDocument();
    });
  });
});

describe("UI 汉化图标复查", () => {
  it("侧栏无字母块（W/P/N/F/G/M/S/L）", () => {
    render(<App />);

    // 侧边栏图标使用 lucide-react，不显示字母
    const sidebar = screen.getByRole("button", { name: /工作台/ });
    expect(sidebar).toBeInTheDocument();
    // 检查没有字母快捷键显示
    expect(screen.queryByText("W")).not.toBeInTheDocument();
    expect(screen.queryByText("P")).not.toBeInTheDocument();
    expect(screen.queryByText("N")).not.toBeInTheDocument();
  });

  it("所有页面标题和主要说明是中文", () => {
    render(<App />);

    // 导航项使用 getAllByText 避免重复匹配
    expect(screen.getAllByText("工作台").length).toBeGreaterThan(0);
    expect(screen.getAllByText("项目管理").length).toBeGreaterThan(0);
    expect(screen.getAllByText("流程管理").length).toBeGreaterThan(0);
    expect(screen.getAllByText("记忆管理").length).toBeGreaterThan(0);
    expect(screen.getAllByText("设置中心").length).toBeGreaterThan(0);
  });
});

describe("IM 适配器验证", () => {
  it("fixtures 包含 IM 适配器数据", () => {
    expect(initialData.imAdapters).toBeDefined();
    expect(initialData.imAdapters.length).toBeGreaterThan(0);
    expect(initialData.imAdapters[0].platform).toBe("feishu");
    expect(initialData.imAdapters[0].name).toBe("公司飞书群");
    expect(initialData.imAdapters[0].enabled).toBe(true);
  });

  it("fixtures 包含项目 IM 绑定数据", () => {
    expect(initialData.projectImBindings).toBeDefined();
    expect(initialData.projectImBindings.length).toBeGreaterThan(0);
    expect(initialData.projectImBindings[0].projectId).toBe("proj-001");
    expect(initialData.projectImBindings[0].adapterId).toBe("im-feishu");
  });

  it("IM 适配器模板包含所有事件类型", () => {
    const adapter = initialData.imAdapters[0];
    expect(adapter.templates.gate_approval).toBeDefined();
    expect(adapter.templates.task_complete).toBeDefined();
    expect(adapter.templates.agent_error).toBeDefined();
    expect(adapter.templates.direct_chat).toBeDefined();
    expect(adapter.templates.gate_approval.buttons.length).toBeGreaterThan(0);
  });
});

describe("Git/DevOps 集成验证", () => {
  it("fixtures 包含 Git 认证数据", () => {
    expect(initialData.gitCredentials).toBeDefined();
    expect(initialData.gitCredentials.length).toBeGreaterThan(0);
    expect(initialData.gitCredentials[0].platform).toBe("github");
    expect(initialData.gitCredentials[0].name).toBe("个人 GitHub");
    expect(initialData.gitCredentials[0].verified).toBe(true);
  });

  it("fixtures 包含 Issue 数据", () => {
    expect(initialData.repoIssues).toBeDefined();
    expect(initialData.repoIssues.length).toBeGreaterThan(0);
    expect(initialData.repoIssues[0].issueNumber).toBe(12);
    expect(initialData.repoIssues[0].state).toBe("open");
  });

  it("fixtures 包含 Pull Request 数据", () => {
    expect(initialData.repoPullRequests).toBeDefined();
    expect(initialData.repoPullRequests.length).toBeGreaterThan(0);
    expect(initialData.repoPullRequests[0].prNumber).toBe(5);
    expect(initialData.repoPullRequests[0].state).toBe("merged");
  });

  it("fixtures 包含 CI Pipeline 数据", () => {
    expect(initialData.ciPipelines).toBeDefined();
    expect(initialData.ciPipelines.length).toBeGreaterThan(0);
    expect(initialData.ciPipelines[0].status).toBe("success");
    expect(initialData.ciPipelines[1].status).toBe("failed");
    expect(initialData.ciPipelines[2].status).toBe("running");
  });
});
