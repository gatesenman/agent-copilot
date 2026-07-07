<script setup lang="ts">
/** 协议徽章演示：切换协议 id 查看能力标签 */
import ProtocolBadge from '../../../lib/agent-copilot/components/protocol/ProtocolBadge.vue'
import DocDemo from '../DocDemo.vue'
</script>

<template>
  <DocDemo
    title="协议徽章"
    description="按协议 id 显示展示名与能力标签（流式/工具/HITL/状态/流水线），能力可通过 capabilities 覆盖。"
    component-name="ProtocolBadge"
    usage="放在标题栏或 Agent 卡片上，标识当前接入协议及能力。传入协议 id 自动匹配 32 种预设的展示名与能力标签；自定义协议可用 capabilities 显式覆盖。"
    :props-table="[
      { name: 'protocol', type: 'string', description: '协议 id（如 a2a/acp/mcp/ag-ui/dify/langgraph/openai-compatible）' },
      { name: 'capabilities', type: 'ProtocolCapability[]', description: '能力标签覆盖：streaming/tools/hitl/state/pipeline' },
      { name: 'size', type: `'sm' | 'md'`, default: `'md'`, description: '尺寸' },
    ]"
    :controls="[
      { name: 'protocol', label: '协议', type: 'select', default: 'a2a', options: [
        { label: 'A2A', value: 'a2a' },
        { label: 'ACP', value: 'acp' },
        { label: 'MCP', value: 'mcp' },
        { label: 'AG-UI', value: 'ag-ui' },
        { label: 'LangGraph', value: 'langgraph' },
        { label: 'Dify', value: 'dify' },
        { label: 'OpenAI 兼容', value: 'openai-compatible' },
      ] },
    ]"
  >
    <template #default="{ values }">
      <div class="ac-root">
        <ProtocolBadge :protocol="String(values.protocol)" />
      </div>
    </template>
  </DocDemo>
</template>
