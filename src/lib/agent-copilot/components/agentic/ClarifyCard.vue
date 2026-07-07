<script setup lang="ts">
/**
 * ClarifyCard —— Agent 澄清选择题（单选/多选 + 自定义"其他"输入）。
 * 对齐 AskUserQuestions 交互：选项带描述，可多题组合。
 */
import { computed, reactive, ref } from 'vue'

export interface ClarifyQuestion {
  id: string
  question: string
  options: { label: string; description?: string }[]
  multiSelect?: boolean
  /** 允许"其他"自定义输入，默认 true */
  allowOther?: boolean
}

const props = withDefaults(
  defineProps<{
    questions: ClarifyQuestion[]
    /** 已提交（只读态） */
    submitted?: boolean
    submittedAnswers?: Record<string, string[]>
    disabled?: boolean
    labels?: { title?: string; other?: string; otherPlaceholder?: string; submit?: string; submittedTip?: string }
  }>(),
  { submitted: false },
)

const emit = defineEmits<{
  (e: 'submit', answers: Record<string, string[]>): void
}>()

const L = computed(() => ({
  title: props.labels?.title ?? '需要你确认',
  other: props.labels?.other ?? '其他',
  otherPlaceholder: props.labels?.otherPlaceholder ?? '输入自定义答案…',
  submit: props.labels?.submit ?? '确认',
  submittedTip: props.labels?.submittedTip ?? '已确认',
}))

/** 每题选中的选项 label 集合 */
const picks = reactive<Record<string, string[]>>({})
const otherOn = reactive<Record<string, boolean>>({})
const otherText = reactive<Record<string, string>>({})
for (const q of props.questions) {
  picks[q.id] = []
  otherOn[q.id] = false
  otherText[q.id] = ''
}

function toggle(q: ClarifyQuestion, label: string) {
  const arr = picks[q.id]
  if (q.multiSelect) {
    picks[q.id] = arr.includes(label) ? arr.filter((v) => v !== label) : [...arr, label]
  } else {
    picks[q.id] = [label]
    otherOn[q.id] = false
  }
}

function toggleOther(q: ClarifyQuestion) {
  if (q.multiSelect) {
    otherOn[q.id] = !otherOn[q.id]
  } else {
    otherOn[q.id] = true
    picks[q.id] = []
  }
}

const canSubmit = computed(() =>
  props.questions.every((q) => picks[q.id].length > 0 || (otherOn[q.id] && otherText[q.id].trim())),
)

function submit() {
  const answers: Record<string, string[]> = {}
  for (const q of props.questions) {
    answers[q.id] = [...picks[q.id]]
    if (otherOn[q.id] && otherText[q.id].trim()) answers[q.id].push(otherText[q.id].trim())
  }
  emit('submit', answers)
}

const review = computed(() => props.submittedAnswers ?? {})
</script>

<template>
  <div class="ac-clarify" :data-submitted="submitted">
    <div class="ac-clarify__head">
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" /><path d="M6.2 6.2a1.8 1.8 0 1 1 2.6 1.6c-.5.3-.8.6-.8 1.2M8 11.4h.01" stroke-linecap="round" />
      </svg>
      <span class="ac-clarify__title">{{ L.title }}</span>
      <span v-if="submitted" class="ac-clarify__done">{{ L.submittedTip }}</span>
    </div>

    <!-- 已提交回显 -->
    <dl v-if="submitted" class="ac-clarify__review">
      <template v-for="q in questions" :key="q.id">
        <dt>{{ q.question }}</dt>
        <dd>{{ (review[q.id] ?? []).join('、') || '—' }}</dd>
      </template>
    </dl>

    <!-- 待回答 -->
    <div v-else class="ac-clarify__body">
      <fieldset v-for="q in questions" :key="q.id" class="ac-clarify__q">
        <legend class="ac-clarify__question">{{ q.question }}</legend>
        <div class="ac-clarify__opts">
          <button
            v-for="opt in q.options"
            :key="opt.label"
            type="button"
            class="ac-clarify__opt"
            :class="{ 'ac-clarify__opt--on': picks[q.id].includes(opt.label) }"
            :disabled="disabled"
            :aria-pressed="picks[q.id].includes(opt.label)"
            @click="toggle(q, opt.label)"
          >
            <span class="ac-clarify__opt-label">{{ opt.label }}</span>
            <span v-if="opt.description" class="ac-clarify__opt-desc">{{ opt.description }}</span>
          </button>
          <button
            v-if="q.allowOther !== false"
            type="button"
            class="ac-clarify__opt ac-clarify__opt--other"
            :class="{ 'ac-clarify__opt--on': otherOn[q.id] }"
            :disabled="disabled"
            :aria-pressed="otherOn[q.id]"
            @click="toggleOther(q)"
          >
            <span class="ac-clarify__opt-label">{{ L.other }}</span>
          </button>
        </div>
        <input
          v-if="otherOn[q.id]"
          v-model="otherText[q.id]"
          class="ac-clarify__input"
          type="text"
          :placeholder="L.otherPlaceholder"
          :aria-label="`${q.question} - ${L.other}`"
          :disabled="disabled"
        />
      </fieldset>

      <div class="ac-clarify__actions">
        <button type="button" class="ac-clarify__btn" :disabled="disabled || !canSubmit" @click="submit">
          {{ L.submit }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ac-clarify {
  margin: 6px 0;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: var(--ac-bg);
  overflow: hidden;
}
.ac-clarify__head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 13px;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
}
.ac-clarify__head svg { color: var(--ac-primary); }
.ac-clarify__title { font-size: 0.82rem; font-weight: 700; color: var(--ac-fg); }
.ac-clarify__done {
  margin-left: auto;
  font-size: 0.7rem;
  color: var(--ac-success);
  background: color-mix(in srgb, var(--ac-success) 12%, transparent);
  padding: 1px 8px;
  border-radius: 999px;
  font-weight: 600;
}
.ac-clarify__body { display: flex; flex-direction: column; gap: 14px; padding: 12px 13px; }
.ac-clarify__q { border: none; margin: 0; padding: 0; }
.ac-clarify__question { font-size: 0.8rem; font-weight: 600; color: var(--ac-fg); margin-bottom: 7px; padding: 0; }
.ac-clarify__opts { display: flex; flex-direction: column; gap: 5px; }
.ac-clarify__opt {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 7px 11px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.7);
  background: var(--ac-bg);
  cursor: pointer;
  text-align: left;
  color: var(--ac-fg);
  transition: border-color 0.15s, background 0.15s;
}
.ac-clarify__opt:hover:not(:disabled) { border-color: var(--ac-primary); }
.ac-clarify__opt--on {
  border-color: var(--ac-primary);
  background: color-mix(in srgb, var(--ac-primary) 7%, transparent);
}
.ac-clarify__opt-label { font-size: 0.8rem; font-weight: 600; }
.ac-clarify__opt--on .ac-clarify__opt-label { color: var(--ac-primary); }
.ac-clarify__opt-desc { font-size: 0.73rem; color: var(--ac-muted); line-height: 1.45; }
.ac-clarify__input {
  margin-top: 6px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.6);
  padding: 6px 10px;
  font-size: 0.8rem;
  background: var(--ac-bg);
  color: var(--ac-fg);
}
.ac-clarify__input:focus { outline: none; border-color: var(--ac-primary); }
.ac-clarify__review {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 5px 14px;
  margin: 0;
  padding: 12px 13px;
  font-size: 0.78rem;
}
.ac-clarify__review dt { color: var(--ac-muted); }
.ac-clarify__review dd { margin: 0; color: var(--ac-fg); }
.ac-clarify__actions { display: flex; justify-content: flex-end; }
.ac-clarify__btn {
  border: 1px solid var(--ac-primary);
  background: var(--ac-primary);
  color: var(--ac-primary-fg, #fff);
  border-radius: calc(var(--ac-radius) * 0.7);
  padding: 5px 16px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}
.ac-clarify__btn:hover:not(:disabled) { opacity: 0.9; }
.ac-clarify__btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
