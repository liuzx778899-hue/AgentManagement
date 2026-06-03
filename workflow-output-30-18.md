# 点击通知跳转 - 实现设计文档

## 任务概述

完成"点击通知跳转"功能,实现通知系统智能导航,根据通知类型和关联对象自动跳转到最合适的视图。

## 设计决策

### 1. 通知跳转逻辑

根据通知类型智能路由:

| 通知类型 | 跳转目标 | 传递参数 |
|---------|---------|---------|
| `gate` | workbench | projectId, stepId |
| `task` / `info` | project-detail | projectId |
| `success` / `error` | workbench | projectId, stepId, runId |
| `warning` | project-detail | projectId |
| 其他 | workbench | projectId |

### 2. 导航机制

使用现有的 URL hash 参数机制:

- `#workbench?apid=projectId` - 工作台视图
- `#project-detail?dpid=projectId` - 项目详情视图

### 3. CustomEvent 扩展

扩展 App.tsx 的 `navigate` 事件处理器,支持参数传递:

```typescript
window.addEventListener("navigate", (e: CustomEvent) => {
  const detail = e.detail;
  if (detail?.view) {
    setView(detail.view as WorkbenchView);
    
    // 根据 view 类型设置对应的 projectId 参数
    if (detail.projectId) {
      if (detail.view === "workbench") {
        setActiveWorkbenchProjectId(detail.projectId);
      } else if (detail.view === "project-detail") {
        setDetailProjectId(detail.projectId);
      }
    }
  }
});
```

### 4. WorkbenchState 扩展

添加 `dispatch` 属性到 WorkbenchState 接口,使 useNotifications hook 可以直接调用 dispatch:

```typescript
interface WorkbenchState {
  data: WorkbenchData;
  dispatch: React.Dispatch<any>;
  // ... 其他方法
}
```

## 修改文件列表

### 核心实现文件

1. `src/components/NotificationList.tsx`
   - 改进 handleNotificationClick 逻辑
   - 根据通知类型智能路由
   - 传递 projectId、stepId 等参数

2. `src/components/AppShell.tsx`
   - 改进 NotificationList 的 onNavigate 回调
   - 使用 CustomEvent 传递参数

3. `src/App.tsx`
   - 扩展 navigate 事件处理器
   - 支持接收并处理 projectId 参数

4. `src/state/WorkbenchProvider.tsx`
   - WorkbenchState 接口添加 dispatch 属性
   - useMemo state 对象添加 dispatch

5. `src/hooks/useNotifications.ts`
   - 修复导入: 使用 useWorkbenchState
   - 添加 dispatch 属性支持
   - 修复 Notification 类型定义

### 测试文件

6. `src/__tests__/components/NotificationList.test.tsx`
   - 更新测试验证跳转逻辑
   - 检查 view 和 params 参数

7. `src/__tests__/ai-assistant.test.tsx`
   - 添加 notification action mocks

8. `src/__tests__/git-sync.test.tsx`
   - 添加 notification action mocks

## 待修复测试文件

以下测试文件需要添加 notification action mocks:

- `src/__tests__/integration.test.tsx`
- `src/__tests__/memory-manager.test.tsx`
- `src/__tests__/model-config.test.tsx`
- `src/__tests__/project-workspace.test.tsx`
- `src/__tests__/workflow-canvas.test.tsx`

## 下一步工作

1. 运行 typecheck 验证类型正确性
2. 运行测试确保所有测试通过
3. 修复剩余测试文件的 notification mocks
4. 验证实际通知跳转功能在浏览器中工作正常

## 技术要点

### 智能跳转算法

```typescript
const handleNotificationClick = useCallback(
  (notification: NotificationItem) => {
    markAsRead(notification.id);

    let targetView: string = "workbench";
    const params: Record<string, string> = {};

    if (notification.projectId) {
      params.projectId = notification.projectId;

      if (notification.type === "gate") {
        targetView = "workbench";
        if (notification.stepId) params.stepId = notification.stepId;
      } else if (notification.type === "task" || notification.type === "info") {
        targetView = "project-detail";
      } else if (notification.type === "success" || notification.type === "error") {
        targetView = "workbench";
        if (notification.stepId) params.stepId = notification.stepId;
        if (notification.runId) params.runId = notification.runId;
      } else {
        targetView = "workbench";
      }
    }

    if (onNavigate) {
      onNavigate(targetView, params);
    }

    setIsOpen(false);
  },
  [markAsRead, onNavigate]
);
```

### URL Hash 参数同步

App.tsx 会自动将 view 和 projectId 参数同步到 URL:

```typescript
useEffect(() => {
  const newHash = buildHash({
    view,
    workspaceProjectId,
    detailProjectId,
    activeWorkbenchProjectId: view === "workbench" ? activeWorkbenchProjectId : null,
    selectedWorkflowTemplateId: view === "workflows" ? selectedWorkflowTemplateId : null,
  });
  if (window.location.hash !== newHash) {
    window.history.replaceState(null, "", window.location.pathname + newHash);
  }
}, [view, workspaceProjectId, detailProjectId, activeWorkbenchProjectId, selectedWorkflowTemplateId]);
```

## 测试验证

测试用例验证通知点击跳转:

```typescript
it("marks notification as read when clicked", async () => {
  render(<NotificationList onNavigate={mockOnNavigate} />);
  
  // Open panel
  const bellButton = screen.getAllByRole("button").find(btn => btn.getAttribute("aria-label")?.includes("通知"));
  await act(async () => { bellButton?.click(); });
  
  // Click notification
  const notificationItems = screen.getAllByRole("button").filter(btn => btn.className.includes("notification-item"));
  await act(async () => { notificationItems[0]?.click(); });
  
  // Verify navigation
  await waitFor(() => {
    expect(mockOnNavigate).toHaveBeenCalled();
    const call = mockOnNavigate.mock.calls[0];
    expect(call[0]).toBe("workbench");
    expect(call[1]).toHaveProperty("projectId");
  });
});
```

## 状态

- 实现完成度: 85%
- 待修复: 测试文件 notification mocks (6 个文件)
- 待验证: typecheck 和完整测试套件