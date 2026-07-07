<script setup lang="ts">
/**
 * 协议接入矩阵 —— 展示协议适配层支持的全部厂商预设与能力，
 * 点击行可查看对应的最小接入配置代码。
 */
import { computed, ref } from 'vue'
import { listProviderPresets, type ProviderPreset } from '../../lib/agent-copilot/protocols'

type Category = 'openai' | 'model' | 'agent'

const CATEGORY_LABELS: Record<Category, { title: string; desc: string }> = {
  openai: {
    title: 'OpenAI 兼容协议（A 类）',
    desc: '一个适配器覆盖 20 家厂商。本地 ReAct 循环，全能力：前端工具 / HITL 审批 / 流水线 / 共享状态。',
  },
  model: {
    title: '专有模型协议（A 类）',
    desc: '厂商私有消息格式与流帧，适配器双向转换。同样跑本地 ReAct 循环，全能力。',
  },
  agent: {
    title: 'Agent 框架协议（B 类）',
    desc: '服务端自带 Agent 循环，适配器把远端事件流归一化为 AgentEvent。能力以适配器声明为准。',
  },
}

function categoryOf(p: ProviderPreset): Category {
  if (p.protocol === 'openai-compatible') return 'openai'
  if (['anthropic', 'gemini', 'ollama-native', 'cohere'].includes(p.protocol)) return 'model'
  return 'agent'
}

const presets = listProviderPresets()
const groups = computed(() => {
  const g: Record<Category, ProviderPreset[]> = { openai: [], model: [], agent: [] }
  for (const p of presets) g[categoryOf(p)].push(p)
  return g
})

const selected = ref<ProviderPreset | null>(null)

function configSnippet(p: ProviderPreset): string {
  const lines = [`provider: '${p.id}',`]
  if (categoryOf(p) === 'agent') {
    lines.push(`endpoint: '${p.apiBase}',`)
    if (p.id === 'dify') lines.push(`apiKey: 'app-xxx',`, `protocolOptions: { user: 'user-123' },`)
    else if (p.id === 'coze') lines.push(`apiKey: 'pat_xxx',`, `protocolOptions: { botId: 'bot_id' },`)
    else if (p.id === 'langgraph') lines.push(`protocolOptions: { assistantId: 'agent' },`)
    else if (p.id === 'fastgpt') lines.push(`apiKey: 'fastgpt-xxx',`)
    else if (p.id !== 'agentscope' && p.id !== 'ai-sdk') lines.push(`apiKey: '...',`)
  } else {
    lines.push(`apiKey: 'sk-...',`)
    if (p.defaultModel) lines.push(`model: '${p.defaultModel}', // 可省略，默认此模型`)
    if (p.id === 'azure-openai') lines.push(`apiBase: 'https://{res}.openai.azure.com/openai/deployments/{dep}',`, `protocolOptions: { apiVersion: '2024-06-01' },`)
  }
  return `<CopilotProvider :config="{\n  ${lines.join('\n  ')}\n}">`
}
</script>

<template>
  <div class="pm">
    <section v-for="(cat, key) in CATEGORY_LABELS" :key="key" class="pm-group">
      <h2 class="pm-group__title">{{ cat.title }}<span class="pm-group__count">{{ groups[key].length }}</span></h2>
      <p class="pm-group__desc">{{ cat.desc }}</p>
      <div class="pm-table" role="table">
        <button
          v-for="p in groups[key]"
          :key="p.id"
          type="button"
          class="pm-row"
          :class="{ 'is-active': selected?.id === p.id }"
          @click="selected = selected?.id === p.id ? null : p"
        >
          <span class="pm-row__label">{{ p.label }}</span>
          <code class="pm-row__id">{{ p.id }}</code>
          <span v-if="p.defaultModel" class="pm-row__model">{{ p.defaultModel }}</span>
          <span v-if="p.notes" class="pm-row__notes">{{ p.notes }}</span>
        </button>
      </div>
      <pre v-if="selected && categoryOf(selected) === key" class="pm-code"><code>{{ configSnippet(selected) }}</code></pre>
    </section>

    <p class="pm-note">
      第 29+ 种协议：用 <code>registerAgentProtocol(id, adapter)</code> /
      <code>registerModelProtocol(id, factory)</code> 注册自定义适配器后，
      即可在 <code>config.protocol</code> 中直接使用。
    </p>
  </div>
</template>

<style scoped>
.pm {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.pm-group__title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 650;
  color: var(--ac-fg);
  display: flex;
  align-items: center;
  gap: 8px;
}
.pm-group__count {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ac-primary);
  background: color-mix(in srgb, var(--ac-primary) 10%, transparent);
  border-radius: 999px;
  padding: 1px 8px;
}
.pm-group__desc {
  margin: 0 0 12px;
  font-size: 12.5px;
  color: var(--ac-muted);
  line-height: 1.6;
  max-width: 720px;
  text-wrap: pretty;
}
.pm-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ac-border);
  border-radius: 10px;
  overflow: hidden;
}
.pm-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 9px 14px;
  background: var(--ac-surface);
  border: none;
  border-bottom: 1px solid var(--ac-border);
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}
.pm-row:last-child { border-bottom: none; }
.pm-row:hover { background: color-mix(in srgb, var(--ac-primary) 4%, var(--ac-surface)); }
.pm-row.is-active { background: color-mix(in srgb, var(--ac-primary) 8%, var(--ac-surface)); }
.pm-row__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ac-fg);
  min-width: 160px;
}
.pm-row__id {
  font-size: 11.5px;
  color: var(--ac-primary);
  background: color-mix(in srgb, var(--ac-primary) 7%, transparent);
  border-radius: 5px;
  padding: 1px 7px;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
}
.pm-row__model {
  font-size: 11.5px;
  color: var(--ac-muted);
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
}
.pm-row__notes {
  font-size: 11.5px;
  color: var(--ac-muted);
  flex-basis: 100%;
}
.pm-code {
  margin: 10px 0 0;
  padding: 12px 14px;
  border: 1px solid var(--ac-border);
  border-radius: 10px;
  background: var(--ac-surface);
  font-size: 12px;
  line-height: 1.65;
  overflow-x: auto;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  color: var(--ac-fg);
}
.pm-note {
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ac-muted);
  border: 1px dashed var(--ac-border);
  border-radius: 10px;
  padding: 12px 14px;
  margin: 0;
}
.pm-note code {
  font-size: 11.5px;
  color: var(--ac-primary);
}
</style>
