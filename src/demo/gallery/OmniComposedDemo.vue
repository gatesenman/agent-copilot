<script setup lang="ts">
/**
 * OmniComposedDemo — 全能助手显式组装演示容器：
 * 独立 CopilotProvider 上下文 + 批量注册三域全部工具 + 显式组装的对话面。
 */
import type { CopilotActionDef, CopilotConfig } from '../../lib/agent-copilot'
import CopilotProvider from '../../lib/agent-copilot/components/CopilotProvider.vue'
import ActionRegistrar from './ActionRegistrar.vue'
import OmniComposedSurface from './OmniComposedSurface.vue'

defineProps<{
  config: CopilotConfig
  actions: CopilotActionDef[]
  height?: string
}>()
</script>

<template>
  <CopilotProvider :config="config">
    <ActionRegistrar :actions="actions" />
    <div class="ocd" :style="{ height: height ?? '560px' }">
      <OmniComposedSurface />
    </div>
  </CopilotProvider>
</template>

<style scoped>
.ocd {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--ac-border, #e2e8f0);
  border-radius: 12px;
  overflow: hidden;
  background: var(--ac-bg, #fff);
}
.ocd :deep(.oc) { height: 100%; }
</style>
