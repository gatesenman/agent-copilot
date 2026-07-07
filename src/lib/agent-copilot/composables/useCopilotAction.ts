/**
 * useCopilotAction — 注册前端 Action（LLM 可调用的工具）
 * 对齐 CopilotKit 的 useCopilotAction，支持：
 *  - handler 直接执行
 *  - requiresApproval: true 即 renderAndWait（HITL）语义
 *  - render 指定 generative UI 卡片
 */
import { onUnmounted } from 'vue'
import type { CopilotActionDef } from '../types'
import { useCopilot } from './useCopilot'

export function useCopilotAction(def: CopilotActionDef): { remove: () => void } {
  const store = useCopilot()
  if (store.actions.has(def.name) && store.config.debug) {
    console.log(`[agent-copilot] Action "${def.name}" 被重复注册，后者覆盖前者`)
  }
  store.actions.set(def.name, def)

  const remove = () => store.actions.delete(def.name)
  onUnmounted(remove)
  return { remove }
}
