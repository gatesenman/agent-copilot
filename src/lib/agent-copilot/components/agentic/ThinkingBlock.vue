<script setup lang="ts">
defineOptions({ name: 'ThinkingBlock' })

/**
 * ThinkingBlock —— 思考内容折叠块。
 * 流式追加时呈现波动指示；结束后显示耗时并默认折叠。
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from '../../i18n'

const props = withDefaults(
  defineProps<{
    /** 思考文本（流式累积） */
    content: string
    /** 思考进行中 */
    streaming?: boolean
    /** 思考耗时（毫秒，结束后显示） */
    duration?: number
    /** 初始是否展开（默认流式中展开、结束折叠） */
    defaultExpanded?: boolean
    /** 文案定制 */
    labels?: { thinking?: string; thought?: string; seconds?: string }
  }>(),
  { streaming: false },
)

const { t } = useI18n()

const L = computed(() => ({
  thinking: props.labels?.thinking ?? t('think.thinking'),
  thought: props.labels?.thought ?? t('think.thought'),
  seconds: props.labels?.seconds ?? t('time.seconds'),
}))

const expanded = ref(props.defaultExpanded ?? props.streaming)

// 流式结束时自动折叠（用户手动展开过则不动）
const userToggled = ref(false)
watch(() => props.streaming, (now, was) => {
  if (was && !now && !userToggled.value) expanded.value = false
})

function toggle() {
  userToggled.value = true
  expanded.value = !expanded.value
}
</script>

<template>
  <div class="ac-think" :class="{ 'ac-think--streaming': streaming }">
    <button type="button" class="ac-think__head" :aria-expanded="expanded" @click="toggle">
      <span class="ac-think__pulse" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M8 2a4.5 4.5 0 0 1 4.5 4.5c0 1.4-.6 2.4-1.4 3.2-.5.6-.85 1-.85 1.8v.5h-4.5v-.5c0-.8-.35-1.2-.85-1.8-.8-.8-1.4-1.8-1.4-3.2A4.5 4.5 0 0 1 8 2ZM6.2 14h3.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <span class="ac-think__title">
        {{ streaming ? L.thinking : L.thought }}<template v-if="!streaming && duration"> ({{ (duration / 1000).toFixed(1) }}{{ L.seconds }})</template>
      </span>
      <span v-if="streaming" class="ac-think__dots" aria-hidden="true"><i /><i /><i /></span>
      <svg class="ac-think__chevron" :class="{ 'ac-think__chevron--open': expanded }" viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div v-if="expanded" class="ac-think__body">
      <pre class="ac-think__text">{{ content }}</pre>
    </div>
  </div>
</template>

<style scoped>
.ac-think {
  margin: 4px 0 8px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.8);
  background: var(--ac-surface);
  overflow: hidden;
}
.ac-think--streaming { border-color: color-mix(in srgb, var(--ac-primary) 40%, var(--ac-border)); }
.ac-think__head {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 7px 11px;
  border: none;
  background: transparent;
  color: var(--ac-muted);
  font-size: 0.78rem;
  cursor: pointer;
  text-align: left;
}
.ac-think__pulse { display: flex; color: var(--ac-primary); }
.ac-think--streaming .ac-think__pulse { animation: ac-think-pulse 1.6s ease-in-out infinite; }
@keyframes ac-think-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) {
  .ac-think--streaming .ac-think__pulse { animation: none; }
}
.ac-think__title { font-weight: 600; }
.ac-think__dots { display: inline-flex; gap: 3px; }
.ac-think__dots i {
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--ac-primary);
  animation: ac-think-dot 1.2s ease-in-out infinite;
}
.ac-think__dots i:nth-child(2) { animation-delay: 0.2s; }
.ac-think__dots i:nth-child(3) { animation-delay: 0.4s; }
@keyframes ac-think-dot { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .ac-think__dots i { animation: none; }
}
.ac-think__chevron { margin-left: auto; transition: transform 0.15s; }
.ac-think__chevron--open { transform: rotate(180deg); }
.ac-think__body { border-top: 1px dashed var(--ac-border); padding: 9px 12px; max-height: 260px; overflow-y: auto; }
.ac-think__text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.78rem;
  line-height: 1.6;
  color: var(--ac-muted);
  font-family: inherit;
}
</style>
