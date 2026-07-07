<script setup lang="ts">
import { ref } from 'vue'
import { PlanPanel } from '../../../lib/agent-copilot'
import type { PlanSpec, PlanStep } from '../../../lib/agent-copilot'
import DocDemo from '../DocDemo.vue'

const plan = ref<PlanSpec>({
  id: 'demo_plan',
  title: '为登录表单添加校验与错误处理',
  status: 'draft',
  steps: [
    { id: 's1', title: '读取现有 LoginForm 组件', status: 'pending' },
    { id: 's2', title: '新建 validators.ts 校验模块', status: 'pending' },
    { id: 's3', title: '接入校验与错误提示', status: 'pending' },
    { id: 's4', title: '运行单元测试验证', status: 'pending' },
  ],
})

const lastDecision = ref('')

function onApprove(steps: PlanStep[]) {
  plan.value = { ...plan.value, status: 'approved', steps }
  lastDecision.value = '已批准'
}

function onReject() {
  plan.value = { ...plan.value, status: 'rejected' }
  lastDecision.value = '已拒绝'
}

function reset() {
  plan.value = { ...plan.value, status: 'draft' }
  lastDecision.value = ''
}
</script>

<template>
  <DocDemo
    title="PlanPanel 计划面板"
    description="draft 态支持编辑步骤并批准/拒绝（plan-approval 流程），批准后进入执行态。"
    component-name="PlanPanel"
    usage="plan 模式下的人机协作核心：Agent 产出计划（PLAN_UPDATE 事件），用户在 draft 态可增删改步骤，批准（@approve）后 Agent 按步骤执行，执行中步骤状态实时更新。可通过 editable=false 关闭编辑仅保留审批。"
    :props-table="[
      { name: 'plan', type: 'PlanSpec', description: '计划：{ id, title, status: draft|approved|executing|done|rejected, steps }' },
      { name: 'editable', type: 'boolean', default: 'true', description: 'draft 态是否允许编辑/增删步骤' },
      { name: 'labels', type: 'Partial<PlanPanelLabels>', description: '批准/拒绝按钮等文案覆盖' },
      { name: '@approve', type: '(steps: PlanStep[]) => void', description: '批准（携带可能编辑过的步骤）' },
      { name: '@reject', type: '() => void', description: '拒绝计划' },
      { name: '@update:plan', type: '(plan: PlanSpec) => void', description: '编辑步骤时同步' },
    ]"
    :controls="[
      { name: 'editable', label: '允许编辑', type: 'boolean', default: true },
    ]"
  >
    <template #default="{ values }">
      <div class="ac-root" style="max-width: 480px; display: flex; flex-direction: column; gap: 8px;">
        <PlanPanel
          :plan="plan"
          :editable="!!values.editable"
          @approve="onApprove"
          @reject="onReject"
          @update:plan="(p: PlanSpec) => (plan = p)"
        />
        <button
          v-if="lastDecision"
          type="button"
          style="align-self: flex-start; padding: 4px 12px; border: 1px solid var(--ac-border, #e2e8f0); border-radius: 7px; background: var(--ac-surface, #fff); font-size: 12px; cursor: pointer;"
          @click="reset"
        >
          {{ lastDecision }} — 重置演示
        </button>
      </div>
    </template>
  </DocDemo>
</template>
