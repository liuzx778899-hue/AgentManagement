import { useEffect, useRef } from "react";
import type { LogEntry } from "../types/localEngineering";

interface PwLogStreamProps {
  logs: LogEntry[];
  autoScroll?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function PwLogStream({
  logs,
  autoScroll = true,
  isLoading = false,
  className = "",
}: PwLogStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      const scrollContainer = containerRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (logs.length === 0 && !isLoading) {
    return (
      <div className={`pw-log-stream ${className}`}>
        <div className="pw-log-empty">
          <span className="pw-log-empty-text">No logs yet</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`pw-log-stream ${className}`}>
      {isLoading && (
        <div className="pw-log-loading">
          <span className="pw-log-loading-text">Loading...</span>
        </div>
      )}
      <div className="pw-log-entries">
        {logs.map((log, index) => (
          <div key={`${log.timestamp}-${index}`} className={`pw-log-entry ${log.stream}`}>
            <span className="pw-log-timestamp">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span className="pw-log-stream-badge">{log.stream}</span>
            <span className="pw-log-content">{log.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
