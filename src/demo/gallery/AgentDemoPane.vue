<script setup lang="ts">
/**
 * 单个 Agent 类型的实时演示容器：
 * 独立 CopilotProvider 上下文 + 批量注册该 Agent 的 Actions + 内嵌 CopilotChat。
 */
import type { CopilotActionDef, CopilotConfig } from '../../lib/agent-copilot'
import CopilotProvider from '../../lib/agent-copilot/components/CopilotProvider.vue'
import CopilotChat from '../../lib/agent-copilot/components/chat/CopilotChat.vue'
import ActionRegistrar from './ActionRegistrar.vue'

defineProps<{
  config: CopilotConfig
  actions: CopilotActionDef[]
  height?: string
}>()
</script>

<template>
  <CopilotProvider :config="config">
    <ActionRegistrar :actions="actions" />
    <div class="demo-pane" :style="{ height: height ?? '520px' }">
      <CopilotChat :show-reset="true" />
    </div>
  </CopilotProvider>
</template>

<style scoped>
.demo-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--ac-border, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  background: var(--ac-bg, #fff);
}
.demo-pane :deep(.ac-chat) {
  height: 100%;
}
</style>
