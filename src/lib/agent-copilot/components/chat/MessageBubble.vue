<template>
  <article
    class="ac-msg"
    :class="isUser ? 'ac-msg--user' : 'ac-msg--assistant'"
    :aria-label="isUser ? t('msg.user') : t('msg.reply', { name: botName ?? 'AI' })"
  >
    <div class="ac-msg__row">
      <!-- 头像 -->
      <span v-if="showAvatar && !isUser" class="ac-msg__avatar" aria-hidden="true">
        <img v-if="botAvatar" :src="botAvatar" alt="" />
        <template v-else>{{ botInitial }}</template>
      </span>

      <div class="ac-msg__bubble">
        <!-- 用户消息附着的上下文（@提及/#引用） -->
        <div v-if="isUser && message.context?.length" class="ac-msg__ctx" :aria-label="t('msg.context')">
          <span v-for="c in message.context" :key="c.id" class="ac-msg__ctx-chip">
            <span v-if="c.type" class="ac-msg__ctx-type">{{ c.type }}</span>{{ c.label }}
          </span>
        </div>

        <!-- 思考块（THINKING_* 事件累积） -->
        <ThinkingBlock
          v-if="!isUser && message.thinking && showThinking"
          :content="message.thinking"
          :streaming="message.thinkingStreaming"
          :duration="message.thinkingDuration"
        />

        <!-- 工具调用卡片（按工具名推断种类：读/写/执行/搜索/浏览，语义化图标与摘要） -->
        <ToolActionCard v-for="tc in visibleToolCalls" :key="tc.id" :tool-call="tc" :renderers="toolDisplay?.renderers" />

        <!-- 结构化载荷（16 种 AG-UI 载荷） -->
        <PayloadCard v-for="(p, i) in message.payloads ?? []" :key="i" :payload="p" />

        <!-- 文本内容 -->
        <MarkdownText v-if="message.content" :content="message.content" :streaming="message.streaming" />
        <span v-if="message.streaming && message.content" class="ac-cursor" aria-hidden="true" />
        <span v-if="message.streaming && !message.content && !(message.toolCalls?.length)" class="ac-msg__typing" :aria-label="t('msg.generating')">
          <i /><i /><i />
        </span>

        <!-- 错误与重试 -->
        <div v-if="message.error" class="ac-msg__error" role="alert">
          <span>{{ message.error }}</span>
          <button v-if="onRetry" type="button" class="ac-btn ac-btn--sm" @click="onRetry">{{ t('chat.retry') }}</button>
        </div>
      </div>

      <span v-if="showAvatar && isUser" class="ac-msg__avatar ac-msg__avatar--user" aria-hidden="true">
        <img v-if="userAvatar" :src="userAvatar" alt="" />
        <template v-else>{{ t('msg.me') }}</template>
      </span>
    </div>

    <!-- 元信息行：时间戳 + 分支导航 + 操作栏 -->
    <div class="ac-msg__meta" :class="{ 'ac-msg__meta--with-avatar': showAvatar }">
      <time v-if="showTimestamp" class="ac-msg__time">{{ timeText }}</time>

      <!-- 分支导航（编辑重发/重新生成产生的多版本） -->
      <span v-if="branch && branch.total > 1" class="ac-branch" role="group" :aria-label="t('msg.branchNav')">
        <button
          type="button" class="ac-branch__btn" :aria-label="t('chat.branchPrev')"
          :disabled="branch.active <= 0"
          @click="emit('switchBranch', branch.active - 1)"
        >
          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10 3 5 8l5 5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <span aria-live="polite">{{ branch.active + 1 }}/{{ branch.total }}</span>
        <button
          type="button" class="ac-branch__btn" :aria-label="t('chat.branchNext')"
          :disabled="branch.active >= branch.total - 1"
          @click="emit('switchBranch', branch.active + 1)"
        >
          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 3 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </span>

      <!-- 助手消息操作栏（生成完毕后显示） -->
      <div
        v-if="!isUser && !message.streaming && message.content && hasAnyAction"
        class="ac-msg__actions"
        role="toolbar"
        :aria-label="t('msg.actions')"
      >
        <button
          v-if="actionsConfig.copy"
          type="button"
          class="ac-msg__action"
          :title="copied ? labelCopied : labelCopy"
          :aria-label="labelCopy"
          @click="copyContent"
        >
          <svg v-if="!copied" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
            <path d="M10.5 5.5v-2a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3.5v5A1.5 1.5 0 0 0 4 10h1.5" />
          </svg>
          <svg v-else viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="m3 8.5 3.5 3.5L13 5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          v-if="actionsConfig.regenerate && onRegenerate"
          type="button"
          class="ac-msg__action"
          :title="labelRegenerate"
          :aria-label="labelRegenerate"
          @click="onRegenerate"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 1.5v3h-3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          v-if="actionsConfig.feedback"
          type="button"
          class="ac-msg__action"
          :class="{ 'is-active': feedback === 'up' }"
          :title="labelFeedbackUp"
          :aria-label="labelFeedbackUp"
          :aria-pressed="feedback === 'up'"
          @click="emit('feedback', 'up')"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
            <path d="M4.5 7 8 1.8c.8 0 1.5.7 1.5 1.5V6h3.2c.9 0 1.5.8 1.3 1.6l-1 5A1.4 1.4 0 0 1 11.6 14H4.5M4.5 7v7M4.5 7H2a.7.7 0 0 0-.7.7v5.6c0 .4.3.7.7.7h2.5" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          v-if="actionsConfig.feedback"
          type="button"
          class="ac-msg__action"
          :class="{ 'is-active is-down': feedback === 'down' }"
          :title="labelFeedbackDown"
          :aria-label="labelFeedbackDown"
          :aria-pressed="feedback === 'down'"
          @click="emit('feedback', 'down')"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" style="transform: rotate(180deg)" aria-hidden="true">
            <path d="M4.5 7 8 1.8c.8 0 1.5.7 1.5 1.5V6h3.2c.9 0 1.5.8 1.3 1.6l-1 5A1.4 1.4 0 0 1 11.6 14H4.5M4.5 7v7M4.5 7H2a.7.7 0 0 0-.7.7v5.6c0 .4.3.7.7.7h2.5" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
/**
 * MessageBubble — 单条消息渲染
 * 文本 + 工具卡片 + 16 种结构化载荷 + 操作栏（复制/重新生成/反馈）
 */
import { computed, ref } from 'vue'
import type { ChatMessage, MessageActionsConfig, ToolDisplayConfig } from '../../types'
import { useI18n } from '../../i18n'
import MarkdownText from './MarkdownText.vue'
import ToolActionCard from '../agentic/ToolActionCard.vue'
import PayloadCard from '../generative-ui/PayloadCard.vue'
import ThinkingBlock from '../agentic/ThinkingBlock.vue'
import { copyText } from '../../utils/clipboard'

const props = withDefaults(
  defineProps<{
    message: ChatMessage
    onRetry?: () => void
    onRegenerate?: () => void
    /** 操作栏配置；false = 全部隐藏 */
    actions?: MessageActionsConfig | false
    /** 工具调用展示配置 */
    toolDisplay?: ToolDisplayConfig
    showTimestamp?: boolean
    showAvatar?: boolean
    botAvatar?: string
    userAvatar?: string
    botName?: string
    /** 当前反馈状态 */
    feedback?: 'up' | 'down'
    /** 分支导航信息（total > 1 时显示切换器） */
    branch?: { anchorId: string; total: number; active: number }
    /** 是否显示思考块，默认 true */
    showThinking?: boolean
    copyLabel?: string
    copiedLabel?: string
    regenerateLabel?: string
    feedbackUpLabel?: string
    feedbackDownLabel?: string
  }>(),
  {
    showTimestamp: false,
    showAvatar: false,
    showThinking: true,
    copyLabel: undefined,
    copiedLabel: undefined,
    regenerateLabel: undefined,
    feedbackUpLabel: undefined,
    feedbackDownLabel: undefined,
  },
)

const { t, locale } = useI18n()

// 未显式传入标签时回退到当前语言包
const labelCopy = computed(() => props.copyLabel ?? t('chat.copy'))
const labelCopied = computed(() => props.copiedLabel ?? t('chat.copied'))
const labelRegenerate = computed(() => props.regenerateLabel ?? t('chat.regenerate'))
const labelFeedbackUp = computed(() => props.feedbackUpLabel ?? t('chat.feedbackUp'))
const labelFeedbackDown = computed(() => props.feedbackDownLabel ?? t('chat.feedbackDown'))

const emit = defineEmits<{
  (e: 'feedback', value: 'up' | 'down'): void
  (e: 'switchBranch', target: number): void
}>()

const isUser = computed(() => props.message.role === 'user')
const timeText = computed(() =>
  new Date(props.message.createdAt).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' }),
)
const botInitial = computed(() => (props.botName ?? 'AI').slice(0, 1).toUpperCase())

const actionsConfig = computed<MessageActionsConfig>(() => {
  if (props.actions === false) return {}
  return props.actions ?? { copy: true, regenerate: true, feedback: true }
})

const hasAnyAction = computed(() => {
  const a = actionsConfig.value
  return !!(a.copy || a.regenerate || a.feedback)
})

/** toolDisplay.mode = hidden 时不渲染工具卡片 */
const visibleToolCalls = computed(() => {
  if (props.toolDisplay?.mode === 'hidden') return []
  return props.message.toolCalls ?? []
})

const copied = ref(false)
async function copyContent() {
  if (await copyText(props.message.content)) {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  }
}
</script>

<style scoped>
.ac-msg {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 100%;
}
.ac-msg--user { align-items: flex-end; }
.ac-msg--assistant { align-items: flex-start; }
.ac-msg__row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 100%;
}
.ac-msg__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--ac-primary);
  color: var(--ac-primary-fg);
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
}
.ac-msg__avatar--user {
  background: var(--ac-surface);
  color: var(--ac-muted);
  border: 1px solid var(--ac-border);
}
.ac-msg__avatar img { width: 100%; height: 100%; object-fit: cover; }
.ac-msg__bubble {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 94%;
  min-width: 0;
  padding: 10px 14px;
  border-radius: var(--ac-radius);
  line-height: 1.6;
  word-break: break-word;
}
.ac-msg--user .ac-msg__bubble {
  background: var(--ac-primary);
  color: var(--ac-primary-fg);
  border-bottom-right-radius: 4px;
  white-space: pre-wrap;
}
.ac-msg--assistant .ac-msg__bubble {
  background: var(--ac-surface);
  color: var(--ac-fg);
  border: 1px solid var(--ac-border);
  border-bottom-left-radius: 4px;
}
.ac-msg__ctx {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ac-msg__ctx-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.18);
  border: 1px solid rgb(255 255 255 / 0.3);
  font-size: 0.74em;
}
.ac-msg__ctx-type { opacity: 0.75; font-size: 0.92em; }
.ac-msg__typing {
  display: inline-flex;
  gap: 4px;
  padding: 4px 0;
}
.ac-msg__typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ac-muted);
  animation: ac-typing 1.2s ease-in-out infinite;
}
.ac-msg__typing i:nth-child(2) { animation-delay: 0.15s; }
.ac-msg__typing i:nth-child(3) { animation-delay: 0.3s; }
@keyframes ac-typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}
.ac-msg__error {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ac-danger);
  font-size: 0.9em;
}
.ac-msg__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
  min-height: 4px;
}
.ac-msg__meta--with-avatar { padding-left: 38px; }
.ac-msg--user .ac-msg__meta--with-avatar { padding-left: 4px; padding-right: 38px; }
.ac-msg__time {
  font-size: 0.76em;
  color: var(--ac-muted);
}
.ac-msg__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.ac-msg:hover .ac-msg__actions,
.ac-msg__actions:focus-within { opacity: 1; }
.ac-msg__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--ac-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.ac-msg__action:hover { background: var(--ac-surface); color: var(--ac-fg); }
.ac-msg__action.is-active { color: var(--ac-primary); }
.ac-msg__action.is-active.is-down { color: var(--ac-danger); }
</style>
