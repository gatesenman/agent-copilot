/**
 * useCoAgentStateRender — 读取 Agent 运行中间状态用于自定义渲染
 * 对齐 CopilotKit 的 useCoAgentStateRender。
 */
import { computed } from 'vue'
import type { PipelineStageState, ReActStep } from '../types'
import { useCopilot } from './useCopilot'

export function useCoAgentStateRender() {
  const store = useCopilot()

  return {
    /** 流水线各阶段状态（US-008 ~ US-013） */
    stages: computed<PipelineStageState[]>(() => store.agentState.stages),
    /** 就绪门决策（US-010） */
    gate: computed(() => store.agentState.gate),
    /** ReAct 思考/行动/观察轨迹（US-011） */
    reactSteps: computed<ReActStep[]>(() => store.agentState.reactSteps),
    /** 治理事件（US-012） */
    governance: computed(() => store.agentState.governance),
    /** 是否运行中 */
    isRunning: computed(() => store.status.value === 'running'),
    /** 当前运行 token 用量 */
    usage: computed(() => store.agentState.usage),
  }
}
