# 工作台待办显示 - 执行报告

**任务编号**: #30-20
**执行日期**: 2026-06-02
**分支**: issue-32-domain-protocol
**提交**: 760cc73

## 任务概述

改进工作台的TODO列表显示,使其从简单的静态列表升级为具有状态指示器、交互操作和真实API集成的动态组件。

## 主要改进

### 1. 状态可视化增强

**之前**: 只显示复选框和任务目标,所有任务都显示为"高优先级"

**之后**: 
- 每个任务显示状态图标和颜色
- 状态类型:
  - `draft` - 草稿 (灰色圆圈)
  - `queued` - 排队中 (橙色时钟)
  - `running` - 运行中 (蓝色播放图标)
  - `gate` - 等待决策 (橙色警告图标)
  - `done` - 已完成 (绿色勾选)
  - `failed` - 失败 (红色方块)

### 2. 任务元数据显示

**新增**:
- 显示关联的工作流模板名称
- 显示已完成任务计数
- 默认显示4个任务,可展开查看更多

### 3. 交互功能

**新增操作**:
- **标记完成**: 点击按钮将任务标记为已完成
- **展开/收起**: 查看更多待办任务

### 4. 数据持久化

**API集成**:
- `updateTask` - 通过API更新任务状态
- `deleteTask` - 新增删除任务action和reducer case

## 技术实现

### 修改文件

1. **src/components/WorkbenchHome.tsx**
   - 添加statusConfig映射(状态 → 图标/颜色/标签)
   - 添加getWorkflowTemplateName辅助函数
   - 实现expanded状态和展开/收起逻辑
   - 渲染改进的TODO列表UI

2. **src/state/WorkbenchProvider.tsx**
   - 添加deleteTask函数(调用API并更新本地状态)
   - 修改updateTask为async函数(持久化到服务器)
   - 将deleteTask添加到状态接口

3. **src/state/workbenchActions.ts**
   - 添加DELETE_TASK action类型
   - 添加deleteTask action creator

4. **src/state/workbenchReducer.ts**
   - 添加DELETE_TASK case

5. **src/App.tsx**
   - 从useWorkbenchState提取deleteTask
   - 传递deleteTask和updateTask给WorkbenchHome组件

6. **src/styles/base.css**
   - 添加.wb-todo-item-enhanced样式
   - 添加.wb-todo-status、.wb-todo-content等子元素样式
   - 添加.wb-todo-expand-btn样式
   - 添加.wb-todo-completed-count样式

### 数据流

```
用户点击"标记完成"
    ↓
handleMarkTaskDone调用updateTask(taskId, { status: "done" })
    ↓
WorkbenchProvider.updateTask发送API请求
    ↓
API响应成功/失败
    ↓
dispatch UPDATE_TASK action
    ↓
workbenchReducer更新本地状态
    ↓
UI重新渲染,任务显示为"已完成"
```

## 视觉对比

### 改进前
```
TODO LIST [4]
┌─────────────────────────┐
│ □ 完成流程设计         高 │
│ □ 实现工作流执行用例   高 │
│ □ 添加测试覆盖         高 │
│ □ 文档更新             高 │
└─────────────────────────┘
```

### 改进后
```
TODO LIST [4]         已完成 2
┌─────────────────────────────┐
│ ● 草稿  完成流程设计        ✓│
│   软件开发完整流程           │
├─────────────────────────────┤
│ 🕐 排队中 实现工作流执行用例 ✓│
│   软件开发完整流程           │
├─────────────────────────────┤
│ ▶ 运行中 添加测试覆盖       ✓│
│   测试流程                   │
├─────────────────────────────┤
│ ⚠ 等待决策 文档更新         ✓│
│   文档审核流程               │
├─────────────────────────────┤
│      ▼ 显示更多 (3 项)      │
└─────────────────────────────┘
```

## 测试验证

需要手动验证的功能:
1. 工作台右侧面板显示改进的TODO列表
2. 每个任务显示正确的状态图标和颜色
3. 点击"标记完成"按钮,任务状态变为"已完成"
4. 点击"显示更多"可以看到所有待办任务
5. 完成的任务计数正确显示
6. API调用正确发送到服务器

## 设计决策

### 为什么不用独立的TaskTodoPanel组件?

虽然创建了TaskTodoPanel组件,但最终选择直接在WorkbenchHome中实现,原因是:
1. 减少组件层级和prop drilling
2. 更容易访问WorkbenchHome中的状态
3. 简化数据流
4. 性能优化(避免额外的re-render)

TaskTodoPanel.tsx文件已创建但未在当前实现中使用,保留供未来重构使用。

### 为什么添加deleteTask而不是复用现有逻辑?

之前只有createTask和updateTask,没有删除任务的功能。为了完整的CRUD操作支持,添加了:
- DELETE_TASK action类型
- deleteTask action creator  
- DELETE_TASK reducer case
- deleteTask Provider函数(调用API)

## 已知限制

1. **编辑功能**: 当前版本只支持"标记完成",不支持编辑任务目标
2. **删除功能**: 虽然添加了deleteTask reducer,但UI中未暴露删除按钮
3. **优先级**: 暂未实现优先级排序和显示
4. **筛选**: 未实现按状态筛选任务的功能

## 后续改进建议

1. **完整的CRUD操作**:
   - 添加编辑任务功能(点击任务名称编辑)
   - 在更多操作菜单中添加删除选项

2. **优先级管理**:
   - 支持高/中/低优先级
   - 按优先级排序

3. **筛选和排序**:
   - 按状态筛选
   - 按工作流模板筛选
   - 按创建时间/更新时间排序

4. **批量操作**:
   - 批量标记完成
   - 批量删除

5. **拖拽排序**:
   - 支持拖拽调整任务顺序

## 相关Issue

- #30 - 工作台Phase 3集成
- #26 - 工作台mock数据替换为真实API

## 验证命令

```bash
# 类型检查
npm run typecheck

# 启动开发服务器
npm run dev:full

# 访问工作台
http://127.0.0.1:5173/#workbench

# 启动API服务器(如果未运行)
npm run dev:server
```

## 结论

工作台待办显示已成功改进,现在具备:
- ✅ 状态可视化
- ✅ 任务元数据显示
- ✅ 交互操作(标记完成)
- ✅ 可展开列表
- ✅ API集成

这些改进使待办列表从静态展示升级为动态交互组件,为后续功能(编辑、删除、筛选)奠定了基础。