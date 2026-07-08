<script setup lang="ts">
/**
 * ChangeReviewPanel —— 文件变更审查面板。
 * 变更列表 + 展开 diff + 单文件/全部 接受/拒绝；统计增删行数。
 */
import { computed, ref } from 'vue'
import { useI18n } from '../../i18n'
import type { FileChange } from '../../types'

const props = withDefaults(
  defineProps<{
    changes: FileChange[]
    /** 只读（已完成审查后展示态） */
    readonly?: boolean
    /**
     * 可折叠汇总条形态（类 VS Code Agent"N 个文件已更改 +x -y"条）：
     * 折叠时仅显示汇总头 + 撤销全部按钮，点击展开文件列表
     */
    collapsible?: boolean
    /** collapsible 时初始是否展开 */
    defaultExpanded?: boolean
    labels?: {
      title?: string
      acceptAll?: string
      rejectAll?: string
      accept?: string
      reject?: string
      accepted?: string
      rejected?: string
      empty?: string
      /** collapsible 汇总条文案模板，{n} 为文件数 */
      summary?: string
      undoAll?: string
    }
  }>(),
  { readonly: false, collapsible: false, defaultExpanded: false },
)

const emit = defineEmits<{
  (e: 'review', changeId: string | 'all', decision: 'accepted' | 'rejected'): void
  (e: 'open', change: FileChange): void
}>()

const { t } = useI18n()

const L = computed(() => ({
  title: props.labels?.title ?? t('review.title'),
  acceptAll: props.labels?.acceptAll ?? t('review.acceptAll'),
  rejectAll: props.labels?.rejectAll ?? t('review.rejectAll'),
  accept: props.labels?.accept ?? t('review.accept'),
  reject: props.labels?.reject ?? t('review.reject'),
  accepted: props.labels?.accepted ?? t('review.accepted'),
  rejected: props.labels?.rejected ?? t('review.rejected'),
  empty: props.labels?.empty ?? t('review.empty'),
  summary: props.labels?.summary ?? t('review.summary'),
  undoAll: props.labels?.undoAll ?? t('review.undoAll'),
}))

/** collapsible 形态下列表是否展开 */
const listOpen = ref(props.defaultExpanded)
const summaryText = computed(() => L.value.summary.replace('{n}', String(props.changes.length)))

const expanded = ref<Record<string, boolean>>({})
const pendingCount = computed(() => props.changes.filter((c) => c.status === 'pending').length)
const totalAdd = computed(() => props.changes.reduce((s, c) => s + (c.additions ?? 0), 0))
const totalDel = computed(() => props.changes.reduce((s, c) => s + (c.deletions ?? 0), 0))

const KIND_LABEL = computed<Record<FileChange['kind'], string>>(() => ({
  create: t('change.create'), modify: t('change.modify'), delete: t('change.delete'), rename: t('change.rename'),
}))

function toggle(id: string) {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] }
}

/** 解析统一 diff 文本为着色行 */
function diffLines(diff: string): { cls: string; text: string }[] {
  return diff.split('\n').map((line) => {
    if (line.startsWith('+')) return { cls: 'add', text: line }
    if (line.startsWith('-')) return { cls: 'del', text: line }
    if (line.startsWith('@@')) return { cls: 'hunk', text: line }
    return { cls: 'ctx', text: line }
  })
}
</script>

<template>
  <div class="ac-review" :class="{ 'ac-review--bar': collapsible && !listOpen }">
    <!-- collapsible 汇总条头（类 VS Code Agent "N 个文件已更改 +x -y [撤销]"） -->
    <button
      v-if="collapsible"
      type="button"
      class="ac-review__head ac-review__head--toggle"
      :aria-expanded="listOpen"
      @click="listOpen = !listOpen"
    >
      <svg class="ac-review__chevron" :class="{ 'ac-review__chevron--open': listOpen }" viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <path d="m6 4 4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="ac-review__title">{{ summaryText }}</span>
      <span class="ac-review__stats">
        <span class="ac-review__stat ac-review__stat--add">+{{ totalAdd }}</span>
        <span class="ac-review__stat ac-review__stat--del">-{{ totalDel }}</span>
      </span>
      <span class="ac-review__spacer" />
      <span
        v-if="!readonly && pendingCount > 0"
        class="ac-review__btn ac-review__btn--sm ac-review__btn--ghost"
        role="button"
        tabindex="0"
        @click.stop="emit('review', 'all', 'rejected')"
        @keydown.enter.stop="emit('review', 'all', 'rejected')"
      >
        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M3 7h7a3 3 0 0 1 0 6H8M3 7l3-3M3 7l3 3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {{ L.undoAll }}
      </span>
    </button>

    <!-- 常开形态头 -->
    <div v-else class="ac-review__head">
      <span class="ac-review__title">{{ L.title }}</span>
      <span class="ac-review__stats">
        <span class="ac-review__stat ac-review__stat--add">+{{ totalAdd }}</span>
        <span class="ac-review__stat ac-review__stat--del">-{{ totalDel }}</span>
        <span class="ac-review__count">{{ t('review.filesN', { n: changes.length }) }}</span>
      </span>
      <span class="ac-review__spacer" />
      <template v-if="!readonly && pendingCount > 0">
        <button type="button" class="ac-review__btn ac-review__btn--ghost" @click="emit('review', 'all', 'rejected')">{{ L.rejectAll }}</button>
        <button type="button" class="ac-review__btn ac-review__btn--primary" @click="emit('review', 'all', 'accepted')">{{ L.acceptAll }}</button>
      </template>
    </div>

    <p v-if="changes.length === 0 && (!collapsible || listOpen)" class="ac-review__empty">{{ L.empty }}</p>

    <ul v-else-if="!collapsible || listOpen" class="ac-review__list" role="list">
      <li v-for="change in changes" :key="change.id" class="ac-review__item" :data-status="change.status">
        <div class="ac-review__row">
          <button type="button" class="ac-review__file" :aria-expanded="!!expanded[change.id]" @click="toggle(change.id); emit('open', change)">
            <svg class="ac-review__chevron" :class="{ 'ac-review__chevron--open': expanded[change.id] }" viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path d="m6 4 4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="ac-review__kind" :class="`ac-review__kind--${change.kind}`">{{ KIND_LABEL[change.kind as FileChange['kind']] }}</span>
            <span class="ac-review__path">{{ change.path }}</span>
            <span v-if="change.fromPath" class="ac-review__from">← {{ change.fromPath }}</span>
            <span class="ac-review__nums">
              <span v-if="change.additions" class="ac-review__stat--add">+{{ change.additions }}</span>
              <span v-if="change.deletions" class="ac-review__stat--del">-{{ change.deletions }}</span>
            </span>
          </button>

          <span v-if="change.status === 'accepted'" class="ac-review__decision ac-review__decision--accepted">{{ L.accepted }}</span>
          <span v-else-if="change.status === 'rejected'" class="ac-review__decision ac-review__decision--rejected">{{ L.rejected }}</span>
          <span v-else-if="!readonly" class="ac-review__actions">
            <button type="button" class="ac-review__btn ac-review__btn--sm ac-review__btn--ghost" @click="emit('review', change.id, 'rejected')">{{ L.reject }}</button>
            <button type="button" class="ac-review__btn ac-review__btn--sm ac-review__btn--primary" @click="emit('review', change.id, 'accepted')">{{ L.accept }}</button>
          </span>
        </div>

        <div v-if="expanded[change.id] && (change.diff || change.content)" class="ac-review__diff">
          <pre v-if="change.diff" class="ac-review__pre"><code><span
            v-for="(line, i) in diffLines(change.diff)"
            :key="i"
            class="ac-review__line"
            :class="`ac-review__line--${line.cls}`"
          >{{ line.text }}
</span></code></pre>
          <pre v-else class="ac-review__pre"><code>{{ change.content }}</code></pre>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ac-review {
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: var(--ac-bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.ac-review__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 13px;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
}
.ac-review__head--toggle {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--ac-border);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--ac-fg);
}
.ac-review__head--toggle:hover { background: color-mix(in srgb, var(--ac-primary) 5%, var(--ac-surface)); }
.ac-review--bar .ac-review__head--toggle { border-bottom: none; }
.ac-review__btn--ghost svg { vertical-align: -1px; margin-right: 3px; }
.ac-review__title { font-size: 0.84rem; font-weight: 700; color: var(--ac-fg); }
.ac-review__stats { display: flex; gap: 7px; font-size: 0.74rem; font-family: var(--ac-font-mono, monospace); }
.ac-review__stat--add { color: var(--ac-success); }
.ac-review__stat--del { color: var(--ac-danger); }
.ac-review__count { color: var(--ac-muted); }
.ac-review__spacer { flex: 1; }
.ac-review__empty { padding: 18px; margin: 0; text-align: center; color: var(--ac-muted); font-size: 0.8rem; }
.ac-review__list { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
.ac-review__item { border-bottom: 1px solid var(--ac-border); }
.ac-review__item:last-child { border-bottom: none; }
.ac-review__item[data-status='rejected'] .ac-review__path { text-decoration: line-through; opacity: 0.6; }
.ac-review__row { display: flex; align-items: center; gap: 8px; padding: 4px 10px 4px 6px; }
.ac-review__file {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 5px 6px;
  color: var(--ac-fg);
  text-align: left;
  border-radius: 6px;
}
.ac-review__file:hover { background: var(--ac-surface); }
.ac-review__chevron { color: var(--ac-muted); flex-shrink: 0; transition: transform 0.15s; }
.ac-review__chevron--open { transform: rotate(90deg); }
.ac-review__kind {
  font-size: 0.66rem;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  flex-shrink: 0;
}
.ac-review__kind--create { background: color-mix(in srgb, var(--ac-success) 14%, transparent); color: var(--ac-success); }
.ac-review__kind--modify { background: color-mix(in srgb, var(--ac-primary) 12%, transparent); color: var(--ac-primary); }
.ac-review__kind--delete { background: color-mix(in srgb, var(--ac-danger) 12%, transparent); color: var(--ac-danger); }
.ac-review__kind--rename { background: color-mix(in srgb, var(--ac-warning) 16%, transparent); color: var(--ac-warning); }
.ac-review__path {
  font-family: var(--ac-font-mono, monospace);
  font-size: 0.76rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ac-review__from { font-size: 0.7rem; color: var(--ac-muted); }
.ac-review__nums { display: flex; gap: 5px; font-size: 0.7rem; font-family: var(--ac-font-mono, monospace); margin-left: auto; flex-shrink: 0; }
.ac-review__actions { display: flex; gap: 5px; flex-shrink: 0; }
.ac-review__decision { font-size: 0.7rem; font-weight: 600; flex-shrink: 0; padding: 1px 8px; border-radius: 999px; }
.ac-review__decision--accepted { color: var(--ac-success); background: color-mix(in srgb, var(--ac-success) 12%, transparent); }
.ac-review__decision--rejected { color: var(--ac-danger); background: color-mix(in srgb, var(--ac-danger) 10%, transparent); }
.ac-review__btn {
  border: 1px solid var(--ac-border);
  background: var(--ac-bg);
  color: var(--ac-fg);
  border-radius: 6px;
  padding: 4px 11px;
  font-size: 0.74rem;
  cursor: pointer;
}
.ac-review__btn--sm { padding: 2px 9px; font-size: 0.7rem; }
.ac-review__btn--ghost { color: var(--ac-muted); }
.ac-review__btn--ghost:hover { color: var(--ac-danger); border-color: var(--ac-danger); }
.ac-review__btn--primary { background: var(--ac-primary); border-color: var(--ac-primary); color: var(--ac-primary-fg, #fff); font-weight: 600; }
.ac-review__btn--primary:hover { opacity: 0.9; }
.ac-review__diff { border-top: 1px dashed var(--ac-border); max-height: 320px; overflow: auto; }
.ac-review__pre {
  margin: 0;
  padding: 8px 0;
  font-family: var(--ac-font-mono, monospace);
  font-size: 0.74rem;
  line-height: 1.55;
}
.ac-review__line { display: block; padding: 0 12px; white-space: pre-wrap; word-break: break-all; }
.ac-review__line--add { background: color-mix(in srgb, var(--ac-success) 10%, transparent); color: var(--ac-success); }
.ac-review__line--del { background: color-mix(in srgb, var(--ac-danger) 8%, transparent); color: var(--ac-danger); }
.ac-review__line--hunk { color: var(--ac-primary); opacity: 0.8; }
.ac-review__line--ctx { color: var(--ac-muted); }
</style>
