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
defineOptions({ name: 'CopilotProvider' })

defineSlots<{
  /** 默认插槽：被 Provider 包裹的应用内容（其中可使用全部 copilot 组件与 useCopilot） */
  default(): unknown
}>()

/**
 * CopilotProvider — 根组件
 * 创建 Copilot 上下文（runtime、会话、注册表），并注入主题变量。
 * 全部配置项见 CopilotConfig 类型。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { CopilotConfig, StructuredPayload } from '../types'
import { provideCopilot } from '../composables/useCopilot'
import { labelsFromLocale, normalizeLocale, provideI18n } from '../i18n'
import { resolveThemeVars } from '../theme/theme-tokens'
import '../theme/copilot-theme.css'

const props = defineProps<{ config: CopilotConfig }>()

const store = provideCopilot(props.config)

// ============ config prop 响应式（第 4 层变更 → 第 5 层 updateConfig） ============
// 深监听 config prop：宿主变更（如切换 model/theme/locale）自动经 updateConfig 分流 ——
// 响应式键即时生效，结构键（endpoint/provider 等）重建 runtime 对新会话生效。
// 仅同步实际变化的键，避免整对象重合并引发无关重建。
watch(
  () => props.config,
  (next, prev) => {
    const patch: Partial<CopilotConfig> = {}
    const keys = new Set([...Object.keys(next ?? {}), ...Object.keys(prev ?? {})]) as Set<keyof CopilotConfig>
    for (const key of keys) {
      const nv = next?.[key]
      if (nv !== prev?.[key] && nv !== undefined) (patch as Record<string, unknown>)[key] = nv
    }
    if (Object.keys(patch).length > 0) store.updateConfig(patch)
  },
  { deep: true },
)

// ============ 多语言 ============
// locale 归一化：'zh' → 'zh-CN'，'en' → 'en-US'；默认中文
const localeCode = computed(() => normalizeLocale(props.config.locale))
const { t } = provideI18n(localeCode)

// store.labels 随 locale 响应式派生（用户 config.labels 覆盖仍最高优先），
// 旧组件读 store.labels.send 无需改造即获得本地化文案
const localizedLabels = computed(() => ({ ...labelsFromLocale(t), ...props.config.labels }))
for (const key of Object.keys(store.labels)) {
  Object.defineProperty(store.labels, key, {
    get: () => (localizedLabels.value as Record<string, string>)[key],
    enumerable: true,
    configurable: true,
  })
}

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
  // 读 props.config 保证运行时更新 config.theme 即时生效
  if (props.config.theme === 'auto') return systemDark.value ? 'dark' : 'light'
  // 未显式配置时优先跟随全局 useTheme()，否则跟随系统
  if (!props.config.theme) return globalTheme.value ?? (systemDark.value ? 'dark' : 'light')
  return props.config.theme
})

/** 主题定制：preset → brandColor 派生 → themeTokens；依赖 props 保证运行时更新 config 即时生效 */
const brandStyle = computed(() =>
  resolveThemeVars(resolvedTheme.value === 'dark' ? 'dark' : 'light', {
    preset: props.config.themePreset,
    brandColor: props.config.brandColor,
    tokens: props.config.themeTokens,
  }),
)

defineExpose({ store })
</script>

<style scoped>
/*
 * 高度继承：父容器有确定高度时（工作台/演示面板场景）ac-root 撑满，
 * 让内部 height:100% 的子组件正确解析；父高度为 auto 时（文档内嵌场景）
 * height:100% 按规范解析为 auto，行为不变。
 */
.ac-root {
  height: 100%;
  min-height: 0;
}
</style>
