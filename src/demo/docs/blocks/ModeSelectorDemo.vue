<script setup lang="ts">
import { ref } from 'vue'
import { ModeSelector } from '../../../lib/agent-copilot'
import type { AgentMode } from '../../../lib/agent-copilot'
import DocDemo from '../DocDemo.vue'

const mode = ref<AgentMode>('confirm_edits')
</script>

<template>
  <DocDemo
    title="ModeSelector 模式选择"
    description="四种权限模式：变更前确认 / 自动编辑 / 计划模式 / 完全访问。切换时通过 update:mode 通知宿主。"
    component-name="ModeSelector"
    usage="用于 Agentic 工作台顶栏或输入区旁，让用户控制 Agent 的权限边界。v-model:mode 双向绑定当前模式；宿主根据模式决定变更是否需要人工确认（confirm_edits/plan 需确认，auto_edit/full_access 自动执行）。"
    :props-table="[
      { name: 'mode', type: `'confirm_edits' | 'auto_edit' | 'plan' | 'full_access'`, default: `'confirm_edits'`, description: '当前模式（v-model:mode 双向绑定）' },
      { name: 'size', type: `'sm' | 'md'`, default: `'md'`, description: '尺寸' },
      { name: 'disabled', type: 'boolean', default: 'false', description: '禁用交互（运行中锁定）' },
      { name: 'placement', type: `'auto' | 'up' | 'down'`, default: `'auto'`, description: '菜单弹出方向；auto 根据视口空间自动翻转' },
      { name: 'labels', type: 'Partial<Record<AgentMode, string>>', description: '自定义各模式显示文案' },
      { name: '@update:mode', type: '(mode: AgentMode) => void', description: '模式切换事件' },
    ]"
    :controls="[
      { name: 'size', label: '尺寸', type: 'select', default: 'md', options: [
        { label: 'md 标准', value: 'md' },
        { label: 'sm 紧凑', value: 'sm' },
      ] },
      { name: 'disabled', label: '禁用', type: 'boolean', default: false },
    ]"
  >
    <template #default="{ values }">
      <div class="ac-root" style="display: flex; flex-direction: column; gap: 10px; align-items: flex-start;">
        <ModeSelector
          :mode="mode"
          :size="values.size as 'sm' | 'md'"
          :disabled="!!values.disabled"
          placement="down"
          @update:mode="(m: AgentMode) => (mode = m)"
        />
        <p style="margin: 0; font-size: 12.5px; color: var(--ac-muted, #64748b);">
          当前模式：<code>{{ mode }}</code>
        </p>
      </div>
    </template>
  </DocDemo>
</template>
