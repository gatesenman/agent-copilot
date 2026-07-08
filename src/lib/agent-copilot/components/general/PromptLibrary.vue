<script setup lang="ts">
defineOptions({ name: 'PromptLibrary' })

/**
 * PromptLibrary —— 提示模板库
 * 企业内沉淀的高频提示词模板，支持分类筛选与变量占位（{变量}）。
 */
import { computed, ref } from 'vue'
import { useI18n } from '../../i18n'

export interface PromptTemplate {
  id: string
  title: string
  /** 模板正文，支持 {变量} 占位符 */
  content: string
  category?: string
  description?: string
}

const props = defineProps<{
    /** 空态文案 */
    emptyText?: string
  templates: PromptTemplate[]
}>()

const emit = defineEmits<{
  /** 选择模板（已高亮变量占位，由调用方填充输入框） */
  (e: 'select', template: PromptTemplate): void
}>()

const { t } = useI18n()

/** 「全部」分类哨兵值，避免把展示文案当作状态 */
const ALL = '__all__'
const UNCATEGORIZED = '__uncategorized__'

const activeCategory = ref<string>(ALL)
const query = ref('')

const categories = computed(() => {
  const set = new Set<string>()
  for (const tpl of props.templates) set.add(tpl.category ?? UNCATEGORIZED)
  return [ALL, ...set]
})

function categoryLabel(c: string) {
  if (c === ALL) return t('prompts.all')
  if (c === UNCATEGORIZED) return t('prompts.uncategorized')
  return c
}

const filtered = computed(() => {
  let list = props.templates
  if (activeCategory.value !== ALL) {
    list = list.filter((tpl) => (tpl.category ?? UNCATEGORIZED) === activeCategory.value)
  }
  const q = query.value.trim().toLowerCase()
  if (q) list = list.filter((tpl) => tpl.title.toLowerCase().includes(q) || tpl.content.toLowerCase().includes(q))
  return list
})

/** 提取模板中的 {变量} 数量用于展示 */
function varCount(content: string) {
  return (content.match(/\{[^{}]+\}/g) ?? []).length
}
</script>

<template>
  <div class="ac-prompts">
    <div class="ac-prompts__top">
      <input v-model="query" type="search" class="ac-prompts__search" :placeholder="t('prompts.search')" :aria-label="t('prompts.searchAria')" />
    </div>
    <div class="ac-prompts__cats" role="tablist" :aria-label="t('prompts.catsAria')">
      <button
        v-for="c in categories"
        :key="c"
        type="button"
        role="tab"
        class="ac-prompts__cat"
        :class="{ 'ac-prompts__cat--active': c === activeCategory }"
        :aria-selected="c === activeCategory"
        @click="activeCategory = c"
      >
        {{ categoryLabel(c) }}
      </button>
    </div>
    <ul class="ac-prompts__list">
      <li v-for="tpl in filtered" :key="tpl.id">
        <button type="button" class="ac-prompts__item" @click="emit('select', tpl)">
          <span class="ac-prompts__title">
            {{ tpl.title }}
            <span v-if="varCount(tpl.content)" class="ac-prompts__vars">{{ t('prompts.varsN', { n: varCount(tpl.content) }) }}</span>
          </span>
          <span class="ac-prompts__desc">{{ tpl.description ?? tpl.content }}</span>
        </button>
      </li>
      <li v-if="filtered.length === 0" class="ac-prompts__empty">{{ emptyText ?? t('prompts.empty') }}</li>
    </ul>
  </div>
</template>

<style scoped>
.ac-prompts { display: flex; flex-direction: column; gap: 8px; font-family: var(--ac-font-sans, inherit); }
.ac-prompts__search {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.8);
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 0.82rem;
  box-sizing: border-box;
}
.ac-prompts__search:focus { outline: 2px solid var(--ac-primary); outline-offset: -1px; }
.ac-prompts__cats { display: flex; flex-wrap: wrap; gap: 4px; }
.ac-prompts__cat {
  padding: 3px 10px;
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  background: var(--ac-bg);
  color: var(--ac-muted);
  font-size: 0.76rem;
  cursor: pointer;
}
.ac-prompts__cat--active { background: var(--ac-primary); border-color: var(--ac-primary); color: var(--ac-primary-fg); }
.ac-prompts__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}
.ac-prompts__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.8);
  background: var(--ac-bg);
  cursor: pointer;
  text-align: left;
}
.ac-prompts__item:hover { border-color: var(--ac-primary); background: var(--ac-surface); }
.ac-prompts__title { font-size: 0.84rem; font-weight: 600; color: var(--ac-fg); display: flex; align-items: center; gap: 6px; }
.ac-prompts__vars {
  font-size: 0.68rem;
  font-weight: 400;
  color: var(--ac-primary);
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 0 6px;
}
.ac-prompts__desc {
  font-size: 0.76rem;
  color: var(--ac-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.ac-prompts__empty { padding: 16px 0; text-align: center; color: var(--ac-muted); font-size: 0.8rem; }
</style>
