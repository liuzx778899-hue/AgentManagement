# IM Adapter Configuration Design

日期：2026-05-15
状态：设计方案
关联：`docs/HANDOFF_NEXT_TASKS.md`

## 目标

在工作台中新增「即时通讯适配器」模块，支持通过微信、钉钉、Telegram、飞书等 IM 渠道对接消息通知和对话交互。

Phase 1 只做前端配置界面，后端 webhook 对接留到 Phase 2。

## 架构位置

| 配置层级 | 位置 | 说明 |
|---------|------|------|
| 全局 | 设置中心 → 「IM 适配器」标签页 | 管理适配器池：新增/编辑/删除/启用 |
| 项目级 | 设置中心 → 项目设置（或项目管理页面） | 从全局池中选择启用的渠道 + 可自定义模板 |

## Domain Model

### 类型定义

```typescript
export type ImPlatform = "wechat" | "dingtalk" | "telegram" | "feishu";

export type ImEventType = "gate_approval" | "task_complete" | "agent_error" | "direct_chat";

export interface ImMessageTemplate {
  title: string;
  body: string;
  buttons: string[];
}

export interface ImRouteRule {
  eventType: ImEventType;
  enabled: boolean;
  targetRoleIds: string[];
  requireResponse: boolean;
}

export interface ImAdapter {
  id: string;
  name: string;
  platform: ImPlatform;
  enabled: boolean;
  webhookUrl: string;
  appId: string;
  appSecret: string;
  verifyToken: string;
  templates: Record<ImEventType, ImMessageTemplate>;
  routeRules: ImRouteRule[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectImBinding {
  projectId: string;
  adapterId: string;
  enabled: boolean;
  overrideTemplates: Partial<Record<ImEventType, ImMessageTemplate>>;
}
```

### WorkbenchData 变更

```typescript
export interface WorkbenchData {
  // ... existing fields ...
  imAdapters: ImAdapter[];
  projectImBindings: ProjectImBinding[];
}
```

## 4 个平台的默认变量支持

| 平台 | 图标 | 默认 Webhook 格式 |
|------|------|------------------|
| 飞书 | `feishu` | `https://open.feishu.cn/open-apis/bot/v2/hook/xxx` |
| 钉钉 | `dingtalk` | `https://oapi.dingtalk.com/robot/send?access_token=xxx` |
| 企业微信 | `wechat` | `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx` |
| Telegram | `telegram` | `https://api.telegram.org/bot<token>/sendMessage` |

## UI 设计

### 设置中心导航变化

设置中心标签页由 6 个增加到 7 个（角色库已移到项目级）：

```
用户偏好 → 项目设置 → 模型配置 → 工作流库 → 项目工作流 → 能力中心 → IM 适配器
```

### IM 适配器页面布局

左右两栏结构：

**左栏：适配器列表**
- 4 个平台的卡片列表
- 每卡片显示：平台图标、名称、启用状态开关、已配置的路由规则数
- 可新增适配器（一个平台可配多个实例，如公司飞书 + 个人飞书）
- 点击选择编辑

**右栏：适配器编辑**

选中适配器后显示编辑表单：

1. **基本信息区**
   - 适配器名称（如"公司飞书群"）
   - 平台类型（飞书/钉钉/微信/Telegram，下拉不可更改）
   - Webhook URL（输入框）
   - App ID（输入框）
   - App Secret（输入框，Phase 1 显示"已配置/未配置"状态标记）
   - 验证 Token（输入框）
   - 测试连接按钮（Phase 1 模拟，显示"连接成功/失败"）
   - 启用/禁用开关

2. **通知模板区**（按事件类型的 tabs）
   - Gate 审批通知
   - 任务完成通知
   - Agent 异常通知
   - 直接对话
   - 每个 tab 包含：
     - 标题模板（支持 `{{projectName}}`、`{{taskName}}`、`{{stepName}}`、`{{roleName}}` 变量）
     - 正文模板
     - 可回复按钮（如 `["同意", "拒绝", "重跑", "查看详情"]`）
     - 模板预览

3. **路由规则区**
   - 事件类型勾选：审批/完成/异常/对话
   - 目标角色：多选角色列表
   - 是否需要用户回复：开关
   - 每条规则单独显示

### 项目级的 IM 渠道绑定

放在「项目管理 → 已有项目 / 新建项目」的配置步骤中：

- 勾选启用的 IM 渠道（从全局适配器池中获取）
- 可选覆盖默认通知模板（如该项目的 Gate 审批用不同文案）

## 4 类事件的默认模板

### Gate 审批通知

```
标题: 🔔 {{taskName}} 需要审批
正文: 步骤「{{stepName}}」已完成，由 {{roleName}} 执行。
      请决定：继续 / 重跑 / 改派 / 终止
按钮: ["同意继续", "重跑", "改派", "终止"]
```

### 任务完成通知

```
标题: ✅ {{taskName}} 已完成
正文: 任务目标：{{goal}}
      验收标准：{{criteria}}
      执行角色：{{roleName}}
      完成时间：{{completedAt}}
按钮: ["查看详情"]
```

### Agent 异常通知

```
标题: ⚠️ {{taskName}} 执行异常
正文: 步骤「{{stepName}}」执行失败。
      错误信息：{{errorMessage}}
      角色：{{roleName}}
      建议：手动介入或重试
按钮: ["重试", "跳过", "查看日志"]
```

### 直接对话

```
标题: {{userMessage}}（截取前 50 字）
正文: {{agentResponse}}（截取前 200 字）
      回复「详情」查看完整内容
按钮: ["继续", "终止对话"]
```

## 代码变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| MODIFY | `src/domain/workbench.ts` | 新增 `ImPlatform`、`ImEventType`、`ImAdapter`、`ImMessageTemplate`、`ImRouteRule`、`ProjectImBinding` 类型；`WorkbenchData` 加 `imAdapters`、`projectImBindings` |
| MODIFY | `src/data/fixtures.ts` | 新增 4 个 IM 适配器 fixtures（微信/钉钉/Telegram/飞书）+ 项目绑定 |
| MODIFY | `src/components/Settings.tsx` | `SettingsTab` 加 `"im-adapters"`，导航加「IM 适配器」，渲染 `ImAdapterSettings` |
| NEW | `src/components/ImAdapterSettings.tsx` | IM 适配器设置主组件（左列表 + 右编辑） |
| MODIFY | `src/__tests__/integration.test.tsx` | 新增 IM 适配器相关品牌/渲染验证 |

## UI 设计约束

- 深色主题，复用现有 design tokens
- 使用 `IconBadge` + lucide-react 图标
- 按钮使用 `btn primary` / `btn ghost` 样式
- 表单使用 `form-field` 样式
- 模板编辑区使用 `terminal` 样式展示预览
- 所有交互元素 focus-visible 显示 2px 蓝色 outline
- icon-only button 必须有 `aria-label`

## 验证

- [ ] 设置中心出现「IM 适配器」标签页
- [ ] 4 个平台的适配器卡片展示在列表中
- [ ] 选中适配器可编辑基本信息、模板、路由规则
- [ ] 新增/删除适配器功能正常
- [ ] 项目设置中可勾选启用的 IM 渠道
- [ ] `npm test` 通过
- [ ] `npm run build` 通过
