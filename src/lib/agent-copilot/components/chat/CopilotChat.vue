<template>
  <section class="ac-chat" :aria-label="t('chat.windowAria')">
    <header v-if="showHeader" class="ac-chat__header">
      <div class="ac-chat__titles">
        <h2 class="ac-chat__title">{{ title || store.config.botName }}</h2>
        <p v-if="subtitle" class="ac-chat__subtitle">{{ subtitle }}</p>
      </div>
      <div class="ac-chat__actions">
        <span v-if="store.config.showTokenUsage && store.totalUsage.totalTokens > 0" class="ac-badge" :title="t('chat.tokenUsage')">
          {{ store.totalUsage.totalTokens.toLocaleString(locale) }} tokens
        </span>
        <slot name="header-actions" />
        <button
          v-if="showReset"
          type="button"
          class="ac-chat__icon-btn"
          :aria-label="t('chat.clear')"
          :title="t('chat.clear')"
          @click="store.clearChat()"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4 4.5l.7 8.6a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-8.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </header>

    <div
      ref="scrollRef"
      class="ac-chat__messages ac-scroll"
      role="log"
      aria-live="polite"
      :aria-busy="isRunning"
      :aria-label="t('chat.messagesAria', { n: visibleMessages.length })"
    >
      <!-- 欢迎屏（config.welcomeScreen） -->
      <div
        v-if="welcome && store.messages.value.length === 0 && !initialMessage"
        class="ac-chat__welcome"
      >
        <!-- icon 以 "M" 开头视为 SVG path data，否则按文本渲染 -->
        <span v-if="welcome.icon && isSvgPath(welcome.icon)" class="ac-chat__welcome-icon ac-chat__welcome-icon--svg" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path :d="welcome.icon" />
          </svg>
        </span>
        <span v-else-if="welcome.icon" class="ac-chat__welcome-icon" aria-hidden="true">{{ welcome.icon }}</span>
        <h3 class="ac-chat__welcome-title">{{ welcome.title ?? store.labels.emptyTitle }}</h3>
        <p class="ac-chat__welcome-sub">{{ welcome.subtitle ?? store.labels.emptySubtitle }}</p>
        <div v-if="welcome.hints?.length" class="ac-chat__welcome-hints">
          <button
            v-for="hint in welcome.hints"
            :key="hint"
            type="button"
            class="ac-chat__welcome-hint"
            @click="store.sendMessage(hint)"
          >{{ hint }}</button>
        </div>
      </div>

      <MessageBubble
        v-if="initialMessage && store.messages.value.length === 0"
        :message="welcomeMessage"
        v-bind="bubbleProps"
      />

      <!-- 长会话窗口化：超出阈值的历史消息折叠，按需批量展开 -->
      <button
        v-if="hiddenCount > 0"
        type="button"
        class="ac-chat__load-earlier"
        @click="showEarlier"
      >
        {{ t('chat.showEarlier', { n: hiddenCount }) }}
      </button>

      <MessageBubble
        v-for="(msg, i) in renderedMessages"
        :key="msg.id"
        :message="msg"
        v-bind="bubbleProps"
        :feedback="store.feedbacks.value[msg.id]"
        :branch="branchOf(msg)"
        :on-retry="msg.error && isLastRendered(i) ? () => store.retryLast() : undefined"
        :on-regenerate="msg.role === 'assistant' && isLastRendered(i) && !isRunning ? () => store.retryLast() : undefined"
        @feedback="(v) => store.sendFeedback(msg.id, v)"
        @switch-branch="(t) => { const b = branchOf(msg); if (b) store.switchBranch(b.anchorId, t) }"
      />

      <!-- HITL 中断卡片 -->
      <ApprovalCard
        v-if="store.interrupt.value"
        :interrupt="store.interrupt.value"
        @respond="(r) => store.respondToInterrupt(r)"
      />
    </div>

    <ChatSuggestions
      v-if="showSuggestionsNow"
      :suggestions="store.suggestions.value"
      :loading="store.suggestionsLoading.value"
      @select="(s) => store.sendMessage(s.message)"
    />

    <!-- 排队中的消息 -->
    <div v-if="store.queuedMessages.value.length > 0" class="ac-chat__queue" :aria-label="t('chat.queuedAria')">
      <div v-for="q in store.queuedMessages.value" :key="q.id" class="ac-chat__queue-item">
        <span class="ac-badge ac-pulse">{{ t('chat.queueing') }}</span>
        <span class="ac-chat__queue-text">{{ q.content }}</span>
        <button type="button" class="ac-chat__icon-btn" :aria-label="t('chat.cancelQueued')" :title="t('chat.cancel')" @click="store.cancelQueued(q.id)">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <ChatInput
      :generating="isRunning"
      :disabled="store.status.value === 'awaiting_interrupt'"
      :placeholder="store.status.value === 'awaiting_interrupt' ? store.labels.interruptLocked : (placeholder || store.labels.inputPlaceholder)"
      :send-on-enter="store.config.sendOnEnter"
      :max-length="store.config.inputMaxLength"
      :commands="store.config.commands"
      :mention-provider="store.config.mentionProvider"
      :reference-provider="store.config.referenceProvider"
      :context-items="store.contextItems.value"
      :queue-enabled="store.config.queue?.enabled"
      :show-attach-button="store.config.attachments?.enabled"
      :attach-accept="store.config.attachments?.accept?.join(',')"
      :show-voice-button="!!store.config.onVoiceInput"
      :voice-recording="voiceRecording"
      :show-thinking-toggle="store.config.agentic?.thinkingToggle"
      :thinking-on="store.thinkingEnabled.value"
      @send="(t) => store.sendMessage(t)"
      @stop="store.stop()"
      @add-context="store.attachContext"
      @remove-context="store.removeContext"
      @attach="onAttachFiles"
      @voice="onVoice"
      @update:thinking-on="(v) => (store.thinkingEnabled.value = v)"
    >
      <template v-if="$slots['toolbar-start']" #toolbar-start>
        <slot name="toolbar-start" />
      </template>
      <template v-if="$slots['toolbar-end']" #toolbar-end>
        <slot name="toolbar-end" />
      </template>
    </ChatInput>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'CopilotChat' })

/**
 * CopilotChat — 内嵌式对话组件（CopilotKit <CopilotChat> 对齐）
 * 组合消息流、流水线状态、HITL 审批卡、建议问题与输入框。
 */
import { computed, nextTick, ref, watch } from 'vue'
import type { ChatMessage } from '../../types'
import { useCopilot } from '../../composables/useCopilot'
import { useI18n } from '../../i18n'
import MessageBubble from './MessageBubble.vue'
import ChatInput from './ChatInput.vue'
import ChatSuggestions from './ChatSuggestions.vue'
import ApprovalCard from '../generative-ui/ApprovalCard.vue'

const props = withDefaults(
  defineProps<{
    /** 顶部标题（默认取 config.botName） */
    title?: string
    /** 副标题 */
    subtitle?: string
    /** 欢迎语（无消息时显示） */
    initialMessage?: string
    /** 输入框占位（默认取 labels.inputPlaceholder） */
    placeholder?: string
    /** 是否显示顶栏 */
    showHeader?: boolean
    /** 是否显示清空按钮 */
    showReset?: boolean
    /** 消息操作栏（覆盖全局 config.messageActions） */
    messageActions?: import('../../types').MessageActionsConfig | false
    /** 时间戳（覆盖全局 config.showTimestamps） */
    timestamps?: boolean | undefined
    /** 头像（覆盖全局 config.showAvatars） */
    avatars?: boolean | undefined
    /** 长会话窗口化阈值：仅完整渲染最近 N 条消息，更早的折叠为"显示更早消息"按钮；0 = 关闭 */
    virtualizeThreshold?: number
  }>(),
  {
    title: '',
    subtitle: '',
    initialMessage: '',
    placeholder: '',
    showHeader: true,
    showReset: true,
    messageActions: undefined,
    timestamps: undefined,
    avatars: undefined,
    virtualizeThreshold: 60,
  },
)

defineSlots<{
  /** 头部右侧操作区（token 徽标与清空按钮之间，如导出/设置按钮） */
  'header-actions'(): unknown
  /** 输入框工具栏左侧扩展区（透传给 ChatInput） */
  'toolbar-start'(): unknown
  /** 输入框工具栏右侧扩展区（透传给 ChatInput，发送按钮左侧） */
  'toolbar-end'(): unknown
}>()

const store = useCopilot()
const { t, locale } = useI18n()
const scrollRef = ref<HTMLElement | null>(null)

/** 程序化控制：滚动到底部 */
function scrollToBottom() {
  const el = scrollRef.value
  if (el) el.scrollTop = el.scrollHeight
}

defineExpose({
  /** 滚动消息区到底部 */
  scrollToBottom,
})

const isRunning = computed(() => store.status.value === 'running')
const welcome = computed(() => store.config.welcomeScreen)

/** 传给每条 MessageBubble 的公共 props */
const bubbleProps = computed(() => ({
  actions: props.messageActions ?? store.config.messageActions,
  toolDisplay: store.config.toolDisplay,
  showTimestamp: props.timestamps ?? store.config.showTimestamps ?? false,
  showAvatar: props.avatars ?? store.config.showAvatars ?? false,
  showThinking: store.config.agentic?.showThinking ?? true,
  botAvatar: store.config.botAvatar,
  userAvatar: store.config.userAvatar,
  botName: store.config.botName,
  copyLabel: store.labels.copy,
  copiedLabel: store.labels.copied,
  regenerateLabel: store.labels.regenerate,
  feedbackUpLabel: store.labels.feedbackUp,
  feedbackDownLabel: store.labels.feedbackDown,
}))

/** 判断欢迎屏 icon 是否为 SVG path data（如 "M4 7h16M4 12h16"） */
function isSvgPath(icon: string): boolean {
  return /^M[0-9\s.,\-MmLlHhVvCcSsQqTtAaZz]+$/.test(icon)
}

const visibleMessages = computed(() =>
  store.messages.value.filter((m) => m.role === 'user' || m.role === 'assistant'),
)

// ---- 长会话窗口化（性能虚拟化）----
/** 用户点击"显示更早"后追加渲染的条数 */
const extraShown = ref(0)
/** 每次点击展开的批量大小 */
const EARLIER_BATCH = 50

const hiddenCount = computed(() => {
  if (!props.virtualizeThreshold || props.virtualizeThreshold <= 0) return 0
  return Math.max(0, visibleMessages.value.length - props.virtualizeThreshold - extraShown.value)
})

/** 实际进入 DOM 的消息切片（保持最近 N 条 + 已手动展开的批次） */
const renderedMessages = computed(() =>
  hiddenCount.value > 0 ? visibleMessages.value.slice(hiddenCount.value) : visibleMessages.value,
)

function isLastRendered(i: number): boolean {
  return i === renderedMessages.value.length - 1
}

function showEarlier() {
  const el = scrollRef.value
  const prevHeight = el?.scrollHeight ?? 0
  extraShown.value += EARLIER_BATCH
  // 展开后保持视口位置不跳动
  nextTick(() => {
    if (el) el.scrollTop += el.scrollHeight - prevHeight
  })
}

// 清空会话后重置展开状态
watch(
  () => visibleMessages.value.length,
  (len, prev) => {
    if (len < (prev ?? 0)) extraShown.value = 0
  },
)

// ---- 附件上传：转为上下文项附着到下一条消息 ----
function onAttachFiles(files: File[]) {
  const cfg = store.config.attachments
  for (const f of files) {
    if (cfg?.maxSize && f.size > cfg.maxSize) continue
    if (cfg?.maxCount && store.contextItems.value.length >= cfg.maxCount) break
    store.attachContext({
      id: `file_${Date.now()}_${f.name}`,
      source: 'file',
      type: 'file',
      label: f.name,
      data: f,
    })
  }
}

// ---- 语音输入：调用宿主提供的识别回调，结果填入输入框 ----
const voiceRecording = ref(false)
async function onVoice() {
  const handler = store.config.onVoiceInput
  if (!handler || voiceRecording.value) return
  voiceRecording.value = true
  try {
    const text = await handler()
    if (text) await store.sendMessage(text)
  } finally {
    voiceRecording.value = false
  }
}

/** 查找消息所在的分支组：当前位于组锚点位置的消息显示分支切换器 */
function branchOf(msg: ChatMessage): { anchorId: string; total: number; active: number } | undefined {
  for (const [anchorId, g] of Object.entries(store.branches.value)) {
    if (g.versions.length > 1 && store.messages.value[g.anchorIndex]?.id === msg.id) {
      return { anchorId, total: g.versions.length, active: g.active }
    }
  }
  return undefined
}

const welcomeMessage = computed<ChatMessage>(() => ({
  id: '__welcome',
  role: 'assistant',
  content: props.initialMessage,
  createdAt: Date.now(),
}))

const showSuggestionsNow = computed(
  () =>
    store.config.suggestions !== false &&
    !isRunning.value &&
    !store.interrupt.value &&
    visibleMessages.value.filter((m) => m.role === 'user').length === 0,
)

watch(
  () => [
    store.messages.value.length,
    store.messages.value[store.messages.value.length - 1]?.content,
    store.interrupt.value,
  ],
  async () => {
    if (store.config.autoScroll === false) return
    await nextTick()
    const el = scrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  },
  { deep: false },
)
</script>

<style scoped>
.ac-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--ac-bg);
  color: var(--ac-fg);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius);
  overflow: hidden;
}
.ac-chat__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ac-border);
  flex-shrink: 0;
}
.ac-chat__titles { min-width: 0; }
.ac-chat__title {
  margin: 0;
  font-size: 1.05em;
  font-weight: 600;
}
.ac-chat__subtitle {
  margin: 2px 0 0;
  font-size: 0.84em;
  color: var(--ac-muted);
}
.ac-chat__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ac-chat__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: calc(var(--ac-radius) * 0.7);
  background: transparent;
  color: var(--ac-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.ac-chat__icon-btn:hover {
  background: var(--ac-surface);
  color: var(--ac-fg);
}
.ac-chat__messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}
.ac-chat__welcome-icon--svg {
  display: inline-flex;
  width: 44px;
  height: 44px;
  padding: 10px;
  border-radius: calc(var(--ac-radius) * 0.9);
  background: color-mix(in srgb, var(--ac-primary) 10%, transparent);
  color: var(--ac-primary);
}
.ac-chat__welcome-icon--svg svg {
  width: 100%;
  height: 100%;
}
/* 渲染虚拟化：视口外的消息跳过布局与绘制，长会话滚动保持流畅 */
.ac-chat__messages > :deep(.ac-msg) {
  content-visibility: auto;
  contain-intrinsic-size: auto 72px;
}
.ac-chat__load-earlier {
  align-self: center;
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  background: var(--ac-surface);
  color: var(--ac-muted);
  font-size: 0.82em;
  padding: 5px 16px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.ac-chat__load-earlier:hover {
  border-color: var(--ac-primary);
  color: var(--ac-primary);
}
.ac-chat__welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  min-height: 180px;
  text-align: center;
  padding: 24px 16px;
}
.ac-chat__welcome-icon { font-size: 30px; }
.ac-chat__welcome-title {
  margin: 0;
  font-size: 1.1em;
  font-weight: 650;
  color: var(--ac-fg);
  text-wrap: balance;
}
.ac-chat__welcome-sub {
  margin: 0;
  font-size: 0.88em;
  color: var(--ac-muted);
  text-wrap: pretty;
}
.ac-chat__welcome-hints {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
}
.ac-chat__welcome-hint {
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  background: var(--ac-surface);
  color: var(--ac-fg);
  font-size: 0.84em;
  padding: 6px 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.ac-chat__welcome-hint:hover {
  border-color: var(--ac-primary);
  background: var(--ac-bg);
}
</style>
