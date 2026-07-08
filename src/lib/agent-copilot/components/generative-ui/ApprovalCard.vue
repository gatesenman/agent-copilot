<template>
  <div class="ac-card ac-approval ac-slide-up" role="alertdialog" :aria-label="interrupt.title">
    <div class="ac-approval__head">
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
        <path d="M10 2L2 17h16L10 2z" stroke="var(--ac-warn)" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M10 8v4" stroke="var(--ac-warn)" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="10" cy="14.4" r="0.9" fill="var(--ac-warn)"/>
      </svg>
      <div>
        <div class="ac-approval__title">{{ interrupt.title }}</div>
        <div v-if="interrupt.description" class="ac-approval__desc">{{ interrupt.description }}</div>
      </div>
    </div>

    <div v-if="interrupt.action" class="ac-approval__body">
      <div class="ac-approval__label">{{ t('approval.paramsLabel') }}</div>
      <table class="ac-approval__table">
        <tbody>
          <tr v-for="(v, k) in interrupt.action.args" :key="k">
            <th>{{ k }}</th>
            <td>{{ formatValue(v) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="interrupt.kind === 'choice' && interrupt.options" class="ac-approval__choices">
      <button
        v-for="opt in interrupt.options"
        :key="opt.value"
        type="button"
        class="ac-btn"
        @click="$emit('respond', { value: opt.value })"
      >
        {{ opt.label }}
      </button>
    </div>

    <div v-if="interrupt.kind === 'approval'" class="ac-approval__footer">
      <input
        v-model="comment"
        class="ac-approval__comment"
        type="text"
        :placeholder="t('approval.notePlaceholder')"
        :aria-label="t('approval.noteAria')"
      />
      <div class="ac-approval__actions">
        <button type="button" class="ac-btn ac-btn--danger" @click="$emit('respond', { approved: false, comment })">
          {{ t('hitl.reject') }}
        </button>
        <button type="button" class="ac-btn ac-btn--primary" @click="$emit('respond', { approved: true, comment })">
          {{ t('hitl.approve') }}
        </button>
      </div>
    </div>

    <div v-if="interrupt.kind === 'input'" class="ac-approval__footer">
      <input
        v-model="inputValue"
        class="ac-approval__comment"
        type="text"
        :placeholder="t('approval.inputPlaceholder')"
        :aria-label="t('approval.inputAria')"
        @keydown.enter="submitInput"
      />
      <div class="ac-approval__actions">
        <button type="button" class="ac-btn ac-btn--primary" @click="submitInput">{{ t('common.submit') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ApprovalCard' })

/**
 * ApprovalCard — HITL 审批/输入/选择卡片
 * 对应 CopilotKit renderAndWait 与 AgentScope 中断-恢复。
 */
import { ref } from 'vue'
import { useI18n } from '../../i18n'
import type { InterruptRequest, InterruptResponse } from '../../types'

const { t } = useI18n()

defineProps<{ interrupt: InterruptRequest }>()
const emit = defineEmits<{ respond: [response: Omit<InterruptResponse, 'interruptId'>] }>()

const comment = ref('')
const inputValue = ref('')

function submitInput() {
  if (inputValue.value.trim()) {
    emit('respond', { value: inputValue.value.trim() })
  }
}

function formatValue(v: unknown): string {
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
</script>

<style scoped>
.ac-approval {
  margin: 8px 0;
  border-color: var(--ac-warn);
  border-width: 1px;
}
.ac-approval__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: var(--ac-warn-soft);
}
.ac-approval__title { font-weight: 600; font-size: 0.95em; }
.ac-approval__desc { font-size: 0.85em; color: var(--ac-muted); margin-top: 2px; }
.ac-approval__body { padding: 12px 14px 0; }
.ac-approval__label { font-size: 0.8em; font-weight: 600; color: var(--ac-muted); margin-bottom: 6px; }
.ac-approval__table { width: 100%; border-collapse: collapse; font-size: 0.88em; }
.ac-approval__table th,
.ac-approval__table td {
  border: 1px solid var(--ac-border);
  padding: 5px 10px;
  text-align: left;
}
.ac-approval__table th {
  background: var(--ac-surface);
  font-weight: 500;
  color: var(--ac-muted);
  width: 130px;
  word-break: keep-all;
}
.ac-approval__table td { word-break: break-all; }
.ac-approval__choices { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 14px; }
.ac-approval__footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}
.ac-approval__comment {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.7);
  background: var(--ac-bg);
  color: var(--ac-fg);
  font: inherit;
  font-size: 0.9em;
}
.ac-approval__comment:focus { outline: 2px solid var(--ac-primary); outline-offset: -1px; }
.ac-approval__actions { display: flex; gap: 8px; }
</style>
