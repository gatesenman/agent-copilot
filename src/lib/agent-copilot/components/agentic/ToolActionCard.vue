<script setup lang="ts">
/**
 * ToolActionCard —— 按工具种类特化的执行卡。
 * read_file / write_file / edit_file / delete_file / run_command / search / browse / generic
 * 自动从 ToolCallState 推断种类（可显式指定），展示摘要 + 展开详情。
 */
import { computed, ref } from 'vue'
import type { ToolActionKind, ToolCallState } from '../../types'

const props = defineProps<{
  toolCall: ToolCallState
  /** 显式指定种类（不传则按工具名推断） */
  kind?: ToolActionKind
  /** 初始展开详情 */
  defaultExpanded?: boolean
}>()

/** 工具名 → 种类推断规则（可通过 kind prop 覆盖） */
const KIND_RULES: [RegExp, ToolActionKind][] = [
  [/read|cat|view|open_file|get_file/i, 'read_file'],
  [/write|create_file|save/i, 'write_file'],
  [/edit|patch|modify|replace/i, 'edit_file'],
  [/delete|remove|rm/i, 'delete_file'],
  [/run|exec|command|shell|bash|terminal/i, 'run_command'],
  [/search|grep|find|glob|query/i, 'search'],
  [/browse|fetch|http|visit|navigate|web/i, 'browse'],
]

const resolvedKind = computed<ToolActionKind>(() => {
  if (props.kind) return props.kind
  for (const [re, k] of KIND_RULES) {
    if (re.test(props.toolCall.name)) return k
  }
  return 'generic'
})

const META: Record<ToolActionKind, { label: string; icon: string }> = {
  read_file: { label: '读取文件', icon: 'M3 2.5h6.5L13 6v7.5H3z M9.5 2.5V6H13' },
  write_file: { label: '写入文件', icon: 'M3 2.5h6.5L13 6v7.5H3z M6 9.5l1.5 1.5L10.5 8' },
  edit_file: { label: '编辑文件', icon: 'M11 2.5l2.5 2.5L6 12.5H3.5V10z' },
  delete_file: { label: '删除文件', icon: 'M4 4.5h8M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8' },
  run_command: { label: '执行命令', icon: 'M3 4l4 4-4 4M8.5 12H13' },
  search: { label: '搜索', icon: 'M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM10.5 10.5 14 14' },
  browse: { label: '浏览网页', icon: 'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM2 8h12M8 2c2 2.2 2 9.8 0 12M8 2c-2 2.2-2 9.8 0 12' },
  generic: { label: '工具调用', icon: 'M9.5 3.5a3 3 0 0 0-4 4L2 11l3 3 3.5-3.5a3 3 0 0 0 4-4L10 9 7 6z' },
}

const meta = computed(() => META[resolvedKind.value])

/** 主参数摘要：文件路径 / 命令 / 查询词 / URL */
const summary = computed(() => {
  const args = props.toolCall.args as Record<string, unknown> | undefined
  if (!args) return ''
  const cand = args.path ?? args.file ?? args.filename ?? args.command ?? args.cmd
    ?? args.query ?? args.pattern ?? args.url ?? args.q
  if (typeof cand === 'string') return cand
  const first = Object.values(args)[0]
  return typeof first === 'string' ? first : ''
})

const expanded = ref(props.defaultExpanded ?? false)
const hasDetail = computed(() =>
  (props.toolCall.args && Object.keys(props.toolCall.args).length > 0) || props.toolCall.result != null || props.toolCall.error,
)

const durationText = computed(() => {
  const { startedAt, finishedAt } = props.toolCall
  if (!startedAt || !finishedAt) return ''
  return `${((finishedAt - startedAt) / 1000).toFixed(1)}s`
})

function fmt(v: unknown): string {
  if (typeof v === 'string') return v
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}
</script>

<template>
  <div class="ac-action" :data-status="toolCall.status" :data-kind="resolvedKind">
    <button
      type="button"
      class="ac-action__head"
      :aria-expanded="expanded"
      :disabled="!hasDetail"
      @click="hasDetail && (expanded = !expanded)"
    >
      <span class="ac-action__icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path :d="meta.icon" />
        </svg>
      </span>
      <span class="ac-action__label">{{ toolCall.label || meta.label }}</span>
      <code v-if="summary" class="ac-action__summary">{{ summary }}</code>
      <span class="ac-action__right">
        <span v-if="durationText" class="ac-action__duration">{{ durationText }}</span>
        <span class="ac-action__status" aria-hidden="true">
          <svg v-if="toolCall.status === 'succeeded'" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 8.5 3.5 3.5L13 5" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <svg v-else-if="toolCall.status === 'failed'" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" /></svg>
          <svg v-else class="ac-action__spin" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6" opacity="0.25" /><path d="M8 2a6 6 0 0 1 6 6" stroke-linecap="round" /></svg>
        </span>
      </span>
    </button>

    <div v-if="expanded" class="ac-action__detail">
      <template v-if="toolCall.args && Object.keys(toolCall.args).length">
        <p class="ac-action__section">参数</p>
        <pre class="ac-action__pre"><code>{{ fmt(toolCall.args) }}</code></pre>
      </template>
      <template v-if="toolCall.result != null">
        <p class="ac-action__section">结果</p>
        <pre class="ac-action__pre"><code>{{ fmt(toolCall.result) }}</code></pre>
      </template>
      <p v-if="toolCall.error" class="ac-action__error">{{ toolCall.error }}</p>
    </div>
  </div>
</template>

<style scoped>
.ac-action {
  margin: 3px 0;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.7);
  background: var(--ac-bg);
  overflow: hidden;
  font-size: 0.78rem;
}
.ac-action__head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: var(--ac-fg);
}
.ac-action__head:disabled { cursor: default; }
.ac-action__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--ac-surface);
  border: 1px solid var(--ac-border);
  color: var(--ac-primary);
  flex-shrink: 0;
}
.ac-action[data-kind='delete_file'] .ac-action__icon { color: var(--ac-danger); }
.ac-action[data-kind='run_command'] .ac-action__icon { color: var(--ac-warning); }
.ac-action__label { font-weight: 600; flex-shrink: 0; }
.ac-action__summary {
  font-family: var(--ac-font-mono, monospace);
  font-size: 0.72rem;
  color: var(--ac-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.ac-action__right { display: flex; align-items: center; gap: 7px; margin-left: auto; flex-shrink: 0; }
.ac-action__duration { font-size: 0.68rem; color: var(--ac-muted); }
.ac-action__status { display: flex; }
.ac-action[data-status='succeeded'] .ac-action__status { color: var(--ac-success); }
.ac-action[data-status='failed'] .ac-action__status { color: var(--ac-danger); }
.ac-action[data-status='running'] .ac-action__status { color: var(--ac-primary); }
.ac-action__spin { animation: ac-action-spin 0.9s linear infinite; }
@keyframes ac-action-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ac-action__spin { animation-duration: 2.5s; } }
.ac-action__detail { border-top: 1px dashed var(--ac-border); padding: 8px 11px; }
.ac-action__section { margin: 0 0 3px; font-size: 0.68rem; font-weight: 700; color: var(--ac-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.ac-action__pre {
  margin: 0 0 8px;
  padding: 7px 9px;
  background: var(--ac-surface);
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.72rem;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
}
.ac-action__error { margin: 0; color: var(--ac-danger); font-size: 0.75rem; }
</style>
