<script setup lang="ts">
/**
 * AgentFormCard —— Agent 请求用户填写的消息内嵌表单（全控件集）。
 * 16 种控件：text/textarea/select/multiselect/radio/checkbox/date/time/number/
 *           email/tel/url/slider/rating/switch/tags
 * 内置校验：必填 / min/max / minLength/maxLength / pattern / email/url/tel 格式
 * AI 检查：aiReview + 字段级 aiIssue 内联警示（AI 审查回填模式）
 */
import { computed, reactive, ref, watch } from 'vue'
import type { FormFieldSpec, FormPayload } from '../../types'

const props = withDefaults(
  defineProps<{
    form: FormPayload
    /** 已提交（只读回显态） */
    submitted?: boolean
    /** 提交后回显的值 */
    submittedValues?: Record<string, unknown>
    /** AI 检查中（提交后等待 AI 审查时的加载态） */
    reviewing?: boolean
    disabled?: boolean
    labels?: {
      required?: string
      submittedTip?: string
      reviewingTip?: string
      aiIssuesTitle?: string
      aiPassedTitle?: string
      tagsPlaceholder?: string
      invalidEmail?: string
      invalidUrl?: string
      invalidTel?: string
      minLengthMsg?: string
      maxLengthMsg?: string
      rangeMsg?: string
    }
  }>(),
  { submitted: false, reviewing: false },
)

const emit = defineEmits<{
  (e: 'submit', values: Record<string, unknown>): void
  (e: 'cancel'): void
}>()

const L = computed(() => ({
  required: props.labels?.required ?? '此项必填',
  submittedTip: props.labels?.submittedTip ?? '已提交',
  reviewingTip: props.labels?.reviewingTip ?? 'AI 检查中…',
  aiIssuesTitle: props.labels?.aiIssuesTitle ?? 'AI 检查发现以下问题，请修改后重新提交',
  aiPassedTitle: props.labels?.aiPassedTitle ?? 'AI 检查通过',
  tagsPlaceholder: props.labels?.tagsPlaceholder ?? '输入后按 Enter 添加',
  invalidEmail: props.labels?.invalidEmail ?? '邮箱格式不正确',
  invalidUrl: props.labels?.invalidUrl ?? '链接格式不正确',
  invalidTel: props.labels?.invalidTel ?? '电话格式不正确',
  minLengthMsg: props.labels?.minLengthMsg ?? '至少 {n} 个字符',
  maxLengthMsg: props.labels?.maxLengthMsg ?? '最多 {n} 个字符',
  rangeMsg: props.labels?.rangeMsg ?? '取值范围 {min} ~ {max}',
}))

// ---- 值初始化 ----
function initialValue(f: FormFieldSpec): unknown {
  if (f.defaultValue != null) return f.defaultValue
  switch (f.type) {
    case 'checkbox':
    case 'multiselect':
    case 'tags':
      return []
    case 'switch':
      return false
    case 'slider':
      return typeof f.min === 'number' ? f.min : 0
    case 'rating':
      return 0
    default:
      return ''
  }
}

const values = reactive<Record<string, unknown>>({})
for (const f of props.form.fields) values[f.name] = initialValue(f)

const errors = ref<Record<string, string>>({})
const tagDrafts = reactive<Record<string, string>>({})

// AI 审查回填：aiIssue 变化时清空对应字段错误让用户重新修改
watch(
  () => props.form.fields.map((f) => f.aiIssue).join('|'),
  () => { errors.value = {} },
)

// ---- 多值控件操作 ----
function toggleArrayValue(name: string, value: string) {
  const arr = (values[name] as string[]) ?? []
  values[name] = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

function addTag(f: FormFieldSpec) {
  const draft = (tagDrafts[f.name] ?? '').trim()
  if (!draft) return
  const arr = (values[f.name] as string[]) ?? []
  if (!arr.includes(draft)) values[f.name] = [...arr, draft]
  tagDrafts[f.name] = ''
}

function removeTag(name: string, tag: string) {
  values[name] = ((values[name] as string[]) ?? []).filter((t) => t !== tag)
}

// ---- 内置校验 ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/\S+$/
const TEL_RE = /^[+\d][\d\s\-()]{4,19}$/

function fmt(tpl: string, params: Record<string, unknown>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

function validateField(f: FormFieldSpec, v: unknown): string | null {
  const empty = v == null || v === '' || (Array.isArray(v) && v.length === 0) ||
    (f.type === 'rating' && v === 0)
  if (f.required && empty && f.type !== 'switch') return L.value.required
  if (empty) return null

  const s = String(v)
  if (f.type === 'email' && !EMAIL_RE.test(s)) return L.value.invalidEmail
  if (f.type === 'url' && !URL_RE.test(s)) return L.value.invalidUrl
  if (f.type === 'tel' && !TEL_RE.test(s)) return L.value.invalidTel

  if (f.minLength != null && s.length < f.minLength) return fmt(L.value.minLengthMsg, { n: f.minLength })
  if (f.maxLength != null && s.length > f.maxLength) return fmt(L.value.maxLengthMsg, { n: f.maxLength })

  if ((f.type === 'number' || f.type === 'slider') && (f.min != null || f.max != null)) {
    const num = Number(v)
    if ((f.min != null && num < Number(f.min)) || (f.max != null && num > Number(f.max))) {
      return fmt(L.value.rangeMsg, { min: f.min ?? '-∞', max: f.max ?? '+∞' })
    }
  }

  if (f.pattern) {
    try {
      if (!new RegExp(f.pattern).test(s)) return f.patternMessage ?? '格式不正确'
    } catch { /* 无效正则跳过 */ }
  }
  return null
}

function validate(): boolean {
  const errs: Record<string, string> = {}
  for (const f of props.form.fields) {
    const msg = validateField(f, values[f.name])
    if (msg) errs[f.name] = msg
  }
  errors.value = errs
  return Object.keys(errs).length === 0
}

function submit() {
  if (!validate()) return
  emit('submit', { ...values })
}

const displayValues = computed(() => props.submittedValues ?? values)

function displayValue(f: FormFieldSpec): string {
  const v = displayValues.value[f.name]
  if (v == null || v === '') return '—'
  if (Array.isArray(v)) return v.length ? (v as string[]).join('、') : '—'
  if (f.type === 'switch') return v ? '是' : '否'
  if (f.type === 'rating') return `${v} / ${f.maxRating ?? 5} 星`
  if ((f.type === 'select' || f.type === 'radio') && f.options) {
    return f.options.find((o) => o.value === v)?.label ?? String(v)
  }
  return f.unit ? `${v} ${f.unit}` : String(v)
}

/** 有 AI 问题的字段数量 */
const aiIssueCount = computed(() => props.form.fields.filter((f) => f.aiIssue).length)
</script>

<template>
  <div class="ac-form" :data-submitted="submitted">
    <div class="ac-form__head">
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <rect x="2.5" y="2" width="11" height="12" rx="1.5" /><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke-linecap="round" />
      </svg>
      <span class="ac-form__title">{{ form.title || '请填写信息' }}</span>
      <span v-if="reviewing" class="ac-form__reviewing" role="status">
        <span class="ac-form__spinner" aria-hidden="true" />{{ L.reviewingTip }}
      </span>
      <span v-else-if="submitted" class="ac-form__done">{{ L.submittedTip }}</span>
    </div>
    <p v-if="form.description" class="ac-form__desc">{{ form.description }}</p>

    <!-- AI 检查结果横幅 -->
    <div
      v-if="form.aiReview === 'issues' && !submitted"
      class="ac-form__ai ac-form__ai--issues"
      role="alert"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M8 1.5 15 14H1L8 1.5Z" stroke-linejoin="round" /><path d="M8 6v3.5M8 11.5v.5" stroke-linecap="round" />
      </svg>
      <div>
        <strong>{{ L.aiIssuesTitle }}</strong>
        <p v-if="form.aiSummary">{{ form.aiSummary }}</p>
        <p v-else-if="aiIssueCount">共 {{ aiIssueCount }} 处待修改，已在对应字段旁标出。</p>
      </div>
    </div>
    <div v-else-if="form.aiReview === 'passed'" class="ac-form__ai ac-form__ai--passed" role="status">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="m3 8.5 3.5 3.5L13 4.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <div>
        <strong>{{ L.aiPassedTitle }}</strong>
        <p v-if="form.aiSummary">{{ form.aiSummary }}</p>
      </div>
    </div>

    <!-- 已提交：只读回显 -->
    <dl v-if="submitted" class="ac-form__review">
      <template v-for="f in form.fields" :key="f.name">
        <dt>{{ f.label }}</dt>
        <dd>{{ displayValue(f) }}</dd>
      </template>
    </dl>

    <!-- 待填写 -->
    <form v-else class="ac-form__body" novalidate @submit.prevent="submit">
      <div
        v-for="f in form.fields"
        :key="f.name"
        class="ac-form__field"
        :class="{ 'ac-form__field--ai': f.aiIssue }"
      >
        <label
          v-if="f.type !== 'switch'"
          :for="`af-${form.formId}-${f.name}`"
          class="ac-form__label"
        >
          {{ f.label }}<span v-if="f.required" class="ac-form__req" aria-hidden="true">*</span>
        </label>
        <p v-if="f.description && f.type !== 'switch'" class="ac-form__hint">{{ f.description }}</p>

        <!-- textarea -->
        <textarea
          v-if="f.type === 'textarea'"
          :id="`af-${form.formId}-${f.name}`"
          v-model="values[f.name] as string"
          class="ac-form__input ac-form__input--area"
          :placeholder="f.placeholder"
          :disabled="disabled"
          :maxlength="f.maxLength"
          rows="3"
        />

        <!-- select 单选下拉 -->
        <select
          v-else-if="f.type === 'select'"
          :id="`af-${form.formId}-${f.name}`"
          v-model="values[f.name] as string"
          class="ac-form__input"
          :disabled="disabled"
        >
          <option value="" disabled>{{ f.placeholder || '请选择' }}</option>
          <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>

        <!-- multiselect 多选（chips 复选） -->
        <div v-else-if="f.type === 'multiselect'" class="ac-form__chips" role="group" :aria-label="f.label">
          <button
            v-for="o in f.options"
            :key="o.value"
            type="button"
            class="ac-form__chip"
            :class="{ 'ac-form__chip--on': (values[f.name] as string[])?.includes(o.value) }"
            :disabled="disabled"
            :aria-pressed="(values[f.name] as string[])?.includes(o.value)"
            @click="toggleArrayValue(f.name, o.value)"
          >{{ o.label }}</button>
        </div>

        <!-- radio -->
        <div v-else-if="f.type === 'radio'" class="ac-form__opts" role="radiogroup" :aria-label="f.label">
          <label v-for="o in f.options" :key="o.value" class="ac-form__opt">
            <input v-model="values[f.name] as string" type="radio" :name="`af-${form.formId}-${f.name}`" :value="o.value" :disabled="disabled" />
            {{ o.label }}
          </label>
        </div>

        <!-- checkbox 组 -->
        <div v-else-if="f.type === 'checkbox'" class="ac-form__opts" role="group" :aria-label="f.label">
          <label v-for="o in f.options" :key="o.value" class="ac-form__opt">
            <input
              type="checkbox"
              :checked="(values[f.name] as string[])?.includes(o.value)"
              :disabled="disabled"
              @change="toggleArrayValue(f.name, o.value)"
            />
            {{ o.label }}
          </label>
        </div>

        <!-- switch 开关 -->
        <div v-else-if="f.type === 'switch'" class="ac-form__switch-row">
          <div class="ac-form__switch-text">
            <span class="ac-form__label">{{ f.label }}<span v-if="f.required" class="ac-form__req" aria-hidden="true">*</span></span>
            <p v-if="f.description" class="ac-form__hint">{{ f.description }}</p>
          </div>
          <button
            :id="`af-${form.formId}-${f.name}`"
            type="button"
            class="ac-form__switch"
            role="switch"
            :aria-checked="!!values[f.name]"
            :aria-label="f.label"
            :disabled="disabled"
            @click="values[f.name] = !values[f.name]"
          >
            <span class="ac-form__switch-knob" aria-hidden="true" />
          </button>
        </div>

        <!-- slider 滑块 -->
        <div v-else-if="f.type === 'slider'" class="ac-form__slider-row">
          <input
            :id="`af-${form.formId}-${f.name}`"
            v-model.number="values[f.name] as number"
            type="range"
            class="ac-form__slider"
            :min="Number(f.min ?? 0)"
            :max="Number(f.max ?? 100)"
            :step="f.step ?? 1"
            :disabled="disabled"
          />
          <span class="ac-form__slider-val">{{ values[f.name] }}{{ f.unit ? ` ${f.unit}` : '' }}</span>
        </div>

        <!-- rating 星级 -->
        <div v-else-if="f.type === 'rating'" class="ac-form__rating" role="radiogroup" :aria-label="f.label">
          <button
            v-for="n in (f.maxRating ?? 5)"
            :key="n"
            type="button"
            class="ac-form__star"
            :class="{ 'ac-form__star--on': (values[f.name] as number) >= n }"
            :aria-label="`${n} 星`"
            :aria-pressed="(values[f.name] as number) === n"
            :disabled="disabled"
            @click="values[f.name] = (values[f.name] as number) === n ? 0 : n"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
              <path d="M8 1.5 9.9 5.6l4.4.5-3.3 3 .9 4.4L8 11.2l-3.9 2.3.9-4.4-3.3-3 4.4-.5L8 1.5Z" />
            </svg>
          </button>
        </div>

        <!-- tags 标签输入 -->
        <div v-else-if="f.type === 'tags'" class="ac-form__tags">
          <span v-for="t in (values[f.name] as string[])" :key="t" class="ac-form__tag">
            {{ t }}
            <button type="button" class="ac-form__tag-x" :aria-label="`移除 ${t}`" :disabled="disabled" @click="removeTag(f.name, t)">×</button>
          </span>
          <input
            :id="`af-${form.formId}-${f.name}`"
            v-model="tagDrafts[f.name]"
            type="text"
            class="ac-form__tag-input"
            :placeholder="f.placeholder || L.tagsPlaceholder"
            :disabled="disabled"
            @keydown.enter.prevent="!($event as KeyboardEvent).isComposing && ($event as KeyboardEvent).keyCode !== 229 && addTag(f)"
          />
        </div>

        <!-- text / email / tel / url / number / date / time -->
        <div v-else class="ac-form__input-wrap">
          <input
            :id="`af-${form.formId}-${f.name}`"
            v-model="values[f.name] as string"
            class="ac-form__input"
            :type="f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'url' ? 'url' : 'text'"
            :placeholder="f.placeholder"
            :disabled="disabled"
            :min="f.min != null ? String(f.min) : undefined"
            :max="f.max != null ? String(f.max) : undefined"
            :step="f.step"
            :maxlength="f.maxLength"
          />
          <span v-if="f.unit" class="ac-form__unit" aria-hidden="true">{{ f.unit }}</span>
        </div>

        <!-- AI 字段级问题 -->
        <p v-if="f.aiIssue" class="ac-form__ai-issue" role="alert">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" /><path d="M8 5v3.5M8 11v.5" stroke-linecap="round" />
          </svg>
          {{ f.aiIssue }}
        </p>
        <!-- 本地校验错误 -->
        <p v-if="errors[f.name]" class="ac-form__error" role="alert">{{ errors[f.name] }}</p>
      </div>

      <div class="ac-form__actions">
        <button v-if="form.cancelLabel" type="button" class="ac-form__btn ac-form__btn--ghost" :disabled="disabled || reviewing" @click="emit('cancel')">
          {{ form.cancelLabel }}
        </button>
        <button type="submit" class="ac-form__btn ac-form__btn--primary" :disabled="disabled || reviewing">
          {{ reviewing ? L.reviewingTip : (form.submitLabel || '提交') }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.ac-form {
  margin: 6px 0;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: var(--ac-bg);
  overflow: hidden;
}
.ac-form__head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 13px;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
  color: var(--ac-fg);
}
.ac-form__head svg { color: var(--ac-primary); }
.ac-form__title { font-size: 0.82rem; font-weight: 700; }
.ac-form__done {
  margin-left: auto;
  font-size: 0.7rem;
  color: var(--ac-success);
  background: color-mix(in srgb, var(--ac-success) 12%, transparent);
  padding: 1px 8px;
  border-radius: 999px;
  font-weight: 600;
}
.ac-form__reviewing {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  color: var(--ac-primary);
  font-weight: 600;
}
.ac-form__spinner {
  width: 10px;
  height: 10px;
  border: 1.5px solid color-mix(in srgb, var(--ac-primary) 30%, transparent);
  border-top-color: var(--ac-primary);
  border-radius: 50%;
  animation: ac-form-spin 0.7s linear infinite;
}
@keyframes ac-form-spin { to { transform: rotate(360deg); } }
.ac-form__desc { margin: 8px 13px 0; font-size: 0.78rem; color: var(--ac-muted); line-height: 1.5; }

/* AI 检查横幅 */
.ac-form__ai {
  display: flex;
  gap: 8px;
  margin: 10px 13px 0;
  padding: 9px 11px;
  border-radius: calc(var(--ac-radius) * 0.7);
  font-size: 0.76rem;
  line-height: 1.5;
}
.ac-form__ai svg { flex-shrink: 0; margin-top: 2px; }
.ac-form__ai strong { font-size: 0.78rem; }
.ac-form__ai p { margin: 2px 0 0; }
.ac-form__ai--issues {
  background: color-mix(in srgb, var(--ac-warning, #d97706) 10%, transparent);
  color: var(--ac-warning, #b45309);
  border: 1px solid color-mix(in srgb, var(--ac-warning, #d97706) 25%, transparent);
}
.ac-form__ai--passed {
  background: color-mix(in srgb, var(--ac-success) 10%, transparent);
  color: var(--ac-success);
  border: 1px solid color-mix(in srgb, var(--ac-success) 25%, transparent);
}

.ac-form__body { display: flex; flex-direction: column; gap: 12px; padding: 12px 13px; }
.ac-form__field { display: flex; flex-direction: column; gap: 4px; }
.ac-form__field--ai {
  padding: 8px 10px;
  margin: -4px -6px;
  border-radius: calc(var(--ac-radius) * 0.6);
  background: color-mix(in srgb, var(--ac-warning, #d97706) 6%, transparent);
}
.ac-form__label { font-size: 0.78rem; font-weight: 600; color: var(--ac-fg); }
.ac-form__req { color: var(--ac-danger); margin-left: 2px; }
.ac-form__hint { margin: 0; font-size: 0.72rem; color: var(--ac-muted); }
.ac-form__input-wrap { position: relative; display: flex; align-items: center; }
.ac-form__input-wrap .ac-form__input { flex: 1; }
.ac-form__unit {
  position: absolute;
  right: 10px;
  font-size: 0.74rem;
  color: var(--ac-muted);
  pointer-events: none;
}
.ac-form__input {
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.6);
  padding: 6px 10px;
  font-size: 0.8rem;
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}
.ac-form__input:focus { outline: none; border-color: var(--ac-primary); }
.ac-form__input--area { resize: vertical; }
.ac-form__opts { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.ac-form__opt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: var(--ac-fg);
  cursor: pointer;
}
.ac-form__opt input { accent-color: var(--ac-primary); }

/* multiselect chips */
.ac-form__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ac-form__chip {
  border: 1px solid var(--ac-border);
  background: var(--ac-bg);
  color: var(--ac-fg);
  border-radius: 999px;
  padding: 3px 12px;
  font-size: 0.76rem;
  cursor: pointer;
}
.ac-form__chip--on {
  background: color-mix(in srgb, var(--ac-primary) 12%, transparent);
  border-color: var(--ac-primary);
  color: var(--ac-primary);
  font-weight: 600;
}

/* switch */
.ac-form__switch-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ac-form__switch-text { display: flex; flex-direction: column; gap: 2px; }
.ac-form__switch {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  border: 1px solid var(--ac-border);
  background: var(--ac-surface);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;
}
.ac-form__switch[aria-checked='true'] { background: var(--ac-primary); border-color: var(--ac-primary); }
.ac-form__switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
  transition: transform 0.15s ease;
}
.ac-form__switch[aria-checked='true'] .ac-form__switch-knob { transform: translateX(16px); }

/* slider */
.ac-form__slider-row { display: flex; align-items: center; gap: 10px; }
.ac-form__slider { flex: 1; accent-color: var(--ac-primary); }
.ac-form__slider-val {
  min-width: 48px;
  text-align: right;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ac-fg);
  font-variant-numeric: tabular-nums;
}

/* rating */
.ac-form__rating { display: flex; gap: 2px; }
.ac-form__star {
  border: none;
  background: transparent;
  padding: 1px;
  cursor: pointer;
  color: var(--ac-border);
}
.ac-form__star svg { fill: currentColor; stroke: none; display: block; }
.ac-form__star--on { color: var(--ac-warning, #f59e0b); }

/* tags */
.ac-form__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.6);
  padding: 5px 8px;
  background: var(--ac-bg);
}
.ac-form__tags:focus-within { border-color: var(--ac-primary); }
.ac-form__tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: color-mix(in srgb, var(--ac-primary) 10%, transparent);
  color: var(--ac-primary);
  border-radius: 999px;
  padding: 1px 4px 1px 9px;
  font-size: 0.74rem;
  font-weight: 600;
}
.ac-form__tag-x {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0 3px;
  line-height: 1;
}
.ac-form__tag-input {
  border: none;
  background: transparent;
  color: var(--ac-fg);
  font-size: 0.78rem;
  flex: 1;
  min-width: 120px;
  padding: 2px;
  font-family: inherit;
}
.ac-form__tag-input:focus { outline: none; }

.ac-form__ai-issue {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  font-size: 0.72rem;
  color: var(--ac-warning, #b45309);
  font-weight: 600;
}
.ac-form__error { margin: 0; font-size: 0.72rem; color: var(--ac-danger); }
.ac-form__review {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 5px 14px;
  margin: 0;
  padding: 12px 13px;
  font-size: 0.78rem;
}
.ac-form__review dt { color: var(--ac-muted); }
.ac-form__review dd { margin: 0; color: var(--ac-fg); }
.ac-form__actions { display: flex; justify-content: flex-end; gap: 8px; }
.ac-form__btn {
  border: 1px solid var(--ac-border);
  background: var(--ac-bg);
  color: var(--ac-fg);
  border-radius: calc(var(--ac-radius) * 0.7);
  padding: 5px 14px;
  font-size: 0.78rem;
  cursor: pointer;
}
.ac-form__btn--ghost { color: var(--ac-muted); }
.ac-form__btn--primary { background: var(--ac-primary); border-color: var(--ac-primary); color: var(--ac-primary-fg, #fff); font-weight: 600; }
.ac-form__btn--primary:hover:not(:disabled) { opacity: 0.9; }
.ac-form__btn:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
