<script setup lang="ts">
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
import CitationsCard from './CitationsCard.vue'
import PlanCard from './PlanCard.vue'
import TimelineCard from './TimelineCard.vue'
import FormCard from './FormCard.vue'

const props = defineProps<{ payload: StructuredPayload }>()

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

function formatJson(v: unknown): string {
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}
</script>

<template>
  <div class="ac-payload ac-slide-up">
    <!-- 错误边界：单个载荷渲染异常时降级为原始 JSON，不拖垮整个消息流 -->
    <ErrorBoundary v-if="resolved" :title="`载荷渲染失败（${payload.type}）`">
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
</style>
