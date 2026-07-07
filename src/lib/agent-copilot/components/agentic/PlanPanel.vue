<script setup lang="ts">
/**
 * PlanPanel —— 计划预览 / 编辑 / 批准 / 执行进度。
 * draft 态可编辑步骤（标题修改、增删、上下移）；批准后进入执行态展示进度。
 */
import { computed, ref, watch } from 'vue'
import type { PlanSpec, PlanStep } from '../../types'

const props = withDefaults(
  defineProps<{
    plan: PlanSpec
    /** 允许编辑步骤（draft 态时），默认 true */
    editable?: boolean
    /** 文案定制 */
    labels?: {
      title?: string
      approve?: string
      reject?: string
      addStep?: string
      executing?: string
      done?: string
      rejected?: string
    }
  }>(),
  { editable: true },
)

const emit = defineEmits<{
  (e: 'approve', steps: PlanStep[]): void
  (e: 'reject'): void
  (e: 'update:plan', plan: PlanSpec): void
}>()

const L = computed(() => ({
  title: props.labels?.title ?? '执行计划',
  approve: props.labels?.approve ?? '批准并执行',
  reject: props.labels?.reject ?? '驳回',
  addStep: props.labels?.addStep ?? '添加步骤',
  executing: props.labels?.executing ?? '执行中',
  done: props.labels?.done ?? '已完成',
  rejected: props.labels?.rejected ?? '已驳回',
}))

/** 本地可编辑副本（draft 态） */
const draftSteps = ref<PlanStep[]>(props.plan.steps.map((s) => ({ ...s })))
watch(() => props.plan, (p) => { draftSteps.value = p.steps.map((s) => ({ ...s })) }, { deep: true })

const isDraft = computed(() => props.plan.status === 'draft')
const canEdit = computed(() => isDraft.value && props.editable)
const doneCount = computed(() => props.plan.steps.filter((s) => s.status === 'done').length)

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

function approve() {
  const steps = draftSteps.value.filter((s) => s.title.trim())
  emit('approve', steps)
}

const statusBadge = computed(() => {
  switch (props.plan.status) {
    case 'executing': return { text: L.value.executing, cls: 'ac-plan__badge--exec' }
    case 'done': return { text: L.value.done, cls: 'ac-plan__badge--done' }
    case 'rejected': return { text: L.value.rejected, cls: 'ac-plan__badge--rejected' }
    default: return null
  }
})
</script>

<template>
  <div class="ac-plan" :data-status="plan.status">
    <div class="ac-plan__head">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M5.5 3h8M5.5 8h8M5.5 13h8M2.5 3h.01M2.5 8h.01M2.5 13h.01" stroke-linecap="round" />
      </svg>
      <span class="ac-plan__title">{{ plan.title || L.title }}</span>
      <span v-if="statusBadge" class="ac-plan__badge" :class="statusBadge.cls">{{ statusBadge.text }}</span>
      <span v-if="plan.status === 'executing' || plan.status === 'done'" class="ac-plan__progress">
        {{ doneCount }}/{{ plan.steps.length }}
      </span>
    </div>

    <!-- draft 态：可编辑列表 -->
    <ol v-if="canEdit" class="ac-plan__steps ac-plan__steps--edit" role="list">
      <li v-for="(step, i) in draftSteps" :key="step.id" class="ac-plan__step">
        <span class="ac-plan__no">{{ i + 1 }}</span>
        <input
          v-model="step.title"
          class="ac-plan__input"
          type="text"
          :placeholder="`步骤 ${i + 1}`"
          :aria-label="`步骤 ${i + 1} 标题`"
        />
        <span class="ac-plan__tools">
          <button type="button" class="ac-plan__tool" :disabled="i === 0" aria-label="上移" @click="moveStep(i, -1)">
            <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m4 10 4-4 4 4" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button type="button" class="ac-plan__tool" :disabled="i === draftSteps.length - 1" aria-label="下移" @click="moveStep(i, 1)">
            <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button type="button" class="ac-plan__tool ac-plan__tool--danger" aria-label="删除步骤" @click="removeStep(i)">
            <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" /></svg>
          </button>
        </span>
      </li>
    </ol>

    <!-- 非 draft / 不可编辑：进度列表 -->
    <ol v-else class="ac-plan__steps" role="list">
      <li
        v-for="(step, i) in plan.steps"
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

    <div v-if="isDraft" class="ac-plan__actions">
      <button v-if="canEdit" type="button" class="ac-plan__btn" @click="addStep">
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
.ac-plan__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  background: var(--ac-surface);
  border-bottom: 1px solid var(--ac-border);
  color: var(--ac-fg);
}
.ac-plan__head svg { color: var(--ac-primary); }
.ac-plan__title { font-size: 0.84rem; font-weight: 700; }
.ac-plan__badge {
  font-size: 0.68rem;
  padding: 1px 8px;
  border-radius: 999px;
  font-weight: 600;
}
.ac-plan__badge--exec { background: color-mix(in srgb, var(--ac-primary) 14%, transparent); color: var(--ac-primary); }
.ac-plan__badge--done { background: color-mix(in srgb, var(--ac-success) 14%, transparent); color: var(--ac-success); }
.ac-plan__badge--rejected { background: color-mix(in srgb, var(--ac-danger) 12%, transparent); color: var(--ac-danger); }
.ac-plan__progress { margin-left: auto; font-size: 0.72rem; color: var(--ac-muted); }
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
  border-radius: 6px;
  padding: 4px 9px;
  font-size: 0.8rem;
  background: var(--ac-bg);
  color: var(--ac-fg);
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
  display: flex;
}
.ac-plan__tool:hover:not(:disabled) { background: var(--ac-surface); color: var(--ac-fg); }
.ac-plan__tool:disabled { opacity: 0.3; cursor: default; }
.ac-plan__tool--danger:hover { color: var(--ac-danger); }
.ac-plan__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border-top: 1px solid var(--ac-border);
}
.ac-plan__spacer { flex: 1; }
.ac-plan__btn {
  border: 1px solid var(--ac-border);
  background: var(--ac-bg);
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
