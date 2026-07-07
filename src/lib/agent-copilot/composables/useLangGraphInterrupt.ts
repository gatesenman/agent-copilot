/**
 * useLangGraphInterrupt — HITL 中断处理
 * 对齐 CopilotKit 的 useLangGraphInterrupt：读取当前中断请求并作出响应。
 * 在 AgentScope 语境下对应「暂停-恢复」（/resume 端点）。
 */
import { computed } from 'vue'
import type { InterruptResponse } from '../types'
import { useCopilot } from './useCopilot'

export function useLangGraphInterrupt() {
  const store = useCopilot()

  return {
    /** 当前待处理的中断请求（null 表示无） */
    interrupt: store.interrupt,
    hasInterrupt: computed(() => store.interrupt.value !== null),
    /** 批准（approval 类型） */
    approve: (comment?: string) => store.respondToInterrupt({ approved: true, comment }),
    /** 拒绝（approval 类型） */
    reject: (comment?: string) => store.respondToInterrupt({ approved: false, comment }),
    /** 提交任意响应（input/choice 类型） */
    respond: (response: Omit<InterruptResponse, 'interruptId'>) => store.respondToInterrupt(response),
  }
}
