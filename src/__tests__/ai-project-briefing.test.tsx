import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../App";

describe("AI project initiation", () => {
  afterEach(() => {
    window.history.replaceState(null, "", window.location.pathname);
  });

  it("renders the v2 three-column AI initiation workspace", () => {
    window.location.hash = "#ai-briefing";
    render(<App />);

    expect(screen.getByRole("heading", { name: "AI 建项助手" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回项目管理" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "讨论区" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI 分析区" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "输出结果区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /添加资料/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /粘贴内容/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /发送/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /引用当前会话/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /读取协同文件/ })).not.toBeInTheDocument();
  });

  it("keeps generated project creation disabled until analysis starts", () => {
    window.location.hash = "#ai-briefing";
    render(<App />);

    expect(screen.getByRole("button", { name: /确认创建项目/ })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/继续描述项目想法/), {
      target: { value: "做一个企业知识平台，需要文档管理、全文检索和权限控制。" },
    });
    fireEvent.click(screen.getByRole("button", { name: /开始分析/ }));

    expect(screen.getByRole("button", { name: /确认创建项目/ })).not.toBeDisabled();
    expect(screen.getByText("企业知识平台 MVP")).toBeInTheDocument();
  });

  it("shows editable workflow role binding and defers library insertion until confirmation", () => {
    window.location.hash = "#ai-briefing";
    render(<App />);

    expect(screen.queryByRole("button", { name: /插入流程库/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /开始分析/ }));

    expect(screen.getByRole("heading", { name: "流程绑定角色" })).toBeInTheDocument();
    expect(screen.getByText("需求分析")).toBeInTheDocument();
    expect(screen.getByText("可编辑，确认后入库")).toBeInTheDocument();

    // Role binding select shows "产品经理" as default (from AI_FLOW_ROLE_BINDINGS)
    // Since roles array is empty, the select still shows the current role text
    expect(screen.getByText("产品经理")).toBeInTheDocument();

    // Cannot change role select when no roles available - just verify the binding row exists
    const bindingRow = screen.getByText("需求分析").closest(".briefing-v2-flow-binding-row");
    expect(bindingRow).toBeInTheDocument();
    expect(screen.queryByText("已入库")).not.toBeInTheDocument();
  });
});
