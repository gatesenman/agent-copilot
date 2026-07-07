<template>
  <div class="ac-input-wrap">
    <!-- 上下文附着条 -->
    <ContextChips :items="contextItems" @remove="emit('removeContext', $event)" />

    <form class="ac-input" @submit.prevent="submit">
      <!-- 命令面板（/ @ #） -->
      <CommandPalette
        :visible="palette.visible.value"
        :items="palette.items.value"
        :active-index="palette.activeIndex.value"
        :heading="palette.heading.value"
        @select="onPaletteSelect"
        @hover="palette.activeIndex.value = $event"
      />

      <!-- 左侧动作按钮：附件 / 语音 / 思考开关 / 宿主自定义控件 -->
      <div v-if="showAttachButton || showVoiceButton || showThinkingToggle || $slots['toolbar-start']" class="ac-input__actions">
        <!-- 宿主自定义左侧控件（如访问模式选择器） -->
        <slot name="toolbar-start" />
        <button
          v-if="showAttachButton"
          type="button"
          class="ac-input__action"
          aria-label="上传附件"
          title="上传附件"
          :disabled="disabled"
          @click="fileInputRef?.click()"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <path d="m13.5 7.5-5.2 5.2a3.2 3.2 0 0 1-4.5-4.5l5.6-5.6a2.1 2.1 0 0 1 3 3l-5.6 5.6a1 1 0 0 1-1.5-1.5l5.2-5.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <input
          ref="fileInputRef"
          type="file"
          class="ac-input__file"
          multiple
          :accept="attachAccept"
          aria-hidden="true"
          tabindex="-1"
          @change="onFilesPicked"
        />
        <button
          v-if="showVoiceButton"
          type="button"
          class="ac-input__action"
          :class="{ 'ac-input__action--rec': voiceRecording }"
          :aria-label="voiceRecording ? '正在录音' : '语音输入'"
          :title="voiceRecording ? '正在录音' : '语音输入'"
          :disabled="disabled"
          @click="onVoiceClick"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <rect x="6" y="1.5" width="4" height="8" rx="2" />
            <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2.5" stroke-linecap="round" />
          </svg>
        </button>
        <button
          v-if="showThinkingToggle"
          type="button"
          class="ac-input__action"
          :class="{ 'ac-input__action--on': thinkingOn }"
          role="switch"
          :aria-checked="thinkingOn"
          aria-label="开启深度思考"
          :title="thinkingOn ? '深度思考：开' : '深度思考：关'"
          :disabled="disabled"
          @click="emit('update:thinkingOn', !thinkingOn)"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <path d="M5.5 2.5a2.5 2.5 0 0 0-2 4A2.8 2.8 0 0 0 4 11.5a2.5 2.5 0 0 0 4 2V3a2.5 2.5 0 0 0-2.5-.5ZM10.5 2.5a2.5 2.5 0 0 1 2 4 2.8 2.8 0 0 1-.5 5 2.5 2.5 0 0 1-4 2V3a2.5 2.5 0 0 1 2.5-.5Z" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <textarea
        ref="textareaRef"
        v-model="text"
        class="ac-input__textarea"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxLength && maxLength > 0 ? maxLength : undefined"
        rows="1"
        aria-label="聊天输入框"
        @keydown="onKeydown"
        @input="onInput"
        @click="syncCaret"
        @keyup="syncCaret"
      />
      <!-- 宿主自定义右侧控件（如模型/推理力度选择器），位于发送按钮左侧 -->
      <div v-if="$slots['toolbar-end']" class="ac-input__actions ac-input__actions--end">
        <slot name="toolbar-end" />
      </div>
      <button
        v-if="generating && !queueEnabled"
        type="button"
        class="ac-input__btn ac-input__btn--stop"
        aria-label="停止生成"
        @click="emit('stop')"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
          <rect x="4" y="4" width="8" height="8" rx="1.5" />
        </svg>
      </button>
      <template v-else>
        <button
          v-if="generating && queueEnabled"
          type="button"
          class="ac-input__btn ac-input__btn--stop"
          aria-label="停止生成"
          @click="emit('stop')"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
            <rect x="4" y="4" width="8" height="8" rx="1.5" />
          </svg>
        </button>
        <button
          type="submit"
          class="ac-input__btn"
          :disabled="disabled || !text.trim() || (generating && !queueEnabled)"
          :aria-label="generating && queueEnabled ? '排队发送' : '发送消息'"
          :title="generating && queueEnabled ? '当前正在生成，发送后将排队' : undefined"
        >
          <svg v-if="!(generating && queueEnabled)" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M14 2 7.5 8.5M14 2 9.8 14l-2.3-5.5L2 6.2 14 2Z" stroke-linejoin="round" />
          </svg>
          <svg v-else viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3l2 2" stroke-linecap="round" />
          </svg>
        </button>
      </template>
    </form>
  </div>
</template>

<script setup lang="ts">
/**
 * ChatInput — 增强输入框
 * - 自适应高度、Enter 发送（CJK 输入法安全）
 * - / 斜杠命令、@ 提及、# 引用（CommandPalette）
 * - 上下文附着条（ContextChips）
 * - 消息队列：生成中可继续发送（排队图标提示）
 * - 插槽：toolbar-start（左侧动作区）/ toolbar-end（发送按钮左侧），
 *   供宿主放置 ModelSelector 等自定义控件
 */
import { computed, ref, toRef } from 'vue'
import type { ContextItem, MentionProvider, SlashCommand } from '../../types'
import { useCommands } from '../../composables/useCommands'
import CommandPalette, { type PaletteItem } from '../input/CommandPalette.vue'
import ContextChips from '../input/ContextChips.vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    generating?: boolean
    placeholder?: string
    sendOnEnter?: boolean
    /** 输入长度上限；0 或 undefined = 不限 */
    maxLength?: number
    /** 斜杠命令 */
    commands?: SlashCommand[]
    mentionProvider?: MentionProvider
    referenceProvider?: MentionProvider
    /** 已附着上下文（由 store 管理） */
    contextItems?: ContextItem[]
    /** 队列模式：生成中允许继续发送 */
    queueEnabled?: boolean
    /** 显示附件上传按钮 */
    showAttachButton?: boolean
    /** 附件 accept（如 "image/*,.pdf"） */
    attachAccept?: string
    /** 显示语音输入按钮 */
    showVoiceButton?: boolean
    /** 语音识别中（外部控制录音态样式） */
    voiceRecording?: boolean
    /** 显示思考开关 */
    showThinkingToggle?: boolean
    /** 思考开关状态（v-model:thinkingOn） */
    thinkingOn?: boolean
  }>(),
  {
    disabled: false, generating: false, placeholder: '输入消息…', sendOnEnter: true,
    maxLength: 0, commands: () => [], contextItems: () => [], queueEnabled: false,
    showAttachButton: false, attachAccept: undefined, showVoiceButton: false,
    voiceRecording: false, showThinkingToggle: false, thinkingOn: false,
  },
)

const emit = defineEmits<{
  (e: 'send', text: string): void
  (e: 'stop'): void
  (e: 'addContext', item: ContextItem): void
  (e: 'removeContext', id: string): void
  (e: 'command', cmd: SlashCommand): void
  (e: 'attach', files: File[]): void
  (e: 'voice'): void
  (e: 'update:thinkingOn', on: boolean): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)

function onFilesPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (files.length) emit('attach', files)
  input.value = ''
}

function onVoiceClick() {
  emit('voice')
}

const text = ref('')
const caretPos = ref(0)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const palette = useCommands(text, caretPos, {
  commands: computed(() => props.commands),
  mentionProvider: props.mentionProvider,
  referenceProvider: props.referenceProvider,
})

const contextItems = toRef(props, 'contextItems')
const queueEnabled = computed(() => props.queueEnabled)

function syncCaret() {
  caretPos.value = textareaRef.value?.selectionStart ?? text.value.length
}

function onInput() {
  syncCaret()
  autoResize()
}

function submit() {
  const value = text.value.trim()
  if (!value || props.disabled) return
  if (props.generating && !props.queueEnabled) return
  emit('send', value)
  text.value = ''
  palette.dismiss()
  if (textareaRef.value) textareaRef.value.style.height = 'auto'
}

function onPaletteSelect(item: PaletteItem) {
  const result = palette.applySelection(item)
  if (result.execute) {
    emit('command', result.execute)
    result.execute.handler?.('')
  }
  if (result.sendNow) {
    emit('send', result.sendNow)
    text.value = ''
    palette.dismiss()
    return
  }
  if (result.newText !== undefined) {
    text.value = result.newText
    caretPos.value = result.newText.length
  }
  if (result.contextItem) emit('addContext', result.contextItem)
  palette.dismiss()
  textareaRef.value?.focus()
}

function onKeydown(e: KeyboardEvent) {
  // 命令面板键盘导航
  if (palette.visible.value) {
    if (e.key === 'ArrowDown') { e.preventDefault(); palette.moveActive(1); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); palette.moveActive(-1); return }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.isComposing || e.keyCode === 229) return
      e.preventDefault()
      const item = palette.items.value[palette.activeIndex.value]
      if (item) onPaletteSelect(item)
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); palette.dismiss(); return }
  }

  if (props.sendOnEnter && e.key === 'Enter' && !e.shiftKey) {
    // CJK 输入法组合中不提交（Safari 兼容 keyCode 229）
    if (e.isComposing || e.keyCode === 229) return
    e.preventDefault()
    submit()
  }
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

defineExpose({ focus: () => textareaRef.value?.focus() })
</script>

<style scoped>
.ac-input-wrap {
  border-top: 1px solid var(--ac-border);
  background: var(--ac-bg);
}
.ac-input {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  background: var(--ac-bg);
}
.ac-input__textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.8);
  padding: 9px 12px;
  font: inherit;
  line-height: 1.5;
  color: var(--ac-fg);
  background: var(--ac-bg);
  max-height: 160px;
  outline: none;
  transition: border-color 0.15s;
}
.ac-input__textarea:focus { border-color: var(--ac-primary); }
.ac-input__textarea:disabled { opacity: 0.6; }
.ac-input__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: none;
  border-radius: calc(var(--ac-radius) * 0.8);
  background: var(--ac-primary);
  color: var(--ac-primary-fg);
  cursor: pointer;
  transition: opacity 0.15s;
}
.ac-input__btn:hover:not(:disabled) { opacity: 0.88; }
.ac-input__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ac-input__btn--stop { background: var(--ac-danger); color: #fff; }
.ac-input__actions { display: flex; align-items: center; gap: 2px; padding-bottom: 5px; }
.ac-input__actions--end { gap: 6px; }
.ac-input__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: calc(var(--ac-radius) * 0.6);
  background: transparent;
  color: var(--ac-muted);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.ac-input__action:hover:not(:disabled) { color: var(--ac-fg); background: color-mix(in srgb, var(--ac-primary) 8%, transparent); }
.ac-input__action:disabled { opacity: 0.4; cursor: not-allowed; }
.ac-input__action--on { color: var(--ac-primary); background: color-mix(in srgb, var(--ac-primary) 12%, transparent); }
.ac-input__action--rec { color: var(--ac-danger); animation: ac-rec-pulse 1.2s ease-in-out infinite; }
.ac-input__file { display: none; }
@keyframes ac-rec-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
@media (prefers-reduced-motion: reduce) {
  .ac-input__action--rec { animation: none; }
}
</style>
