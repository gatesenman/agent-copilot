<script setup lang="ts">
defineOptions({ name: 'UsageMeter' })

/**
 * UsageMeter —— Token 用量与配额仪表
 * 企业级成本可观测：会话累计 token、预算占比、费用估算。
 */
import { computed } from 'vue'
import { useI18n } from '../../i18n'

const props = withDefaults(
  defineProps<{
    /** 已用 prompt tokens */
    promptTokens: number
    /** 已用 completion tokens */
    completionTokens: number
    /** 配额上限（tokens），不传则不显示进度条 */
    quota?: number
    /** 每 1K prompt token 价格 */
    promptPricePerK?: number
    /** 每 1K completion token 价格 */
    completionPricePerK?: number
    /** 费用货币符号 */
    currency?: string
    /** 紧凑模式（单行） */
    compact?: boolean
  }>(),
  { compact: false, currency: '¥' },
)

const { t } = useI18n()

const total = computed(() => props.promptTokens + props.completionTokens)
const pct = computed(() => (props.quota ? Math.min(100, (total.value / props.quota) * 100) : 0))
const tone = computed(() => (pct.value >= 90 ? 'danger' : pct.value >= 70 ? 'warning' : 'ok'))

const cost = computed(() => {
  if (props.promptPricePerK == null && props.completionPricePerK == null) return null
  const c =
    (props.promptTokens / 1000) * (props.promptPricePerK ?? 0) +
    (props.completionTokens / 1000) * (props.completionPricePerK ?? 0)
  return c
})

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}
</script>

<template>
  <div class="ac-usage" :class="{ 'ac-usage--compact': compact }" role="status" :aria-label="t('usage.aria')">
    <div class="ac-usage__row">
      <span class="ac-usage__total">{{ fmt(total) }} <span class="ac-usage__unit">tokens</span></span>
      <span class="ac-usage__split">
        <span :title="`${t('usage.input')} tokens`">{{ t('usage.input') }} {{ fmt(promptTokens) }}</span>
        <span aria-hidden="true">·</span>
        <span :title="`${t('usage.output')} tokens`">{{ t('usage.output') }} {{ fmt(completionTokens) }}</span>
      </span>
      <span v-if="cost != null" class="ac-usage__cost">≈ {{ currency }}{{ cost.toFixed(4) }}</span>
    </div>
    <div v-if="quota" class="ac-usage__bar-wrap">
      <div class="ac-usage__bar" role="progressbar" :aria-valuenow="Math.round(pct)" aria-valuemin="0" aria-valuemax="100" :aria-label="t('usage.quotaUsed', { n: Math.round(pct) })">
        <div class="ac-usage__fill" :class="`ac-usage__fill--${tone}`" :style="{ width: `${pct}%` }" />
      </div>
      <span class="ac-usage__quota">{{ Math.round(pct) }}% / {{ fmt(quota) }}</span>
    </div>
  </div>
</template>

<style scoped>
.ac-usage {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: var(--ac-surface);
  font-family: var(--ac-font-sans, inherit);
  font-size: 0.8rem;
}
.ac-usage--compact { flex-direction: row; align-items: center; gap: 10px; padding: 4px 10px; }
.ac-usage__row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.ac-usage__total { font-weight: 700; color: var(--ac-fg); font-size: 0.92rem; font-variant-numeric: tabular-nums; }
.ac-usage__unit { font-weight: 400; font-size: 0.72rem; color: var(--ac-muted); }
.ac-usage__split { display: flex; gap: 6px; color: var(--ac-muted); font-size: 0.76rem; font-variant-numeric: tabular-nums; }
.ac-usage__cost { margin-left: auto; color: var(--ac-fg); font-weight: 600; font-variant-numeric: tabular-nums; }
.ac-usage__bar-wrap { display: flex; align-items: center; gap: 8px; }
.ac-usage__bar {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: var(--ac-border);
  overflow: hidden;
}
.ac-usage__fill { height: 100%; border-radius: 999px; transition: width 0.3s; }
.ac-usage__fill--ok { background: var(--ac-success); }
.ac-usage__fill--warning { background: var(--ac-warning); }
.ac-usage__fill--danger { background: var(--ac-danger); }
.ac-usage__quota { font-size: 0.72rem; color: var(--ac-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
</style>
