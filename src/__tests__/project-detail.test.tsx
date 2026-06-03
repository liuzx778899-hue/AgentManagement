import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ProjectDetailPage } from "../components/ProjectDetailPage";
import { workbenchData } from "../data/fixtures";

function renderProjectDetail() {
  render(
    <ProjectDetailPage
      data={workbenchData}
      projectId="proj-001"
      onBack={vi.fn()}
      onEnterWorkbench={vi.fn()}
    />,
  );
}

describe("ProjectDetailPage tabs", () => {
  it("keeps the persistent detail panel aligned with the mockup shell", () => {
    renderProjectDetail();

    expect(document.querySelector(".project-detail-page")).toBeInTheDocument();
    expect(document.querySelector(".pd-drawer")).toBeInTheDocument();
    expect(screen.getByText("详情面板")).toBeInTheDocument();
    expect(screen.getByText("当前任务")).toBeInTheDocument();
  });

  it("renders the mockup-style risk decision tab", () => {
    renderProjectDetail();

    fireEvent.click(screen.getByRole("tab", { name: "风险与决策" }));

    expect(screen.getByText("风险与决策 · SWOT 分析")).toBeInTheDocument();
    expect(screen.getByText("S 优势")).toBeInTheDocument();
    expect(screen.getByText("W 劣势")).toBeInTheDocument();
    expect(screen.getByText("O 机会")).toBeInTheDocument();
    expect(screen.getByText("T 威胁")).toBeInTheDocument();
    expect(screen.getByText("风险矩阵")).toBeInTheDocument();
    expect(screen.getByText("待决策 Gate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "进入决策" })).toBeInTheDocument();
  });

  it("renders the mockup-style roles and workflow tab", () => {
    renderProjectDetail();

    fireEvent.click(screen.getByRole("tab", { name: "角色与流程" }));

    expect(screen.getByText("角色与流程")).toBeInTheDocument();
    expect(screen.getByText("项目角色池")).toBeInTheDocument();
    expect(screen.getByText("流程绑定关系")).toBeInTheDocument();
    expect(document.querySelectorAll(".pd-role-card-inline")).toHaveLength(5);
    expect(document.querySelectorAll(".pd-step-card")).toHaveLength(5);
  });

  it("renders the mockup-style collaboration files tab", () => {
    renderProjectDetail();

    fireEvent.click(screen.getByRole("tab", { name: "协同文件" }));

    // 协同文件功能正在开发中，目前只显示占位内容
    expect(screen.getAllByText("协同文件")).toHaveLength(2);
    expect(screen.getByText("暂无协同文件")).toBeInTheDocument();
  });
});
