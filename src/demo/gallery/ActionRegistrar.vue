<script setup lang="ts">
/**
 * 批量注册 Actions 的辅助组件：
 * 必须作为 CopilotProvider 的子组件使用（依赖注入的 store 上下文）。
 */
import { onUnmounted } from 'vue'
import type { CopilotActionDef } from '../../lib/agent-copilot'
import { useCopilot } from '../../lib/agent-copilot'

const props = defineProps<{ actions: CopilotActionDef[] }>()

const store = useCopilot()
for (const def of props.actions) {
  store.actions.set(def.name, def)
}

onUnmounted(() => {
  for (const def of props.actions) store.actions.delete(def.name)
})
</script>

<template>
  <slot />
</template>
