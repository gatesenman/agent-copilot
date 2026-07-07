<script setup lang="ts">
/**
 * TaskTracker —— Agent 任务清单追踪（TodoList 式）。
 * active 转圈 / done 打勾 / pending 灰点 / error 红叉；支持折叠与进度统计。
 */
import { computed, ref } from 'vue'
import type { AgentTask } from '../../types'

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
    labels?: { empty?: string }
  }>(),
  { title: '任务', collapsible: true, showProgress: true },
)

const emit = defineEmits<{
  (e: 'taskClick', task: AgentTask): void
}>()

const collapsed = ref(props.defaultCollapsed ?? false)
const doneCount = computed(() => props.tasks.filter((t) => t.status === 'done').length)
const emptyText = computed(() => props.labels?.empty ?? '暂无任务')
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
      <span class="ac-tasks__title">{{ title }}</span>
      <span v-if="showProgress && tasks.length" class="ac-tasks__progress">{{ doneCount }}/{{ tasks.length }}</span>
      <span v-if="showProgress && tasks.length" class="ac-tasks__bar" aria-hidden="true">
        <span class="ac-tasks__bar-fill" :style="{ width: `${(doneCount / tasks.length) * 100}%` }" />
      </span>
      <svg class="ac-tasks__chevron" :class="{ 'ac-tasks__chevron--closed': collapsed }" viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div v-else class="ac-tasks__head ac-tasks__head--static">
      <span class="ac-tasks__title">{{ title }}</span>
      <span v-if="showProgress && tasks.length" class="ac-tasks__progress">{{ doneCount }}/{{ tasks.length }}</span>
    </div>

    <ul v-if="!collapsed" class="ac-tasks__list" role="list">
      <li v-if="tasks.length === 0" class="ac-tasks__empty">{{ emptyText }}</li>
      <li
        v-for="task in tasks"
        :key="task.id"
        class="ac-tasks__item"
        :class="`ac-tasks__item--${task.status}`"
      >
        <button type="button" class="ac-tasks__item-btn" @click="emit('taskClick', task)">
          <span class="ac-tasks__status" aria-hidden="true">
            <svg v-if="task.status === 'done'" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 8.5 3.5 3.5L13 5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <svg v-else-if="task.status === 'active'" class="ac-tasks__spinner" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6" opacity="0.25" /><path d="M8 2a6 6 0 0 1 6 6" stroke-linecap="round" /></svg>
            <svg v-else-if="task.status === 'error'" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" /></svg>
            <span v-else class="ac-tasks__dot" />
          </span>
          <span class="ac-tasks__item-title">{{ task.title }}</span>
        </button>
        <p v-if="task.detail" class="ac-tasks__detail">{{ task.detail }}</p>
      </li>
    </ul>
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
.ac-tasks__progress { font-size: 0.72rem; color: var(--ac-muted); }
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
.ac-tasks__list { list-style: none; margin: 0; padding: 4px 0; }
.ac-tasks__empty { padding: 12px; font-size: 0.78rem; color: var(--ac-muted); text-align: center; }
.ac-tasks__item { padding: 0 8px; }
.ac-tasks__item-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: var(--ac-fg);
  border-radius: 6px;
  font-size: 0.8rem;
}
.ac-tasks__item-btn:hover { background: var(--ac-surface); }
.ac-tasks__status { display: flex; align-items: center; width: 15px; flex-shrink: 0; }
.ac-tasks__item--done .ac-tasks__status { color: var(--ac-success); }
.ac-tasks__item--active .ac-tasks__status { color: var(--ac-primary); }
.ac-tasks__item--error .ac-tasks__status { color: var(--ac-danger); }
.ac-tasks__item--done .ac-tasks__item-title { color: var(--ac-muted); text-decoration: line-through; }
.ac-tasks__item--active .ac-tasks__item-title { font-weight: 600; }
.ac-tasks__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ac-border); margin-left: 3px; }
.ac-tasks__spinner { animation: ac-task-spin 0.9s linear infinite; }
@keyframes ac-task-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .ac-tasks__spinner { animation-duration: 2.5s; }
}
.ac-tasks__detail { margin: 0 0 4px 29px; font-size: 0.72rem; color: var(--ac-muted); line-height: 1.5; }
</style>
