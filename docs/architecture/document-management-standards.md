# 文档与产物归档规范

本规范约束后续所有 Agent、Skill、脚本和人工开发产生的文档、mockup、截图、临时脚本和运行产物，避免根目录继续出现散乱文件。

## 信息源优先级

后续开发默认按以下顺序读取资料：

1. `docs/README.md`
2. `docs/handoff/latest-context.md`
3. `docs/handoff/handoff-next-tasks.md`
4. `docs/product/`
5. `docs/architecture/`
6. `docs/design/README.md`
7. `docs/design/mockups/current/`
8. `docs/design/assets/current/`

`docs/generated/` 和 `docs/archive/` 默认不是当前开发依据。只有当前 handoff 明确引用时，才可以把其中内容作为输入。

## 目录归属

| 类型 | 保存位置 | 说明 |
| --- | --- | --- |
| 产品规划、阶段计划、需求 | `docs/product/` | 需要人工确认后进入 |
| 架构、技术选型、工程规范 | `docs/architecture/` | 当前文档属于本类 |
| API 契约 | `docs/api/` | OpenAPI、接口约定 |
| 当前协同状态 | `docs/handoff/` | 后续 Agent 的当前入口 |
| PR / Issue 审查记录 | `docs/reviews/` | 审查报告和修复意见 |
| 当前设计稿 | `docs/design/mockups/current/` | 开发默认只看这里 |
| 当前设计资产 | `docs/design/assets/current/` | 当前截图和图片参考 |
| 旧版设计稿、旧截图 | `docs/design/mockups/archive/`、`docs/design/assets/archive/` | 仅追溯，不覆盖 current |
| Skill / AI 生成草稿 | `docs/generated/` | 默认不是最终依据 |
| 历史资料、备份、日志 | `docs/archive/` | 不作为默认开发依据 |
| E2E 或调试脚本 | `scripts/e2e/`、`scripts/dev/` | 不放根目录 |
| 测试截图、视觉验收截图 | `docs/archive/test-artifacts/` | 保留证据时归档到这里 |

## 禁止生成到根目录

除非是项目标准配置文件，后续不要在仓库根目录新增以下文件：

- `*.md`
- `*.yaml`
- `*.yml`
- `*.mjs`
- `*.png`
- `*.jpg`
- `*.jpeg`
- `*.webp`
- `mockups/`
- `screenshots/`
- `test-screenshots/`

如果工具默认生成到根目录，生成后必须立即移动到上表对应目录，并更新引用路径。

## Generated 文档规则

`docs/generated/` 保存 AI、Skill、Superpowers、Codex、Claude Code 等工具生成的过程文档。

- 新生成的 Skill 计划、规格、状态记录放入 `docs/generated/<tool-name>/`。
- `docs/generated/` 中的内容默认是草稿，不是最终结论。
- 被确认采用的内容必须整理到 `docs/product/`、`docs/architecture/`、`docs/design/` 或 `docs/handoff/`。
- 不允许后续 Agent 直接把 `docs/generated/` 的旧内容当作当前任务来源。

## Mockup 规则

- 当前设计只放在 `docs/design/mockups/current/`。
- 旧版、探索稿、导出预览放在 `docs/design/mockups/archive/`。
- 不再维护根目录 `mockups/`。
- 不再把 `public/mockups/` 当作设计源文件；如果需要浏览预览，应从 `docs/design/mockups/current/` 复制或生成。
- 实现时如果发现 current 与代码冲突，先创建 Issue 或更新 handoff，不要直接回滚到 archive 的旧稿。

## 本地工程服务与缓存

以下目录属于本地工程服务或开发环境，不要删除、归档或提交：

- `.git/`
- `.github/`
- `.agentmanagement/`
- `.agents/`
- `.claude/`
- `.codegraph/`
- `.superpowers/`
- `.worktrees/`

以下目录属于可再生缓存或构建产物，可以本地清理，但不应提交：

- `dist/`
- `.npm-cache/`
- `.playwright/`
- `.playwright-cli/`
- `.playwright-screenshots/`
- `*.tsbuildinfo`
- `vite.config.js`
- `vite.config.d.ts`

特别注意：`.codegraph/` 是 Codegraph 工程服务数据与索引，不是普通缓存，禁止清理。

## 提交要求

涉及文档整理时，应单独提交，提交说明建议使用：

```text
chore(docs): reorganize documentation and generated artifacts
```

提交前必须检查：

1. 根目录没有新增临时文档、截图、mockup 或脚本。
2. 新文档已经放入正确目录。
3. 如果路径移动，引用路径已经同步更新。
4. 不把本地备份 zip、运行日志、缓存目录提交到 Git。
