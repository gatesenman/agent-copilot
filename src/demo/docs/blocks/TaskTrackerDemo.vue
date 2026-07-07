<script setup lang="ts">
import { TaskTracker } from '../../../lib/agent-copilot'
import type { AgentTask } from '../../../lib/agent-copilot'
import DocDemo from '../DocDemo.vue'

const TASKS: AgentTask[] = [
  { id: 't1', title: '读取现有代码', status: 'done' },
  { id: 't2', title: '编写校验模块', status: 'done' },
  { id: 't3', title: '修改登录组件', status: 'active', detail: '正在接入错误提示' },
  { id: 't4', title: '运行测试', status: 'pending' },
]
</script>

<template>
  <DocDemo
    title="TaskTracker 任务追踪"
    description="TodoList 式任务进度，由 TASK_UPDATE 事件驱动（全量替换或单个 upsert）。"
    component-name="TaskTracker"
    usage="放在聊天流或右侧面板，展示 Agent 的任务清单与进度。协议侧由 TASK_UPDATE 事件驱动（tasks 全量替换或按 id upsert）；手动接入时直接传 tasks 数组，status 支持 pending/active/done/failed/skipped。"
    :props-table="[
      { name: 'tasks', type: 'AgentTask[]', description: '任务数组：{ id, title, status, detail? }' },
      { name: 'showProgress', type: 'boolean', default: 'true', description: '顶部显示完成进度条与计数' },
      { name: 'collapsible', type: 'boolean', default: 'true', description: '允许折叠列表' },
      { name: 'title', type: 'string', default: `'任务'`, description: '标题文案' },
    ]"
    :controls="[
      { name: 'showProgress', label: '显示进度', type: 'boolean', default: true },
      { name: 'collapsible', label: '可折叠', type: 'boolean', default: true },
    ]"
  >
    <template #default="{ values }">
      <div class="ac-root" style="max-width: 420px;">
        <TaskTracker
          :tasks="TASKS"
          :show-progress="!!values.showProgress"
          :collapsible="!!values.collapsible"
        />
      </div>
    </template>
  </DocDemo>
</template>
