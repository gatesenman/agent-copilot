<script setup lang="ts">
defineOptions({ name: 'SourcePanel' })

/**
 * SourcePanel —— RAG 引用溯源面板
 * 展示回答引用的知识来源：文档片段、置信分、原文定位。
 */
import { computed, ref } from 'vue'
import { useI18n } from '../../i18n'

export interface SourceChunk {
  id: string
  /** 文档标题 */
  title: string
  /** 引用的片段文本 */
  snippet: string
  /** 相关度得分 0-1 */
  score?: number
  /** 来源标识（如 "知识库/费用管理.pdf · 第 3 页"） */
  location?: string
  /** 外链 */
  url?: string
}

const props = withDefaults(
  defineProps<{
    sources: SourceChunk[]
    title?: string
    /** "查看原文"按钮文案 */
    openLabel?: string
  }>(),
  { title: undefined, openLabel: undefined },
)

const emit = defineEmits<{
  (e: 'open', source: SourceChunk): void
}>()

const { t } = useI18n()
const titleText = computed(() => props.title ?? t('source.title'))
const openText = computed(() => props.openLabel ?? t('source.open'))

const expandedId = ref<string | null>(null)

function toggle(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function scoreTone(score?: number) {
  if (score == null) return ''
  if (score >= 0.8) return 'high'
  if (score >= 0.5) return 'mid'
  return 'low'
}
</script>

<template>
  <section class="ac-sources" :aria-label="titleText">
    <h4 class="ac-sources__title">
      {{ titleText }}
      <span class="ac-sources__count">{{ sources.length }}</span>
    </h4>
    <ol class="ac-sources__list">
      <li v-for="(s, i) in sources" :key="s.id" class="ac-sources__item">
        <button
          type="button"
          class="ac-sources__head"
          :aria-expanded="expandedId === s.id"
          @click="toggle(s.id)"
        >
          <span class="ac-sources__no">{{ i + 1 }}</span>
          <span class="ac-sources__name">{{ s.title }}</span>
          <span v-if="s.score != null" class="ac-sources__score" :class="`ac-sources__score--${scoreTone(s.score)}`">
            {{ Math.round(s.score * 100) }}%
          </span>
          <svg
            class="ac-sources__chev"
            :class="{ 'ac-sources__chev--open': expandedId === s.id }"
            viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"
          >
            <path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <div v-if="expandedId === s.id" class="ac-sources__body">
          <blockquote class="ac-sources__snippet">{{ s.snippet }}</blockquote>
          <div class="ac-sources__meta">
            <span v-if="s.location" class="ac-sources__loc">{{ s.location }}</span>
            <button v-if="s.url" type="button" class="ac-sources__open" @click="emit('open', s)">
              {{ openText }}
            </button>
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.ac-sources {
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: var(--ac-surface);
  padding: 10px 12px;
  font-family: var(--ac-font-sans, inherit);
}
.ac-sources__title {
  margin: 0 0 6px;
  font-size: 0.78rem;
  color: var(--ac-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ac-sources__count {
  background: var(--ac-border);
  color: var(--ac-fg);
  border-radius: 999px;
  padding: 0 7px;
  font-size: 0.7rem;
}
.ac-sources__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.ac-sources__head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: calc(var(--ac-radius) * 0.6);
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.ac-sources__head:hover { background: var(--ac-bg); }
.ac-sources__no {
  flex-shrink: 0;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--ac-primary);
  color: var(--ac-primary-fg);
  font-size: 0.66rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.ac-sources__name {
  flex: 1;
  min-width: 0;
  font-size: 0.82rem;
  color: var(--ac-fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ac-sources__score { font-size: 0.7rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.ac-sources__score--high { color: var(--ac-success); }
.ac-sources__score--mid { color: var(--ac-warning); }
.ac-sources__score--low { color: var(--ac-muted); }
.ac-sources__chev { color: var(--ac-muted); transition: transform 0.15s; flex-shrink: 0; }
.ac-sources__chev--open { transform: rotate(180deg); }
.ac-sources__body { padding: 4px 8px 8px 33px; }
.ac-sources__snippet {
  margin: 0;
  padding: 8px 10px;
  border-left: 2px solid var(--ac-primary);
  background: var(--ac-bg);
  border-radius: 0 6px 6px 0;
  font-size: 0.8rem;
  color: var(--ac-fg);
  line-height: 1.55;
}
.ac-sources__meta { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.ac-sources__loc { font-size: 0.72rem; color: var(--ac-muted); }
.ac-sources__open {
  border: none;
  background: transparent;
  color: var(--ac-primary);
  font-size: 0.74rem;
  cursor: pointer;
  padding: 0;
}
.ac-sources__open:hover { text-decoration: underline; }
</style>
