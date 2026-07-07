<template>
  <div
    class="ac-root"
    :data-theme="resolvedTheme"
    :data-radius="store.config.radius"
    :data-density="store.config.density"
    :style="brandStyle"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * CopilotProvider — 根组件
 * 创建 Copilot 上下文（runtime、会话、注册表），并注入主题变量。
 * 全部配置项见 CopilotConfig 类型。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { CopilotConfig, StructuredPayload } from '../types'
import { provideCopilot } from '../composables/useCopilot'
import '../theme/copilot-theme.css'

const props = defineProps<{ config: CopilotConfig }>()

const store = provideCopilot(props.config)

/** 演示/调试通道：window 事件注入结构化载荷（如演练场的 AI 表单演示） */
function onInjectPayload(e: Event) {
  const detail = (e as CustomEvent).detail as StructuredPayload | undefined
  if (detail?.type && detail.data !== undefined) store.injectPayload(detail)
}

const systemDark = ref(false)
/** 全局 useTheme() 在 documentElement 上设置的 data-ac-theme（未显式配置 theme 时跟随） */
const globalTheme = ref<string | null>(null)
let themeObserver: MutationObserver | null = null

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = mq.matches
    mq.addEventListener('change', (e) => { systemDark.value = e.matches })
  }
  // 跟随全局 data-ac-theme（useTheme 切换时实时联动）
  if (typeof document !== 'undefined') {
    globalTheme.value = document.documentElement.getAttribute('data-ac-theme')
    themeObserver = new MutationObserver(() => {
      globalTheme.value = document.documentElement.getAttribute('data-ac-theme')
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ac-theme'] })
  }
  // 初始建议问题
  if (store.config.suggestions !== false) {
    store.refreshSuggestions()
  }
  window.addEventListener('agent-copilot:inject-payload', onInjectPayload)
})

onUnmounted(() => {
  themeObserver?.disconnect()
  window.removeEventListener('agent-copilot:inject-payload', onInjectPayload)
})

const resolvedTheme = computed(() => {
  if (store.config.theme === 'auto') return systemDark.value ? 'dark' : 'light'
  // 未显式配置时优先跟随全局 useTheme()，否则跟随系统
  if (!store.config.theme) return globalTheme.value ?? (systemDark.value ? 'dark' : 'light')
  return store.config.theme
})

const brandStyle = computed(() => {
  const s: Record<string, string> = {}
  if (store.config.brandColor) {
    s['--ac-primary'] = store.config.brandColor
  }
  return s
})

defineExpose({ store })
</script>
