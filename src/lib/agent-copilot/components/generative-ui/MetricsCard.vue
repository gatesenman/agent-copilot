<template>
  <div class="ac-card ac-metrics ac-slide-up">
    <div v-if="payload.title" class="ac-metrics__title">{{ payload.title }}</div>
    <div class="ac-metrics__grid" :style="{ '--cols': data.columns ?? autoCols }">
      <div v-for="(item, i) in data.items" :key="i" class="ac-metrics__item">
        <div class="ac-metrics__label">{{ item.label }}</div>
        <div class="ac-metrics__value">
          {{ formatValue(item.value) }}<span v-if="item.unit" class="ac-metrics__unit">{{ item.unit }}</span>
        </div>
        <div v-if="item.delta !== undefined" class="ac-metrics__delta" :class="deltaClass(item)">
          <span aria-hidden="true">{{ item.delta > 0 ? '▲' : item.delta < 0 ? '▼' : '—' }}</span>
          {{ Math.abs(item.delta) }}%
        </div>
        <div v-if="item.hint" class="ac-metrics__hint">{{ item.hint }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'MetricsCard' })

/** MetricsCard — metrics 载荷：KPI 指标格（Data Agent） */
import { computed } from 'vue'
import type { MetricsPayload, StructuredPayload } from '../../types'

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<MetricsPayload>(() => (props.payload.data ?? { items: [] }) as MetricsPayload)

const autoCols = computed(() => {
  const n = data.value.items.length
  return n <= 2 ? 2 : n === 3 ? 3 : 4
})

function formatValue(v: string | number): string {
  return typeof v === 'number' ? v.toLocaleString('zh-CN') : v
}

function deltaClass(item: MetricsPayload['items'][number]): string {
  if (!item.delta) return 'is-flat'
  const positive = item.invertDelta ? item.delta < 0 : item.delta > 0
  return positive ? 'is-up' : 'is-down'
}
</script>

<style scoped>
.ac-metrics { margin: 6px 0; }
.ac-metrics__title {
  padding: 8px 12px; font-weight: 600; font-size: 0.9em;
  background: var(--ac-surface); border-bottom: 1px solid var(--ac-border);
}
.ac-metrics__grid {
  display: grid;
  grid-template-columns: repeat(var(--cols, 3), 1fr);
  gap: 1px;
  background: var(--ac-border);
}
.ac-metrics__item { background: var(--ac-bg); padding: 12px 14px; display: flex; flex-direction: column; gap: 3px; }
.ac-metrics__label { font-size: 0.8em; color: var(--ac-muted); }
.ac-metrics__value { font-size: 1.35em; font-weight: 700; font-variant-numeric: tabular-nums; }
.ac-metrics__unit { font-size: 0.6em; font-weight: 500; color: var(--ac-muted); margin-left: 3px; }
.ac-metrics__delta { font-size: 0.8em; font-weight: 600; display: inline-flex; align-items: center; gap: 3px; }
.ac-metrics__delta.is-up { color: var(--ac-success); }
.ac-metrics__delta.is-down { color: var(--ac-danger); }
.ac-metrics__delta.is-flat { color: var(--ac-muted); }
.ac-metrics__hint { font-size: 0.76em; color: var(--ac-muted); }
@media (max-width: 480px) {
  .ac-metrics__grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
