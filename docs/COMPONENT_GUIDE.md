# agent-copilot for Vue 3 — 组件使用文档

`agent-copilot` 是一套面向 Vue 3 的 AI Copilot 组件库：前端交互能力对齐 **CopilotKit** 全部核心能力，Agent 运行时能力对齐 **AgentScope（Java 版）** 的 5+1 层流水线架构（US-008 ~ US-014）。

- 双运行时：`HttpAgentRuntime`（SSE 对接 AgentScope Java 后端）与 `BrowserAgentRuntime`（浏览器直连 LLM，内置流水线模拟器，无需后端即可运行）
- 事件协议：AG-UI 风格 SSE 事件流，前后端完全对齐，可无缝切换
- HITL：支持工具级审批（renderAndWaitForResponse）与治理钩子级中断恢复

---

## 1. 安装与引入

组件库以源码形式交付，位于 `src/lib/agent-copilot`。复制该目录到你的项目即可，无三方运行时依赖（仅要求 Vue 3.4+）。

```ts
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import 'agent-copilot/theme/copilot-theme.css' // 主题样式（CSS 变量，可覆盖）

createApp(App).mount('#app')
```

## 2. 快速开始

### 2.1 用 CopilotProvider 包裹应用

```vue
<script setup lang="ts">
import { CopilotProvider, CopilotChat, BrowserAgentRuntime } from 'agent-copilot'

const runtime = new BrowserAgentRuntime({
  llm: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: 'sk-****',
    model: 'Qwen/Qwen2.5-72B-Instruct',
  },
  systemPrompt: '你是企业 AI 助手……',
})
</script>

<template>
  <CopilotProvider :runtime="runtime">
    <CopilotChat title="企业 AI 助手" />
  </CopilotProvider>
</template>
```

### 2.2 对接 AgentScope Java 后端

```ts
import { HttpAgentRuntime } from 'agent-copilot'

const runtime = new HttpAgentRuntime({
  baseUrl: 'http://localhost:8080/api/agent', // Spring Boot 后端
  headers: { Authorization: 'Bearer <token>' },
})
```

后端接口协议（详见 java-backend/README.md）：

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/chat` | POST (SSE) | 发起对话，流式返回 AG-UI 事件 |
| `/resume` | POST (SSE) | HITL 审批后恢复执行 |
| `/abort` | POST | 中止当前运行 |

## 3. 组件总览

| 组件 | 说明 |
| --- | --- |
| `CopilotProvider` | 根上下文，注入 runtime、管理全局状态 |
| `CopilotChat` | 内嵌式完整对话面板（消息流 / 输入框 / 建议 / 流水线可视化 / HITL 卡片） |
| `CopilotSidebar` | 右侧抽屉式对话栏 |
| `CopilotPopup` | 右下角浮动气泡弹窗 |
| `CopilotTextarea` | AI 补全文本域（Ctrl+K 改写、Tab 接受幽灵文本） |
| `PipelineTimeline` | AgentScope 5+1 层流水线阶段时间轴 |
| `AgentInspector` | 运行检视器（事件流 / 治理钩子 / Token 用量 / 共享状态） |
| `ToolCallCard` / `ApprovalCard` / `PayloadCard` | 生成式 UI 卡片（可被自定义渲染替换） |

### 3.1 CopilotChat Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | 取全局 `botName` | 标题栏文本 |
| `subtitle` | `string` | — | 标题栏副标题 |
| `initialMessage` | `string` | — | 无消息时显示的欢迎语 |
| `placeholder` | `string` | `'输入消息…'` | 输入框占位 |
| `pipeline` | `boolean` | 取全局配置 | 是否显示流水线时间轴 |
| `showHeader` | `boolean` | `true` | 是否显示标题栏 |
| `showReset` | `boolean` | `true` | 是否显示清空会话按钮 |

插槽：`#header`、`#empty`、`#message="{ message }"`（完全自定义消息渲染，Headless 用法）。

### 3.2 CopilotSidebar / CopilotPopup

在 `CopilotChat` 全部 Props 基础上增加：

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `defaultOpen` | `boolean` | `false` | 初始是否展开 |
| `width` | `string` | `'420px'` | Sidebar 宽度 / Popup 面板宽度 |

### 3.3 CopilotTextarea

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `v-model` | `string` | 文本值 |
| `autosuggestions` | `boolean` | 停顿后自动生成幽灵补全（Tab 接受） |
| `context` | `string` | 补全参考的业务上下文 |

快捷键：`Tab` 接受补全；`Ctrl/Cmd + K` 打开 AI 改写指令框。

## 4. Composables（对齐 CopilotKit Hooks）

| Composable | 对应 CopilotKit | 说明 |
| --- | --- | --- |
| `useCopilotReadable(options)` | `useCopilotReadable` | 向 Agent 暴露响应式应用状态（自动随组件卸载注销） |
| `useCopilotAction(action)` | `useCopilotAction` | 注册前端工具；支持 `render`（生成式 UI）与 `renderAndWaitForResponse`（HITL 审批） |
| `useCopilotChat()` | `useCopilotChat` | Headless 编程式对话控制（消息、发送、中止、重置） |
| `useCoAgent(name, initial)` | `useCoAgent` | 与 Agent 双向共享状态 |
| `useCoAgentStateRender(options)` | `useCoAgentStateRender` | Agent 状态变更时渲染自定义 UI |
| `useCopilotChatSuggestions(options)` | `useCopilotChatSuggestions` | 配置输入建议芯片（静态或按上下文动态生成） |
| `useCopilotAdditionalInstructions(text)` | `useCopilotAdditionalInstructions` | 追加系统指令片段 |
| `useLangGraphInterrupt(handler)` | `useLangGraphInterrupt` | 处理治理钩子中断（对齐 AgentScope 中断恢复语义） |

### 4.1 useCopilotReadable

```ts
import { computed } from 'vue'
import { useCopilotReadable } from 'agent-copilot'

useCopilotReadable({
  description: '当前工作项列表',
  value: computed(() => store.workItems),
})
```

### 4.2 useCopilotAction（含 HITL）

```ts
useCopilotAction({
  name: 'create_approval_flow',
  description: '为工作项创建审批流',
  parameters: [
    { name: 'workItemId', type: 'string', description: '工作项编号', required: true },
    { name: 'approverIds', type: 'string[]', description: '审批人编号' },
  ],
  // HITL：渲染审批卡片并等待用户决策
  renderAndWaitForResponse: ({ args, respond, status }) => ({
    component: MyApprovalCard,
    props: { args, respond, status },
  }),
  handler: async ({ workItemId, approverIds }) => {
    return await api.createRfq(requisitionId, supplierIds)
  },
})
```

### 4.3 useCoAgent 共享状态

```ts
const { state, setState } = useCoAgent('procurement', { activeRfq: null })
// Agent 侧通过 STATE_DELTA 事件更新，前端 setState 会同步给 Agent
```

## 5. 全量配置项（CopilotConfig）

`CopilotProvider :config` 支持 80+ 配置项，全部可选（有合理默认值）。

### 5.1 运行时与协议

| 配置 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `runtime` | `'browser' \| 'http'` | `'browser'` | 浏览器直连 LLM/框架 / 对接 Java 后端 |
| `provider` | `string` | — | 厂商预设名（28 种，见第 12 章），自动推断 apiBase/model/protocol |
| `protocol` | `string` | `'openai-compatible'` | 显式协议（覆盖 provider 推断） |
| `protocolOptions` | `Record<string,unknown>` | — | 协议特有参数（dify 的 user、coze 的 botId、azure 的 apiVersion 等） |
| `endpoint` | `string` | `/api/agent` | http 模式后端地址；B 类协议的服务端点 |
| `apiBase` / `apiKey` / `model` | `string` | 硅基流动 | browser 模式 LLM 配置 |
| `headers` | `Record<string,string>` | — | 附加请求头 |
| `requestTimeout` | `number` | `90000` | 请求超时毫秒 |

### 5.2 Agent 行为

| 配置 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `agentType` | `'chat' \| 'code' \| 'design' \| 'data' \| 'custom'` | `'custom'` | 预设：自动调整工具展示 / 温度 / 消息操作 |
| `systemPrompt` | `string` | — | 系统提示词 |
| `temperature` / `maxTokens` | `number` | `0.3` / `2048` | 采样参数 |
| `maxRetries` / `retryDelay` | `number` | `2` / `1200` | LLM 调用重试 |
| `maxIterations` | `number` | `8` | ReAct 最大迭代轮数 |

### 5.3 HITL 审批

| 配置 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `approvalMode` | `'auto' \| 'gate' \| 'always'` | `'gate'` | 快捷字段 |
| `approval.mode` | 同上 | — | 同 approvalMode |
| `approval.gateTools` | `string[]` | — | gate 模式下强制审批的工具名 |
| `approval.timeoutSeconds` | `number` | `0` | 审批超时自动拒绝（0 不超时） |

### 5.4 消息体验

| 配置 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `showTimestamps` | `boolean` | `false` | 消息时间戳 |
| `showAvatars` | `boolean` | `true` | 消息头像 |
| `messageActions` | `{ copy, regenerate, edit, feedback }` 或 `false` | 全开 | 悬浮操作栏 |
| `markdown.codeHighlight` | `boolean` | `true` | 代码块高亮 |
| `markdown.linkTarget` | `'_blank' \| '_self'` | `'_blank'` | 链接打开方式 |
| `welcomeScreen` | `{ title, subtitle, icon, hints[] }` | — | 空态欢迎屏（hints 点击直接发送） |
| `streaming.enabled` | `boolean` | `true` | 流式输出 |
| `streaming.typewriterSpeed` | `number` | `0` | 打字机限速（0 不限） |
| `toolDisplay.mode` | `'inline' \| 'collapsed' \| 'hidden'` | `'inline'` | 工具调用展示形态 |
| `toolDisplay.icons` | `Record<string,string>` | — | 工具图标映射 |
| `toolDisplay.showArgs` / `showResult` | `boolean` | `true` | 参数/结果可见性 |

### 5.5 输入与会话

| 配置 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `sendOnEnter` | `boolean` | `true` | Enter 发送（已处理 CJK 输入法合成） |
| `inputMaxLength` | `number` | `4000` | 输入长度上限 |
| `attachments` | `{ enabled, accept[], maxSize, maxCount }` | 关闭 | 附件上传 |
| `draftPersistence` | `boolean` | `false` | 输入草稿持久化 |
| `persistence.mode` | `'none' \| 'local' \| 'session'` | `'none'` | 会话历史持久化 |
| `persistence.historyLimit` | `number` | `100` | 保留最近 N 条 |
| `rateLimit` | `number` | `0` | 每分钟最大发送条数 |

### 5.6 外观与文案

| 配置 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `theme` / `brandColor` / `radius` / `density` | — | light | 主题体系 |
| `botName` / `botAvatar` / `userAvatar` | `string` | — | 角色形象 |
| `labels` | `LabelsConfig`（20 项） | 中文 | 全部 UI 文案可覆盖（国际化/白标） |

### 5.7 可观测性与回调

| 配置 | 类型 | 说明 |
| --- | --- | --- |
| `showPipeline` / `showReActTrace` / `showGovernance` / `showTokenUsage` | `boolean` | 检查器开关 |
| `inspector.tabs` | 数组 | 检查器页签定制 |
| `inspector.traceVerbosity` | `'minimal' \| 'normal' \| 'verbose'` | 轨迹详细度 |
| `callbacks.onMessageSent` | `(msg) => void` | 消息发出 |
| `callbacks.onResponseStart` / `onResponseComplete` | — | 响应生命周期 |
| `callbacks.onToolCall` / `onInterrupt` / `onInterruptResolved` | — | 工具与 HITL |
| `callbacks.onError` / `onUsage` / `onFeedback` / `onSuggestionClick` | — | 错误 / 用量 / 反馈 / 建议点击 |

## 6. AG-UI 结构化载荷（16 种）

工具 handler 返回值带 `__payload`（或 `__payloads` 数组）字段即触发生成式 UI 渲染，其余字段作为工具结果继续给模型：

```ts
useCopilotAction({
  name: 'query_sales',
  description: '查询销售数据',
  handler: async ({ region }) => ({
    __payload: {
      type: 'chart',
      title: `${region} 销售趋势`,
      data: { kind: 'line', labels: [...], series: [...] },
    },
    summary: '华东区 Q2 环比增长 12%',  // 这部分给模型
  }),
})
```

| 类型 | 适用 Agent | data 形状要点 |
| --- | --- | --- |
| `card` | chat | 键值对对象 |
| `document` | chat | `{ content }` Markdown 文本 |
| `plan` | chat | `{ steps: [{ title, description, status }] }` |
| `citations` | chat (RAG) | `{ items: [{ title, snippet, url, source, score }] }` |
| `comparison` | 通用 | 同 table |
| `code` | code | `{ language, code, filename, showLineNumbers, highlightLines }` |
| `diff` | code | `{ lines: [{ type: add/del/ctx/hunk, text }], additions, deletions }` |
| `file_tree` | code | `{ root: [{ name, type, children, badge }] }` |
| `terminal` | code | `{ lines: [{ kind: cmd/out/err, text }], exitCode }` |
| `table` | data | `{ columns, rows, sortable, filterable, pageSize, exportable }` |
| `chart` | data | `{ kind: bar/line/pie, labels, series, unit }` |
| `metrics` | data | `{ items: [{ label, value, unit, delta, invertDelta }], columns }` |
| `sql_result` | data | `{ sql, columns, rows, rowCount, elapsedMs }` |
| `image` | design | `{ src, alt, prompt, caption }` |
| `palette` | design | `{ colors: [{ hex, name, usage }], note }` |
| `design_spec` | design | `{ sections: [{ title, items: [{ label, value, preview }] }] }` |

自定义渲染：

```ts
import { registerPayloadRenderer } from 'agent-copilot'
import MyKanban from './MyKanban.vue'

registerPayloadRenderer('kanban', MyKanban) // 之后 __payload: { type: 'kanban', ... } 用你的组件渲染
```

## 7. 四类 Agent 接入指南

`agentType` 预设 + 对应载荷 Action 即可搭建垂直 Agent（完整示例见组件演示页与 `src/demo/gallery/agent-demos.ts`）：

- **Chat Agent**：`agentType: 'chat'`，注册 `search_knowledge`（返回 citations 载荷）与 `show_plan`。工具卡默认折叠，突出对话流。
- **Code Agent**：`agentType: 'code'`，注册 `show_code` / `show_diff` / `run_tests`（terminal + file_tree）。温度自动降至 0.1，工具卡默认展开。
- **Data Agent**：`agentType: 'data'`，注册 `query_data`（sql_result）/ `show_chart` / `show_metrics` / `show_table`。
- **Design Agent**：`agentType: 'design'`，注册 `show_palette` / `show_design_spec` / `show_image`。温度自动升至 0.7。

## 8. AgentScope 能力映射

| AgentScope（Java）能力 | 组件库对应 |
| --- | --- |
| US-008 输入理解与上下文引导 | 流水线 `input_understanding` 阶段事件 + PipelineTimeline |
| US-009 本体推理与可执行上下文 | `ontology_reasoning` 阶段 + ExecutableContext 事件载荷 |
| US-010 执行就绪门 | `readiness_gate` 阶段，`GATE_PASS / GATE_CLARIFY` 事件 |
| US-011 ReAct 业务执行 | `react_execution` 阶段，`TOOL_CALL_* / TEXT_MESSAGE_*` 流式事件 |
| US-012 治理钩子 | `GOVERNANCE_*` 事件 + AgentInspector 钩子面板 + HITL 中断 |
| US-013 输出管理 | `output_management` 阶段，PayloadCard 结构化载荷渲染 |
| US-014 流水线编排 | `RUN_STARTED / STAGE_* / RUN_FINISHED` 全生命周期事件 |
| 记忆（Memory） | 会话内多轮 Memory + `MEMORY_UPDATED` 事件 |
| 中断与恢复（Interruption） | `INTERRUPT` 事件 + `runtime.resume()` |

## 9. 事件协议（AG-UI 风格 SSE）

```text
RUN_STARTED, STAGE_STARTED, STAGE_FINISHED,
TEXT_MESSAGE_START, TEXT_MESSAGE_CONTENT, TEXT_MESSAGE_END,
TOOL_CALL_START, TOOL_CALL_ARGS, TOOL_CALL_END, TOOL_CALL_RESULT,
STATE_SNAPSHOT, STATE_DELTA, GOVERNANCE_HOOK, INTERRUPT,
GATE_RESULT, PAYLOAD, MEMORY_UPDATED, RUN_FINISHED, RUN_ERROR
```

每个事件为一行 `data: {json}`。`HttpAgentRuntime` 与 Java 后端的 `AgUiEvent` 一一对应。

## 10. 主题定制

所有颜色 / 圆角 / 字体通过 CSS 变量控制（`--cp-*`），在你自己的样式中覆盖：

```css
:root {
  --cp-primary: #0f6f5c;
  --cp-radius: 10px;
}
```

## 11. 常见问题

- **不接后端能用吗？** 可以，使用 `BrowserAgentRuntime`，它在浏览器内实现了完整 5+1 流水线模拟并直连 LLM（如硅基流动）。
- **如何切到生产 Java 后端？** 仅需把 runtime 换成 `HttpAgentRuntime`，组件与 composables 零改动。
- **CORS？** 浏览器直连硅基流动已验证可用；Java 后端需在 Spring 中配置 CORS（模板已含）。

## 12. 多协议接入（28 种厂商/框架）

协议适配层位于 `protocols/`，UI 组件与事件体系完全无关注：任何协议最终都归一化为 AgentEvent。

### 12.1 两类协议

- **A 类：模型协议**（本地 ReAct 循环，全能力——前端工具 / HITL / 流水线 / 共享状态）
  - `openai-compatible` — 一个适配器覆盖 20 家厂商预设
  - `anthropic` / `gemini` / `ollama-native` / `cohere` — 专有格式双向转换
- **B 类：Agent 框架协议**（服务端自带循环，能力以适配器声明为准）
  - `ag-ui`（标准协议）/ `langgraph`（HITL 中断/恢复）/ `langserve` / `agentscope`（本项目 Java 后端）
  - `ai-sdk`（Vercel useChat 端点）/ `dify` / `coze` / `fastgpt`

### 12.2 厂商预设（config.provider 一个字段接入）

OpenAI 兼容（20）：`openai` `azure-openai` `siliconflow` `deepseek` `moonshot` `zhipu` `qwen`
`hunyuan` `doubao` `baichuan` `minimax` `yi` `stepfun` `groq` `mistral` `xai` `together`
`openrouter` `vllm` `ollama-v1`；专有模型（4）：`anthropic` `gemini` `ollama-native` `cohere`；
Agent 框架（8）：`ag-ui` `langgraph` `langserve` `agentscope` `ai-sdk` `dify` `coze` `fastgpt`。

```vue
<!-- DeepSeek：一行切换 -->
<CopilotProvider :config="{ provider: 'deepseek', apiKey: 'sk-...' }">

<!-- Claude -->
<CopilotProvider :config="{ provider: 'anthropic', apiKey: 'sk-ant-...' }">

<!-- LangGraph Platform（支持 HITL 中断/恢复） -->
<CopilotProvider :config="{
  provider: 'langgraph',
  endpoint: 'http://localhost:2024',
  protocolOptions: { assistantId: 'agent' },
}">

<!-- Dify（工具由服务端编排） -->
<CopilotProvider :config="{
  provider: 'dify',
  apiKey: 'app-xxx',
  protocolOptions: { user: 'user-123' },
}">
```

### 12.3 自定义协议扩展

```ts
import { registerAgentProtocol, registerModelProtocol } from '@od/agent-copilot-vue'

registerAgentProtocol('my-agent', myAdapter)     // 实现 AgentStreamAdapter
registerModelProtocol('my-model', myFactory)     // 实现 (opts) => ModelAdapter
// 之后 config.protocol = 'my-agent' 即可使用
```

### 12.4 验证状态

`openai-compatible`（硅基流动）已端到端真实验证；其余适配器按各协议官方文档实现并通过
mock 流解析冒烟测试，接入真实服务时如遇字段差异，可用 `registerAgentProtocol` 覆盖内置实现。
