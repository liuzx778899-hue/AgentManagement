import { useState } from "react";
import { Check, Plus } from "lucide-react";
import type { WorkflowTemplate, WorkflowStep, WorkbenchData } from "../domain/workbench";
import { useWorkbenchState } from "../App";
import { WorkflowNode } from "./WorkflowNode";
import { StepEditModal } from "./StepEditModal";

interface WorkflowCanvasProps {
  template: WorkflowTemplate;
  data: WorkbenchData;
  selectedStepId?: string | null;
  onStepClick?: (stepId: string) => void;
}

export function WorkflowCanvas({ template, data, selectedStepId, onStepClick }: WorkflowCanvasProps) {
  const { addWorkflowStep, updateWorkflowStep } = useWorkbenchState();
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const sortedSteps = [...template.steps]
    .sort((a, b) => a.order - b.order);

  const editingStep = sortedSteps.find((s) => s.id === editingStepId) ?? null;

  const handleAddStep = (afterIndex: number) => {
    const newOrder = afterIndex >= 0 ? afterIndex + 1.5 : sortedSteps.length + 1;
    const provider = data.modelProviders.find((p) => p.enabled);
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      order: newOrder,
      name: "新步骤",
      assignments: [{
        id: `assignment-${Date.now()}`,
        order: 1,
        roleId: data.roles[0]?.id ?? "",
        modelProviderId: provider?.id ?? "",
        modelName: provider?.models[0]?.name ?? "",
        goal: "新步骤",
        acceptanceCriteria: [],
        inputs: [],
        outputs: [],
      }],
      inputs: [],
      outputs: [],
      gateMode: "auto",
      failureStrategy: "stop",
      projectOverride: false,
    };
    addWorkflowStep(template.id, newStep);
  };

  const addToEnd = () => handleAddStep(sortedSteps.length);

  // Drag handlers
  const handleDragStart = (_e: React.DragEvent, stepId: string) => {
    setDraggedStepId(stepId);
  };

  const handleDragEnd = () => {
    setDraggedStepId(null);
    setDropTargetIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStepId && sortedSteps[index]?.id !== draggedStepId) {
      setDropTargetIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedStepId) return;

    const draggedIndex = sortedSteps.findIndex((s) => s.id === draggedStepId);
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedStepId(null);
      setDropTargetIndex(null);
      return;
    }

    // Reorder: calculate new order values
    const stepsToUpdate: { id: string; newOrder: number }[] = [];

    if (draggedIndex < targetIndex) {
      // Moving down
      for (let i = draggedIndex + 1; i <= targetIndex; i++) {
        stepsToUpdate.push({ id: sortedSteps[i].id, newOrder: i });
      }
      stepsToUpdate.push({ id: draggedStepId, newOrder: targetIndex + 1 });
    } else {
      // Moving up
      for (let i = targetIndex; i < draggedIndex; i++) {
        stepsToUpdate.push({ id: sortedSteps[i].id, newOrder: i + 2 });
      }
      stepsToUpdate.push({ id: draggedStepId, newOrder: targetIndex + 1 });
    }

    // Apply updates
    stepsToUpdate.forEach(({ id, newOrder }) => {
      const step = sortedSteps.find((s) => s.id === id);
      if (step) {
        updateWorkflowStep(template.id, id, { order: newOrder });
      }
    });

    setDraggedStepId(null);
    setDropTargetIndex(null);
  };

  return (
    <>
      <div className="canvas-body">
        <div className="canvas-inner">
          {sortedSteps.length === 0 ? (
            <div className="workflow-canvas-empty">此工作流模板没有步骤，点击下方按钮添加。</div>
          ) : (
            sortedSteps.map((step, i) => {
              const isLast = i === sortedSteps.length - 1;
              const outputText = step.outputs.length > 0 ? step.outputs.join(", ") : "";

              return (
                <div key={step.id} className="step-group-wrapper">
                  <WorkflowNode
                    step={step}
                    index={i}
                    data={data}
                    template={template}
                    isLast={isLast}
                    isDragging={draggedStepId === step.id}
                    isDropTarget={dropTargetIndex === i}
                    isSelected={selectedStepId === step.id}
                    onClick={() => onStepClick?.(step.id)}
                    onDoubleClick={() => setEditingStepId(step.id)}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />

                  {/* Edge with output label */}
                  {!isLast && (
                    <>
                      {/* Insert button between steps */}
                      <div className="insert-between">
                        <button
                          className="insert-btn"
                          onClick={() => handleAddStep(i)}
                          title="插入步骤"
                          type="button"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Success edge */}
                      <div className="edge-success">
                        <span className="edge-success-label">
                          <Check size={12} />
                          {outputText}
                        </span>
                        <div className="edge-success-line">
                          <div className="edge-success-arrow" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}

          {/* Add step at end */}
          <button className="add-step-end" onClick={addToEnd} type="button">
            <Plus size={16} />
            添加步骤
          </button>
        </div>
      </div>

      {editingStep && (
        <StepEditModal
          step={editingStep}
          template={template}
          data={data}
          onSave={(updates) => {
            updateWorkflowStep(template.id, editingStep.id, updates);
            setEditingStepId(null);
          }}
          onDelete={() => {
            updateWorkflowStep(template.id, editingStep.id, { order: -1 } as Partial<WorkflowStep>);
            setEditingStepId(null);
          }}
          onClose={() => setEditingStepId(null)}
        />
      )}
    </>
  );
}