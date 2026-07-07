<script setup lang="ts">
/**
 * PromptLibrary —— 提示模板库
 * 企业内沉淀的高频提示词模板，支持分类筛选与变量占位（{变量}）。
 */
import { computed, ref } from 'vue'

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

const activeCategory = ref<string>('全部')
const query = ref('')

const categories = computed(() => {
  const set = new Set<string>()
  for (const t of props.templates) set.add(t.category ?? '未分类')
  return ['全部', ...set]
})

const filtered = computed(() => {
  let list = props.templates
  if (activeCategory.value !== '全部') {
    list = list.filter((t) => (t.category ?? '未分类') === activeCategory.value)
  }
  const q = query.value.trim().toLowerCase()
  if (q) list = list.filter((t) => t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q))
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
      <input v-model="query" type="search" class="ac-prompts__search" placeholder="搜索模板…" aria-label="搜索提示模板" />
    </div>
    <div class="ac-prompts__cats" role="tablist" aria-label="模板分类">
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
        {{ c }}
      </button>
    </div>
    <ul class="ac-prompts__list">
      <li v-for="t in filtered" :key="t.id">
        <button type="button" class="ac-prompts__item" @click="emit('select', t)">
          <span class="ac-prompts__title">
            {{ t.title }}
            <span v-if="varCount(t.content)" class="ac-prompts__vars">{{ varCount(t.content) }} 个变量</span>
          </span>
          <span class="ac-prompts__desc">{{ t.description ?? t.content }}</span>
        </button>
      </li>
      <li v-if="filtered.length === 0" class="ac-prompts__empty">{{ emptyText ?? '没有匹配的模板' }}</li>
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
