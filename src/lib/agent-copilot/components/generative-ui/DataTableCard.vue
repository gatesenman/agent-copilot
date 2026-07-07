<template>
  <div class="ac-card ac-dtable ac-slide-up">
    <div class="ac-dtable__head">
      <span v-if="payload.title" class="ac-dtable__title">{{ payload.title }}</span>
      <span class="ac-dtable__count">{{ filteredRows.length }} 条</span>
      <input
        v-if="data.filterable"
        v-model="filterText"
        type="search"
        class="ac-dtable__filter"
        placeholder="筛选…"
        aria-label="筛选表格数据"
      />
      <button v-if="data.exportable" type="button" class="ac-dtable__export" @click="exportCsv">导出 CSV</button>
    </div>
    <div class="ac-dtable__scroll ac-scroll">
      <table class="ac-dtable__table">
        <thead>
          <tr>
            <th
              v-for="col in data.columns"
              :key="col.key"
              :style="{ textAlign: col.align ?? 'left' }"
              :class="{ 'is-sortable': data.sortable }"
              @click="data.sortable && toggleSort(col.key)"
            >
              {{ col.label }}
              <span v-if="sortKey === col.key" class="ac-dtable__arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in pagedRows" :key="i">
            <td v-for="col in data.columns" :key="col.key" :style="{ textAlign: col.align ?? 'left' }">
              {{ formatCell(row[col.key]) }}
            </td>
          </tr>
          <tr v-if="pagedRows.length === 0">
            <td :colspan="data.columns.length" class="ac-dtable__empty">无匹配数据</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="pageCount > 1" class="ac-dtable__pager">
      <button type="button" class="ac-dtable__pagebtn" :disabled="page === 0" @click="page--">上一页</button>
      <span class="ac-dtable__pageinfo">{{ page + 1 }} / {{ pageCount }}</span>
      <button type="button" class="ac-dtable__pagebtn" :disabled="page >= pageCount - 1" @click="page++">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
/** DataTableCard — table 载荷增强版：排序/筛选/分页/导出 CSV（Data Agent） */
import { computed, ref, watch } from 'vue'
import type { StructuredPayload, TablePayload } from '../../types'

const props = defineProps<{ payload: StructuredPayload }>()

const data = computed<TablePayload>(() => {
  const d = props.payload.data as any
  if (d?.columns && d?.rows) return d
  if (Array.isArray(d) && d.length > 0 && typeof d[0] === 'object') {
    return { columns: Object.keys(d[0]).map((k) => ({ key: k, label: k })), rows: d }
  }
  return { columns: [], rows: [] }
})

const filterText = ref('')
const sortKey = ref<string | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(0)
const pageSize = computed(() => data.value.pageSize ?? 10)

watch([filterText, sortKey, sortDir], () => { page.value = 0 })

const filteredRows = computed(() => {
  let rows = data.value.rows
  const q = filterText.value.trim().toLowerCase()
  if (q) {
    rows = rows.filter((row) =>
      data.value.columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(q)),
    )
  }
  if (sortKey.value) {
    const key = sortKey.value
    const dir = sortDir.value === 'asc' ? 1 : -1
    rows = [...rows].sort((a, b) => {
      const av = a[key]; const bv = b[key]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av ?? '').localeCompare(String(bv ?? ''), 'zh-CN') * dir
    })
  }
  return rows
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)))
const pagedRows = computed(() => {
  if (!data.value.pageSize && filteredRows.value.length <= 15) return filteredRows.value
  return filteredRows.value.slice(page.value * pageSize.value, (page.value + 1) * pageSize.value)
})

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return v.toLocaleString('zh-CN')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function exportCsv() {
  const header = data.value.columns.map((c) => `"${c.label}"`).join(',')
  const body = filteredRows.value
    .map((row) => data.value.columns.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${header}\n${body}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.payload.title ?? 'data'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.ac-dtable { margin: 6px 0; }
.ac-dtable__head {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
}
.ac-dtable__title { font-weight: 600; font-size: 0.9em; }
.ac-dtable__count { color: var(--ac-muted); font-size: 0.8em; }
.ac-dtable__filter {
  margin-left: auto;
  border: 1px solid var(--ac-border);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 0.83em;
  background: var(--ac-bg);
  color: var(--ac-fg);
  width: 130px;
}
.ac-dtable__filter:focus { outline: 2px solid var(--ac-primary); outline-offset: -1px; }
.ac-dtable__export {
  border: 1px solid var(--ac-border);
  background: var(--ac-bg);
  color: var(--ac-fg);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 0.83em;
  cursor: pointer;
}
.ac-dtable__export:hover { border-color: var(--ac-primary); color: var(--ac-primary); }
.ac-dtable__scroll { overflow-x: auto; }
.ac-dtable__table { width: 100%; border-collapse: collapse; font-size: 0.87em; }
.ac-dtable__table th, .ac-dtable__table td {
  border-bottom: 1px solid var(--ac-border);
  padding: 6px 12px; white-space: nowrap;
}
.ac-dtable__table th { background: var(--ac-surface); font-weight: 600; user-select: none; }
.ac-dtable__table th.is-sortable { cursor: pointer; }
.ac-dtable__table th.is-sortable:hover { color: var(--ac-primary); }
.ac-dtable__arrow { color: var(--ac-primary); font-size: 0.9em; }
.ac-dtable__table td { font-variant-numeric: tabular-nums; }
.ac-dtable__empty { text-align: center; color: var(--ac-muted); padding: 16px !important; }
.ac-dtable__pager {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 7px; border-top: 1px solid var(--ac-border);
}
.ac-dtable__pagebtn {
  border: 1px solid var(--ac-border);
  background: var(--ac-bg); color: var(--ac-fg);
  border-radius: 6px; padding: 2px 10px; font-size: 0.82em; cursor: pointer;
}
.ac-dtable__pagebtn:disabled { opacity: 0.4; cursor: default; }
.ac-dtable__pageinfo { font-size: 0.82em; color: var(--ac-muted); font-variant-numeric: tabular-nums; }
</style>
