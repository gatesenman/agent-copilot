<script setup lang="ts">
/**
 * TaskTrackerItem —— TaskTracker 的递归任务项。
 * 支持子任务层级、activeForm 进行时文案、耗时、错误原因、重试/跳过操作、产物链接。
 */
import { useI18n } from '../../i18n'
import type { AgentTask, AgentTaskArtifact } from '../../types'

const props = withDefaults(
  defineProps<{
    task: AgentTask
    /** 嵌套深度（根为 0） */
    depth?: number
    /** 紧凑密度 */
    compact?: boolean
    labels?: { retry?: string; skip?: string }
  }>(),
  { depth: 0, compact: false },
)

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'taskClick', task: AgentTask): void
  (e: 'retry', task: AgentTask): void
  (e: 'skip', task: AgentTask): void
  (e: 'artifactClick', artifact: AgentTaskArtifact, task: AgentTask): void
}>()

/** active 态优先显示进行时文案 */
function displayTitle(t: AgentTask) {
  return t.status === 'active' && t.activeForm ? t.activeForm : t.title
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m${Math.round((ms % 60_000) / 1000)}s`
}
</script>

<template>
  <li
    class="ac-tasks__item"
    :class="[`ac-tasks__item--${task.status}`, { 'ac-tasks__item--compact': compact }]"
    :data-task-status="task.status"
  >
    <div class="ac-tasks__row" :style="depth > 0 ? { paddingLeft: `${depth * 18}px` } : undefined">
      <button type="button" class="ac-tasks__item-btn" @click="emit('taskClick', task)">
        <span class="ac-tasks__status" aria-hidden="true">
          <svg v-if="task.status === 'done'" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 8.5 3.5 3.5L13 5" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <svg v-else-if="task.status === 'active'" class="ac-tasks__spinner" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6" opacity="0.25" /><path d="M8 2a6 6 0 0 1 6 6" stroke-linecap="round" /></svg>
          <svg v-else-if="task.status === 'error'" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" /></svg>
          <svg v-else-if="task.status === 'skipped'" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8h10M10 4.5 13.5 8 10 11.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7" /></svg>
          <svg v-else-if="task.status === 'cancelled'" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="6" /><path d="M4.5 11.5 11.5 4.5" stroke-linecap="round" /></svg>
          <span v-else class="ac-tasks__dot" />
        </span>
        <span class="ac-tasks__item-title">{{ displayTitle(task) }}</span>
        <span v-if="task.durationMs != null && (task.status === 'done' || task.status === 'error')" class="ac-tasks__duration">{{ formatDuration(task.durationMs) }}</span>
      </button>
      <span class="ac-tasks__actions">
        <button
          v-if="task.status === 'error' && task.retryable"
          type="button"
          class="ac-tasks__action"
          @click.stop="emit('retry', task)"
        >{{ labels?.retry ?? t('task.retry') }}</button>
        <button
          v-if="task.skippable && (task.status === 'pending' || task.status === 'error')"
          type="button"
          class="ac-tasks__action ac-tasks__action--ghost"
          @click.stop="emit('skip', task)"
        >{{ labels?.skip ?? t('task.skip') }}</button>
      </span>
    </div>

    <template v-if="!compact">
      <p v-if="task.status === 'error' && task.errorReason" class="ac-tasks__error" :style="{ marginLeft: `${29 + depth * 18}px` }">{{ task.errorReason }}</p>
      <p v-else-if="task.detail" class="ac-tasks__detail" :style="{ marginLeft: `${29 + depth * 18}px` }">{{ task.detail }}</p>
      <span v-if="task.artifacts?.length" class="ac-tasks__artifacts" :style="{ marginLeft: `${29 + depth * 18}px` }">
        <button
          v-for="art in task.artifacts"
          :key="art.uri"
          type="button"
          class="ac-tasks__artifact"
          @click.stop="emit('artifactClick', art, task)"
        >
          <svg v-if="art.type === 'file'" viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 1.5h5L13 5.5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z M9 1.5v4h4" stroke-linejoin="round" /></svg>
          <svg v-else viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M6.5 9.5 9.5 6.5M7.5 4.5 9 3a2.8 2.8 0 0 1 4 4l-1.5 1.5M8.5 11.5 7 13a2.8 2.8 0 0 1-4-4l1.5-1.5" stroke-linecap="round" /></svg>
          {{ art.label }}
        </button>
      </span>
    </template>

    <!-- 子任务递归 -->
    <ul v-if="task.subtasks?.length" class="ac-tasks__sublist" role="list">
      <TaskTrackerItem
        v-for="sub in task.subtasks"
        :key="sub.id"
        :task="sub"
        :depth="depth + 1"
        :compact="compact"
        :labels="labels"
        @task-click="(t) => emit('taskClick', t)"
        @retry="(t) => emit('retry', t)"
        @skip="(t) => emit('skip', t)"
        @artifact-click="(a, t) => emit('artifactClick', a, t)"
      />
    </ul>
  </li>
</template>

<style scoped>
.ac-tasks__item { padding: 0 8px; }
.ac-tasks__row { display: flex; align-items: center; gap: 4px; }
.ac-tasks__item-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 5px 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: var(--ac-fg);
  border-radius: 6px;
  font-size: 0.8rem;
}
.ac-tasks__item--compact .ac-tasks__item-btn { padding: 3px 6px; font-size: 0.76rem; }
.ac-tasks__item-btn:hover { background: var(--ac-surface); }
.ac-tasks__status { display: flex; align-items: center; width: 15px; flex-shrink: 0; }
.ac-tasks__item--done > .ac-tasks__row .ac-tasks__status { color: var(--ac-success); }
.ac-tasks__item--active > .ac-tasks__row .ac-tasks__status { color: var(--ac-primary); }
.ac-tasks__item--error > .ac-tasks__row .ac-tasks__status { color: var(--ac-danger); }
.ac-tasks__item--skipped > .ac-tasks__row .ac-tasks__status,
.ac-tasks__item--cancelled > .ac-tasks__row .ac-tasks__status { color: var(--ac-muted); }
.ac-tasks__item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.25s;
}
.ac-tasks__item--done > .ac-tasks__row .ac-tasks__item-title { color: var(--ac-muted); text-decoration: line-through; }
.ac-tasks__item--skipped > .ac-tasks__row .ac-tasks__item-title,
.ac-tasks__item--cancelled > .ac-tasks__row .ac-tasks__item-title { color: var(--ac-muted); }
.ac-tasks__item--active > .ac-tasks__row .ac-tasks__item-title { font-weight: 600; }
.ac-tasks__duration { margin-left: auto; flex-shrink: 0; font-size: 0.68rem; color: var(--ac-muted); font-variant-numeric: tabular-nums; }
.ac-tasks__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ac-border); margin-left: 3px; }
.ac-tasks__spinner { animation: ac-task-spin 0.9s linear infinite; }
@keyframes ac-task-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .ac-tasks__spinner { animation-duration: 2.5s; }
}
.ac-tasks__actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.ac-tasks__action {
  padding: 2px 8px;
  border: 1px solid var(--ac-border);
  border-radius: 5px;
  background: var(--ac-bg);
  color: var(--ac-fg);
  font-size: 0.68rem;
  cursor: pointer;
}
.ac-tasks__action:hover { border-color: var(--ac-primary); color: var(--ac-primary); }
.ac-tasks__action--ghost { border-color: transparent; color: var(--ac-muted); }
.ac-tasks__action--ghost:hover { color: var(--ac-fg); border-color: var(--ac-border); }
.ac-tasks__detail { margin: 0 0 4px; font-size: 0.72rem; color: var(--ac-muted); line-height: 1.5; }
.ac-tasks__error { margin: 0 0 4px; font-size: 0.72rem; color: var(--ac-danger); line-height: 1.5; }
.ac-tasks__artifacts { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
.ac-tasks__artifact {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  background: var(--ac-surface);
  color: var(--ac-fg);
  font-size: 0.68rem;
  cursor: pointer;
}
.ac-tasks__artifact:hover { border-color: var(--ac-primary); color: var(--ac-primary); }
.ac-tasks__sublist { list-style: none; margin: 0; padding: 0; }
</style>
