<script setup lang="ts">
/**
 * ProtocolBadge — 协议标识徽章 + 能力提示
 *
 * 在会话头部 / Agent 目录中标注当前连接走的协议，悬停展示能力矩阵。
 */
import { computed } from 'vue'
import { useI18n } from '../../i18n'

const props = defineProps<{
  /** 协议 id（a2a / acp / mcp / ag-ui / langgraph / dify / openai-compatible…） */
  protocol: string
  /** 能力覆盖（缺省用内置表） */
  capabilities?: { streaming?: boolean; tools?: boolean; hitl?: boolean; sharedState?: boolean; pipeline?: boolean }
}>()

const { t } = useI18n()

/** 能力标识 → 词条 key（渲染时翻译，避免把展示文案当状态） */
type CapKey = 'streaming' | 'tools' | 'hitl' | 'state' | 'pipeline' | 'resources' | 'prompts'
const CAP_I18N: Record<CapKey, string> = {
  streaming: 'proto.capStreaming',
  tools: 'proto.capTools',
  hitl: 'proto.capHitl',
  state: 'proto.capState',
  pipeline: 'proto.capPipeline',
  resources: 'proto.capResources',
  prompts: 'proto.capPrompts',
}

/** 内置协议展示名与默认能力（能力用标识存储，翻译在渲染层） */
const KNOWN: Record<string, { label: string; caps: CapKey[] }> = {
  'openai-compatible': { label: 'OpenAI Compatible', caps: ['streaming', 'tools', 'hitl', 'state', 'pipeline'] },
  anthropic: { label: 'Anthropic', caps: ['streaming', 'tools', 'hitl', 'state', 'pipeline'] },
  gemini: { label: 'Gemini', caps: ['streaming', 'tools', 'hitl', 'state', 'pipeline'] },
  'ollama-native': { label: 'Ollama', caps: ['streaming', 'tools', 'hitl', 'state', 'pipeline'] },
  cohere: { label: 'Cohere', caps: ['streaming', 'tools', 'hitl', 'state', 'pipeline'] },
  'ag-ui': { label: 'AG-UI', caps: ['streaming', 'tools', 'state'] },
  langgraph: { label: 'LangGraph', caps: ['streaming', 'tools', 'hitl', 'state'] },
  langserve: { label: 'LangServe', caps: ['streaming'] },
  agentscope: { label: 'AgentScope', caps: ['streaming', 'tools', 'state', 'pipeline'] },
  'ai-sdk': { label: 'AI SDK', caps: ['streaming', 'tools'] },
  dify: { label: 'Dify', caps: ['streaming', 'tools'] },
  coze: { label: 'Coze', caps: ['streaming', 'tools'] },
  fastgpt: { label: 'FastGPT', caps: ['streaming'] },
  a2a: { label: 'A2A', caps: ['streaming', 'hitl', 'state', 'pipeline'] },
  acp: { label: 'ACP', caps: ['streaming', 'hitl', 'state', 'pipeline'] },
  'openai-assistants': { label: 'Assistants', caps: ['streaming', 'tools', 'hitl', 'pipeline'] },
  mcp: { label: 'MCP', caps: ['tools', 'resources', 'prompts'] },
}

const info = computed(() => KNOWN[props.protocol] ?? { label: props.protocol, caps: [] as CapKey[] })

const capText = computed(() => {
  if (props.capabilities) {
    const map: [keyof NonNullable<typeof props.capabilities>, CapKey][] = [
      ['streaming', 'streaming'], ['tools', 'tools'], ['hitl', 'hitl'], ['sharedState', 'state'], ['pipeline', 'pipeline'],
    ]
    return map.filter(([k]) => props.capabilities![k]).map(([, cap]) => t(CAP_I18N[cap])).join(' · ')
  }
  return info.value.caps.map((cap) => t(CAP_I18N[cap])).join(' · ')
})
</script>

<template>
  <span class="ac-proto-badge" :title="capText ? `${t('proto.capsPrefix')}${capText}` : undefined">
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
