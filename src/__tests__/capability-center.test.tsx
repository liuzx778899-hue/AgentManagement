import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CapabilityCenter } from "../components/CapabilityCenter";
import { workbenchData } from "../data/fixtures";

describe("CapabilityCenter", () => {
  it("renders capability center with tabs", () => {
    render(
      <CapabilityCenter
        mcpServers={workbenchData.mcpServers}
        skills={workbenchData.skills}
        plugins={workbenchData.plugins}
        agents={workbenchData.agents}
      />
    );

    expect(screen.getByText("能力中心")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /MCP/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Skills/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plugins/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agents/ })).toBeInTheDocument();
  });

  it("shows stats for MCP tab", () => {
    render(
      <CapabilityCenter
        mcpServers={workbenchData.mcpServers}
        skills={workbenchData.skills}
        plugins={workbenchData.plugins}
        agents={workbenchData.agents}
      />
    );

    // MCP tab is active by default
    expect(screen.getByText("总数")).toBeInTheDocument();
    // Use getAllByText since there are multiple "已启用" elements
    expect(screen.getAllByText("已启用").length).toBeGreaterThan(0);
    expect(screen.getByText("来源类型")).toBeInTheDocument();
    expect(screen.getByText("需关注")).toBeInTheDocument();
  });

  it("displays MCP servers in list", () => {
    render(
      <CapabilityCenter
        mcpServers={workbenchData.mcpServers}
        skills={workbenchData.skills}
        plugins={workbenchData.plugins}
        agents={workbenchData.agents}
      />
    );

    expect(screen.getByText("Browser")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Local Shell")).toBeInTheDocument();
  });

  it("switches to Skills tab and shows skills", () => {
    render(
      <CapabilityCenter
        mcpServers={workbenchData.mcpServers}
        skills={workbenchData.skills}
        plugins={workbenchData.plugins}
        agents={workbenchData.agents}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Skills/ }));

    expect(screen.getByText("ui-ux-pro-max")).toBeInTheDocument();
    expect(screen.getByText("Brainstorming")).toBeInTheDocument();
    expect(screen.getByText("Planning")).toBeInTheDocument();
  });

  it("switches to Plugins tab and shows plugins", () => {
    render(
      <CapabilityCenter
        mcpServers={workbenchData.mcpServers}
        skills={workbenchData.skills}
        plugins={workbenchData.plugins}
        agents={workbenchData.agents}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Plugins/ }));

    expect(screen.getByText("Superpowers")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
  });

  it("switches to Agents tab and shows agents", () => {
    render(
      <CapabilityCenter
        mcpServers={workbenchData.mcpServers}
        skills={workbenchData.skills}
        plugins={workbenchData.plugins}
        agents={workbenchData.agents}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Agents/ }));

    expect(screen.getByText("Explore Agent")).toBeInTheDocument();
    expect(screen.getByText("Plan Agent")).toBeInTheDocument();
    expect(screen.getByText("Frontend Agent")).toBeInTheDocument();
  });

  it("shows detail panel when clicking an item", () => {
    render(
      <CapabilityCenter
        mcpServers={workbenchData.mcpServers}
        skills={workbenchData.skills}
        plugins={workbenchData.plugins}
        agents={workbenchData.agents}
      />
    );

    // Click on Browser MCP
    fireEvent.click(screen.getByText("Browser"));

    // Detail panel should show
    expect(screen.getByText("传输类型")).toBeInTheDocument();
    expect(screen.getByText("stdio")).toBeInTheDocument();
  });

  it("filters items by search term", () => {
    render(
      <CapabilityCenter
        mcpServers={workbenchData.mcpServers}
        skills={workbenchData.skills}
        plugins={workbenchData.plugins}
        agents={workbenchData.agents}
      />
    );

    const searchInput = screen.getByPlaceholderText("搜索...");
    fireEvent.change(searchInput, { target: { value: "browser" } });

    // Only Browser should be visible
    expect(screen.getByText("Browser")).toBeInTheDocument();
    // GitHub should not be visible
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
  });
});
