<script setup lang="ts">
/**
 * OmniAgenticPanel — 全能助手「步骤」页签。
 * Agentic Coding 全域组件：AgentStepList / WorkSummary / ThinkingBlock /
 * ToolActionCard / CheckpointCard / ClarifyCard / AgentFormCard / TaskTrackerItem。
 */
import { ref } from 'vue'
import AgentStepList, { type AgentStep } from '../../lib/agent-copilot/components/agentic/AgentStepList.vue'
import WorkSummary from '../../lib/agent-copilot/components/agentic/WorkSummary.vue'
import ThinkingBlock from '../../lib/agent-copilot/components/agentic/ThinkingBlock.vue'
import ToolActionCard from '../../lib/agent-copilot/components/agentic/ToolActionCard.vue'
import CheckpointCard from '../../lib/agent-copilot/components/agentic/CheckpointCard.vue'
import ClarifyCard from '../../lib/agent-copilot/components/agentic/ClarifyCard.vue'
import AgentFormCard from '../../lib/agent-copilot/components/agentic/AgentFormCard.vue'
import TaskTrackerItem from '../../lib/agent-copilot/components/agentic/TaskTrackerItem.vue'
import type { AgentTask, FileChange, FormPayload, ToolCallState } from '../../lib/agent-copilot/types'

const STEPS: AgentStep[] = [
  { id: 'st1', kind: 'thinking', title: '分析需求与现有实现', note: '思考 2s', status: 'done', detail: '对比了三种防抖实现方案的取舍。' },
  { id: 'st2', kind: 'search', title: '检索知识库「防抖最佳实践」', note: '3 条命中', status: 'done' },
  { id: 'st3', kind: 'file', title: '写入 src/utils/debounce.ts', note: '1 文件', status: 'done' },
  { id: 'st4', kind: 'terminal', title: '运行单元测试', note: 'vitest', status: 'running' },
]

const TOOL_CALL: ToolCallState = {
  id: 'tc1', name: 'run_tests', label: '运行测试',
  args: { pattern: 'debounce.test.ts' },
  status: 'success',
  result: { passed: 2, failed: 0, duration: '20ms' },
}

const CHECKPOINT_FILES: FileChange[] = [
  { id: 'cp1', path: 'src/utils/debounce.ts', kind: 'create', status: 'accepted', additions: 12, deletions: 0 },
  { id: 'cp2', path: 'src/pages/dashboard.vue', kind: 'modify', status: 'accepted', additions: 8, deletions: 3 },
]

const clarifySubmitted = ref(false)
const clarifyAnswers = ref<Record<string, string[]>>()

const AGENT_FORM: FormPayload = {
  fields: [
    { key: 'env', label: '部署环境', type: 'select', required: true, options: [{ label: '预发', value: 'staging' }, { label: '生产', value: 'prod' }] },
    { key: 'note', label: '发布说明', type: 'textarea', placeholder: '本次变更要点…' },
  ],
  submitLabel: '确认发布',
}
const formSubmitted = ref(false)
const formValues = ref<Record<string, unknown>>()

const TRACKER_TASK: AgentTask = {
  id: 'tt1', title: '重构工具函数并补测试', status: 'active', detail: '子任务 2/3 已完成',
  children: [
    { id: 'tt1a', title: '实现 debounce', status: 'done' },
    { id: 'tt1b', title: '补单元测试', status: 'done' },
    { id: 'tt1c', title: '接入 dashboard', status: 'active' },
  ],
}
</script>

<template>
  <div class="oagentic">
    <p class="oagentic__intro">Agentic 全域：执行步骤、工具调用、检查点回滚、澄清问答、Agent 表单与任务追踪。</p>

    <section class="oagentic__sec" data-comp="WorkSummary（耗时统计）+ AgentStepList（执行步骤流）">
      <WorkSummary :duration-ms="128_000" />
      <AgentStepList :steps="STEPS" />
    </section>

    <section class="oagentic__sec" data-comp="ThinkingBlock（思考过程折叠）">
      <ThinkingBlock
        content="用户要的是通用防抖：闭包实现最简洁；需要 cancel 时再升级为类封装。先交付最小实现并补测试。"
        :duration="2"
        default-expanded
      />
    </section>

    <section class="oagentic__sec" data-comp="ToolActionCard（工具调用卡）">
      <ToolActionCard :tool-call="TOOL_CALL" kind="terminal" default-expanded />
    </section>

    <section class="oagentic__sec" data-comp="CheckpointCard（检查点 / 一键回滚）">
      <CheckpointCard title="发布前检查点" version="v3" :files="CHECKPOINT_FILES" revertable />
    </section>

    <section class="oagentic__sec" data-comp="ClarifyCard（多选澄清问答）">
      <ClarifyCard
        :questions="[{
          id: 'q1', question: '防抖需要支持哪些能力？', multiSelect: true,
          options: [
            { label: '立即执行模式', description: 'leading edge' },
            { label: '手动取消', description: 'cancel()' },
            { label: '强制触发', description: 'flush()' },
          ],
        }]"
        :submitted="clarifySubmitted"
        :submitted-answers="clarifyAnswers"
        @submit="(a: Record<string, string[]>) => { clarifyAnswers = a; clarifySubmitted = true }"
      />
    </section>

    <section class="oagentic__sec" data-comp="AgentFormCard（Agent 发起的表单）">
      <AgentFormCard
        :form="AGENT_FORM"
        :submitted="formSubmitted"
        :submitted-values="formValues"
        @submit="(v: Record<string, unknown>) => { formValues = v; formSubmitted = true }"
      />
    </section>

    <section class="oagentic__sec" data-comp="TaskTrackerItem（单任务节点 / 嵌套子任务）">
      <TaskTrackerItem :task="TRACKER_TASK" />
    </section>
  </div>
</template>

<style scoped>
.oagentic { display: flex; flex-direction: column; gap: 14px; padding: 10px; }
.oagentic__intro { margin: 0; font-size: 12px; color: var(--ac-muted, #64748b); }
.oagentic__sec {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 8px 8px;
  border: 1px dashed color-mix(in srgb, var(--ac-primary, #2563eb) 25%, transparent);
  border-radius: 10px;
}
.oagentic__sec::before {
  content: attr(data-comp);
  position: absolute;
  top: -1px;
  left: 8px;
  font-size: 10px;
  font-weight: 650;
  color: var(--ac-primary, #2563eb);
  background: color-mix(in srgb, var(--ac-primary, #2563eb) 8%, var(--ac-bg, #fff));
  border: 1px solid color-mix(in srgb, var(--ac-primary, #2563eb) 30%, transparent);
  border-top: none;
  border-radius: 0 0 6px 6px;
  padding: 1px 8px;
  max-width: 92%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
