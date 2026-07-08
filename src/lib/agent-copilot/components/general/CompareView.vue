<script setup lang="ts">
/**
 * CompareView —— 双模型对比视图
 * 同一问题在两个模型/配置下的回答并排对比，支持投票选优。
 */
import { useI18n } from '../../i18n'
import MarkdownText from '../chat/MarkdownText.vue'

export interface CompareSide {
  /** 模型/配置名 */
  label: string
  /** 回答内容（markdown） */
  content: string
  /** 生成中 */
  streaming?: boolean
  /** 耗时（ms） */
  latencyMs?: number
  /** token 数 */
  tokens?: number
}

withDefaults(
  defineProps<{
    question: string
    left: CompareSide
    right: CompareSide
    /** 已投票方向 */
    voted?: 'left' | 'right' | 'tie'
    /** 是否显示投票区 */
    votable?: boolean
    /** 文案覆盖 */
    labels?: {
      question?: string
      streaming?: string
      voteLeft?: string
      voteTie?: string
      voteRight?: string
    }
  }>(),
  { votable: true, labels: () => ({}) },
)

const emit = defineEmits<{
  (e: 'vote', side: 'left' | 'right' | 'tie'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div class="ac-compare">
    <div class="ac-compare__question">
      <span class="ac-compare__q-label">{{ labels.question ?? t('compare.question') }}</span>
      <p class="ac-compare__q-text">{{ question }}</p>
    </div>

    <div class="ac-compare__grid">
      <section
        v-for="(side, key) in { left, right }"
        :key="key"
        class="ac-compare__side"
        :class="{ 'ac-compare__side--winner': voted === key }"
        :aria-label="t('compare.answerAria', { name: side.label })"
      >
        <header class="ac-compare__head">
          <span class="ac-compare__model">{{ side.label }}</span>
          <span class="ac-compare__stats">
            <span v-if="side.latencyMs != null">{{ (side.latencyMs / 1000).toFixed(1) }}s</span>
            <span v-if="side.tokens != null">{{ side.tokens }} tok</span>
          </span>
        </header>
        <div class="ac-compare__body">
          <MarkdownText :content="side.content" :streaming="side.streaming" />
          <span v-if="side.streaming" class="ac-compare__typing">{{ labels.streaming ?? t('compare.streaming') }}</span>
        </div>
      </section>
    </div>

    <div v-if="votable" class="ac-compare__vote" role="group" :aria-label="t('compare.voteAria')">
      <button type="button" class="ac-compare__vote-btn" :class="{ 'ac-compare__vote-btn--active': voted === 'left' }" @click="emit('vote', 'left')">
        {{ labels.voteLeft ?? t('compare.voteLeft') }}
      </button>
      <button type="button" class="ac-compare__vote-btn" :class="{ 'ac-compare__vote-btn--active': voted === 'tie' }" @click="emit('vote', 'tie')">
        {{ labels.voteTie ?? t('compare.voteTie') }}
      </button>
      <button type="button" class="ac-compare__vote-btn" :class="{ 'ac-compare__vote-btn--active': voted === 'right' }" @click="emit('vote', 'right')">
        {{ labels.voteRight ?? t('compare.voteRight') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.ac-compare { display: flex; flex-direction: column; gap: 10px; font-family: var(--ac-font-sans, inherit); }
.ac-compare__question {
  padding: 10px 14px;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: var(--ac-surface);
}
.ac-compare__q-label { font-size: 0.72rem; color: var(--ac-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.ac-compare__q-text { margin: 4px 0 0; font-size: 0.9rem; font-weight: 600; color: var(--ac-fg); }
.ac-compare__grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
@media (min-width: 720px) { .ac-compare__grid { grid-template-columns: 1fr 1fr; } }
.ac-compare__side {
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.ac-compare__side--winner { border-color: var(--ac-success); box-shadow: 0 0 0 1px var(--ac-success); }
.ac-compare__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
}
.ac-compare__model { font-size: 0.82rem; font-weight: 700; color: var(--ac-fg); }
.ac-compare__stats { display: flex; gap: 8px; font-size: 0.72rem; color: var(--ac-muted); font-variant-numeric: tabular-nums; }
.ac-compare__body { padding: 10px 12px; font-size: 0.86rem; flex: 1; min-height: 80px; }
.ac-compare__typing { font-size: 0.74rem; color: var(--ac-muted); }
.ac-compare__vote { display: flex; gap: 8px; justify-content: center; }
.ac-compare__vote-btn {
  padding: 6px 16px;
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 0.8rem;
  cursor: pointer;
}
.ac-compare__vote-btn:hover { border-color: var(--ac-primary); }
.ac-compare__vote-btn--active { background: var(--ac-primary); border-color: var(--ac-primary); color: var(--ac-primary-fg); }
</style>
