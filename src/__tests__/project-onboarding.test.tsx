import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { App } from "../App";

describe("Project onboarding overlays", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders existing project import as a three-step scan-detect-confirm flow", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "项目管理" }));
    fireEvent.click(screen.getAllByRole("button", { name: /导入已有项目/ })[0]);

    expect(screen.getByText("01 扫描路径")).toBeInTheDocument();
    expect(screen.getByText("02 检测结果")).toBeInTheDocument();
    expect(screen.getByText("03 确认导入")).toBeInTheDocument();
  });

  it("lets new projects select a workflow without manually choosing roles", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "项目管理" }));
    fireEvent.click(screen.getAllByRole("button", { name: /新建项目/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: /选择流程/ }));

    expect(screen.queryByRole("button", { name: /角色池与流程绑定/ })).not.toBeInTheDocument();
    expect(screen.queryByText("使用默认角色池")).not.toBeInTheDocument();
    expect(screen.getByText("选择此流程")).toBeInTheDocument();
    expect(screen.getByText("流程步骤")).toBeInTheDocument();
  });

  it("uses the import supplement tech stack field and exposes selectable Skill and MCP options", async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "项目管理" }));
    fireEvent.click(screen.getAllByRole("button", { name: /导入已有项目/ })[0]);
    fireEvent.change(screen.getByPlaceholderText(/输入或粘贴仓库路径/), {
      target: { value: "D:/work/react-vite-app" },
    });
    fireEvent.click(screen.getByRole("button", { name: /开始检测/ }));

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByLabelText("技术栈")).toHaveValue("Vite + React + TypeScript");
    expect(screen.queryByText("技术栈与命令")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /配置能力授权/ })).toBeInTheDocument();
    expect(document.querySelector(".import-panel .capability-grid")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /配置能力授权/ }));

    expect(screen.getByRole("heading", { level: 2, name: "能力授权" })).toBeInTheDocument();
    expect(document.querySelector(".import-capability-content")?.classList.contains("wizard-step-content")).toBe(true);
    expect(screen.getByText("Plugins")).toBeInTheDocument();
    expect(screen.getByText("Superpowers")).toBeInTheDocument();
    expect(document.querySelector(".import-capability-modal .capability-grid .cap-item.selected")).toBeInTheDocument();
    expect(document.querySelector(".import-capability-modal .cap-select-btn.selected")).toHaveTextContent("已选择");
    expect(document.querySelector(".import-panel .capability-select-chip")).not.toBeInTheDocument();
  });

  it("keeps project creation actions only in the toolbar", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "项目管理" }));

    expect(screen.queryByText("新建空白项目")).not.toBeInTheDocument();
    expect(screen.queryByText("AI 方案立项")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "项目组合看板" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /新建项目/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /导入已有项目/ })).toHaveLength(1);
  });
});
