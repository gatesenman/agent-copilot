/**
 * llms.txt 生成器 —— 将组件库的全部公开能力汇编成一份 AI 可读的 Markdown 文档。
 * 数据源：component-api.ts（全组件 Props/事件/插槽，与源码同步维护）+ 运行时协议与组合式 API 摘要。
 * 参照 https://llmstxt.org 约定：单文件、纯 Markdown、结构可预测，便于粘贴给任何 LLM。
 */
import { COMPONENT_API_GROUPS } from '../gallery/component-api'

const HEADER = `# agent-copilot（Vue 3 企业级 AI Copilot UI Kit）

> 面向 Agentic 应用的 Vue 3 组件库：对话 / 生成式 UI 载荷卡 / Agent 工作台 / 企业治理 / A2A·MCP 协议组件，
> 配套 CopilotKit 风格组合式 API 与事件流运行时协议。本文档供 AI 编码助手理解并正确使用本库。

## 安装与最小接入

\`\`\`bash
pnpm add agent-copilot
\`\`\`

\`\`\`vue
<script setup lang="ts">
import { CopilotProvider, CopilotChat } from 'agent-copilot'
import 'agent-copilot/theme/copilot-theme.css'
</script>

<template>
  <!-- config.runtime: 'browser'（浏览器直连 LLM）或 'http'（对接任意事件流后端） -->
  <CopilotProvider :config="{ runtime: 'http', endpoint: '/api/agent' }">
    <CopilotChat title="企业 AI 助手" />
  </CopilotProvider>
</template>
\`\`\`

## 组合式 API（CopilotKit 风格）

| API | 用途 |
| --- | --- |
| \`useCopilot()\` | 取会话 store：messages / isRunning / sendMessage / abort / clearMessages 等 |
| \`useCopilotReadable({ description, value })\` | 把宿主应用状态注册为 AI 可读上下文（自动进 system prompt） |
| \`useCopilotAction({ name, description, parameters, handler, render? })\` | 注册前端工具供 AI 调用；render 返回载荷即生成式 UI |
| \`useCopilotChatSuggestions({ instructions })\` | 注册输入区智能建议 |
| \`useCopilotAdditionalInstructions({ instructions })\` | 追加系统级指令 |
| \`useCoAgent({ name, initialState })\` | 与 Agent 共享读写状态（AGENT_STATE_DELTA 双向同步） |
| \`useCoAgentStateRender({ name, render })\` | Agent 状态变化时渲染自定义 UI |
| \`useLangGraphInterrupt({ render })\` | HITL 中断（审批 / 表单）自定义渲染 |
| \`useCommands(commands)\` | 注册斜杠命令（ChatInput 内 CommandPalette 消费） |
| \`useTheme()\` | 亮 / 暗 / 跟随系统三态主题 |

## 运行时事件协议（SSE / 浏览器内一致）

生命周期：\`RUN_STARTED → … → RUN_FINISHED | RUN_ERROR\`
文本流：\`TEXT_MESSAGE_START / TEXT_DELTA / TEXT_MESSAGE_END\`；思考流：\`THINKING_START / THINKING_DELTA / THINKING_END\`
工具：\`TOOL_CALL_START / TOOL_CALL_ARGS / TOOL_CALL_RESULT\`；生成式 UI：\`STRUCTURED_PAYLOAD\`（16 种 payload type）
Agentic：\`TASK_UPDATE / PLAN_UPDATE / FILE_CHANGE / TERMINAL_APPEND / FORM_REQUEST / INTERRUPT / CLARIFY\`
其余：\`STAGE_STARTED / STAGE_FINISHED / REACT_STEP / GOVERNANCE_EVENT / GATE_DECISION / AGENT_STATE_DELTA / USAGE / DEGRADE\`

## 关键规则

1. 所有组件必须在 \`CopilotProvider\` 子树内使用（除纯展示卡可独立传 props）。
2. 生成式 UI：后端发 \`STRUCTURED_PAYLOAD\` 事件（{ type, data }），\`PayloadCard\` 自动分发到 16 种载荷卡；自定义类型用 \`registerPayloadRenderer(type, component)\`。
3. HITL 审批：设 \`config.approvalMode: 'gate'\`，危险工具触发 \`INTERRUPT\`，UI 呈现 ApprovalCard，经 \`/resume\` 端点恢复。
4. 主题：全部样式经 \`--ac-*\` CSS 变量（bg/fg/surface/border/primary/muted…），暗色由根类 \`.ac-dark\` 切换。
5. 工具调用渲染统一使用 \`ToolActionCard\`（语义化图标 + 参数摘要 + 耗时）。

---

# 组件 API 参考（按域分组）
`

function propsTable(rows: { name: string; type: string; default?: string; desc: string }[]): string {
  if (!rows.length) return '_无 props_\n'
  const lines = ['| Prop | 类型 | 默认 | 说明 |', '| --- | --- | --- | --- |']
  for (const p of rows) lines.push(`| ${p.name} | \`${p.type.replace(/\|/g, '\\|')}\` | ${p.default ? `\`${p.default.replace(/\|/g, '\\|')}\`` : '—'} | ${p.desc} |`)
  return lines.join('\n') + '\n'
}

/** 生成完整 llms.txt Markdown 文本 */
export function generateLlmsDoc(): string {
  const parts: string[] = [HEADER]
  for (const group of COMPONENT_API_GROUPS) {
    parts.push(`\n## ${group.label}\n`)
    for (const c of group.components) {
      parts.push(`### ${c.name}\n`)
      parts.push(`${c.brief}。**何时用**：${c.when}\n`)
      parts.push(propsTable(c.props))
      if (c.events?.length) {
        parts.push('事件：' + c.events.map((e) => `\`@${e.name}(${e.payload})\` ${e.desc}`).join('；') + '\n')
      }
      if (c.slots?.length) {
        parts.push('插槽：' + c.slots.map((s) => `\`#${s.name}\` ${s.desc}`).join('；') + '\n')
      }
    }
  }
  parts.push(`\n---\n\n_本文档由 component-api.ts 单一数据源自动生成，与站内「全组件 API 速查」保持一致。_\n`)
  return parts.join('\n')
}
