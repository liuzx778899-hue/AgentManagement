# Issue 工作流规范

## 概述

所有 issue 的关闭必须经过项目 Owner 的 review 和批准。

## 流程规范

### 1. Issue 创建
- 开发者可以自由创建 issue
- Issue 需要填写完整的描述、验收标准、关联计划

### 2. Issue 开发
- 开发者领取 issue 后开始开发
- 每个功能点完成后提交代码，commit message 引用 issue 编号

### 3. Issue 关闭（强制流程）

**禁止操作：**
- 开发者**不可**自行关闭 issue

**正确流程：**
1. 开发者完成开发后，创建 Pull Request
2. PR 描述中引用 issue 编号（如 `Closes #123`）
3. Owner review PR，确认验收标准达成
4. Owner merge PR 后，issue 自动关闭

### 4. 例外情况
- 如果 issue 无效或重复，Owner 可直接关闭
- 如果 issue 已由其他方式解决，Owner 需添加说明后关闭

## GitHub 配置建议

### Branch Protection Rules
在 Settings > Branches > Add rule：
- Branch name pattern: `main`
- Require pull request reviews before merging: ✅
- Required approving reviews: 1
- Dismiss stale pull request approvals: ✅

### CODEOWNERS 文件
创建 `.github/CODEOWNERS`：
```
* @liuzx8888
```

这样所有 PR 都需要 Owner 的批准才能合并。

## Issue 模板更新

Issue 模板需要包含：
- 验收标准（Acceptance Criteria）
- 关联计划文档
- 预估工作量

## 违规处理
- 自行关闭的 issue 需要重新打开
- 未经验收关闭的 issue 需要补充 review

---

**生效日期：** 2026-05-30
**责任人：** @liuzx8888
