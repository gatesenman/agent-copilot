<script setup lang="ts">
/**
 * PlanReviewCard —— Markdown 长文计划审查卡（类 Claude Code / Cursor Plan Review）。
 *
 * 与 PlanPanel（结构化步骤列表）互补：本组件面向 Agent 产出的整篇 Markdown 计划，
 * 提供「折叠预览（渐隐 + 居中展开按钮）→ 展开阅读 → 手动编辑全文 → 确认 / 驳回」闭环。
 *
 * - 折叠：超过 collapsedHeight 时截断显示，底部渐隐遮罩 + 居中"展开计划"药丸按钮
 * - 编辑：切换 textarea 编辑原始 Markdown，保存 emit update:content，取消还原
 * - 审查：draft 态显示"确认计划 / 驳回"，approve 携带（可能已被手动修改的）最终文本
 */
import { computed, nextTick, ref, watch } from 'vue'
import MarkdownText from '../chat/MarkdownText.vue'

const props = withDefaults(
  defineProps<{
    /** Markdown 计划全文 */
    content: string
    /** 卡片标题 */
    title?: string
    /** 审查状态：draft 显示操作区，approved / rejected 显示结果徽章 */
    status?: 'draft' | 'approved' | 'rejected'
    /** 允许手动编辑，默认 true（仅 draft 态生效） */
    editable?: boolean
    /** 折叠态预览高度（px），默认 300；内容不超高时不折叠 */
    collapsedHeight?: number
    /** 初始是否展开，默认 false */
    defaultExpanded?: boolean
    labels?: {
      title?: string
      expand?: string
      collapse?: string
      edit?: string
      save?: string
      cancel?: string
      approve?: string
      reject?: string
      approved?: string
      rejected?: string
      edited?: string
    }
  }>(),
  { title: '', status: 'draft', editable: true, collapsedHeight: 300, defaultExpanded: false },
)

const emit = defineEmits<{
  (e: 'approve', content: string): void
  (e: 'reject'): void
  (e: 'update:content', content: string): void
}>()

const L = computed(() => ({
  title: props.labels?.title ?? '计划',
  expand: props.labels?.expand ?? '展开计划',
  collapse: props.labels?.collapse ?? '收起',
  edit: props.labels?.edit ?? '编辑',
  save: props.labels?.save ?? '保存',
  cancel: props.labels?.cancel ?? '取消',
  approve: props.labels?.approve ?? '确认计划',
  reject: props.labels?.reject ?? '驳回',
  approved: props.labels?.approved ?? '已确认',
  rejected: props.labels?.rejected ?? '已驳回',
  edited: props.labels?.edited ?? '已修改',
}))

const isDraft = computed(() => props.status === 'draft')

// ---- 展开 / 收起 ----
const expanded = ref(props.defaultExpanded)
const bodyEl = ref<HTMLElement | null>(null)
/** 内容实际高度是否超过折叠阈值（不超过则无需折叠控件） */
const overflowing = ref(false)

function measure() {
  nextTick(() => {
    if (bodyEl.value) overflowing.value = bodyEl.value.scrollHeight > props.collapsedHeight + 40
  })
}
watch(() => props.content, measure, { immediate: true })

const clamped = computed(() => overflowing.value && !expanded.value)

// ---- 手动编辑 ----
const editing = ref(false)
const draft = ref(props.content)
/** 是否被手动改过（相对最近一次外部传入） */
const dirty = ref(false)
watch(() => props.content, (v) => {
  if (editing.value) return
  // 自己保存后的 v-model 回流（v === draft）不应清除"已修改"标记；仅外部换入新内容时重置
  if (v !== draft.value) dirty.value = false
  draft.value = v
})

const textareaEl = ref<HTMLTextAreaElement | null>(null)
function startEdit() {
  draft.value = props.content
  editing.value = true
  expanded.value = true
  nextTick(() => textareaEl.value?.focus())
}
function saveEdit() {
  editing.value = false
  if (draft.value !== props.content) {
    dirty.value = true
    emit('update:content', draft.value)
  }
  measure()
}
function cancelEdit() {
  editing.value = false
  draft.value = props.content
}

function approve() {
  emit('approve', editing.value ? draft.value : props.content)
}

const statusBadge = computed(() => {
  if (props.status === 'approved') return { text: L.value.approved, cls: 'ac-planrev__badge--ok' }
  if (props.status === 'rejected') return { text: L.value.rejected, cls: 'ac-planrev__badge--no' }
  return null
})
</script>

<template>
  <div class="ac-planrev" :data-status="status">
    <div class="ac-planrev__head">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M9.5 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9.5 2Z" stroke-linejoin="round" />
        <path d="M9.5 2v3.5H13M5.5 9h5M5.5 11.5h3" stroke-linecap="round" />
      </svg>
      <span class="ac-planrev__title">{{ title || L.title }}</span>
      <span v-if="dirty && isDraft" class="ac-planrev__badge ac-planrev__badge--edited">{{ L.edited }}</span>
      <span v-if="statusBadge" class="ac-planrev__badge" :class="statusBadge.cls">{{ statusBadge.text }}</span>
      <span class="ac-planrev__spacer" />
      <button
        v-if="isDraft && editable && !editing"
        type="button"
        class="ac-planrev__tool"
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
        class="ac-planrev__tool"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" :class="{ 'ac-planrev__chev--open': expanded }" class="ac-planrev__chev" aria-hidden="true">
          <path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {{ expanded ? L.collapse : L.expand }}
      </button>
    </div>

    <!-- 编辑态：原始 Markdown -->
    <div v-if="editing" class="ac-planrev__editor">
      <textarea
        ref="textareaEl"
        v-model="draft"
        class="ac-planrev__textarea"
        :aria-label="L.edit"
        rows="14"
        spellcheck="false"
      />
      <div class="ac-planrev__editbar">
        <button type="button" class="ac-planrev__btn ac-planrev__btn--ghost" @click="cancelEdit">{{ L.cancel }}</button>
        <button type="button" class="ac-planrev__btn ac-planrev__btn--primary" @click="saveEdit">{{ L.save }}</button>
      </div>
    </div>

    <!-- 预览态：折叠渐隐 + 居中展开按钮 -->
    <div v-else class="ac-planrev__bodywrap" :class="{ 'ac-planrev__bodywrap--clamped': clamped }">
      <div
        ref="bodyEl"
        class="ac-planrev__body"
        :style="clamped ? { maxHeight: `${collapsedHeight}px` } : undefined"
      >
        <MarkdownText :content="content" />
      </div>
      <div v-if="clamped" class="ac-planrev__fade" aria-hidden="true" />
      <button
        v-if="clamped"
        type="button"
        class="ac-planrev__expand"
        :aria-label="L.expand"
        @click="expanded = true"
      >
        {{ L.expand }}
      </button>
    </div>

    <div v-if="isDraft && !editing" class="ac-planrev__actions">
      <button type="button" class="ac-planrev__btn ac-planrev__btn--ghost" @click="emit('reject')">{{ L.reject }}</button>
      <button type="button" class="ac-planrev__btn ac-planrev__btn--primary" @click="approve">{{ L.approve }}</button>
    </div>
  </div>
</template>

<style scoped>
.ac-planrev {
  border: 1px solid color-mix(in srgb, var(--ac-border) 55%, transparent);
  border-radius: calc(var(--ac-radius) * 1.4);
  background: var(--ac-surface);
  overflow: hidden;
}
.ac-planrev__head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 14px 18px 0;
  color: var(--ac-muted);
}
.ac-planrev__head > svg { color: var(--ac-muted); flex-shrink: 0; }
.ac-planrev__title { font-size: 0.8rem; font-weight: 500; letter-spacing: 0.02em; }
.ac-planrev__spacer { flex: 1; }
.ac-planrev__badge {
  font-size: 0.68rem;
  padding: 1px 8px;
  border-radius: 999px;
  font-weight: 600;
}
.ac-planrev__badge--ok { background: color-mix(in srgb, var(--ac-success) 14%, transparent); color: var(--ac-success); }
.ac-planrev__badge--no { background: color-mix(in srgb, var(--ac-danger) 12%, transparent); color: var(--ac-danger); }
.ac-planrev__badge--edited { background: color-mix(in srgb, var(--ac-primary) 12%, transparent); color: var(--ac-primary); }
.ac-planrev__tool {
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
.ac-planrev__tool:hover { background: color-mix(in srgb, var(--ac-primary) 8%, transparent); color: var(--ac-fg); }
.ac-planrev__chev { transition: transform 0.18s; }
.ac-planrev__chev--open { transform: rotate(180deg); }

.ac-planrev__bodywrap { position: relative; }
.ac-planrev__body { padding: 4px 18px 14px; overflow: hidden; }
.ac-planrev__fade {
  position: absolute;
  inset: auto 0 0 0;
  height: 110px;
  background: linear-gradient(to bottom, transparent, var(--ac-surface) 82%);
  pointer-events: none;
}
.ac-planrev__expand {
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
.ac-planrev__expand:hover { opacity: 0.88; transform: translateX(-50%) translateY(-1px); }

.ac-planrev__editor { display: flex; flex-direction: column; }
.ac-planrev__textarea {
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
.ac-planrev__textarea:focus { outline: none; }
.ac-planrev__editbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 9px 13px;
}
.ac-planrev__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 18px 14px;
}
.ac-planrev__btn {
  border: 1px solid var(--ac-border);
  background: transparent;
  color: var(--ac-fg);
  border-radius: calc(var(--ac-radius) * 0.7);
  padding: 5px 13px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.ac-planrev__btn:hover { border-color: var(--ac-primary); }
.ac-planrev__btn--ghost { color: var(--ac-muted); }
.ac-planrev__btn--primary {
  background: var(--ac-primary);
  border-color: var(--ac-primary);
  color: var(--ac-primary-fg, #fff);
  font-weight: 600;
}
.ac-planrev__btn--primary:hover { opacity: 0.9; }
</style>
