<script setup lang="ts">
/**
 * AgentStepList — Agent 执行步骤时间流
 *
 * 将一次运行中的思考、工具调用、终端命令、文件浏览等动作按时间顺序
 * 排成可折叠的日志流（Claude/v0 式的执行过程展示）。
 * 每个步骤：种类图标 + 标题 + 可选状态 + 可折叠详情（文本或 detail 插槽）。
 */
import { ref } from 'vue'
import { useI18n } from '../../i18n'

export interface AgentStep {
  id: string
  /** 种类决定图标：thinking 思考 / tool 工具 / terminal 终端 / file 文件 / search 检索 / info 信息 */
  kind: 'thinking' | 'tool' | 'terminal' | 'file' | 'search' | 'info'
  /** 步骤标题，如「Checked view heights」 */
  title: string
  /** 可选注释（灰色小字，如「Thought for 2s」的耗时、「2 Files」） */
  note?: string
  /** 运行状态（running 显示旋转指示） */
  status?: 'running' | 'done' | 'error'
  /** 可折叠的详情文本（等宽渲染；复杂内容用 detail 插槽） */
  detail?: string
  /** 初始是否展开 */
  expanded?: boolean
}

const props = withDefaults(
  defineProps<{
    steps: AgentStep[]
    /** 紧凑密度 */
    compact?: boolean
  }>(),
  { compact: false },
)

const emit = defineEmits<{ (e: 'toggle', step: AgentStep, expanded: boolean): void }>()

const { t } = useI18n()

const openMap = ref<Record<string, boolean>>(
  Object.fromEntries(props.steps.filter((s) => s.expanded).map((s) => [s.id, true])),
)

function hasDetail(step: AgentStep) {
  return Boolean(step.detail)
}

function toggle(step: AgentStep) {
  if (!hasDetail(step)) return
  openMap.value[step.id] = !openMap.value[step.id]
  emit('toggle', step, !!openMap.value[step.id])
}

const KIND_ICON: Record<AgentStep['kind'], string> = {
  thinking: 'M12 3a7 7 0 0 0-4 12.7V18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 3Zm-2 17h4v1a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1Z',
  tool: 'M21.7 6.7a5.5 5.5 0 0 1-7.2 7.2L7 21.4a2 2 0 0 1-2.8-2.8l7.5-7.5a5.5 5.5 0 0 1 7.2-7.2l-3.4 3.4 2.8 2.8 3.4-3.4Z',
  terminal: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm2.7 4.3 3 2.7-3 2.7 1.3 1.5L12.3 11 8 7l-1.3 1.3ZM13 15h5v-2h-5v2Z',
  file: 'M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V8h4.5L13 3.5Z',
  search: 'M10 3a7 7 0 1 0 4.4 12.5l4.5 4.5 1.6-1.6-4.5-4.5A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 7h2v8h-2V9Zm0-4h2v2h-2V5Z',
}
</script>

<template>
  <div class="ac-steps" :class="{ 'ac-steps--compact': compact }" role="log" :aria-label="t('steps.aria')">
    <div v-for="step in steps" :key="step.id" class="ac-steps__item" :data-status="step.status">
      <component
        :is="hasDetail(step) ? 'button' : 'div'"
        :type="hasDetail(step) ? 'button' : undefined"
        class="ac-steps__head"
        :class="{ 'is-clickable': hasDetail(step) }"
        :aria-expanded="hasDetail(step) ? !!openMap[step.id] : undefined"
        @click="toggle(step)"
      >
        <svg
          v-if="hasDetail(step)"
          class="ac-steps__chevron"
          :class="{ 'is-open': openMap[step.id] }"
          viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span v-else class="ac-steps__chevron ac-steps__chevron--ph" />
        <svg class="ac-steps__icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path :d="KIND_ICON[step.kind]" fill="currentColor" />
        </svg>
        <span class="ac-steps__title">{{ step.title }}</span>
        <span v-if="step.note" class="ac-steps__note">{{ step.note }}</span>
        <span v-if="step.status === 'running'" class="ac-steps__spin" :aria-label="t('steps.running')" />
        <span v-else-if="step.status === 'error'" class="ac-steps__err" :aria-label="t('steps.error')">!</span>
      </component>
      <div v-if="hasDetail(step) && openMap[step.id]" class="ac-steps__detail">
        <slot name="detail" :step="step">
          <pre class="ac-steps__pre">{{ step.detail }}</pre>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ac-steps {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13.5px;
}
.ac-steps--compact { font-size: 12.5px; }
.ac-steps__head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--ac-fg, #1a1a1a);
  text-align: left;
  font: inherit;
}
.ac-steps__head.is-clickable { cursor: pointer; }
.ac-steps__head.is-clickable:hover { background: var(--ac-surface-2, rgba(0, 0, 0, 0.04)); }
.ac-steps__chevron {
  flex-shrink: 0;
  color: var(--ac-muted, #767676);
  transition: transform 0.15s ease;
  width: 12px;
}
.ac-steps__chevron.is-open { transform: rotate(90deg); }
.ac-steps__chevron--ph { display: inline-block; }
.ac-steps__icon { flex-shrink: 0; color: var(--ac-muted, #767676); }
.ac-steps__title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-steps__note { flex-shrink: 0; color: var(--ac-muted, #767676); font-size: 0.88em; }
.ac-steps__spin {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border: 2px solid var(--ac-border, #e2e2e2);
  border-top-color: var(--ac-primary, #0e7a5f);
  border-radius: 50%;
  animation: ac-steps-spin 0.8s linear infinite;
}
@keyframes ac-steps-spin { to { transform: rotate(360deg); } }
.ac-steps__err {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--ac-danger, #c93b3b);
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ac-steps__item[data-status='error'] .ac-steps__title { color: var(--ac-danger, #c93b3b); }
.ac-steps__detail {
  margin: 2px 0 6px 40px;
  border-left: 2px solid var(--ac-border, #e2e2e2);
  padding-left: 10px;
}
.ac-steps__pre {
  margin: 0;
  padding: 8px 10px;
  background: var(--ac-surface-2, rgba(0, 0, 0, 0.04));
  border-radius: 8px;
  font-family: var(--ac-font-mono, ui-monospace, monospace);
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 260px;
  overflow: auto;
}
</style>
