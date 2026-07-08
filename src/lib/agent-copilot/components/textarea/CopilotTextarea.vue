<template>
  <div class="ac-textarea" :class="{ 'ac-textarea--loading': suggesting }">
    <div class="ac-textarea__wrap">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        class="ac-textarea__input"
        :placeholder="placeholder"
        :rows="rows"
        :disabled="disabled"
        :maxlength="maxLength || undefined"
        :aria-label="t('ta.aria')"
        @input="onInput"
        @keydown="onKeydown"
        @mouseup="onSelectionChange"
        @keyup="onSelectionChange"
        @blur="onBlur"
        @scroll="syncGhostScroll"
      />
      <!-- Ghost 补全预览 -->
      <div v-if="ghost" ref="ghostRef" class="ac-textarea__ghost" aria-hidden="true">
        <span class="ac-textarea__ghost-typed">{{ modelValue }}</span><span class="ac-textarea__ghost-suggest">{{ ghost }}</span>
      </div>

      <!-- 选区 AI 工具条 -->
      <div
        v-if="selToolbar.visible"
        class="ac-textarea__seltool"
        :style="{ left: selToolbar.x + 'px', top: selToolbar.y + 'px' }"
        role="toolbar"
        :aria-label="t('ta.selectionAria')"
        @mousedown.prevent
      >
        <template v-if="!customMode">
          <button
            v-for="a in quickActions"
            :key="a.key"
            type="button"
            class="ac-textarea__selbtn"
            :disabled="transforming"
            @click="applyQuickAction(a)"
          >{{ a.label }}</button>
          <span class="ac-textarea__seldiv" />
          <button type="button" class="ac-textarea__selbtn" :disabled="transforming" :title="t('ta.customTitle')" @click="customMode = true">
            {{ t('ta.custom') }}
          </button>
        </template>
        <template v-else>
          <input
            ref="customInputRef"
            v-model="customInstruction"
            class="ac-textarea__selinput"
            type="text"
            :placeholder="t('ta.customPlaceholder')"
            :disabled="transforming"
            @keydown.enter.prevent="applyCustom"
            @keydown.esc.stop="customMode = false"
          />
          <button type="button" class="ac-textarea__selbtn ac-textarea__selbtn--primary" :disabled="transforming || !customInstruction.trim()" @click="applyCustom">
            <span v-if="transforming" class="ac-spin" />
            <span v-else>{{ t('ta.apply') }}</span>
          </button>
        </template>
      </div>
    </div>

    <div class="ac-textarea__bar">
      <span v-if="transforming" class="ac-textarea__hint"><span class="ac-spin" /> {{ t('ta.transforming') }}</span>
      <span v-else-if="ghost" class="ac-textarea__hint">
        <kbd>Tab</kbd> {{ t('ta.ghostHint') }} · <kbd>Ctrl+→</kbd> {{ t('ta.ghostWord') }} · <kbd>Esc</kbd> {{ t('ta.ghostDismiss') }}
      </span>
      <span v-else-if="suggesting" class="ac-textarea__hint"><span class="ac-spin" /> {{ t('ta.suggesting') }}</span>
      <span v-else-if="errorMsg" class="ac-textarea__hint ac-textarea__hint--err">{{ errorMsg }}</span>
      <span v-else class="ac-textarea__hint">{{ hint || t('ta.defaultHint') }}</span>

      <span class="ac-textarea__bar-end">
        <span v-if="showCount" class="ac-textarea__count" :class="{ 'ac-textarea__count--over': maxLength > 0 && modelValue.length >= maxLength }">
          {{ modelValue.length }}<template v-if="maxLength > 0"> / {{ maxLength }}</template>
        </span>
        <button
          v-if="lastSnapshot !== null"
          type="button"
          class="ac-btn ac-btn--sm ac-btn--ghost"
          :disabled="disabled"
          @click="undoAi"
        >
          {{ t('ta.undo') }}
        </button>
        <button
          v-if="insertPrompt"
          type="button"
          class="ac-btn ac-btn--sm"
          :disabled="suggesting || transforming || disabled"
          @click="runInsert"
        >
          {{ t('ta.generate') }}
        </button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * CopilotTextarea — AI 辅助文本域（CopilotKit <CopilotTextarea> 对齐并扩展）
 *
 * 能力：
 * 1. 停顿自动补全（ghost text）：Tab 全量接受 / Ctrl+→ 逐词接受 / Esc 忽略
 * 2. 选中文本悬浮 AI 工具条：润色 / 精简 / 扩写 / 翻译 + 自定义指令（Ctrl+K 唤起）
 * 3. "AI 生成"按钮按 insertPrompt 生成整段内容
 * 4. 任何 AI 写入均可一键撤销（保留修改前快照）
 * 5. 字数统计与 maxLength 限制
 * 6. Provider 可插拔：suggestionProvider / transformProvider 优先，
 *    否则回落到 useCopilot 的浏览器直连 LLM（需 apiKey）
 */
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useCopilot } from '../../composables/useCopilot'
import { useI18n } from '../../i18n'
import { LlmClient } from '../../runtime/llm-client'

interface QuickAction {
  key: string
  label: string
  instruction: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    rows?: number
    disabled?: boolean
    /** 自动补全用途说明（告诉 AI 这个输入框在写什么） */
    purpose?: string
    /** 停顿多少毫秒后触发补全；0 = 关闭自动补全 */
    debounceMs?: number
    /** "AI 生成"按钮的生成指令；不传则不显示按钮 */
    insertPrompt?: string
    hint?: string
    /** 字数上限；0 = 不限 */
    maxLength?: number
    /** 显示字数统计 */
    showCount?: boolean
    /** 选区快捷操作（缺省：润色/精简/扩写/译英） */
    actions?: QuickAction[]
    /** 自定义补全 provider：返回续写文本。优先于内置 LLM 直连 */
    suggestionProvider?: (text: string, purpose: string) => Promise<string>
    /** 自定义改写 provider：按指令改写选中文本。优先于内置 LLM 直连 */
    transformProvider?: (instruction: string, selection: string, fullText: string) => Promise<string>
  }>(),
  {
    placeholder: '',
    rows: 4,
    disabled: false,
    purpose: '',
    debounceMs: 800,
    insertPrompt: '',
    hint: '',
    maxLength: 0,
    showCount: true,
    actions: undefined,
    suggestionProvider: undefined,
    transformProvider: undefined,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  /** AI 写入（补全接受 / 改写 / 生成）后触发 */
  (e: 'ai-change', payload: { kind: 'suggestion' | 'transform' | 'insert'; before: string; after: string }): void
}>()

const store = useCopilot()
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const ghostRef = ref<HTMLElement | null>(null)
const customInputRef = ref<HTMLInputElement | null>(null)

const ghost = ref('')
const suggesting = ref(false)
const transforming = ref(false)
const errorMsg = ref('')
/** AI 写入前的快照（null = 无可撤销内容） */
const lastSnapshot = ref<string | null>(null)

const { t } = useI18n()

const DEFAULT_ACTIONS = computed<QuickAction[]>(() => [
  { key: 'polish', label: t('ta.polish'), instruction: t('ta.polishInstr') },
  { key: 'shorten', label: t('ta.shorten'), instruction: t('ta.shortenInstr') },
  { key: 'expand', label: t('ta.expand'), instruction: t('ta.expandInstr') },
  { key: 'translate', label: t('ta.translate'), instruction: t('ta.translateInstr') },
])

const quickActions = computed<QuickAction[]>(() => props.actions ?? DEFAULT_ACTIONS.value)

// ---- 选区工具条 ----
const selToolbar = reactive({ visible: false, x: 0, y: 0, start: 0, end: 0 })
const customMode = ref(false)
const customInstruction = ref('')

watch(customMode, (v) => { if (v) nextTick(() => customInputRef.value?.focus()) })

let timer: ReturnType<typeof setTimeout> | null = null
let abort: AbortController | null = null

function client(): LlmClient | null {
  if (store.config.runtime !== 'browser' || !store.config.apiKey) return null
  return new LlmClient({
    apiBase: store.config.apiBase!,
    apiKey: store.config.apiKey,
    model: store.config.model!,
  })
}

function contextSummary(): string {
  return [...store.readables.values()]
    .map((r) => `${r.description}: ${JSON.stringify(r.value()).slice(0, 400)}`)
    .join('\n')
}

function flashError(msg: string) {
  errorMsg.value = msg
  setTimeout(() => { if (errorMsg.value === msg) errorMsg.value = '' }, 3000)
}

function commit(value: string, kind: 'suggestion' | 'transform' | 'insert') {
  const before = props.modelValue
  lastSnapshot.value = before
  emit('update:modelValue', value)
  emit('ai-change', { kind, before, after: value })
}

function undoAi() {
  if (lastSnapshot.value === null) return
  emit('update:modelValue', lastSnapshot.value)
  lastSnapshot.value = null
}

// ---- 输入与补全 ----
function onInput(e: Event) {
  const value = (e.target as HTMLTextAreaElement).value
  emit('update:modelValue', value)
  ghost.value = ''
  scheduleSuggest(value)
}

function scheduleSuggest(value: string) {
  if (timer) clearTimeout(timer)
  abort?.abort()
  if (!props.debounceMs || value.trim().length < 6) return
  timer = setTimeout(() => void suggest(value), props.debounceMs)
}

async function suggest(value: string) {
  if (suggesting.value) return
  suggesting.value = true
  abort = new AbortController()
  try {
    let text = ''
    if (props.suggestionProvider) {
      text = await props.suggestionProvider(value, props.purpose)
    } else {
      const c = client()
      if (!c) return
      text = await c.chatOnce({
        messages: [
          {
            role: 'system',
            content:
              t('ta.suggestSystem', { purpose: props.purpose || t('ta.suggestPurposeFallback') }) +
              (contextSummary() ? `\n\n${t('ta.suggestContext')}\n${contextSummary()}` : ''),
          },
          { role: 'user', content: value },
        ],
        maxTokens: 80,
        temperature: 0.4,
        signal: abort.signal,
      })
    }
    if (text && !text.startsWith(value)) ghost.value = text.trim()
  } catch {
    /* 补全失败静默 */
  } finally {
    suggesting.value = false
  }
}

/** 接受 ghost 的第一个词（含前导空白与标点边界） */
function acceptGhostWord() {
  const m = ghost.value.match(/^\s*\S+([，。、；：,.;:!?！？]?)/)
  if (!m) return
  const word = m[0]
  commit(props.modelValue + word, 'suggestion')
  ghost.value = ghost.value.slice(word.length)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab' && ghost.value) {
    e.preventDefault()
    commit(props.modelValue + ghost.value, 'suggestion')
    ghost.value = ''
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight' && ghost.value) {
    e.preventDefault()
    acceptGhostWord()
  } else if (e.key === 'Escape') {
    if (ghost.value) { ghost.value = ''; return }
    if (selToolbar.visible) { selToolbar.visible = false; customMode.value = false }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    // Ctrl+K：对选区（或全文）唤起自定义指令
    e.preventDefault()
    const el = textareaRef.value
    if (!el) return
    if (el.selectionStart === el.selectionEnd) { el.select() }
    onSelectionChange()
    customMode.value = true
  }
}

function onBlur() {
  ghost.value = ''
  // 延迟收起，允许点击工具条（mousedown.prevent 已防失焦，此处兜底）
  setTimeout(() => { if (!customMode.value) selToolbar.visible = false }, 150)
}

function syncGhostScroll() {
  if (ghostRef.value && textareaRef.value) {
    ghostRef.value.scrollTop = textareaRef.value.scrollTop
  }
}

// ---- 选区工具条 ----
function onSelectionChange() {
  const el = textareaRef.value
  if (!el || props.disabled) return
  const { selectionStart, selectionEnd } = el
  if (selectionEnd - selectionStart < 2) {
    if (!customMode.value) selToolbar.visible = false
    return
  }
  selToolbar.start = selectionStart
  selToolbar.end = selectionEnd
  // 依据选区中点行数估算工具条位置（textarea 无 Range API，按行高近似）
  const style = getComputedStyle(el)
  const lineHeight = Number.parseFloat(style.lineHeight) || 22
  const before = el.value.slice(0, selectionStart)
  const line = before.split('\n').length - 1
  const y = Math.max(4, line * lineHeight - el.scrollTop + 4)
  selToolbar.x = 12
  selToolbar.y = Math.min(y, el.clientHeight - 36)
  selToolbar.visible = true
}

async function transformSelection(instruction: string) {
  const el = textareaRef.value
  if (!el || transforming.value) return
  const full = props.modelValue
  const selection = full.slice(selToolbar.start, selToolbar.end)
  if (!selection) return
  transforming.value = true
  abort = new AbortController()
  try {
    let replaced = ''
    if (props.transformProvider) {
      replaced = await props.transformProvider(instruction, selection, full)
    } else {
      const c = client()
      if (!c) { flashError('未配置 LLM，无法执行 AI 改写'); return }
      replaced = await c.chatOnce({
        messages: [
          { role: 'system', content: `你是文本编辑助手。按指令改写用户给出的文本片段，只输出改写结果，不要解释。指令：${instruction}` },
          { role: 'user', content: selection },
        ],
        maxTokens: 800,
        temperature: 0.4,
        signal: abort.signal,
      })
    }
    if (replaced) {
      const next = full.slice(0, selToolbar.start) + replaced.trim() + full.slice(selToolbar.end)
      commit(next, 'transform')
    }
  } catch {
    flashError('AI 改写失败，请重试')
  } finally {
    transforming.value = false
    selToolbar.visible = false
    customMode.value = false
    customInstruction.value = ''
  }
}

function applyQuickAction(a: QuickAction) {
  void transformSelection(a.instruction)
}

function applyCustom() {
  if (!customInstruction.value.trim()) return
  void transformSelection(customInstruction.value.trim())
}

// ---- AI 生成整段 ----
async function runInsert() {
  if (!props.insertPrompt) return
  suggesting.value = true
  abort = new AbortController()
  try {
    let text = ''
    if (props.transformProvider) {
      text = await props.transformProvider(props.insertPrompt, props.modelValue, props.modelValue)
    } else {
      const c = client()
      if (!c) { flashError('未配置 LLM，无法生成') ; return }
      text = await c.chatOnce({
        messages: [
          {
            role: 'system',
            content:
              `你是写作助手。${props.insertPrompt}` +
              (contextSummary() ? `\n\n应用上下文：\n${contextSummary()}` : '') +
              '\n直接输出正文，不要额外解释。',
          },
          { role: 'user', content: props.modelValue || '（当前为空，请从头生成）' },
        ],
        maxTokens: 600,
        temperature: 0.5,
        signal: abort.signal,
      })
    }
    if (text) commit(text.trim(), 'insert')
  } catch {
    flashError('AI 生成失败，请重试')
  } finally {
    suggesting.value = false
  }
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  abort?.abort()
})
</script>

<style scoped>
.ac-textarea {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  background: var(--ac-bg);
  overflow: hidden;
}
.ac-textarea:focus-within { border-color: var(--ac-primary); }
.ac-textarea__wrap { position: relative; }
.ac-textarea__input {
  width: 100%;
  border: none;
  resize: vertical;
  padding: 10px 12px;
  font: inherit;
  line-height: 1.6;
  color: var(--ac-fg);
  background: transparent;
  outline: none;
  min-height: 80px;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
}
.ac-textarea__ghost {
  position: absolute;
  inset: 0;
  padding: 10px 12px;
  font: inherit;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.ac-textarea__ghost-typed { color: transparent; }
.ac-textarea__ghost-suggest { color: var(--ac-muted); opacity: 0.75; }

/* 选区 AI 工具条 */
.ac-textarea__seltool {
  position: absolute;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: var(--ac-bg);
  border: 1px solid var(--ac-border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.14);
}
.ac-textarea__selbtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--ac-fg);
  white-space: nowrap;
}
.ac-textarea__selbtn:hover:not(:disabled) { background: var(--ac-surface); }
.ac-textarea__selbtn:disabled { opacity: 0.5; cursor: default; }
.ac-textarea__selbtn--primary { background: var(--ac-primary); color: var(--ac-primary-fg, #fff); }
.ac-textarea__selbtn--primary:hover:not(:disabled) { background: var(--ac-primary); opacity: 0.9; }
.ac-textarea__seldiv { width: 1px; height: 16px; background: var(--ac-border); margin: 0 2px; }
.ac-textarea__selinput {
  width: 200px;
  padding: 4px 8px;
  border: 1px solid var(--ac-border);
  border-radius: 6px;
  font-size: 0.78rem;
  background: var(--ac-bg);
  color: var(--ac-fg);
  outline: none;
}
.ac-textarea__selinput:focus { border-color: var(--ac-primary); }

.ac-textarea__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-top: 1px solid var(--ac-border);
  background: var(--ac-surface);
  min-height: 34px;
}
.ac-textarea__hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8em;
  color: var(--ac-muted);
}
.ac-textarea__hint--err { color: var(--ac-danger, #dc2626); }
.ac-textarea__hint kbd {
  padding: 1px 5px;
  border: 1px solid var(--ac-border);
  border-bottom-width: 2px;
  border-radius: 4px;
  font-size: 0.72em;
  font-family: inherit;
  background: var(--ac-bg);
}
.ac-textarea__bar-end { display: inline-flex; align-items: center; gap: 8px; }
.ac-textarea__count { font-size: 0.74em; color: var(--ac-muted); font-variant-numeric: tabular-nums; }
.ac-textarea__count--over { color: var(--ac-danger, #dc2626); font-weight: 600; }
.ac-btn--ghost { background: transparent; border: 1px solid var(--ac-border); color: var(--ac-muted); }
</style>
