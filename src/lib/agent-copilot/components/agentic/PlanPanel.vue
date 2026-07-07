<script setup lang="ts">
/**
 * PlanPanel —— 统一计划审查组件（结构化步骤 + Markdown 长文双形态）。
 *
 * 行业内（Cursor / Claude Code 的 Plan mode）计划审查是一个组件，
 * 本组件将原 PlanPanel（结构化步骤）与 PlanReviewCard（Markdown 全文）合并：
 *
 * - 传 `plan`（PlanSpec）→ 结构化形态：draft 可编辑步骤（改题/增删/排序）、
 *   批准后展示执行进度（running/done/error 图标）
 * - 传 `content`（Markdown 字符串）→ 长文形态：折叠预览（渐隐 + 居中展开按钮）、
 *   全文编辑、确认/驳回闭环
 *
 * 两形态共用头部徽章、操作区与视觉语言。原 PlanReviewCard 导出保留为本组件别名。
 */
import { computed, nextTick, ref, watch } from 'vue'
import type { PlanSpec, PlanStep } from '../../types'
import MarkdownText from '../chat/MarkdownText.vue'
import { useI18n } from '../../i18n'

const props = withDefaults(
  defineProps<{
    /** 结构化计划（与 content 二选一；同传时 content 优先级低） */
    plan?: PlanSpec
    /** Markdown 计划全文（长文形态） */
    content?: string
    /** 长文形态标题 / 结构化形态 plan.title 的兜底 */
    title?: string
    /** 长文形态审查状态：draft 显示操作区，approved / rejected 显示结果徽章 */
    status?: 'draft' | 'approved' | 'rejected'
    /** 允许编辑（两形态通用，仅 draft 态生效），默认 true */
    editable?: boolean
    /** 长文形态折叠预览高度（px），默认 300；内容不超高时不折叠 */
    collapsedHeight?: number
    /** 长文形态初始是否展开 */
    defaultExpanded?: boolean
    labels?: {
      title?: string
      approve?: string
      reject?: string
      addStep?: string
      executing?: string
      done?: string
      rejected?: string
      approved?: string
      expand?: string
      collapse?: string
      edit?: string
      save?: string
      cancel?: string
      edited?: string
    }
  }>(),
  { editable: true, status: 'draft', collapsedHeight: 300, defaultExpanded: false },
)

const emit = defineEmits<{
  /** 结构化形态携带最终步骤数组；长文形态携带（可能已编辑的）Markdown 全文 */
  (e: 'approve', payload: PlanStep[] | string): void
  (e: 'reject'): void
  (e: 'update:plan', plan: PlanSpec): void
  (e: 'update:content', content: string): void
}>()

const { t } = useI18n()

const L = computed(() => ({
  title: props.labels?.title ?? t('plan.title'),
  approve: props.labels?.approve ?? (isMarkdown.value ? t('plan.confirm') : t('plan.approveRun')),
  reject: props.labels?.reject ?? t('plan.reject'),
  addStep: props.labels?.addStep ?? t('plan.addStep'),
  executing: props.labels?.executing ?? t('plan.executing'),
  done: props.labels?.done ?? t('plan.done'),
  rejected: props.labels?.rejected ?? t('plan.rejected'),
  approved: props.labels?.approved ?? t('plan.approved'),
  expand: props.labels?.expand ?? t('plan.expand'),
  collapse: props.labels?.collapse ?? t('plan.collapse'),
  edit: props.labels?.edit ?? t('plan.edit'),
  save: props.labels?.save ?? t('plan.save'),
  cancel: props.labels?.cancel ?? t('chat.cancel'),
  edited: props.labels?.edited ?? t('plan.edited'),
}))

/** 形态判定：只传 content（无 plan）时走 Markdown 长文形态 */
const isMarkdown = computed(() => !props.plan && typeof props.content === 'string')

// ============ 结构化形态 ============

const draftSteps = ref<PlanStep[]>((props.plan?.steps ?? []).map((s) => ({ ...s })))
watch(() => props.plan, (p) => { draftSteps.value = (p?.steps ?? []).map((s) => ({ ...s })) }, { deep: true })

const isDraft = computed(() => (isMarkdown.value ? props.status === 'draft' : props.plan?.status === 'draft'))
const canEditSteps = computed(() => !isMarkdown.value && isDraft.value && props.editable)
const doneCount = computed(() => (props.plan?.steps ?? []).filter((s) => s.status === 'done').length)

let stepSeq = 0
function addStep() {
  draftSteps.value.push({ id: `ps_new_${++stepSeq}`, title: '', status: 'pending' })
}
function removeStep(i: number) {
  draftSteps.value.splice(i, 1)
}
function moveStep(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= draftSteps.value.length) return
  const arr = draftSteps.value
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}

const statusBadge = computed(() => {
  if (isMarkdown.value) {
    if (props.status === 'approved') return { text: L.value.approved, cls: 'ac-plan__badge--done' }
    if (props.status === 'rejected') return { text: L.value.rejected, cls: 'ac-plan__badge--rejected' }
    return null
  }
  switch (props.plan?.status) {
    case 'executing': return { text: L.value.executing, cls: 'ac-plan__badge--exec' }
    case 'done': return { text: L.value.done, cls: 'ac-plan__badge--done' }
    case 'rejected': return { text: L.value.rejected, cls: 'ac-plan__badge--rejected' }
    default: return null
  }
})

// ============ Markdown 长文形态 ============

const expanded = ref(props.defaultExpanded)
const bodyEl = ref<HTMLElement | null>(null)
const overflowing = ref(false)

function measure() {
  nextTick(() => {
    if (bodyEl.value) overflowing.value = bodyEl.value.scrollHeight > props.collapsedHeight + 40
  })
}
watch(() => props.content, measure, { immediate: true })

const clamped = computed(() => overflowing.value && !expanded.value)

const editing = ref(false)
const draftText = ref(props.content ?? '')
/** 是否被手动改过（相对最近一次外部传入） */
const dirty = ref(false)
watch(() => props.content, (v) => {
  if (editing.value) return
  // 自己保存后的 v-model 回流（v === draftText）不应清除"已修改"标记
  if (v !== draftText.value) dirty.value = false
  draftText.value = v ?? ''
})

const textareaEl = ref<HTMLTextAreaElement | null>(null)
function startEdit() {
  draftText.value = props.content ?? ''
  editing.value = true
  expanded.value = true
  nextTick(() => textareaEl.value?.focus())
}
function saveEdit() {
  editing.value = false
  if (draftText.value !== props.content) {
    dirty.value = true
    emit('update:content', draftText.value)
  }
  measure()
}
function cancelEdit() {
  editing.value = false
  draftText.value = props.content ?? ''
}

// ============ 审批 ============

function approve() {
  if (isMarkdown.value) {
    emit('approve', editing.value ? draftText.value : (props.content ?? ''))
  } else {
    emit('approve', draftSteps.value.filter((s) => s.title.trim()))
  }
}
</script>

<template>
  <div class="ac-plan" :class="{ 'ac-plan--md': isMarkdown }" :data-status="isMarkdown ? status : plan?.status">
    <div class="ac-plan__head">
      <svg v-if="isMarkdown" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M9.5 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9.5 2Z" stroke-linejoin="round" />
        <path d="M9.5 2v3.5H13M5.5 9h5M5.5 11.5h3" stroke-linecap="round" />
      </svg>
      <svg v-else viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M5.5 3h8M5.5 8h8M5.5 13h8M2.5 3h.01M2.5 8h.01M2.5 13h.01" stroke-linecap="round" />
      </svg>
      <span class="ac-plan__title">{{ (isMarkdown ? title : plan?.title) || L.title }}</span>
      <span v-if="isMarkdown && dirty && isDraft" class="ac-plan__badge ac-plan__badge--edited">{{ L.edited }}</span>
      <span v-if="statusBadge" class="ac-plan__badge" :class="statusBadge.cls">{{ statusBadge.text }}</span>
      <span v-if="!isMarkdown && (plan?.status === 'executing' || plan?.status === 'done')" class="ac-plan__progress">
        {{ doneCount }}/{{ plan?.steps.length }}
      </span>
      <template v-if="isMarkdown">
        <span class="ac-plan__spacer" />
        <button
          v-if="isDraft && editable && !editing"
          type="button"
          class="ac-plan__tool-btn"
          :aria-label="L.edit"
          @click="startEdit"
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M11.5 2.5a1.4 1.4 0 0 1 2 2L5 13l-2.7.7L3 11l8.5-8.5Z" stroke-linejoin="round" />
          </svg>
          {{ L.edit }}
        </button>
        <button
          v-if="overflowing && !editing"
          type="button"
          class="ac-plan__tool-btn"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" :class="{ 'ac-plan__chev--open': expanded }" class="ac-plan__chev" aria-hidden="true">
            <path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ expanded ? L.collapse : L.expand }}
        </button>
      </template>
    </div>

    <!-- ============ Markdown 长文形态 ============ -->
    <template v-if="isMarkdown">
      <!-- 编辑态：原始 Markdown -->
      <div v-if="editing" class="ac-plan__editor">
        <textarea
          ref="textareaEl"
          v-model="draftText"
          class="ac-plan__textarea"
          :aria-label="L.edit"
          rows="14"
          spellcheck="false"
        />
        <div class="ac-plan__editbar">
          <button type="button" class="ac-plan__btn ac-plan__btn--ghost" @click="cancelEdit">{{ L.cancel }}</button>
          <button type="button" class="ac-plan__btn ac-plan__btn--primary" @click="saveEdit">{{ L.save }}</button>
        </div>
      </div>

      <!-- 预览态：折叠渐隐 + 居中展开按钮 -->
      <div v-else class="ac-plan__bodywrap">
        <div
          ref="bodyEl"
          class="ac-plan__mdbody"
          :style="clamped ? { maxHeight: `${collapsedHeight}px` } : undefined"
        >
          <MarkdownText :content="content ?? ''" />
        </div>
        <div v-if="clamped" class="ac-plan__fade" aria-hidden="true" />
        <button
          v-if="clamped"
          type="button"
          class="ac-plan__expand"
          :aria-label="L.expand"
          @click="expanded = true"
        >
          {{ L.expand }}
        </button>
      </div>
    </template>

    <!-- ============ 结构化步骤形态 ============ -->
    <template v-else>
      <!-- draft 态：可编辑列表 -->
      <ol v-if="canEditSteps" class="ac-plan__steps ac-plan__steps--edit" role="list">
        <li v-for="(step, i) in draftSteps" :key="step.id" class="ac-plan__step">
          <span class="ac-plan__no">{{ i + 1 }}</span>
          <input
            v-model="step.title"
            class="ac-plan__input"
            type="text"
            :placeholder="t('plan.stepN', { n: i + 1 })"
            :aria-label="t('plan.stepN', { n: i + 1 })"
          />
          <span class="ac-plan__tools">
            <button type="button" class="ac-plan__tool" :disabled="i === 0" :aria-label="t('plan.moveUp')" @click="moveStep(i, -1)">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m4 10 4-4 4 4" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
            <button type="button" class="ac-plan__tool" :disabled="i === draftSteps.length - 1" :aria-label="t('plan.moveDown')" @click="moveStep(i, 1)">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
            <button type="button" class="ac-plan__tool ac-plan__tool--danger" :aria-label="t('plan.removeStep')" @click="removeStep(i)">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" /></svg>
            </button>
          </span>
        </li>
      </ol>

      <!-- 非 draft / 不可编辑：进度列表 -->
      <ol v-else class="ac-plan__steps" role="list">
        <li
          v-for="(step, i) in plan?.steps ?? []"
          :key="step.id"
          class="ac-plan__step"
          :class="`ac-plan__step--${step.status}`"
        >
          <span class="ac-plan__marker" aria-hidden="true">
            <svg v-if="step.status === 'done'" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 8.5 3.5 3.5L13 5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <svg v-else-if="step.status === 'running'" class="ac-plan__spin" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6" opacity="0.25" /><path d="M8 2a6 6 0 0 1 6 6" stroke-linecap="round" /></svg>
            <svg v-else-if="step.status === 'error'" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" /></svg>
            <span v-else class="ac-plan__no">{{ i + 1 }}</span>
          </span>
          <span class="ac-plan__step-body">
            <span class="ac-plan__step-title">{{ step.title }}</span>
            <span v-if="step.detail" class="ac-plan__step-detail">{{ step.detail }}</span>
          </span>
        </li>
      </ol>
    </template>

    <!-- ============ 审批操作区（两形态共用） ============ -->
    <div v-if="isDraft && !editing" class="ac-plan__actions">
      <button v-if="canEditSteps" type="button" class="ac-plan__btn" @click="addStep">
        + {{ L.addStep }}
      </button>
      <span class="ac-plan__spacer" />
      <button type="button" class="ac-plan__btn ac-plan__btn--ghost" @click="emit('reject')">{{ L.reject }}</button>
      <button type="button" class="ac-plan__btn ac-plan__btn--primary" @click="approve">{{ L.approve }}</button>
    </div>
  </div>
</template>

<style scoped>
.ac-plan {
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: var(--ac-bg);
  overflow: hidden;
}
.ac-plan--md {
  border-color: color-mix(in srgb, var(--ac-border) 55%, transparent);
  border-radius: calc(var(--ac-radius) * 1.4);
  background: var(--ac-surface);
}
.ac-plan__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
  color: var(--ac-fg);
}
.ac-plan--md .ac-plan__head {
  padding: 14px 18px 0;
  background: transparent;
  border-bottom: none;
  color: var(--ac-muted);
  gap: 7px;
}
.ac-plan__head > svg { color: var(--ac-primary); flex-shrink: 0; }
.ac-plan--md .ac-plan__head > svg { color: var(--ac-muted); }
.ac-plan__title { font-size: 0.84rem; font-weight: 700; }
.ac-plan--md .ac-plan__title { font-size: 0.8rem; font-weight: 500; letter-spacing: 0.02em; }
.ac-plan__badge {
  font-size: 0.68rem;
  padding: 1px 8px;
  border-radius: 999px;
  font-weight: 600;
}
.ac-plan__badge--exec { background: color-mix(in srgb, var(--ac-primary) 14%, transparent); color: var(--ac-primary); }
.ac-plan__badge--done { background: color-mix(in srgb, var(--ac-success) 14%, transparent); color: var(--ac-success); }
.ac-plan__badge--rejected { background: color-mix(in srgb, var(--ac-danger) 12%, transparent); color: var(--ac-danger); }
.ac-plan__badge--edited { background: color-mix(in srgb, var(--ac-primary) 12%, transparent); color: var(--ac-primary); }
.ac-plan__progress { margin-left: auto; font-size: 0.72rem; color: var(--ac-muted); }
.ac-plan__spacer { flex: 1; }

/* ---- 结构化步骤 ---- */
.ac-plan__steps { list-style: none; margin: 0; padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; }
.ac-plan__step { display: flex; align-items: flex-start; gap: 9px; padding: 3px 0; }
.ac-plan__no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ac-surface);
  border: 1px solid var(--ac-border);
  font-size: 0.68rem;
  color: var(--ac-muted);
  flex-shrink: 0;
}
.ac-plan__marker { display: flex; align-items: center; width: 18px; flex-shrink: 0; padding-top: 1px; }
.ac-plan__step--done .ac-plan__marker { color: var(--ac-success); }
.ac-plan__step--running .ac-plan__marker { color: var(--ac-primary); }
.ac-plan__step--error .ac-plan__marker { color: var(--ac-danger); }
.ac-plan__step-body { display: flex; flex-direction: column; gap: 1px; }
.ac-plan__step-title { font-size: 0.82rem; color: var(--ac-fg); }
.ac-plan__step--done .ac-plan__step-title { color: var(--ac-muted); }
.ac-plan__step--running .ac-plan__step-title { font-weight: 600; }
.ac-plan__step--skipped .ac-plan__step-title { color: var(--ac-muted); text-decoration: line-through; }
.ac-plan__step-detail { font-size: 0.73rem; color: var(--ac-muted); line-height: 1.5; }
.ac-plan__spin { animation: ac-plan-spin 0.9s linear infinite; }
@keyframes ac-plan-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ac-plan__spin { animation-duration: 2.5s; } }
.ac-plan__input {
  flex: 1;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.6);
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 0.8rem;
  padding: 4px 8px;
}
.ac-plan__input:focus { outline: none; border-color: var(--ac-primary); }
.ac-plan__tools { display: flex; gap: 2px; }
.ac-plan__tool {
  border: none;
  background: transparent;
  color: var(--ac-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: inline-flex;
}
.ac-plan__tool:hover:not(:disabled) { background: var(--ac-surface); color: var(--ac-fg); }
.ac-plan__tool:disabled { opacity: 0.35; cursor: default; }
.ac-plan__tool--danger:hover:not(:disabled) { color: var(--ac-danger); }

/* ---- Markdown 长文 ---- */
.ac-plan__tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--ac-muted);
  font-size: 0.74rem;
  cursor: pointer;
  padding: 3px 7px;
  border-radius: 5px;
}
.ac-plan__tool-btn:hover { background: color-mix(in srgb, var(--ac-primary) 8%, transparent); color: var(--ac-fg); }
.ac-plan__chev { transition: transform 0.18s; }
.ac-plan__chev--open { transform: rotate(180deg); }
.ac-plan__bodywrap { position: relative; }
.ac-plan__mdbody { padding: 4px 18px 14px; overflow: hidden; }
.ac-plan__fade {
  position: absolute;
  inset: auto 0 0 0;
  height: 110px;
  background: linear-gradient(to bottom, transparent, var(--ac-surface) 82%);
  pointer-events: none;
}
.ac-plan__expand {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  border: none;
  background: var(--ac-fg);
  color: var(--ac-bg);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 8px 22px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.18);
  transition: opacity 0.15s, transform 0.15s;
}
.ac-plan__expand:hover { opacity: 0.88; transform: translateX(-50%) translateY(-1px); }
.ac-plan__editor { display: flex; flex-direction: column; }
.ac-plan__textarea {
  border: none;
  border-bottom: 1px solid var(--ac-border);
  background: var(--ac-surface);
  color: var(--ac-fg);
  font-family: var(--ac-font-mono, ui-monospace, monospace);
  font-size: 0.78rem;
  line-height: 1.6;
  padding: 12px 15px;
  resize: vertical;
  min-height: 200px;
}
.ac-plan__textarea:focus { outline: none; }
.ac-plan__editbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 9px 13px;
}

/* ---- 操作区 ---- */
.ac-plan__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 13px 11px;
}
.ac-plan--md .ac-plan__actions { padding: 0 18px 14px; justify-content: flex-end; }
.ac-plan__btn {
  border: 1px solid var(--ac-border);
  background: transparent;
  color: var(--ac-fg);
  border-radius: calc(var(--ac-radius) * 0.7);
  padding: 5px 13px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.ac-plan__btn:hover { border-color: var(--ac-primary); }
.ac-plan__btn--ghost { color: var(--ac-muted); }
.ac-plan__btn--primary {
  background: var(--ac-primary);
  border-color: var(--ac-primary);
  color: var(--ac-primary-fg, #fff);
  font-weight: 600;
}
.ac-plan__btn--primary:hover { opacity: 0.9; }
</style>
