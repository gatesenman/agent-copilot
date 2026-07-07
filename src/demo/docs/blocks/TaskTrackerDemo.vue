<script setup lang="ts">
import { ref } from 'vue'
import { TaskTracker } from '../../../lib/agent-copilot'
import type { AgentTask } from '../../../lib/agent-copilot'
import DocDemo from '../DocDemo.vue'

/** 覆盖六态 / 子任务 / activeForm / 耗时 / 错误重试 / 产物的完整示例 */
function buildTasks(): AgentTask[] {
  return [
    { id: 't1', title: '读取现有代码', status: 'done', durationMs: 850 },
    { id: 't2', title: '安装依赖', status: 'skipped', detail: '依赖已存在，自动跳过' },
    {
      id: 't3', title: '编写校验模块', status: 'done', durationMs: 12400,
      artifacts: [
        { type: 'file', label: 'lib/validate.ts', uri: 'lib/validate.ts' },
        { type: 'link', label: '预览', uri: 'https://example.com' },
      ],
    },
    {
      id: 't4', title: '修改登录组件', status: 'active', activeForm: '正在修改登录组件…',
      subtasks: [
        { id: 't4-1', title: '接入错误提示', status: 'done', durationMs: 3100 },
        { id: 't4-2', title: '表单校验联调', status: 'active', activeForm: '正在联调表单校验…' },
        { id: 't4-3', title: '无障碍属性补齐', status: 'pending' },
      ],
    },
    {
      id: 't5', title: '运行测试', status: 'error', durationMs: 5300,
      errorReason: '2 个用例失败：登录超时分支未覆盖', retryable: true, skippable: true,
    },
    { id: 't6', title: '部署预览环境', status: 'pending', skippable: true },
  ]
}

const tasks = ref(buildTasks())
const lastAction = ref('')

function onRetry(t: AgentTask) {
  lastAction.value = `重试：${t.title}`
  patch(tasks.value, t.id, { status: 'active', errorReason: undefined })
}
function onSkip(t: AgentTask) {
  lastAction.value = `跳过：${t.title}`
  patch(tasks.value, t.id, { status: 'skipped' })
}
function patch(list: AgentTask[], id: string, p: Partial<AgentTask>) {
  for (const t of list) {
    if (t.id === id) Object.assign(t, p)
    else if (t.subtasks) patch(t.subtasks, id, p)
  }
}
function reset() {
  tasks.value = buildTasks()
  lastAction.value = ''
}
</script>

<template>
  <DocDemo
    title="TaskTracker 任务追踪"
    description="TodoList 式任务进度：六态图标、子任务层级、activeForm 进行时文案、耗时、错误重试/跳过、产物跳转、规划中占位。由 TASK_UPDATE 事件驱动。"
    component-name="TaskTracker"
    usage="放在聊天流或右侧面板，展示 Agent 的任务清单与进度。协议侧由 TASK_UPDATE 事件驱动（tasks 全量替换或按 id upsert）；手动接入时直接传 tasks 数组。status 支持 pending/active/done/error/skipped/cancelled；active 任务优先显示 activeForm 进行时文案；error 任务可配 retryable/skippable 出现行内操作；done 任务可挂 artifacts 产物跳转。"
    :props-table="[
      { name: 'tasks', type: 'AgentTask[]', description: '任务数组：支持 subtasks 层级 / activeForm / durationMs / errorReason / artifacts' },
      { name: 'showProgress', type: 'boolean', default: 'true', description: '顶部进度条（含子任务计数，role=progressbar）' },
      { name: 'collapsible', type: 'boolean', default: 'true', description: '允许折叠列表' },
      { name: 'density', type: `'comfortable' | 'compact'`, default: `'comfortable'`, description: '密度；compact 紧凑单行，适合消息流内嵌' },
      { name: 'collapseDoneAfter', type: 'number', default: '0', description: '连续已完成超过 N 项时收起为一行摘要' },
      { name: 'streaming', type: 'boolean', default: 'false', description: '规划中：尾部显示占位骨架' },
      { name: 'autoScroll', type: 'boolean', default: 'true', description: 'active 任务变化时自动滚动定位' },
      { name: '@retry / @skip', type: '(task) => void', description: '错误重试 / 跳过操作事件' },
      { name: '@artifactClick', type: '(artifact, task) => void', description: '点击任务产物' },
    ]"
    :controls="[
      { name: 'showProgress', label: '显示进度', type: 'boolean', default: true },
      { name: 'density', label: '密度', type: 'select', default: 'comfortable', options: [
        { label: 'comfortable 详细', value: 'comfortable' },
        { label: 'compact 紧凑', value: 'compact' },
      ] },
      { name: 'collapseDone', label: '收起已完成', type: 'boolean', default: false },
      { name: 'streaming', label: '规划中占位', type: 'boolean', default: false },
    ]"
  >
    <template #default="{ values }">
      <div class="ac-root" style="max-width: 460px;">
        <TaskTracker
          :tasks="tasks"
          :show-progress="!!values.showProgress"
          :density="values.density as 'comfortable' | 'compact'"
          :collapse-done-after="values.collapseDone ? 1 : 0"
          :streaming="!!values.streaming"
          @retry="onRetry"
          @skip="onSkip"
          @artifact-click="(a) => (lastAction = `打开产物：${a.label}`)"
        />
        <p v-if="lastAction" class="demo-action">
          {{ lastAction }}
          <button type="button" class="demo-reset" @click="reset">重置</button>
        </p>
      </div>
    </template>
  </DocDemo>
</template>

<style scoped>
.demo-action {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 0;
  font-size: 0.74rem;
  color: var(--ac-muted, #888);
}
.demo-reset {
  padding: 2px 8px;
  border: 1px solid var(--ac-border, #ddd);
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font-size: 0.7rem;
  cursor: pointer;
}
</style>
