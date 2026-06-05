# AI 助手模型配置设计

日期：2026-05-16
状态：设计方案
效果参考：`mockups/ai-assistant-settings.html`
数据模型：`WorkbenchData.aiAssistantModel?: { providerId: string; modelName: string }`（已在 `workbench.ts:84-87`）

## 目标

在 Settings 模型配置 tab 底部增加 AI 工程助手默认模型选择区域。

## 插入位置

`Settings.tsx` 中 `{activeTab === "models" && (` 区块内，`<div className="model-provider-list">` 之后、`</div> {/* panel-body */}` 之前。

## UI 布局

```
┌─ 模型配置 ─────────────────────────────────────────────┐
│  [供应商卡片列表]                                        │
│  ┌─ AI 工程助手默认模型 ───────────────────────────┐    │
│  │  当前：DeepSeek / deepseek-v4-pro                 │    │
│  ├──────────────────────────────────────────────────┤    │
│  │  模型供应商  [DeepSeek ▼]    模型名称  [deepseek-v4-pro ▼] │
│  │  [保存配置]                                       │    │
│  │  AI 工程助手将在所有页面对话中使用此模型。         │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 交互流程

1. 供应商下拉列出所有 `enabled === true` 的 `modelProviders`
2. 选择供应商 → 模型下拉联动过滤该 provider 的 `models`（`ModelInfo[]`）
3. 选择模型 → 保存按钮可用
4. 点击保存 → 写入 `data.aiAssistantModel = { providerId, modelName }`
5. header 显示当前配置（未配置时显示"未配置"）

## 涉及文件

| 操作 | 文件 | 说明 |
|------|------|------|
| MODIFY | `src/components/Settings.tsx` | 新增 AI 助手配置 UI（供应商下拉+模型联动+保存） |
| MODIFY | `src/styles/pages.css` | `.ai-assistant-section` 紫色边框样式 |
| MODIFY | `src/__tests__/model-config.test.tsx` | 追加 2 条测试 |
