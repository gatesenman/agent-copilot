<script setup lang="ts">
defineOptions({ name: 'PayloadCard' })

/**
 * PayloadCard — 结构化载荷分发器（AG-UI 生成式 UI）
 *
 * 渲染优先级：
 * 1. registerPayloadRenderer 注册的自定义组件（可覆盖内置）
 * 2. 16 种内置载荷组件
 * 3. JSON 兜底渲染（未知类型 / card / document）
 */
import { computed } from 'vue'
import type { Component } from 'vue'
import { useI18n } from '../../i18n'
import type { StructuredPayload } from '../../types'
import { getPayloadRenderer } from './payload-registry'
import ErrorBoundary from '../general/ErrorBoundary.vue'
import DataTableCard from './DataTableCard.vue'
import ChartCard from './ChartCard.vue'
import MetricsCard from './MetricsCard.vue'
import SqlResultCard from './SqlResultCard.vue'
import CodeBlockCard from './CodeBlockCard.vue'
import DiffCard from './DiffCard.vue'
import FileTreeCard from './FileTreeCard.vue'
import TerminalCard from './TerminalCard.vue'
import ImageCard from './ImageCard.vue'
import AudioCard from './AudioCard.vue'
import VideoCard from './VideoCard.vue'
import CitationsCard from './CitationsCard.vue'
import PlanCard from './PlanCard.vue'
import TimelineCard from './TimelineCard.vue'
import FormCard from './FormCard.vue'

const props = withDefaults(
  defineProps<{
    payload: StructuredPayload
    /** 载荷数据仍在生成/加载时显示骨架屏 */
    loading?: boolean
    /** 载荷生成失败时的错误信息；非空则显示错误占位与重试按钮 */
    error?: string
  }>(),
  { loading: false, error: '' },
)

const emit = defineEmits<{
  /** 用户点击错误占位中的重试按钮 */
  (e: 'retry'): void
}>()

/** 内置类型 -> 组件映射 */
const BUILTIN: Record<string, Component> = {
  table: DataTableCard,
  comparison: DataTableCard,
  sql_result: SqlResultCard,
  chart: ChartCard,
  metrics: MetricsCard,
  code: CodeBlockCard,
  diff: DiffCard,
  file_tree: FileTreeCard,
  terminal: TerminalCard,
  image: ImageCard,
  audio: AudioCard,
  video: VideoCard,
  citations: CitationsCard,
  plan: PlanCard,
  timeline_events: TimelineCard,
  // Agent↔人双向交互
  form: FormCard,
}

const resolved = computed<Component | null>(() => {
  // 自定义注册表优先，可覆盖内置
  return getPayloadRenderer(props.payload.type) ?? BUILTIN[props.payload.type] ?? null
})

/** 归一化载荷：兼容旧数据形状后整体传给子组件 */
const normalizedPayload = computed<StructuredPayload>(() => {
  const d = props.payload.data as any
  if ((props.payload.type === 'table' || props.payload.type === 'comparison')
      && Array.isArray(d) && d.length > 0 && typeof d[0] === 'object') {
    const keys = Object.keys(d[0])
    return { ...props.payload, data: { columns: keys.map((k) => ({ key: k, label: k })), rows: d } }
  }
  // plan 兼容字符串数组
  if (props.payload.type === 'plan' && Array.isArray(d)) {
    return { ...props.payload, data: { steps: d.map((s: unknown) => (typeof s === 'string' ? { title: s } : s)) } }
  }
  return props.payload
})

const { t } = useI18n()

function formatJson(v: unknown): string {
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}
</script>

<template>
  <div class="ac-payload ac-slide-up">
    <!-- 加载态：骨架屏 -->
    <div v-if="loading" class="ac-card ac-payload__skeleton" role="status" :aria-label="t('common.loading')">
      <div class="ac-payload__skel-bar ac-payload__skel-bar--w60" />
      <div class="ac-payload__skel-bar" />
      <div class="ac-payload__skel-bar ac-payload__skel-bar--w80" />
    </div>
    <!-- 错误态：占位 + 重试 -->
    <div v-else-if="error" class="ac-card ac-payload__error" role="alert">
      <span class="ac-payload__error-msg">{{ error }}</span>
      <button type="button" class="ac-payload__retry" @click="emit('retry')">{{ t('common.retry') }}</button>
    </div>
    <!-- 错误边界：单个载荷渲染异常时降级为原始 JSON，不拖垮整个消息流 -->
    <ErrorBoundary v-else-if="resolved" :title="t('gencard.payloadError', { type: payload.type })">
      <component
        :is="resolved"
        :payload="normalizedPayload"
      />
      <template #fallback>
        <pre class="ac-payload__pre ac-payload__pre--degraded">{{ formatJson(payload.data) }}</pre>
      </template>
    </ErrorBoundary>
    <!-- 兜底：card / document / 未知类型 -->
    <div v-else class="ac-card ac-payload__fallback">
      <div v-if="payload.title" class="ac-payload__title">{{ payload.title }}</div>
      <pre class="ac-payload__pre">{{ formatJson(payload.data) }}</pre>
    </div>
  </div>
</template>

<style scoped>
.ac-payload { margin: 6px 0; }
.ac-payload__fallback { overflow: hidden; }
.ac-payload__title {
  padding: 8px 12px;
  font-weight: 600;
  font-size: 0.9em;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
}
.ac-payload__pre {
  margin: 0;
  padding: 10px 12px;
  font-size: 0.82em;
  overflow-x: auto;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  white-space: pre-wrap;
}
.ac-payload__pre--degraded {
  max-height: 200px;
  overflow-y: auto;
  background: var(--ac-bg);
  border-radius: calc(var(--ac-radius) * 0.6);
}

/* ---------- 加载骨架屏 ---------- */
.ac-payload__skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 12px;
}
.ac-payload__skel-bar {
  height: 12px;
  border-radius: 6px;
  background: var(--ac-surface);
  animation: ac-pulse 1.4s ease-in-out infinite;
}
.ac-payload__skel-bar--w60 { width: 60%; }
.ac-payload__skel-bar--w80 { width: 80%; }
@media (prefers-reduced-motion: reduce) {
  .ac-payload__skel-bar { animation: none; opacity: 0.7; }
}

/* ---------- 错误占位 ---------- */
.ac-payload__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-color: var(--ac-danger, #b42318);
}
.ac-payload__error-msg {
  font-size: 0.85em;
  color: var(--ac-danger, #b42318);
  overflow-wrap: anywhere;
}
.ac-payload__retry {
  flex-shrink: 0;
  padding: 4px 12px;
  font-size: 0.82em;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.6);
  background: var(--ac-bg);
  color: var(--ac-text);
  cursor: pointer;
}
.ac-payload__retry:hover { background: var(--ac-surface); }
</style>
