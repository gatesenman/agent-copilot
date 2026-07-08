<script setup lang="ts">
/**
 * ArtifactPanel —— 会话产物面板。
 *
 * 从消息流中收集结构化产物（代码 / Diff / 表格 / 图表 / 图片 / 文档等），
 * 以清单形式聚合展示，支持点击预览（PayloadCard 渲染）、单个下载与会话导出。
 *
 * 用法：
 *   <ArtifactPanel :messages="store.messages.value" />
 * 或手动传入产物列表：
 *   <ArtifactPanel :artifacts="items" />
 */
import { computed, ref } from 'vue'
import { useI18n } from '../../i18n'
import type { ChatMessage, StructuredPayload, StructuredPayloadType } from '../../types'
import { downloadText, exportSession, type ExportFormat } from '../../utils/session-export'
import PayloadCard from '../generative-ui/PayloadCard.vue'

export interface ArtifactItem {
  id: string
  payload: StructuredPayload
  /** 来源消息 id */
  messageId?: string
  createdAt?: number
}

const props = withDefaults(
  defineProps<{
    /** 从消息流自动收集（与 artifacts 二选一） */
    messages?: ChatMessage[]
    /** 手动传入产物列表 */
    artifacts?: ArtifactItem[]
    /** 参与收集的载荷类型，默认为产出型载荷 */
    collectTypes?: StructuredPayloadType[]
    /** 显示会话导出按钮（需传 messages），默认 true */
    exportable?: boolean
    labels?: { title?: string; empty?: string; download?: string; exportMd?: string; exportJson?: string }
  }>(),
  { exportable: true },
)

const emit = defineEmits<{
  (e: 'open', item: ArtifactItem): void
}>()

const { t, locale } = useI18n()

const L = computed(() => ({
  title: props.labels?.title ?? t('artifact.title'),
  empty: props.labels?.empty ?? t('artifact.empty'),
  download: props.labels?.download ?? t('common.download'),
  exportMd: props.labels?.exportMd ?? t('artifact.exportMd'),
  exportJson: props.labels?.exportJson ?? t('artifact.exportJson'),
}))

/** 默认收集的“产出型”载荷（排除表单/计划等交互型） */
const DEFAULT_TYPES: StructuredPayloadType[] = [
  'code', 'diff', 'table', 'comparison', 'chart', 'sql_result',
  'image', 'document', 'metrics', 'file_tree',
]

const TYPE_META = computed<Partial<Record<StructuredPayloadType, { label: string; icon: string }>>>(() => ({
  code: { label: t('artifact.typeCode'), icon: '{ }' },
  diff: { label: 'Diff', icon: '±' },
  table: { label: t('artifact.typeTable'), icon: '▦' },
  comparison: { label: t('artifact.typeComparison'), icon: '▦' },
  chart: { label: t('artifact.typeChart'), icon: '▁▃▅' },
  sql_result: { label: 'SQL', icon: '⌸' },
  image: { label: t('artifact.typeImage'), icon: '▣' },
  document: { label: t('artifact.typeDocument'), icon: '¶' },
  metrics: { label: t('artifact.typeMetrics'), icon: '◔' },
  file_tree: { label: t('artifact.typeFileTree'), icon: '⌥' },
}))

const items = computed<ArtifactItem[]>(() => {
  if (props.artifacts) return props.artifacts
  const types = props.collectTypes ?? DEFAULT_TYPES
  const out: ArtifactItem[] = []
  for (const m of props.messages ?? []) {
    ;(m.payloads ?? []).forEach((p, i) => {
      if (types.includes(p.type)) {
        out.push({ id: `${m.id}_${i}`, payload: p, messageId: m.id, createdAt: m.createdAt })
      }
    })
  }
  return out
})

const activeId = ref<string | null>(null)
const active = computed(() => items.value.find((it) => it.id === activeId.value) ?? null)

function toggle(item: ArtifactItem) {
  activeId.value = activeId.value === item.id ? null : item.id
  emit('open', item)
}

function titleOf(item: ArtifactItem): string {
  const meta = TYPE_META.value[item.payload.type]
  return item.payload.title ?? meta?.label ?? item.payload.type
}

/** 单个产物下载：code/diff 保存源文件，其余存 JSON */
function download(item: ArtifactItem) {
  const d = item.payload.data as any
  if (item.payload.type === 'code' && d?.code) {
    downloadText(d.code, d.filename ?? `artifact-${item.id}.txt`)
    return
  }
  if (item.payload.type === 'diff' && Array.isArray(d?.lines)) {
    downloadText(d.lines.map((l: any) => l.text).join('\n'), `${d.filename ?? 'artifact'}.diff`)
    return
  }
  let json: string
  try { json = JSON.stringify(item.payload, null, 2) } catch { json = String(item.payload.data) }
  downloadText(json, `artifact-${item.payload.type}-${item.id}.json`, 'application/json')
}

function doExport(format: ExportFormat) {
  if (props.messages) exportSession(props.messages, format)
}
</script>

<template>
  <div class="ac-artifacts">
    <div class="ac-artifacts__head">
      <span class="ac-artifacts__title">{{ L.title }}</span>
      <span class="ac-artifacts__count">{{ items.length }}</span>
      <span class="ac-artifacts__spacer" />
      <template v-if="exportable && messages">
        <button type="button" class="ac-artifacts__btn" :disabled="!messages.length" @click="doExport('markdown')">{{ L.exportMd }}</button>
        <button type="button" class="ac-artifacts__btn" :disabled="!messages.length" @click="doExport('json')">{{ L.exportJson }}</button>
      </template>
    </div>

    <p v-if="items.length === 0" class="ac-artifacts__empty">{{ L.empty }}</p>

    <ul v-else class="ac-artifacts__list" role="list">
      <li v-for="item in items" :key="item.id" class="ac-artifacts__item">
        <div class="ac-artifacts__row">
          <button
            type="button"
            class="ac-artifacts__entry"
            :aria-expanded="activeId === item.id"
            @click="toggle(item)"
          >
            <span class="ac-artifacts__icon" aria-hidden="true">{{ TYPE_META[item.payload.type]?.icon ?? '◇' }}</span>
            <span class="ac-artifacts__name">{{ titleOf(item) }}</span>
            <span class="ac-artifacts__type">{{ TYPE_META[item.payload.type]?.label ?? item.payload.type }}</span>
            <span v-if="item.createdAt" class="ac-artifacts__time">{{ new Date(item.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) }}</span>
          </button>
          <button type="button" class="ac-artifacts__dl" :title="L.download" :aria-label="`${L.download} ${titleOf(item)}`" @click="download(item)">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M8 2v8m0 0 3-3m-3 3L5 7M3 13h10" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
        <div v-if="activeId === item.id && active" class="ac-artifacts__preview">
          <PayloadCard :payload="active.payload" />
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ac-artifacts {
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: var(--ac-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.ac-artifacts__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
}
.ac-artifacts__title { font-size: 0.84rem; font-weight: 700; color: var(--ac-fg); }
.ac-artifacts__count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--ac-border);
  color: var(--ac-fg);
  font-size: 0.68rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ac-artifacts__spacer { flex: 1; }
.ac-artifacts__btn {
  border: 1px solid var(--ac-border);
  background: var(--ac-bg);
  color: var(--ac-fg);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 0.72rem;
  cursor: pointer;
}
.ac-artifacts__btn:hover:not(:disabled) { border-color: var(--ac-primary); color: var(--ac-primary); }
.ac-artifacts__btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ac-artifacts__empty { padding: 18px; margin: 0; text-align: center; color: var(--ac-muted); font-size: 0.78rem; text-wrap: pretty; }
.ac-artifacts__list { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
.ac-artifacts__item { border-bottom: 1px solid var(--ac-border); }
.ac-artifacts__item:last-child { border-bottom: none; }
.ac-artifacts__row { display: flex; align-items: center; gap: 4px; padding: 2px 8px 2px 4px; }
.ac-artifacts__entry {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 7px 8px;
  color: var(--ac-fg);
  text-align: left;
  border-radius: 6px;
}
.ac-artifacts__entry:hover { background: var(--ac-surface); }
.ac-artifacts__icon {
  flex-shrink: 0;
  width: 26px;
  text-align: center;
  font-size: 0.7rem;
  font-family: var(--ac-font-mono, monospace);
  color: var(--ac-primary);
}
.ac-artifacts__name {
  font-size: 0.79rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ac-artifacts__type {
  flex-shrink: 0;
  font-size: 0.66rem;
  padding: 1px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--ac-primary) 10%, transparent);
  color: var(--ac-primary);
  font-weight: 600;
}
.ac-artifacts__time { flex-shrink: 0; margin-left: auto; font-size: 0.68rem; color: var(--ac-muted); font-family: var(--ac-font-mono, monospace); }
.ac-artifacts__dl {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--ac-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: inline-flex;
}
.ac-artifacts__dl:hover { color: var(--ac-primary); background: var(--ac-surface); }
.ac-artifacts__preview { border-top: 1px dashed var(--ac-border); padding: 8px 12px; background: var(--ac-surface); }
</style>
