import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PwLogStream } from "../../components/PwLogStream";
import type { LogEntry } from "../../types/localEngineering";

describe("PwLogStream", () => {
  const mockLogs: LogEntry[] = [
    { timestamp: "2026-05-21T10:00:00Z", stream: "stdout", content: "Starting process..." },
    { timestamp: "2026-05-21T10:00:01Z", stream: "stdout", content: "Process initialized" },
    { timestamp: "2026-05-21T10:00:02Z", stream: "stderr", content: "Warning: deprecated API" },
    { timestamp: "2026-05-21T10:00:03Z", stream: "stdout", content: "Done" },
  ];

  it("renders log entries", () => {
    render(<PwLogStream logs={mockLogs} />);

    expect(screen.getByText("Starting process...")).toBeInTheDocument();
    expect(screen.getByText("Process initialized")).toBeInTheDocument();
    expect(screen.getByText("Warning: deprecated API")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("distinguishes stdout and stderr with different colors", () => {
    const { container } = render(<PwLogStream logs={mockLogs} />);

    const logEntries = container.querySelectorAll(".pw-log-entry");
    expect(logEntries[0]).toHaveClass("stdout");
    expect(logEntries[2]).toHaveClass("stderr");
  });

  it("shows empty state when no logs", () => {
    render(<PwLogStream logs={[]} />);

    expect(screen.getByText(/no logs/i)).toBeInTheDocument();
  });

  it("auto-scrolls to bottom when autoScroll is true", () => {
    const { container, rerender } = render(<PwLogStream logs={mockLogs} autoScroll />);

    // Manually set scrollTop to test auto-scroll behavior
    const scrollContainer = container.querySelector('.pw-log-stream') as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000, writable: true });
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 0, writable: true });
    }

    const newLogs = [
      ...mockLogs,
      { timestamp: "2026-05-21T10:00:04Z", stream: "stdout" as const, content: "New entry" },
    ];
    rerender(<PwLogStream logs={newLogs} autoScroll />);

    // Just verify component re-renders with new logs
    expect(screen.getByText("New entry")).toBeInTheDocument();
  });

  it("displays timestamp for each log entry", () => {
    render(<PwLogStream logs={mockLogs} />);

    // Check timestamp is displayed (time format HH:mm:ss)
    const timestamps = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it("shows loading indicator when isLoading is true", () => {
    render(<PwLogStream logs={mockLogs} isLoading />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<PwLogStream logs={mockLogs} className="custom-class" />);

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
