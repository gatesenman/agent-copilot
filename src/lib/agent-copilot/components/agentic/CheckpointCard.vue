<script setup lang="ts">
defineOptions({ name: 'CheckpointCard' })

/**
 * CheckpointCard — 版本快照卡
 *
 * 消息流内嵌的一次变更快照：版本标签 + 聚合差异统计（+11 / -5）+
 * 逐文件路径与增删行数 + 撤销回滚按钮（v0 式的 "Removed xxx v14" 卡片）。
 * 与 ChangeReviewPanel（审查面板）互补：这是轻量只读展示 + 一键回滚。
 */
import { computed, ref } from 'vue'
import { useI18n } from '../../i18n'
import type { FileChange } from '../../types'

const props = withDefaults(
  defineProps<{
    /** 快照标题，如「Removed Agentic height」 */
    title: string
    /** 版本标签，如「v14」 */
    version?: string
    /** 涉及的文件变更（复用 FileChange，仅读 path/additions/deletions/kind） */
    files: FileChange[]
    /** 是否显示撤销按钮 */
    revertable?: boolean
    /** 初始是否展开文件列表 */
    defaultExpanded?: boolean
  }>(),
  { revertable: true, defaultExpanded: true },
)

const emit = defineEmits<{
  (e: 'revert'): void
  (e: 'select-file', file: FileChange): void
}>()

const expanded = ref(props.defaultExpanded)

const totalAdd = computed(() => props.files.reduce((s, f) => s + (f.additions ?? 0), 0))
const totalDel = computed(() => props.files.reduce((s, f) => s + (f.deletions ?? 0), 0))

const { t } = useI18n()

const KIND_LABEL = computed<Record<FileChange['kind'], string>>(() => ({
  create: t('change.create'),
  modify: t('change.modify'),
  delete: t('change.delete'),
  rename: t('change.rename'),
}))

function fileName(path: string) {
  return path.split('/').pop() ?? path
}
function dirName(path: string) {
  const i = path.lastIndexOf('/')
  return i > 0 ? path.slice(0, i) : ''
}
</script>

<template>
  <section class="ac-ckpt" :aria-label="t('ckpt.aria')">
    <header class="ac-ckpt__head">
      <button
        type="button"
        class="ac-ckpt__toggle"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <svg class="ac-ckpt__chevron" :class="{ 'is-open': expanded }" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="ac-ckpt__title">{{ title }}</span>
        <span v-if="version" class="ac-ckpt__ver">{{ version }}</span>
      </button>
      <div class="ac-ckpt__meta">
        <span class="ac-ckpt__stat" :aria-label="t('ckpt.diffStat')">
          <em v-if="totalAdd" class="ac-ckpt__add">+{{ totalAdd }}</em>
          <i v-if="totalAdd && totalDel" class="ac-ckpt__sep">/</i>
          <em v-if="totalDel" class="ac-ckpt__del">-{{ totalDel }}</em>
        </span>
        <button
          v-if="revertable"
          type="button"
          class="ac-ckpt__revert"
          :aria-label="t('ckpt.revert')"
          :title="t('ckpt.revert')"
          @click="emit('revert')"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M12 5V1L5 8l7 7v-4.5c3.3 0 6 2.7 6 6 0 1-.2 1.9-.7 2.7l1.8 1.3A8 8 0 0 0 12 5Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </header>
    <ul v-if="expanded && files.length" class="ac-ckpt__files">
      <li v-for="f in files" :key="f.id">
        <button type="button" class="ac-ckpt__file" @click="emit('select-file', f)">
          <svg class="ac-ckpt__ficon" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V8h4.5L13 3.5Z" fill="currentColor" />
          </svg>
          <span class="ac-ckpt__fname">{{ fileName(f.path) }}</span>
          <span class="ac-ckpt__fdir">{{ dirName(f.path) }}</span>
          <span class="ac-ckpt__fkind" :data-kind="f.kind">{{ KIND_LABEL[f.kind] }}</span>
          <span class="ac-ckpt__fstat">
            <em v-if="f.additions" class="ac-ckpt__add">+{{ f.additions }}</em>
            <i v-if="f.additions && f.deletions" class="ac-ckpt__sep">/</i>
            <em v-if="f.deletions" class="ac-ckpt__del">-{{ f.deletions }}</em>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ac-ckpt {
  border: 1px solid var(--ac-border, #e2e2e2);
  border-radius: 12px;
  background: var(--ac-surface, #fff);
  overflow: hidden;
  font-size: 13px;
}
.ac-ckpt__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
}
.ac-ckpt__toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--ac-fg, #1a1a1a);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 6px;
}
.ac-ckpt__toggle:hover { background: var(--ac-surface-2, rgba(0, 0, 0, 0.04)); }
.ac-ckpt__chevron { color: var(--ac-muted, #767676); transition: transform 0.15s ease; flex-shrink: 0; }
.ac-ckpt__chevron.is-open { transform: rotate(90deg); }
.ac-ckpt__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-ckpt__ver {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--ac-muted, #767676);
  background: var(--ac-surface-2, rgba(0, 0, 0, 0.05));
  border-radius: 999px;
  padding: 1px 8px;
}
.ac-ckpt__meta { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.ac-ckpt__stat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 1px solid var(--ac-border, #e2e2e2);
  border-radius: 999px;
  padding: 1px 9px;
  font-size: 12px;
  font-weight: 600;
}
.ac-ckpt__add { color: var(--ac-success, #1a7f4b); font-style: normal; }
.ac-ckpt__del { color: var(--ac-danger, #c93b3b); font-style: normal; }
.ac-ckpt__sep { color: var(--ac-muted, #767676); font-style: normal; }
.ac-ckpt__revert {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--ac-border, #e2e2e2);
  border-radius: 8px;
  background: transparent;
  color: var(--ac-muted, #767676);
  cursor: pointer;
}
.ac-ckpt__revert:hover { color: var(--ac-fg, #1a1a1a); background: var(--ac-surface-2, rgba(0, 0, 0, 0.04)); }
.ac-ckpt__files {
  list-style: none;
  margin: 0;
  padding: 2px 6px 6px;
  border-top: 1px solid var(--ac-border, #e2e2e2);
}
.ac-ckpt__file {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 6px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--ac-fg, #1a1a1a);
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
}
.ac-ckpt__file:hover { background: var(--ac-surface-2, rgba(0, 0, 0, 0.04)); }
.ac-ckpt__ficon { color: var(--ac-muted, #767676); flex-shrink: 0; }
.ac-ckpt__fname { font-weight: 600; flex-shrink: 0; }
.ac-ckpt__fdir {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ac-muted, #767676);
  font-size: 11.5px;
  font-family: var(--ac-font-mono, ui-monospace, monospace);
}
.ac-ckpt__fkind {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 10.5px;
  border-radius: 999px;
  padding: 0 7px;
  border: 1px solid var(--ac-border, #e2e2e2);
  color: var(--ac-muted, #767676);
}
.ac-ckpt__fkind[data-kind='create'] { color: var(--ac-success, #1a7f4b); border-color: currentColor; }
.ac-ckpt__fkind[data-kind='delete'] { color: var(--ac-danger, #c93b3b); border-color: currentColor; }
.ac-ckpt__fstat { flex-shrink: 0; display: inline-flex; gap: 3px; font-size: 11.5px; font-weight: 600; }
</style>
