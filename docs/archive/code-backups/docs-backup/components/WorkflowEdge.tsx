import { RefreshCcw, Undo2 } from "lucide-react";
import type { WorkflowStep } from "../domain/workbench";

interface WorkflowEdgeProps {
  step: WorkflowStep;
  isLast: boolean;
}

export function WorkflowEdge({ step, isLast }: WorkflowEdgeProps) {
  if (isLast) {
    return null;
  }

  const outputsText = step.outputs.length > 0 ? step.outputs.join(", ") : "\u2014";

  const hasFailureBranch = step.failureStrategy === "retry" || step.failureStrategy === "fallback";

  return (
    <div className="workflow-edge-wrapper">
      <div className="workflow-edge-output">
        <span className="workflow-edge-output-label">输出 \u2192</span>
        <span className="workflow-edge-output-value">{outputsText}</span>
      </div>

      <div className="workflow-edge-line">
        <div className="workflow-edge-arrow" />
      </div>

      {hasFailureBranch && (
        <div className="workflow-edge-branch">
          {step.failureStrategy === "retry" ? (
            <svg width="80" height="36" viewBox="0 0 80 36">
              <path
                d="M 40 0 C 60 -8, 75 8, 72 24"
                stroke="var(--warn)"
                strokeWidth="1.5"
                fill="none"
                strokeDasharray="4 2"
              />
            </svg>
          ) : (
            <svg width="80" height="36" viewBox="0 0 80 36">
              <path
                d="M 40 0 C 60 4, 70 16, 50 20"
                stroke="var(--warn)"
                strokeWidth="1.5"
                fill="none"
                strokeDasharray="4 2"
              />
            </svg>
          )}
          <span className="workflow-edge-branch-label">
            {step.failureStrategy === "retry" ? (
              <>
                <RefreshCcw size={14} strokeWidth={2} aria-hidden="true" />
                重试
              </>
            ) : (
              <>
                <Undo2 size={14} strokeWidth={2} aria-hidden="true" />
                回退
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
