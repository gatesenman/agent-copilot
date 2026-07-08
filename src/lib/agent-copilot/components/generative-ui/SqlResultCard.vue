<template>
  <div class="ac-card ac-sqlcard ac-slide-up" role="region" :aria-label="payload.title || t('gencard.sqlRegion')">
    <div class="ac-sqlcard__head">
      <span class="ac-sqlcard__label">SQL</span>
      <span v-if="payload.title" class="ac-sqlcard__title">{{ payload.title }}</span>
      <span class="ac-sqlcard__meta">
        {{ t('gencard.sqlRows', { n: data.rowCount ?? data.rows.length }) }}<template v-if="data.elapsedMs !== undefined"> · {{ data.elapsedMs }}ms</template>
      </span>
    </div>
    <pre class="ac-sqlcard__sql ac-scroll"><code v-html="highlightedSql"></code></pre>
    <div class="ac-sqlcard__result ac-scroll">
      <table class="ac-sqlcard__table">
        <thead>
          <tr>
            <th v-for="col in data.columns" :key="col.key">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in data.rows" :key="i">
            <td v-for="col in data.columns" :key="col.key">{{ formatCell(row[col.key]) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SqlResultCard' })

/** SqlResultCard — sql_result 载荷：SQL 语句 + 结果表（Data Agent） */
import { computed } from 'vue'
import { useI18n } from '../../i18n'
import type { SqlResultPayload, StructuredPayload } from '../../types'
import { highlightCode } from './highlight'

const { t, locale } = useI18n()

const props = defineProps<{ payload: StructuredPayload }>()
const data = computed<SqlResultPayload>(() => (props.payload.data ?? { sql: '', columns: [], rows: [] }) as SqlResultPayload)

const highlightedSql = computed(() => highlightCode(data.value.sql, 'sql'))

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return v.toLocaleString(locale.value)
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
</script>

<style scoped>
.ac-sqlcard { margin: 6px 0; overflow: hidden; }
.ac-sqlcard__head {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 12px;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
  font-size: 0.85em;
}
.ac-sqlcard__label {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-weight: 700; font-size: 0.85em;
  background: var(--ac-primary-soft); color: var(--ac-primary);
  padding: 1px 7px; border-radius: 5px;
}
.ac-sqlcard__title { font-weight: 600; }
.ac-sqlcard__meta { margin-left: auto; color: var(--ac-muted); font-size: 0.9em; }
.ac-sqlcard__sql {
  margin: 0; padding: 10px 12px;
  background: #0e1412; color: #d7e4df;
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.83em; line-height: 1.55;
  overflow-x: auto; white-space: pre-wrap;
}
.ac-sqlcard__sql :deep(.tok-keyword) { color: #7cd7b8; font-weight: 600; }
.ac-sqlcard__sql :deep(.tok-string) { color: #e8c67a; }
.ac-sqlcard__sql :deep(.tok-number) { color: #d09bde; }
.ac-sqlcard__sql :deep(.tok-comment) { color: #5c6f68; font-style: italic; }
.ac-sqlcard__sql :deep(.tok-type) { color: #8ec2e8; }
.ac-sqlcard__result { overflow-x: auto; max-height: 300px; overflow-y: auto; }
.ac-sqlcard__table { width: 100%; border-collapse: collapse; font-size: 0.85em; }
.ac-sqlcard__table th, .ac-sqlcard__table td {
  border-bottom: 1px solid var(--ac-border);
  padding: 6px 12px; text-align: left; white-space: nowrap;
}
.ac-sqlcard__table th { background: var(--ac-surface); font-weight: 600; position: sticky; top: 0; }
.ac-sqlcard__table td { font-variant-numeric: tabular-nums; }
</style>
