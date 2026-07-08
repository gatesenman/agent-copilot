<script setup lang="ts">
/**
 * TaskTracker —— Agent 任务清单追踪（TodoList 式）。
 * 六态图标 / 子任务层级 / activeForm 进行时文案 / 耗时统计 / 错误重试跳过 /
 * 产物跳转 / 已完成自动折叠 / 当前任务自动定位 / 流式占位 / 紧凑密度。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from '../../i18n'
import type { AgentTask, AgentTaskArtifact } from '../../types'
import TaskTrackerItem from './TaskTrackerItem.vue'

const props = withDefaults(
  defineProps<{
    tasks: AgentTask[]
    /** 标题 */
    title?: string
    /** 可折叠，默认 true */
    collapsible?: boolean
    /** 初始折叠 */
    defaultCollapsed?: boolean
    /** 显示进度统计，默认 true */
    showProgress?: boolean
    /** 密度：comfortable 显示详情/产物，compact 紧凑单行 */
    density?: 'comfortable' | 'compact'
    /** 已完成任务超过该数量时自动收起为一行摘要；0 表示不收起 */
    collapseDoneAfter?: number
    /** Agent 仍在规划中：列表尾部显示"计划中…"占位骨架 */
    streaming?: boolean
    /** active 任务变化时自动滚动到可见位置，默认 true */
    autoScroll?: boolean
    labels?: { empty?: string; retry?: string; skip?: string; doneCollapsed?: string; planning?: string }
  }>(),
  { title: undefined, collapsible: true, showProgress: true, density: 'comfortable', collapseDoneAfter: 0, autoScroll: true },
)

const { t } = useI18n()
const titleText = computed(() => props.title ?? t('task.title'))

const emit = defineEmits<{
  (e: 'taskClick', task: AgentTask): void
  (e: 'retry', task: AgentTask): void
  (e: 'skip', task: AgentTask): void
  (e: 'artifactClick', artifact: AgentTaskArtifact, task: AgentTask): void
}>()

const collapsed = ref(props.defaultCollapsed ?? false)
const doneExpanded = ref(false)
const listEl = ref<HTMLElement | null>(null)

/** 统计含子任务在内的完成度 */
function flatten(tasks: AgentTask[]): AgentTask[] {
  return tasks.flatMap((t) => [t, ...(t.subtasks ? flatten(t.subtasks) : [])])
}
const allTasks = computed(() => flatten(props.tasks))
const doneCount = computed(() => allTasks.value.filter((t) => t.status === 'done' || t.status === 'skipped').length)
const totalCount = computed(() => allTasks.value.length)
const activeTask = computed(() => allTasks.value.find((t) => t.status === 'active'))

/** 已完成折叠：顶层连续已完成(done/skipped)前缀超过阈值时收起 */
const collapsedDonePrefix = computed(() => {
  if (!props.collapseDoneAfter || doneExpanded.value) return 0
  let n = 0
  for (const t of props.tasks) {
    if (t.status === 'done' || t.status === 'skipped') n++
    else break
  }
  return n > props.collapseDoneAfter ? n : 0
})
const visibleTasks = computed(() => props.tasks.slice(collapsedDonePrefix.value))

const emptyText = computed(() => props.labels?.empty ?? t('task.empty'))
const planningText = computed(() => props.labels?.planning ?? t('task.planning'))

/** aria-live 播报：当前任务变化时向读屏器通报 */
const liveText = computed(() => {
  if (!activeTask.value) return ''
  return `${activeTask.value.activeForm ?? activeTask.value.title} (${doneCount.value}/${totalCount.value})`
})

/** active 任务变化时自动滚动定位 */
watch(
  () => activeTask.value?.id,
  async (id) => {
    if (!id || !props.autoScroll || collapsed.value) return
    await nextTick()
    const el = listEl.value?.querySelector('[data-task-status="active"]')
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  },
)
</script>

<template>
  <div class="ac-tasks">
    <button
      v-if="collapsible"
      type="button"
      class="ac-tasks__head"
      :aria-expanded="!collapsed"
      @click="collapsed = !collapsed"
    >
      <span class="ac-tasks__title">{{ titleText }}</span>
      <span v-if="showProgress && totalCount" class="ac-tasks__progress">{{ doneCount }}/{{ totalCount }}</span>
      <span
        v-if="showProgress && totalCount"
        class="ac-tasks__bar"
        role="progressbar"
        :aria-valuenow="doneCount"
        :aria-valuemin="0"
        :aria-valuemax="totalCount"
        :aria-label="t('task.progressAria', { done: doneCount, total: totalCount })"
      >
        <span class="ac-tasks__bar-fill" :style="{ width: `${(doneCount / totalCount) * 100}%` }" />
      </span>
      <svg class="ac-tasks__chevron" :class="{ 'ac-tasks__chevron--closed': collapsed }" viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div v-else class="ac-tasks__head ac-tasks__head--static">
      <span class="ac-tasks__title">{{ titleText }}</span>
      <span v-if="showProgress && totalCount" class="ac-tasks__progress">{{ doneCount }}/{{ totalCount }}</span>
    </div>

    <span class="ac-sr-only" aria-live="polite">{{ liveText }}</span>

    <div v-if="!collapsed" ref="listEl" class="ac-tasks__body">
      <button
        v-if="collapsedDonePrefix > 0"
        type="button"
        class="ac-tasks__done-fold"
        @click="doneExpanded = true"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 8.5 3.5 3.5L13 5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        {{ labels?.doneCollapsed ?? t('task.doneCollapsed', { n: collapsedDonePrefix }) }}
        <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>

      <TransitionGroup tag="ul" name="ac-task" class="ac-tasks__list" role="list">
        <li v-if="totalCount === 0 && !streaming" key="__empty" class="ac-tasks__empty">{{ emptyText }}</li>
        <TaskTrackerItem
          v-for="task in visibleTasks"
          :key="task.id"
          :task="task"
          :compact="density === 'compact'"
          :labels="labels"
          @task-click="(t) => emit('taskClick', t)"
          @retry="(t) => emit('retry', t)"
          @skip="(t) => emit('skip', t)"
          @artifact-click="(a, t) => emit('artifactClick', a, t)"
        />
        <li v-if="streaming" key="__planning" class="ac-tasks__planning" aria-hidden="true">
          <span class="ac-tasks__planning-dot" />
          <span class="ac-tasks__planning-dot" />
          <span class="ac-tasks__planning-dot" />
          <span class="ac-tasks__planning-text">{{ planningText }}</span>
        </li>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.ac-tasks {
  border: 1px solid var(--ac-border);
  border-radius: calc(var(--ac-radius) * 0.8);
  background: var(--ac-bg);
  overflow: hidden;
}
.ac-tasks__head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: var(--ac-surface);
  cursor: pointer;
  text-align: left;
  color: var(--ac-fg);
}
.ac-tasks__head--static { cursor: default; }
.ac-tasks__title { font-size: 0.8rem; font-weight: 700; }
.ac-tasks__progress { font-size: 0.72rem; color: var(--ac-muted); font-variant-numeric: tabular-nums; }
.ac-tasks__bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--ac-border);
  overflow: hidden;
  max-width: 90px;
}
.ac-tasks__bar-fill { display: block; height: 100%; background: var(--ac-success); transition: width 0.3s; }
.ac-tasks__chevron { margin-left: auto; color: var(--ac-muted); transition: transform 0.15s; }
.ac-tasks__chevron--closed { transform: rotate(-90deg); }
.ac-tasks__body { max-height: 320px; overflow-y: auto; }
.ac-tasks__list { list-style: none; margin: 0; padding: 4px 0; }
.ac-tasks__empty { padding: 12px; font-size: 0.78rem; color: var(--ac-muted); text-align: center; }
.ac-tasks__done-fold {
  display: flex;
  align-items: center;
  gap: 6px;
  width: calc(100% - 16px);
  margin: 4px 8px 0;
  padding: 5px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ac-success);
  font-size: 0.76rem;
  cursor: pointer;
  text-align: left;
}
.ac-tasks__done-fold:hover { background: var(--ac-surface); }
.ac-tasks__done-fold svg:last-child { color: var(--ac-muted); }
.ac-tasks__planning {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
}
.ac-tasks__planning-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ac-muted);
  animation: ac-task-pulse 1.2s ease-in-out infinite;
}
.ac-tasks__planning-dot:nth-child(2) { animation-delay: 0.2s; }
.ac-tasks__planning-dot:nth-child(3) { animation-delay: 0.4s; }
.ac-tasks__planning-text { margin-left: 4px; font-size: 0.72rem; color: var(--ac-muted); }
@keyframes ac-task-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
/* 状态/插入过渡动画 */
.ac-task-enter-active, .ac-task-leave-active { transition: opacity 0.25s, transform 0.25s; }
.ac-task-enter-from { opacity: 0; transform: translateY(4px); }
.ac-task-leave-to { opacity: 0; }
.ac-task-move { transition: transform 0.25s; }
@media (prefers-reduced-motion: reduce) {
  .ac-task-enter-active, .ac-task-leave-active, .ac-task-move { transition: none; }
  .ac-tasks__planning-dot { animation: none; opacity: 0.6; }
}
.ac-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
