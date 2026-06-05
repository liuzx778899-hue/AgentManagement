# Issue #26 BDD 场景定义

## Feature: 工作台真实 API 对接

作为用户，我希望工作台显示真实数据，以便监控任务执行进度和查看实际输出。

---

### Scenario 1: Terminal 显示真实日志

```gherkin
Given 我已打开工作台页面
And 当前项目有运行中的任务
When 页面加载完成
Then Terminal 区域显示该任务的实时日志
And 日志内容来自 runnerApi.getLogs(processId)
And 日志持续滚动更新
```

### Scenario 2: Terminal 无任务占位

```gherkin
Given 我已打开工作台页面
And 当前项目没有运行中的任务
When 页面加载完成
Then Terminal 区域显示"暂无运行中的任务"占位提示
```

### Scenario 3: 步骤状态反映真实进度

```gherkin
Given 我已打开工作台页面
And 项目有 3 个任务：任务A已完成，任务B运行中，任务C待执行
When 页面加载完成
Then 任务A对应的步骤显示为 done 状态（绿色勾选）
And 任务B对应的步骤显示为 active 状态（蓝色进度）
And 任务C对应的步骤显示为 pending 状态（灰色等待）
```

### Scenario 4: 启动步骤操作

```gherkin
Given 我已打开工作台页面
And 任务C显示为 pending 状态
When 我点击任务C的"启动"按钮
Then 调用 taskApi.update(taskC.id, { status: 'running' })
And 任务C状态变为 active
And Terminal 区域开始显示任务C的日志
```

### Scenario 5: 完成步骤操作

```gherkin
Given 我已打开工作台页面
And 任务B显示为 active 状态且已执行完成
When 我点击任务B的"完成"按钮
Then 调用 taskApi.update(taskB.id, { status: 'completed' })
And 任务B状态变为 done
```

### Scenario 6: 最近文件列表

```gherkin
Given 我已打开工作台页面
And 项目有最近变更的文件
When 页面加载完成
Then 最近文件列表显示真实文件名
And 文件列表来自 gitApi.getStatus(projectId) 或 task.outputArtifacts
```

---

## 测试用例生成计划

| 场景 | 测试类型 | 测试文件 |
|------|----------|----------|
| Scenario 1-2 | E2E (Playwright) | `e2e/workbench-terminal.spec.ts` |
| Scenario 3 | E2E (Playwright) | `e2e/workbench-step-status.spec.ts` |
| Scenario 4-5 | E2E (Playwright) | `e2e/workbench-actions.spec.ts` |
| Scenario 6 | E2E (Playwright) | `e2e/workbench-files.spec.ts` |

---

## 开发顺序（BDD 流程）

1. ✅ 已确认 Issue 需求
2. → 生成 BDD 场景（当前步骤）
3. → 你确认场景是否覆盖需求
4. → 我生成 E2E 测试用例
5. → 运行测试（预期全部失败）
6. → 实现功能代码
7. → 运行测试（预期逐步通过）
8. → 重构优化
9. → 所有测试通过，验收完成