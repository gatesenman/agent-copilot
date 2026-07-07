/**
 * useCopilotChat — Headless 聊天控制
 * 对齐 CopilotKit 的 useCopilotChat：不使用内置 UI 也能完整驱动对话。
 */
import { computed } from 'vue'
import { useCopilot } from './useCopilot'

export function useCopilotChat() {
  const store = useCopilot()

  return {
    /** 消息列表（响应式） */
    messages: store.messages,
    /** idle | running | awaiting_interrupt | error */
    status: store.status,
    isLoading: computed(() => store.status.value === 'running'),
    lastError: store.lastError,
    /** 当前 HITL 中断请求 */
    interrupt: store.interrupt,
    /** 累计 token 用量 */
    totalUsage: store.totalUsage,
    /** Agent 状态快照（流水线/ReAct/治理） */
    agentState: store.agentState,
    sessionId: store.sessionId,

    /** 发送用户消息 */
    append: store.sendMessage,
    /** 停止当前生成 */
    stop: store.stop,
    /** 重试最后一轮 */
    reload: store.retryLast,
    /** 编辑某条用户消息并重发（其后历史被截断） */
    editAndResend: store.editAndResend,
    /** 清空会话 */
    clear: store.clearChat,
    /** 响应 HITL 中断（审批/输入/选择） */
    respondToInterrupt: store.respondToInterrupt,
  }
}
