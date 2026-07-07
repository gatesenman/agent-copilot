<script setup lang="ts">
/**
 * ProtocolBadge — 协议标识徽章 + 能力提示
 *
 * 在会话头部 / Agent 目录中标注当前连接走的协议，悬停展示能力矩阵。
 */
import { computed } from 'vue'

const props = defineProps<{
  /** 协议 id（a2a / acp / mcp / ag-ui / langgraph / dify / openai-compatible…） */
  protocol: string
  /** 能力覆盖（缺省用内置表） */
  capabilities?: { streaming?: boolean; tools?: boolean; hitl?: boolean; sharedState?: boolean; pipeline?: boolean }
}>()

/** 内置协议展示名与默认能力 */
const KNOWN: Record<string, { label: string; caps: string[] }> = {
  'openai-compatible': { label: 'OpenAI 兼容', caps: ['流式', '工具', 'HITL', '状态', '流水线'] },
  anthropic: { label: 'Anthropic', caps: ['流式', '工具', 'HITL', '状态', '流水线'] },
  gemini: { label: 'Gemini', caps: ['流式', '工具', 'HITL', '状态', '流水线'] },
  'ollama-native': { label: 'Ollama', caps: ['流式', '工具', 'HITL', '状态', '流水线'] },
  cohere: { label: 'Cohere', caps: ['流式', '工具', 'HITL', '状态', '流水线'] },
  'ag-ui': { label: 'AG-UI', caps: ['流式', '工具', '状态'] },
  langgraph: { label: 'LangGraph', caps: ['流式', '工具', 'HITL', '状态'] },
  langserve: { label: 'LangServe', caps: ['流式'] },
  agentscope: { label: 'AgentScope', caps: ['流式', '工具', '状态', '流水线'] },
  'ai-sdk': { label: 'AI SDK', caps: ['流式', '工具'] },
  dify: { label: 'Dify', caps: ['流式', '工具'] },
  coze: { label: 'Coze', caps: ['流式', '工具'] },
  fastgpt: { label: 'FastGPT', caps: ['流式'] },
  a2a: { label: 'A2A', caps: ['流式', 'HITL', '状态', '流水线'] },
  acp: { label: 'ACP', caps: ['流式', 'HITL', '状态', '流水线'] },
  'openai-assistants': { label: 'Assistants', caps: ['流式', '工具', 'HITL', '流水线'] },
  mcp: { label: 'MCP', caps: ['工具', '资源', '提示模板'] },
}

const info = computed(() => KNOWN[props.protocol] ?? { label: props.protocol, caps: [] })

const capText = computed(() => {
  if (props.capabilities) {
    const map: [keyof NonNullable<typeof props.capabilities>, string][] = [
      ['streaming', '流式'], ['tools', '工具'], ['hitl', 'HITL'], ['sharedState', '状态'], ['pipeline', '流水线'],
    ]
    return map.filter(([k]) => props.capabilities![k]).map(([, label]) => label).join(' · ')
  }
  return info.value.caps.join(' · ')
})
</script>

<template>
  <span class="ac-proto-badge" :title="capText ? `能力：${capText}` : undefined">
    <span class="ac-proto-badge__dot" aria-hidden="true" />
    {{ info.label }}
  </span>
</template>

<style scoped>
.ac-proto-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 9px; border-radius: 999px;
  border: 1px solid var(--ac-border); background: var(--ac-surface);
  font-size: 0.72rem; font-weight: 600; color: var(--ac-fg);
  cursor: default;
}
.ac-proto-badge__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ac-primary); }
</style>
