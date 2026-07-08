<script setup lang="ts">
defineOptions({ name: 'KnowledgeSelector' })

/**
 * KnowledgeSelector —— 知识库选择器。
 *
 * 下拉多选知识库（RAG 检索范围），完全数据驱动：bases 由外部传入。
 * 支持 v-model:selected（id 数组），选中后以 Chips 形式展示。
 */
import { computed, onScopeDispose, ref } from 'vue'
import { useI18n } from '../../i18n'

export interface KnowledgeBase {
  id: string
  name: string
  description?: string
  /** 文档数（展示用） */
  docCount?: number
  icon?: string
}

const props = withDefaults(
  defineProps<{
    /** 空态文案 */
    emptyText?: string
    bases: KnowledgeBase[]
    /** 选中的知识库 id（v-model:selected） */
    selected: string[]
    /** 触发按钮文案 */
    placeholder?: string
    /** 最多可选（0 = 不限） */
    maxCount?: number
    disabled?: boolean
  }>(),
  { placeholder: undefined, maxCount: 0, disabled: false },
)

const emit = defineEmits<{
  (e: 'update:selected', ids: string[]): void
}>()

const { t } = useI18n()
const placeholderText = computed(() => props.placeholder ?? t('kb.placeholder'))

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const selectedBases = computed(() => props.bases.filter((b) => props.selected.includes(b.id)))

function toggle(id: string) {
  const next = props.selected.includes(id)
    ? props.selected.filter((x) => x !== id)
    : props.maxCount > 0 && props.selected.length >= props.maxCount
      ? props.selected
      : [...props.selected, id]
  emit('update:selected', next)
}

function onDocClick(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) open.value = false
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', onDocClick)
  onScopeDispose(() => document.removeEventListener('click', onDocClick))
}
</script>

<template>
  <div ref="rootRef" class="ac-kb">
    <button
      type="button"
      class="ac-kb__trigger"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="open = !open"
    >
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
        <path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h8a1.5 1.5 0 0 1 1.5 1.5v10L8 11 2.5 13.5v-10Z" stroke-linejoin="round" />
      </svg>
      <span v-if="selectedBases.length === 0">{{ placeholderText }}</span>
      <span v-else class="ac-kb__count">{{ selectedBases.map((b) => b.name).join(', ') }}</span>
      <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" :style="{ transform: open ? 'rotate(180deg)' : undefined }">
        <path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div v-if="open" class="ac-kb__menu" role="listbox" aria-multiselectable="true">
      <button
        v-for="base in bases"
        :key="base.id"
        type="button"
        role="option"
        class="ac-kb__item"
        :aria-selected="selected.includes(base.id)"
        @click="toggle(base.id)"
      >
        <span class="ac-kb__check" :class="{ 'ac-kb__check--on': selected.includes(base.id) }">
          <svg v-if="selected.includes(base.id)" viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path d="m3 8.5 3.5 3.5L13 4.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="ac-kb__body">
          <span class="ac-kb__name">
            {{ base.name }}
            <span v-if="base.docCount != null" class="ac-kb__docs">{{ t('kb.docsN', { n: base.docCount }) }}</span>
          </span>
          <span v-if="base.description" class="ac-kb__desc">{{ base.description }}</span>
        </span>
      </button>
      <p v-if="bases.length === 0" class="ac-kb__empty">{{ emptyText ?? t('kb.empty') }}</p>
    </div>
  </div>
</template>

<style scoped>
.ac-kb { position: relative; display: inline-block; }
.ac-kb__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  background: var(--ac-bg);
  color: var(--ac-muted);
  font-size: 0.78rem;
  cursor: pointer;
  max-width: 280px;
}
.ac-kb__trigger:hover:not(:disabled) { border-color: var(--ac-primary); color: var(--ac-fg); }
.ac-kb__trigger:disabled { opacity: 0.5; cursor: not-allowed; }
.ac-kb__count { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ac-fg); }
.ac-kb__menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 6px;
  width: 280px;
  max-height: 260px;
  overflow-y: auto;
  background: var(--ac-bg);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  box-shadow: 0 8px 30px rgb(0 0 0 / 0.14);
  z-index: 40;
  padding: 4px;
}
.ac-kb__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: calc(var(--ac-radius) * 0.6);
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: var(--ac-fg);
}
.ac-kb__item:hover { background: var(--ac-surface); }
.ac-kb__check {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 1px;
  border: 1.5px solid var(--ac-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ac-primary-fg);
}
.ac-kb__check--on { background: var(--ac-primary); border-color: var(--ac-primary); }
.ac-kb__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ac-kb__name { font-size: 0.84rem; font-weight: 500; display: flex; align-items: center; gap: 6px; }
.ac-kb__docs { font-size: 0.7rem; color: var(--ac-muted); font-weight: 400; }
.ac-kb__desc { font-size: 0.74rem; color: var(--ac-muted); }
.ac-kb__empty { margin: 0; padding: 14px; text-align: center; color: var(--ac-muted); font-size: 0.8rem; }
</style>
