<script setup lang="ts">
defineOptions({ name: 'ToolActionCard' })

/**
 * ToolActionCard —— 按工具种类特化的执行卡。
 *
 * 行业对标（AG-UI Controlled Generative UI / CopilotKit useRenderTool / assistant-ui defineToolkit）：
 * 1. 内置特化：read_file / write_file / edit_file / delete_file / run_command / search / browse / generic
 *    自动从 ToolCallState 推断种类（可显式指定），展示语义图标 + 参数摘要 + 状态耗时 + 展开详情。
 * 2. 自定义渲染器注册表：renderers 按「工具名 → 组件」完全接管单个工具的渲染
 *    （等价 AG-UI toolRenderers 字典 / CopilotKit useRenderTool），default 键为兜底。
 * 3. 特化结果渲染：run_command 结果按终端样式展示 stdout/exitCode；
 *    检测到 diff 文本按 +/- 着色；browse 的 url 可点击打开。
 */
import { computed, ref, type Component } from 'vue'
import type { ToolActionKind, ToolCallState } from '../../types'
import { useI18n } from '../../i18n'

const props = defineProps<{
  toolCall: ToolCallState
  /** 显式指定种类（不传则按工具名推断） */
  kind?: ToolActionKind
  /** 初始展开详情 */
  defaultExpanded?: boolean
  /**
   * 自定义渲染器注册表：工具名 → 组件（AG-UI toolRenderers 模式）。
   * 命中后完全接管渲染，组件收到 props: { toolCall }；'default' 键为兜底。
   */
  renderers?: Record<string, Component>
}>()

const { t } = useI18n()

/** 命中注册表则用自定义组件（精确工具名 > default） */
const customRenderer = computed<Component | null>(
  () => props.renderers?.[props.toolCall.name] ?? props.renderers?.default ?? null,
)

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

const META: Record<ToolActionKind, { labelKey: string; icon: string }> = {
  read_file: { labelKey: 'tool.readFile', icon: 'M3 2.5h6.5L13 6v7.5H3z M9.5 2.5V6H13' },
  write_file: { labelKey: 'tool.writeFile', icon: 'M3 2.5h6.5L13 6v7.5H3z M6 9.5l1.5 1.5L10.5 8' },
  edit_file: { labelKey: 'tool.editFile', icon: 'M11 2.5l2.5 2.5L6 12.5H3.5V10z' },
  delete_file: { labelKey: 'tool.deleteFile', icon: 'M4 4.5h8M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8' },
  run_command: { labelKey: 'tool.runCommand', icon: 'M3 4l4 4-4 4M8.5 12H13' },
  search: { labelKey: 'tool.search', icon: 'M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM10.5 10.5 14 14' },
  browse: { labelKey: 'tool.browse', icon: 'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM2 8h12M8 2c2 2.2 2 9.8 0 12M8 2c-2 2.2-2 9.8 0 12' },
  generic: { labelKey: 'tool.generic', icon: 'M9.5 3.5a3 3 0 0 0-4 4L2 11l3 3 3.5-3.5a3 3 0 0 0 4-4L10 9 7 6z' },
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

/** browse 类：url 参数可点击 */
const linkUrl = computed(() => {
  if (resolvedKind.value !== 'browse') return ''
  const u = (props.toolCall.args as Record<string, unknown> | undefined)?.url
  return typeof u === 'string' && /^https?:\/\//.test(u) ? u : ''
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

// ============ 特化结果渲染 ============

/** run_command：结果对象里提取 stdout / output / exitCode */
const cmdResult = computed(() => {
  if (resolvedKind.value !== 'run_command' || props.toolCall.result == null) return null
  const r = props.toolCall.result
  if (typeof r === 'string') return { output: r, exitCode: undefined as number | undefined }
  if (typeof r === 'object') {
    const o = r as Record<string, unknown>
    const output = o.stdout ?? o.output ?? o.text
    if (typeof output === 'string') {
      return { output, exitCode: typeof o.exitCode === 'number' ? o.exitCode : undefined }
    }
  }
  return null
})

/** diff 检测：文本含 +/- 前缀行（编辑/写入类结果或 diff 参数），按行着色 */
const diffLines = computed(() => {
  if (!['edit_file', 'write_file'].includes(resolvedKind.value)) return null
  const cand = [
    props.toolCall.result,
    (props.toolCall.args as Record<string, unknown> | undefined)?.diff,
  ].find((v) => typeof v === 'string') as string | undefined
  if (!cand) return null
  const lines = cand.split('\n')
  // 至少要有一行 +/- 才当作 diff
  if (!lines.some((l) => /^[+-](?![+-])/.test(l))) return null
  return lines.map((text) => ({
    text,
    type: text.startsWith('+') ? 'add' : text.startsWith('-') ? 'del' : 'ctx',
  }))
})

/** 通用详情是否还需要展示结果块（特化渲染接管后不再重复） */
const showRawResult = computed(
  () => props.toolCall.result != null && !cmdResult.value && !diffLines.value,
)
</script>

<template>
  <!-- 注册表命中：完全交给自定义组件（AG-UI toolRenderers 模式） -->
  <component :is="customRenderer" v-if="customRenderer" :tool-call="toolCall" />

  <div v-else class="ac-action" :data-status="toolCall.status" :data-kind="resolvedKind">
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
      <span class="ac-action__label">{{ toolCall.label || t(meta.labelKey) }}</span>
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
        <p class="ac-action__section">{{ t('tool.args') }}</p>
        <pre class="ac-action__pre"><code>{{ fmt(toolCall.args) }}</code></pre>
      </template>

      <!-- 特化：终端样式命令输出 -->
      <template v-if="cmdResult">
        <p class="ac-action__section">
          {{ t('tool.output') }}
          <span v-if="cmdResult.exitCode !== undefined" class="ac-action__exit" :data-ok="cmdResult.exitCode === 0">
            {{ t('tool.exitCode', { n: cmdResult.exitCode }) }}
          </span>
        </p>
        <pre class="ac-action__pre ac-action__pre--term"><code>{{ cmdResult.output }}</code></pre>
      </template>

      <!-- 特化：diff 着色 -->
      <template v-else-if="diffLines">
        <p class="ac-action__section">{{ t('tool.result') }}</p>
        <pre class="ac-action__pre ac-action__pre--diff"><code><span
          v-for="(l, i) in diffLines" :key="i" class="ac-action__dline" :data-t="l.type"
        >{{ l.text }}
</span></code></pre>
      </template>

      <!-- 通用 JSON 结果 -->
      <template v-else-if="showRawResult">
        <p class="ac-action__section">{{ t('tool.result') }}</p>
        <pre class="ac-action__pre"><code>{{ fmt(toolCall.result) }}</code></pre>
      </template>

      <a v-if="linkUrl" class="ac-action__link" :href="linkUrl" target="_blank" rel="noopener noreferrer">
        {{ t('tool.openLink') }} ↗
      </a>
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
.ac-action__section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 3px;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--ac-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.ac-action__exit {
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  color: var(--ac-danger);
}
.ac-action__exit[data-ok='true'] { color: var(--ac-success); }
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
/* 终端样式：深底浅字，与 TerminalPanel 视觉一致 */
.ac-action__pre--term {
  background: #16181d;
  color: #d4d8de;
}
.ac-action__pre--diff { padding: 7px 0; }
.ac-action__dline { display: block; padding: 0 9px; white-space: pre; }
.ac-action__dline[data-t='add'] { background: color-mix(in srgb, var(--ac-success) 12%, transparent); color: var(--ac-success); }
.ac-action__dline[data-t='del'] { background: color-mix(in srgb, var(--ac-danger) 10%, transparent); color: var(--ac-danger); }
.ac-action__link {
  display: inline-block;
  margin: 0 0 6px;
  font-size: 0.74rem;
  color: var(--ac-primary);
  text-decoration: none;
}
.ac-action__link:hover { text-decoration: underline; }
.ac-action__error { margin: 0; color: var(--ac-danger); font-size: 0.75rem; }
</style>
