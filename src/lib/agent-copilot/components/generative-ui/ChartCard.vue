<template>
  <div class="ac-card ac-chartcard ac-slide-up">
    <div v-if="payload.title" class="ac-chartcard__title">{{ payload.title }}</div>
    <div class="ac-chartcard__body">
      <!-- 柱状图 / 折线图 -->
      <svg
        v-if="data.kind !== 'pie'"
        :viewBox="`0 0 ${W} ${H}`"
        class="ac-chartcard__svg"
        role="img"
        :aria-label="payload.title || t('chart.fallbackTitle')"
      >
        <!-- 网格线与Y轴标签 -->
        <g v-for="tick in ticks" :key="tick.v">
          <line :x1="PAD_L" :y1="tick.y" :x2="W - PAD_R" :y2="tick.y" class="ac-chart__grid" />
          <text :x="PAD_L - 6" :y="tick.y + 3" class="ac-chart__ylabel">{{ tick.label }}</text>
        </g>
        <!-- 柱状 -->
        <template v-if="data.kind === 'bar'">
          <g v-for="(s, si) in data.series" :key="si">
            <rect
              v-for="(v, i) in s.values"
              :key="i"
              :x="barX(i, si)"
              :y="yScale(v)"
              :width="barW"
              :height="Math.max(1, H - PAD_B - yScale(v))"
              :fill="seriesColor(si)"
              rx="2"
            >
              <title>{{ data.labels[i] }} · {{ s.name }}: {{ v }}{{ data.unit ?? '' }}</title>
            </rect>
          </g>
        </template>
        <!-- 折线 -->
        <template v-else>
          <g v-for="(s, si) in data.series" :key="si">
            <polyline :points="linePoints(s.values)" fill="none" :stroke="seriesColor(si)" stroke-width="2" />
            <circle
              v-for="(v, i) in s.values"
              :key="i"
              :cx="lineX(i)"
              :cy="yScale(v)"
              r="3"
              :fill="seriesColor(si)"
            >
              <title>{{ data.labels[i] }} · {{ s.name }}: {{ v }}{{ data.unit ?? '' }}</title>
            </circle>
          </g>
        </template>
        <!-- X轴标签 -->
        <text
          v-for="(label, i) in data.labels"
          :key="i"
          :x="lineX(i)"
          :y="H - PAD_B + 16"
          class="ac-chart__xlabel"
        >{{ label }}</text>
      </svg>

      <!-- 饼图 -->
      <div v-else class="ac-chartcard__pie-wrap">
        <svg :viewBox="`0 0 120 120`" class="ac-chartcard__pie" role="img" :aria-label="payload.title || t('chart.pie')">
          <circle
            v-for="(seg, i) in pieSegments"
            :key="i"
            cx="60" cy="60" r="45"
            fill="none"
            :stroke="seg.color"
            stroke-width="26"
            :stroke-dasharray="`${seg.len} ${CIRC - seg.len}`"
            :stroke-dashoffset="-seg.offset"
          >
            <title>{{ seg.label }}: {{ seg.value }}{{ data.unit ?? '' }} ({{ seg.pct }}%)</title>
          </circle>
        </svg>
      </div>

      <!-- 图例 -->
      <div class="ac-chartcard__legend">
        <template v-if="data.kind === 'pie'">
          <span v-for="(seg, i) in pieSegments" :key="i" class="ac-chartcard__legend-item">
            <span class="ac-chartcard__swatch" :style="{ background: seg.color }"></span>
            {{ seg.label }} · {{ seg.pct }}%
          </span>
        </template>
        <template v-else>
          <span v-for="(s, si) in data.series" :key="si" class="ac-chartcard__legend-item">
            <span class="ac-chartcard__swatch" :style="{ background: seriesColor(si) }"></span>
            {{ s.name }}
          </span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ChartCard' })

/** ChartCard — chart 载荷：零依赖 SVG 柱状/折线/饼图（Data Agent） */
import { computed } from 'vue'
import { useI18n } from '../../i18n'
import type { ChartPayload, StructuredPayload } from '../../types'

const { t, locale } = useI18n()

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<ChartPayload>(() => (props.payload.data ?? { kind: 'bar', labels: [], series: [] }) as ChartPayload)

const W = 560
const H = computed(() => data.value.height ?? 240).value
const PAD_L = 48
const PAD_R = 12
const PAD_T = 12
const PAD_B = 30
const CIRC = 2 * Math.PI * 45

const PALETTE = ['#0f6b54', '#3b82a6', '#a16207', '#8455a6', '#b91c1c', '#4d7c0f']

function seriesColor(i: number): string {
  return data.value.series[i]?.color ?? PALETTE[i % PALETTE.length]
}

const maxV = computed(() => {
  const all = data.value.series.flatMap((s) => s.values)
  const m = Math.max(1, ...all)
  // 取整到优雅刻度
  const mag = 10 ** Math.floor(Math.log10(m))
  return Math.ceil(m / mag) * mag
})

function yScale(v: number): number {
  return PAD_T + (1 - v / maxV.value) * (H - PAD_T - PAD_B)
}

const ticks = computed(() => {
  const n = 4
  return Array.from({ length: n + 1 }, (_, i) => {
    const v = (maxV.value / n) * i
    return {
      v,
      y: yScale(v),
      label:
        locale.value === 'zh-CN' && v >= 10000
          ? `${(v / 10000).toLocaleString('zh-CN')}万`
          : v >= 10000
            ? new Intl.NumberFormat(locale.value, { notation: 'compact' }).format(v)
            : v.toLocaleString(locale.value),
    }
  })
})

const slotW = computed(() => (W - PAD_L - PAD_R) / Math.max(1, data.value.labels.length))
const barW = computed(() => Math.min(40, (slotW.value * 0.7) / Math.max(1, data.value.series.length))).value

function barX(i: number, si: number): number {
  const groupW = barW * data.value.series.length
  return PAD_L + slotW.value * i + (slotW.value - groupW) / 2 + si * barW
}

function lineX(i: number): number {
  return PAD_L + slotW.value * i + slotW.value / 2
}

function linePoints(values: number[]): string {
  return values.map((v, i) => `${lineX(i)},${yScale(v)}`).join(' ')
}

const pieSegments = computed(() => {
  const values = data.value.series[0]?.values ?? []
  const total = values.reduce((a, b) => a + b, 0) || 1
  let acc = 0
  return values.map((v, i) => {
    const len = (v / total) * CIRC
    const seg = {
      label: data.value.labels[i] ?? `#${i + 1}`,
      value: v,
      pct: Math.round((v / total) * 100),
      color: seriesColor(i),
      len,
      offset: acc,
    }
    acc += len
    return seg
  })
})
</script>

<style scoped>
.ac-chartcard { margin: 6px 0; }
.ac-chartcard__title {
  padding: 8px 12px; font-weight: 600; font-size: 0.9em;
  background: var(--ac-surface); border-bottom: 1px solid var(--ac-border);
}
.ac-chartcard__body { padding: 12px; }
.ac-chartcard__svg { width: 100%; height: auto; }
.ac-chart__grid { stroke: var(--ac-border); stroke-width: 1; }
.ac-chart__ylabel { font-size: 10px; fill: var(--ac-muted); text-anchor: end; }
.ac-chart__xlabel { font-size: 10px; fill: var(--ac-muted); text-anchor: middle; }
.ac-chartcard__pie-wrap { display: flex; justify-content: center; }
.ac-chartcard__pie { width: 180px; height: 180px; transform: rotate(-90deg); }
.ac-chartcard__legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 8px; font-size: 0.82em; color: var(--ac-muted); }
.ac-chartcard__legend-item { display: inline-flex; align-items: center; gap: 5px; }
.ac-chartcard__swatch { width: 10px; height: 10px; border-radius: 3px; flex: none; }
</style>
