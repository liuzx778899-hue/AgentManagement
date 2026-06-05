# Design Review Operating Model

更新时间：2026-05-15

## 当前分工

编码执行交给其他工具负责。本项目里，这条 Codex 线程主要负责：

- 方案设计。
- 产品架构梳理。
- 信息架构和流程设计。
- HTML 原型和可视化评审页生成。
- 设计规格和验收标准维护。
- 最终实现效果审查。
- 发现实现偏离设计时，输出明确修改建议。

除非用户明确要求，本线程不主动承担大段业务代码实现。

## 我们负责的产物

### 1. 方案设计

- 产品定位。
- V1 / V2 / 后续路线。
- 个人模式、团队模式、桌面模式的边界。
- 核心对象和数据关系。
- 页面清单和主路径。
- 功能取舍和延后范围。

### 2. 原型生成

- 静态 HTML 原型。
- 评审展示页。
- 产品流程页。
- 关键页面状态图。
- localhost 预览页面。

当前原型入口：

- `http://127.0.0.1:55179/`
- `mockups/v1-product-flow.html`
- `mockups/progress-review.html`
- `mockups/agent-workbench-ui.html`
- `mockups/agent-workbench-review-page.html`

### 3. 规格维护

- `docs/generated/superpowers/specs/2026-05-15-agent-workbench-ui-design.md`
- `docs/generated/superpowers/specs/2026-05-15-v1-product-flow.md`
- `docs/product/roadmap-and-architecture.md`
- `docs/handoff/project-status.md`
- `docs/handoff/latest-context.md`

### 4. 效果审查

其他工具完成编码后，本线程负责审查：

- 是否符合 V1 产品闭环。
- 是否覆盖项目接入、新建任务、Workflow Builder、Manual Gate、记忆管理。
- 是否符合深色、高密度、工程感的视觉方向。
- 是否满足可访问性、响应式和触控尺寸要求。
- 是否有文字重叠、横向滚动、按钮不可读、状态只靠颜色表达等问题。
- 是否通过测试、构建和浏览器验证。

## 审查输入

编码工具交付后，建议提供：

- 代码所在分支或目录。
- 本地启动地址。
- 变更摘要。
- 测试结果。
- 截图或浏览器可访问页面。
- 需要重点检查的页面或风险点。

## 审查输出

审查时优先输出：

1. 阻塞问题。
2. 高风险偏差。
3. 设计还原问题。
4. 可访问性和响应式问题。
5. 建议修复清单。
6. 是否可以进入下一阶段。

## 默认下一步

当前编码工作已经交给其他工具。本线程下一步默认等待实现结果，然后做：

- 原型对照审查。
- V1 flow 覆盖审查。
- 视觉和交互质量审查。
- 文档和进度同步。

如果还需要继续做设计，则优先补：

- 更细的页面状态。
- 空状态、加载态、错误态。
- Manual Gate 的证据组合。
- Workflow Builder 的编辑细节。
- 记忆管理的引用策略。
