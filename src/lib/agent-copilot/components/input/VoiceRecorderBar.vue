<script setup lang="ts">
defineOptions({ name: 'VoiceRecorderBar' })

/**
 * VoiceRecorderBar — 录音中状态条
 *
 * 场景：点击 ChatInput 语音按钮后替换输入区展示（对标 ChatGPT 按住说话 UI）。
 * 纯展示 + 事件组件：宿主负责实际 MediaRecorder 采集，传入实时电平即可驱动波形。
 * 特性：跳动波形（levels 驱动或自动动画）、计时、取消 / 停止发送。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '../../i18n'

const props = withDefaults(
  defineProps<{
    /** 实时音量电平 0-1 数组（如 AnalyserNode 输出）；不传则用内置动画 */
    levels?: number[]
    /** 已录制秒数；不传则组件内部自计时 */
    elapsed?: number
    /** 暂停态（停止计时与波形跳动） */
    paused?: boolean
  }>(),
  { levels: undefined, elapsed: undefined, paused: false },
)

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'stop'): void
}>()

const { t } = useI18n()

// ---- 内部计时（宿主未受控时） ----
const innerElapsed = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
const shownElapsed = computed(() => props.elapsed ?? innerElapsed.value)

// ---- 内置波形动画（未传 levels 时） ----
const animLevels = ref<number[]>(Array.from({ length: 24 }, () => 0.3))
let raf = 0
let tick = 0

function animate() {
  tick += 1
  if (tick % 4 === 0 && !props.paused) {
    animLevels.value = animLevels.value.map((_, i) => 0.2 + Math.abs(Math.sin(tick / 9 + i * 0.7)) * 0.75)
  }
  raf = requestAnimationFrame(animate)
}

const bars = computed(() => props.levels ?? animLevels.value)

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${String(ss).padStart(2, '0')}`
}

onMounted(() => {
  timer = setInterval(() => {
    if (!props.paused) innerElapsed.value += 1
  }, 1000)
  raf = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div class="ac-rec" role="status" :aria-label="paused ? t('media.recPaused') : t('media.recording')">
    <button
      type="button"
      class="ac-rec__btn ac-rec__btn--cancel"
      :aria-label="t('media.recCancel')"
      :title="t('media.recCancel')"
      @click="emit('cancel')"
    >
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" /></svg>
    </button>

    <span class="ac-rec__dot" :class="{ 'ac-rec__dot--paused': paused }" aria-hidden="true" />
    <span class="ac-rec__label">{{ paused ? t('media.recPaused') : t('media.recording') }}</span>

    <div class="ac-rec__wave" aria-hidden="true">
      <span
        v-for="(b, i) in bars"
        :key="i"
        class="ac-rec__bar"
        :style="{ height: `${Math.round(Math.min(1, Math.max(0.1, b)) * 100)}%` }"
      />
    </div>

    <span class="ac-rec__time">{{ fmt(shownElapsed) }}</span>

    <button
      type="button"
      class="ac-rec__btn ac-rec__btn--stop"
      :aria-label="t('media.recStop')"
      :title="t('media.recStop')"
      @click="emit('stop')"
    >
      <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1.5" /></svg>
    </button>
  </div>
</template>

<style scoped>
.ac-rec {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--ac-border, #e5e7eb);
  border-radius: 999px;
  background: var(--ac-surface, #fff);
  padding: 8px 12px;
}
.ac-rec__btn {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.ac-rec__btn--cancel {
  background: var(--ac-surface-2, #f3f4f6);
  color: var(--ac-text-muted, #6b7280);
}
.ac-rec__btn--cancel:hover { color: var(--ac-text, #111827); }
.ac-rec__btn--stop {
  background: var(--ac-danger, #dc2626);
  color: var(--ac-primary-fg, #fff);
}
.ac-rec__btn--stop:hover { opacity: 0.9; }
.ac-rec__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ac-danger, #dc2626);
  animation: ac-rec-pulse 1.2s ease-in-out infinite;
}
.ac-rec__dot--paused { animation: none; opacity: 0.4; }
@keyframes ac-rec-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.ac-rec__label {
  flex: none;
  font-size: 12px;
  color: var(--ac-text-muted, #6b7280);
}
.ac-rec__wave {
  flex: 1;
  height: 24px;
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 60px;
}
.ac-rec__bar {
  flex: 1;
  min-width: 2px;
  border-radius: 2px;
  background: var(--ac-primary, #2563eb);
  transition: height 0.12s ease;
}
.ac-rec__time {
  flex: none;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--ac-text, #111827);
}
</style>
