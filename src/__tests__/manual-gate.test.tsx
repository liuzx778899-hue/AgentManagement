import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ManualGateDecision } from "../components/ManualGateDecision";
import { workbenchData } from "../data/fixtures";
import type { GateStatus, WorkbenchData } from "../domain/workbench";

const mockUpdateGateStatus = vi.fn();

vi.mock("../App", () => ({
  useWorkbenchState: () => ({
    data: workbenchData,
    updateGateStatus: mockUpdateGateStatus,
    addMemory: vi.fn(),
    deleteMemory: vi.fn(),
    createTask: vi.fn(),
  }),
}));

describe("ManualGateDecision", () => {
  beforeEach(() => {
    mockUpdateGateStatus.mockClear();
  });

  it("renders waiting gate when one exists", () => {
    render(<ManualGateDecision data={workbenchData} />);

    expect(screen.getByRole("heading", { name: "人工决策", level: 1 })).toBeInTheDocument();
  });

  it("displays evidence panel tabs", () => {
    render(<ManualGateDecision data={workbenchData} />);

    expect(screen.getByRole("button", { name: "Diff" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "测试" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "日志" })).toBeInTheDocument();
  });

  it("switches evidence tabs on click", () => {
    render(<ManualGateDecision data={workbenchData} />);

    fireEvent.click(screen.getByRole("button", { name: "测试" }));

    expect(screen.getByText("npm test: 21 passed")).toBeInTheDocument();
  });

  it("shows decision summary", () => {
    render(<ManualGateDecision data={workbenchData} />);

    expect(screen.getByText("决策摘要")).toBeInTheDocument();
  });

  it("shows action buttons", () => {
    render(<ManualGateDecision data={workbenchData} />);

    expect(screen.getByRole("button", { name: "继续" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "终止" })).toBeInTheDocument();
  });

  it("calls updateGateStatus when continue button is clicked", () => {
    render(<ManualGateDecision data={workbenchData} />);

    fireEvent.click(screen.getByRole("button", { name: "继续" }));

    expect(mockUpdateGateStatus).toHaveBeenCalledWith("gate-001", "approved");
  });

  it("calls updateGateStatus when terminate button is clicked", () => {
    render(<ManualGateDecision data={workbenchData} />);

    fireEvent.click(screen.getByRole("button", { name: "终止" }));

    expect(mockUpdateGateStatus).toHaveBeenCalledWith("gate-001", "terminate");
  });

  it("shows empty state when no waiting gate", () => {
    const noGateData: WorkbenchData = {
      ...workbenchData,
      manualGates: workbenchData.manualGates.map((g) => ({ ...g, status: "approved" as GateStatus })),
    };

    render(<ManualGateDecision data={noGateData} />);

    expect(screen.getByText("暂无待处理人工决策")).toBeInTheDocument();
  });
});
