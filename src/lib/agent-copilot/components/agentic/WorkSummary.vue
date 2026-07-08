<script setup lang="ts">
defineOptions({ name: 'WorkSummary' })

/**
 * WorkSummary —— Agent 回合工作耗时摘要行。
 * 运行中实时走秒（"已工作 X 分 X 秒"），结束后定格显示总耗时。
 * 对应 Cursor / Windsurf / VS Code Agent 的 "Worked for Xs" 分隔行。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from '../../i18n'

const props = withDefaults(
  defineProps<{
    /** 开始时间戳（毫秒）。running 时据此实时计时 */
    startedAt?: number
    /** 定格总耗时（毫秒）。提供时优先于 startedAt 计算 */
    durationMs?: number
    /** 运行中（实时走秒 + 呼吸指示） */
    running?: boolean
    /** 文案定制 */
    labels?: { working?: string; worked?: string }
  }>(),
  { running: false },
)

const { t } = useI18n()

const L = computed(() => ({
  working: props.labels?.working ?? t('work.working'),
  worked: props.labels?.worked ?? t('work.worked'),
}))

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

function startTick() {
  stopTick()
  now.value = Date.now()
  timer = setInterval(() => { now.value = Date.now() }, 1000)
}
function stopTick() {
  if (timer) { clearInterval(timer); timer = null }
}

watch(
  () => props.running,
  (running) => { running ? startTick() : stopTick() },
  { immediate: true },
)
onBeforeUnmount(stopTick)

const elapsedMs = computed(() => {
  if (!props.running && props.durationMs != null) return props.durationMs
  if (props.startedAt != null) return Math.max(0, now.value - props.startedAt)
  return props.durationMs ?? 0
})

/** 格式化为 "X 分 X 秒" / "X 秒" / "X 小时 X 分" */
const formatted = computed(() => {
  const totalSec = Math.floor(elapsedMs.value / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${t('time.h', { n: h })} ${t('time.m', { n: m })}`
  if (m > 0) return `${t('time.m', { n: m })} ${t('time.s', { n: s })}`
  return t('time.s', { n: s })
})
</script>

<template>
  <div class="ac-worksum" :class="{ 'ac-worksum--running': running }" role="status">
    <span v-if="running" class="ac-worksum__pulse" aria-hidden="true" />
    <span class="ac-worksum__text">{{ running ? L.working : L.worked }} {{ formatted }}</span>
    <span class="ac-worksum__rule" aria-hidden="true" />
  </div>
</template>

<style scoped>
.ac-worksum {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
  color: var(--ac-muted);
  font-size: 0.76rem;
  user-select: none;
}
.ac-worksum__pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ac-primary);
  flex-shrink: 0;
  animation: ac-worksum-pulse 1.4s ease-in-out infinite;
}
@keyframes ac-worksum-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.8); }
}
@media (prefers-reduced-motion: reduce) {
  .ac-worksum__pulse { animation: none; }
}
.ac-worksum__text { font-weight: 600; white-space: nowrap; }
.ac-worksum--running .ac-worksum__text { color: var(--ac-fg); }
.ac-worksum__rule { flex: 1; height: 1px; background: var(--ac-border); }
</style>
