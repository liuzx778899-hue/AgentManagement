import type { LocalResult } from '../../../types/localEngineering';
import type { WorkflowAssignment } from '../../../domain/workflowAssignment';

/**
 * WorkflowAssignment Repository
 *
 * 内存存储，负责 WorkflowAssignment 的持久化操作
 */
const assignments = new Map<string, WorkflowAssignment>();

/**
 * 保存 Assignment
 */
export async function save(assignment: WorkflowAssignment): Promise<LocalResult<WorkflowAssignment>> {
  assignments.set(assignment.id, assignment);

  return {
    ok: true,
    data: assignment,
    diagnostics: [`Assignment 已保存: ${assignment.id}`],
  };
}

/**
 * 加载 Assignment
 */
export async function load(assignmentId: string): Promise<LocalResult<WorkflowAssignment>> {
  const assignment = assignments.get(assignmentId);

  if (!assignment) {
    return {
      ok: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: `Assignment 不存在: ${assignmentId}`,
        recoverable: false,
      },
    };
  }

  return {
    ok: true,
    data: assignment,
  };
}

/**
 * 按 Step 列出 Assignments
 */
export async function listByStep(workflowStepId: string): Promise<LocalResult<WorkflowAssignment[]>> {
  const result = Array.from(assignments.values()).filter(
    a => a.workflowStepId === workflowStepId
  );

  return {
    ok: true,
    data: result,
    diagnostics: [`Step ${workflowStepId} 有 ${result.length} 个 Assignments`],
  };
}

/**
 * 按工作流列出所有 Assignments
 * 注意：WorkflowAssignment 中没有直接的 workflowId，需要外部传入关联的 stepIds
 */
export async function listByWorkflow(stepIds: string[]): Promise<LocalResult<WorkflowAssignment[]>> {
  const stepIdSet = new Set(stepIds);
  const result = Array.from(assignments.values()).filter(
    a => stepIdSet.has(a.workflowStepId)
  );

  return {
    ok: true,
    data: result,
    diagnostics: [`找到 ${result.length} 个 Assignments`],
  };
}

/**
 * 按 workflowTemplateId 列出所有 Assignments
 */
export async function listByWorkflowTemplate(workflowTemplateId: string): Promise<LocalResult<WorkflowAssignment[]>> {
  const result = Array.from(assignments.values()).filter(
    a => a.workflowTemplateId === workflowTemplateId
  );

  return {
    ok: true,
    data: result,
    diagnostics: [`Workflow ${workflowTemplateId} 有 ${result.length} 个 Assignments`],
  };
}

/**
 * 获取所有 Assignments
 */
export async function listAll(): Promise<LocalResult<WorkflowAssignment[]>> {
  return {
    ok: true,
    data: Array.from(assignments.values()),
    diagnostics: [`共 ${assignments.size} 个 Assignments`],
  };
}

/**
 * 批量保存 Assignments
 */
export async function saveBatch(items: WorkflowAssignment[]): Promise<LocalResult<WorkflowAssignment[]>> {
  const results: WorkflowAssignment[] = [];
  const errors: string[] = [];

  for (const item of items) {
    try {
      assignments.set(item.id, item);
      results.push(item);
    } catch {
      errors.push(`Assignment ${item.id} 保存失败`);
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      error: {
        code: 'BATCH_SAVE_FAILED',
        message: errors.join('; '),
        recoverable: true,
      },
    };
  }

  return {
    ok: true,
    data: results,
    diagnostics: [`成功保存 ${results.length} 个 Assignments`],
  };
}
