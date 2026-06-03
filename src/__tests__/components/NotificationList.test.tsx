import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationList } from "../../components/NotificationList";

describe("NotificationList", () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders notification bell button", () => {
    render(<NotificationList onNavigate={mockOnNavigate} />);
    // Find button by aria-label
    const buttons = screen.getAllByRole("button");
    const bellButton = buttons.find((btn) => btn.getAttribute("aria-label")?.includes("通知"));
    expect(bellButton).toBeDefined();
  });

  it("shows unread badge when there are unread notifications", () => {
    render(<NotificationList onNavigate={mockOnNavigate} />);
    // Default mock has 2 unread notifications
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("opens notification panel on click", async () => {
    render(<NotificationList onNavigate={mockOnNavigate} />);

    const bellButton = screen.getAllByRole("button").find((btn) => btn.getAttribute("aria-label")?.includes("通知"));
    expect(bellButton).toBeDefined();

    await act(async () => {
      bellButton?.click();
    });

    // Panel should show title
    await waitFor(() => {
      const titleElements = screen.getAllByText("通知");
      expect(titleElements.length).toBeGreaterThan(0);
    });
  });

  it("shows filter buttons when panel is open", async () => {
    render(<NotificationList onNavigate={mockOnNavigate} />);

    const bellButton = screen.getAllByRole("button").find((btn) => btn.getAttribute("aria-label")?.includes("通知"));

    await act(async () => {
      bellButton?.click();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "全部" })).toBeInTheDocument();
    });
  });

  it("shows notification items when panel is open", async () => {
    render(<NotificationList onNavigate={mockOnNavigate} />);

    const bellButton = screen.getAllByRole("button").find((btn) => btn.getAttribute("aria-label")?.includes("通知"));

    await act(async () => {
      bellButton?.click();
    });

    await waitFor(() => {
      // Panel should be open and show notification titles
      const titles = screen.getAllByText(/步骤完成|Gate 待决策/);
      expect(titles.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it("marks notification as read when clicked", async () => {
    render(<NotificationList onNavigate={mockOnNavigate} />);

    const bellButton = screen.getAllByRole("button").find((btn) => btn.getAttribute("aria-label")?.includes("通知"));

    await act(async () => {
      bellButton?.click();
    });

    await waitFor(() => {
      expect(screen.getByText("步骤完成")).toBeInTheDocument();
    });

    // Click on notification item - use the clickable div with role=button
    const notificationItems = screen.getAllByRole("button").filter((btn) => btn.className.includes("notification-item"));

    await act(async () => {
      if (notificationItems.length > 0) {
        notificationItems[0].click();
      }
    });

    // Should have called onNavigate with correct view and params
    await waitFor(() => {
      expect(mockOnNavigate).toHaveBeenCalled();
      // First notification is a success type with projectId, should navigate to workbench
      const call = mockOnNavigate.mock.calls[0];
      expect(call[0]).toBe("workbench");
      expect(call[1]).toHaveProperty("projectId");
    });
  });
});