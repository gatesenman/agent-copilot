<script setup lang="ts">
/**
 * ErrorBoundary — 渲染错误边界（企业级降级基础设施）
 *
 * 捕获子树渲染/生命周期异常，阻断错误冒泡导致整个对话面板白屏。
 * 降级 UI 提供：错误摘要、可展开的技术细节、重试按钮。
 * 宿主可通过 @error 事件接入监控上报（Sentry 等）。
 */
import { computed, ref } from 'vue'
import { onErrorCaptured } from 'vue'
import { useI18n } from '../../i18n'

const props = withDefaults(
  defineProps<{
    /** 降级卡片标题 */
    title?: string
    /** 重试按钮文案；设为空字符串隐藏重试 */
    retryLabel?: string
    /** 是否展示可展开的技术细节（生产环境可关闭） */
    showDetail?: boolean
  }>(),
  {
    title: undefined,
    retryLabel: undefined,
    showDetail: true,
  },
)

const { t } = useI18n()
const titleText = computed(() => props.title ?? t('error.title'))
const retryText = computed(() => props.retryLabel ?? t('error.retry'))

const emit = defineEmits<{
  (e: 'error', err: Error, info: string): void
}>()

const error = ref<Error | null>(null)
const errorInfo = ref('')
/** key 递增强制重建子树，实现重试 */
const retryKey = ref(0)

onErrorCaptured((err, _instance, info) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  errorInfo.value = info
  emit('error', error.value, info)
  return false // 阻断向上冒泡
})

function retry() {
  error.value = null
  errorInfo.value = ''
  retryKey.value++
}
</script>

<template>
  <div v-if="error" class="ac-boundary" role="alert">
    <div class="ac-boundary__head">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="ac-boundary__icon">
        <path d="M8 5.5v3.2M8 11.2v.1M6.9 2.2 1.6 11.4a1.3 1.3 0 0 0 1.1 1.9h10.6a1.3 1.3 0 0 0 1.1-1.9L9.1 2.2a1.3 1.3 0 0 0-2.2 0Z" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="ac-boundary__title">{{ titleText }}</span>
      <button v-if="retryLabel !== ''" type="button" class="ac-boundary__retry" @click="retry">
        {{ retryText }}
      </button>
    </div>
    <slot name="fallback" :error="error" />
    <details v-if="showDetail" class="ac-boundary__detail">
      <summary>{{ t('error.details') }}</summary>
      <pre class="ac-boundary__pre">{{ error.message }}{{ errorInfo ? `\n(${errorInfo})` : '' }}</pre>
    </details>
  </div>
  <template v-else>
    <slot :key="retryKey" />
  </template>
</template>

<style scoped>
.ac-boundary {
  border: 1px solid var(--ac-border);
  border-left: 3px solid var(--ac-danger);
  border-radius: var(--ac-radius);
  background: var(--ac-surface);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.86em;
}
.ac-boundary__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ac-boundary__icon { color: var(--ac-danger); flex-shrink: 0; }
.ac-boundary__title { color: var(--ac-fg); font-weight: 600; flex: 1; min-width: 0; }
.ac-boundary__retry {
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.7);
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 0.85em;
  padding: 3px 10px;
  cursor: pointer;
  flex-shrink: 0;
}
.ac-boundary__retry:hover { border-color: var(--ac-primary); color: var(--ac-primary); }
.ac-boundary__detail { color: var(--ac-muted); }
.ac-boundary__detail summary { cursor: pointer; font-size: 0.9em; }
.ac-boundary__pre {
  margin: 6px 0 0;
  padding: 8px;
  background: var(--ac-bg);
  border-radius: calc(var(--ac-radius) * 0.6);
  font-size: 0.86em;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}
</style>
