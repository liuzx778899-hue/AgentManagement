import { useState, useEffect, useCallback } from "react";
import { Play, Square, RefreshCw, Terminal } from "lucide-react";
import { useLocalServices } from "../hooks/useLocalServices";
import { PwLogStream } from "./PwLogStream";
import type { RunnerProfile } from "../domain/runner";
import type { ProcessState, RunnerProcess, LogEntry } from "../types/localEngineering";

interface PwRunnerPanelProps {
  projectId: string;
  projectPath: string;
  runnerProfiles: RunnerProfile[];
}

export function PwRunnerPanel({
  projectId,
  projectPath,
  runnerProfiles,
}: PwRunnerPanelProps) {
  const { processRunner } = useLocalServices();
  const [selectedRunnerId, setSelectedRunnerId] = useState<string>("");
  const [processState, setProcessState] = useState<ProcessState>("idle");
  const [currentProcess, setCurrentProcess] = useState<RunnerProcess | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get selected runner profile
  const selectedRunner = runnerProfiles.find((r) => r.id === selectedRunnerId);

  // Poll for logs when running
  useEffect(() => {
    if (processState !== "running" || !currentProcess) return;

    const pollInterval = setInterval(async () => {
      const result = await processRunner.getLogs(currentProcess.id);
      if (result.ok && result.data) {
        setLogs(result.data);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [processState, currentProcess, processRunner]);

  // Start the runner process
  const handleStart = useCallback(async () => {
    if (!selectedRunner) return;

    setError(null);
    setProcessState("starting");
    setIsLoading(true);

    const result = await processRunner.start({
      runnerId: selectedRunner.id,
      command: selectedRunner.command,
      args: selectedRunner.defaultArgs || [],
      cwd: projectPath,
      env: selectedRunner.envVars,
    });

    setIsLoading(false);

    if (!result.ok) {
      setError(result.error?.message || "Failed to start process");
      setProcessState("idle");
      return;
    }

    setCurrentProcess(result.data!);
    setProcessState("running");
    setLogs(result.data!.logs);
  }, [selectedRunner, projectPath, processRunner]);

  // Stop the runner process
  const handleStop = useCallback(async () => {
    if (!currentProcess) return;

    setProcessState("stopping");

    const result = await processRunner.stop(currentProcess.id);

    if (result.ok) {
      setProcessState("stopped");
      setCurrentProcess(result.data ?? null);
    } else {
      setError(result.error?.message || "Failed to stop process");
      setProcessState("failed");
    }
  }, [currentProcess, processRunner]);

  // Reset to idle state
  const handleReset = useCallback(() => {
    setProcessState("idle");
    setCurrentProcess(null);
    setLogs([]);
    setError(null);
  }, []);

  // Status color mapping
  const getStatusColor = (): string => {
    switch (processState) {
      case "running":
        return "green";
      case "starting":
      case "stopping":
        return "orange";
      case "failed":
        return "red";
      case "stopped":
        return "gray";
      default:
        return "blue";
    }
  };

  // Status text
  const getStatusText = (): string => {
    switch (processState) {
      case "running":
        return "Running";
      case "starting":
        return "Starting...";
      case "stopping":
        return "Stopping...";
      case "stopped":
        return "Stopped";
      case "failed":
        return "Failed";
      default:
        return "Idle";
    }
  };

  const isIdle = processState === "idle";
  const isRunning = processState === "running";
  const isTransitioning = processState === "starting" || processState === "stopping";

  return (
    <div className="pw-runner-panel">
      {/* Header */}
      <div className="pw-runner-header">
        <div className="pw-runner-title">
          <Terminal size={16} />
          <span>CLI Runner</span>
        </div>
        <div className={`pw-runner-status ${getStatusColor()}`}>
          <span className={`pw-status-dot ${processState}`} />
          <span className="pw-status-text">{getStatusText()}</span>
        </div>
      </div>

      {/* Runner Selector */}
      <div className="pw-runner-select-row">
        <label className="pw-runner-label">Select Runner:</label>
        <select
          className="pw-runner-select"
          value={selectedRunnerId}
          onChange={(e) => setSelectedRunnerId(e.target.value)}
          disabled={!isIdle}
        >
          <option value="">-- Select a runner --</option>
          {runnerProfiles.map((runner) => (
            <option key={runner.id} value={runner.id}>
              {runner.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Process Info */}
      {currentProcess && (
        <div className="pw-runner-process-info">
          {currentProcess.pid && (
            <div className="pw-process-stat">
              <span className="pw-process-stat-label">PID</span>
              <span className="pw-process-stat-value">{currentProcess.pid}</span>
            </div>
          )}
          {currentProcess.startedAt && (
            <div className="pw-process-stat">
              <span className="pw-process-stat-label">Started At</span>
              <span className="pw-process-stat-value">
                {new Date(currentProcess.startedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
          {currentProcess.exitCode !== undefined && (
            <div className="pw-process-stat">
              <span className="pw-process-stat-label">Exit Code</span>
              <span className="pw-process-stat-value">{currentProcess.exitCode}</span>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="pw-runner-error">
          <span className="pw-error-icon">!</span>
          <span className="pw-error-text">{error}</span>
        </div>
      )}

      {/* Control Buttons */}
      <div className="pw-runner-controls">
        {isIdle || processState === "stopped" || processState === "failed" ? (
          <button
            className="btn primary pw-runner-btn"
            onClick={isIdle ? handleStart : handleReset}
            disabled={(isIdle && !selectedRunner) || isTransitioning}
          >
            {isIdle ? (
              <>
                <Play size={14} />
                <span>Start</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                <span>Reset</span>
              </>
            )}
          </button>
        ) : (
          <button
            className="btn danger pw-runner-btn"
            onClick={handleStop}
            disabled={isTransitioning}
          >
            <Square size={14} />
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Log Stream */}
      <div className="pw-runner-log-stream">
        <PwLogStream logs={logs} autoScroll isLoading={isLoading} />
      </div>
    </div>
  );
}
