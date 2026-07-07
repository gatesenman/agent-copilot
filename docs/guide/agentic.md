# Agentic 工作台

面向 Coding Agent / 深度执行场景的完整交互体系：模式选择、思考过程、任务追踪、计划审批、变更审查、工具执行、双向表单，以及右侧文件/终端/浏览器面板。

## 运行模式（ModeSelector）

对齐 Cursor / Claude Code 的权限模型，四种模式控制 Agent 的自主程度：

| 模式 | 说明 |
| --- | --- |
| `confirm_edits` | 变更前确认 — 每次文件修改需人工批准 |
| `auto_edit` | 自动编辑 — 自动写文件，命令执行仍需确认 |
| `plan` | 计划模式 — 只产出计划，批准后才执行 |
| `full_access` | 完全访问 — 全自主执行（谨慎使用） |

[demo:mode-selector]

模式经 `RunInput.metadata.agentMode` 传给后端，切换回调 `agentic.onModeChange` 可做权限校验。

## 思考过程(ThinkingBlock)

`THINKING_START / THINKING_DELTA / THINKING_END` 事件累积到 `message.thinking`，渲染为可折叠思考块，显示耗时。输入框可开启"深度思考"开关（`agentic.thinkingToggle: true`）。

[demo:thinking-block]

## 任务追踪（TaskTracker）

`TASK_UPDATE` 事件驱动，支持全量替换（`{ tasks }`）或单条 upsert（`{ task }`）。

[demo:task-tracker]

## 计划审批（PlanPanel）

`PLAN_UPDATE` 事件下发计划草案（`status: 'draft'`），人审阅后批准/驳回。`editable` 模式下可增删改步骤后再批准 — 计划即协作契约。

[demo:plan-panel]

## 变更审查（ChangeReviewPanel）

`FILE_CHANGE` 事件推送文件变更（create / modify / delete / rename + diff），人逐个或批量接受/拒绝。决策经 `onFileChangeReview` 回传。

[demo:change-review]

## Agent 追问表单（AgentFormCard）

Agent 执行中需要人补充信息时，通过 `FORM_REQUEST` 事件下发表单 schema（文本/下拉/单选/多选/日期/数字），提交经 `onFormSubmit` 回传 — 这是 HITL 中断之外更结构化的双向交互。

[demo:agent-form]

## 工具执行卡（ToolActionCard）

`read_file / write_file / edit_file / delete_file / run_command / search / browse` 七种特化渲染，各自带图标、路径徽章与结果摘要。

## 右侧面板体系

- **FilePanel** — 文件树 + 代码预览（`WorkspaceFile[]` 数据驱动）
- **TerminalPanel** — 命令/输出/错误流（`TERMINAL_APPEND` 事件）
- **BrowserPanel** — iframe 预览 + 地址栏 + 刷新
- **PanelContainer** — 多页签容器，徽标显示待处理数
- **AgentWorkspace** — 组合 Shell：左会话列表 + 中聊天 + 右面板
- **ArtifactPanel** — 会话产物归集：自动从消息流收集代码 / 表格 / 图表 / 图片等产出型载荷，支持内联预览、单个下载与整段会话导出

完整体验见「解决方案 → Coding Agent 工作台」。

## 产物归集与会话导出（ArtifactPanel）

```vue
<script setup lang="ts">
import { ArtifactPanel, useCopilot } from 'agent-copilot'
const store = useCopilot()
</script>

<template>
  <!-- 传入消息流即可，产物清单自动维护 -->
  <ArtifactPanel :messages="store.messages.value" />
</template>
```

也可以脱离组件直接用导出工具：

```ts
import { exportSession, sessionToMarkdown } from 'agent-copilot'

// 一键下载 Markdown（含代码块 / 表格 / 图表数据序列化）
exportSession(messages, { format: 'markdown', title: '本次会话记录' })

// 或拿到字符串自行处理（发送到后端归档等）
const md = sessionToMarkdown(messages)
```

## 配置一览

```ts
const config: CopilotConfig = {
  agentic: {
    mode: 'confirm_edits',          // 初始模式
    availableModes: ['confirm_edits', 'plan'],  // 限制可用模式
    onModeChange: (m) => {},        // 模式切换回调
    showThinking: true,             // 显示思考块
    thinkingToggle: true,           // 输入框显示思考开关
  },
  onFileChangeReview: (id, decision) => {},  // 变更审查回传
  onPlanDecision: (planId, decision, steps) => {},  // 计划审批回传
  onFormSubmit: (formId, values) => {},      // 表单提交回传
  onVoiceInput: async () => '识别文本',       // 语音识别（可选）
}
```
