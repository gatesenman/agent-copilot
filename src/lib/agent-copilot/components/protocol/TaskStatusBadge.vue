<script setup lang="ts">
/**
 * TaskStatusBadge — A2A / ACP 任务状态机可视化
 *
 * 渲染任务生命周期进度条：submitted → working → completed，
 * 分叉状态（input-required / failed / canceled）以徽章色区分。
 */
import { computed } from 'vue'

const props = defineProps<{
  /** A2A: submitted/working/input-required/completed/failed/canceled；ACP: created/in-progress/awaiting/completed/failed/cancelled */
  state: string
  /** 任务 id（可选展示） */
  taskId?: string
  /** 协议名徽章 */
  protocol?: string
}>()

/** 状态归一化：ACP 状态映射到 A2A 语义 */
const normalized = computed(() => {
  const map: Record<string, string> = {
    created: 'submitted', 'in-progress': 'working', awaiting: 'input-required', cancelled: 'canceled',
  }
  return map[props.state] ?? props.state
})

const STATES = [
  { id: 'submitted', label: '已提交' },
  { id: 'working', label: '处理中' },
  { id: 'completed', label: '已完成' },
]

const LABELS: Record<string, string> = {
  submitted: '已提交', working: '处理中', 'input-required': '等待输入',
  completed: '已完成', failed: '已失败', canceled: '已取消',
  rejected: '已拒绝', 'auth-required': '需要认证',
}

const tone = computed(() => {
  const s = normalized.value
  if (s === 'completed') return 'success'
  if (s === 'failed' || s === 'rejected') return 'danger'
  if (s === 'input-required' || s === 'auth-required' || s === 'canceled') return 'warning'
  return 'info'
})

/** 主线进度索引（分叉状态停在 working 位置） */
const progressIdx = computed(() => {
  const s = normalized.value
  if (s === 'submitted') return 0
  if (s === 'completed') return 2
  return 1
})
</script>

<template>
  <div class="ac-task-status" role="status" :aria-label="`任务状态：${LABELS[normalized] ?? state}`">
    <div class="ac-task-status__head">
      <span v-if="protocol" class="ac-badge">{{ protocol }}</span>
      <span class="ac-task-status__label" :class="`ac-task-status__label--${tone}`">
        {{ LABELS[normalized] ?? state }}
      </span>
      <code v-if="taskId" class="ac-task-status__id">{{ taskId }}</code>
    </div>
    <div class="ac-task-status__track" aria-hidden="true">
      <template v-for="(s, i) in STATES" :key="s.id">
        <div
          class="ac-task-status__step"
          :class="{
            'ac-task-status__step--done': i < progressIdx || normalized === 'completed',
            'ac-task-status__step--active': i === progressIdx && normalized !== 'completed',
            [`ac-task-status__step--${tone}`]: i === progressIdx,
          }"
        >
          <span class="ac-task-status__dot" />
          <span class="ac-task-status__step-label">{{ s.label }}</span>
        </div>
        <div v-if="i < STATES.length - 1" class="ac-task-status__line" :class="{ 'ac-task-status__line--done': i < progressIdx }" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.ac-task-status {
  display: flex; flex-direction: column; gap: 8px;
  padding: 10px 12px; border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius); background: var(--ac-surface);
}
.ac-task-status__head { display: flex; align-items: center; gap: 8px; }
.ac-task-status__label { font-size: 0.8rem; font-weight: 700; }
.ac-task-status__label--success { color: var(--ac-success); }
.ac-task-status__label--danger { color: var(--ac-danger); }
.ac-task-status__label--warning { color: var(--ac-warning); }
.ac-task-status__label--info { color: var(--ac-primary); }
.ac-task-status__id { font-size: 0.7rem; color: var(--ac-muted); margin-left: auto; }
.ac-task-status__track { display: flex; align-items: center; gap: 4px; }
.ac-task-status__step { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.ac-task-status__dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--ac-bg); border: 2px solid var(--ac-border);
}
.ac-task-status__step--done .ac-task-status__dot { background: var(--ac-success); border-color: var(--ac-success); }
.ac-task-status__step--active .ac-task-status__dot { border-color: var(--ac-primary); background: var(--ac-primary); animation: ac-pulse-dot 1.2s ease-in-out infinite; }
.ac-task-status__step--active.ac-task-status__step--warning .ac-task-status__dot { border-color: var(--ac-warning); background: var(--ac-warning); }
.ac-task-status__step--active.ac-task-status__step--danger .ac-task-status__dot { border-color: var(--ac-danger); background: var(--ac-danger); animation: none; }
.ac-task-status__step-label { font-size: 0.68rem; color: var(--ac-muted); }
.ac-task-status__line { flex: 1; height: 2px; background: var(--ac-border); margin-bottom: 14px; }
.ac-task-status__line--done { background: var(--ac-success); }
@keyframes ac-pulse-dot {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ac-primary) 40%, transparent); }
  50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--ac-primary) 15%, transparent); }
}
</style>
