/**
 * useCoAgent — Agent 共享状态（双向）
 * 对齐 CopilotKit CoAgents 的 useCoAgent：
 *  - Agent 通过 AGENT_STATE_DELTA 事件写入 shared 状态，前端响应式读取
 *  - 前端 setState 写入后，会作为 readable 注入下一次运行
 */
import { computed, onUnmounted } from 'vue'
import { genId } from '../types'
import { useCopilot } from './useCopilot'

export function useCoAgent<T extends Record<string, unknown>>(options: {
  name: string
  initialState?: T
}) {
  const store = useCopilot()

  if (options.initialState && store.agentState.shared[options.name] === undefined) {
    store.agentState.shared[options.name] = { ...options.initialState }
  }

  const state = computed<T>(() => (store.agentState.shared[options.name] as T) ?? ({} as T))

  function setState(patch: Partial<T>) {
    const current = (store.agentState.shared[options.name] as T) ?? ({} as T)
    store.agentState.shared[options.name] = { ...current, ...patch }
  }

  // 将共享状态注册为 readable，注入 LLM 上下文
  const readableId = genId('coagent')
  store.readables.set(readableId, {
    id: readableId,
    description: `共享 Agent 状态「${options.name}」（useCoAgent 双向同步）`,
    value: () => store.agentState.shared[options.name],
  })
  onUnmounted(() => store.readables.delete(readableId))

  return { state, setState }
}
