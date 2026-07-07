/**
 * useCopilotAdditionalInstructions — 动态附加系统指令
 * 对齐 CopilotKit 的 useCopilotAdditionalInstructions。
 */
import { onUnmounted, watchEffect, type Ref } from 'vue'
import { genId } from '../types'
import { useCopilot } from './useCopilot'

export function useCopilotAdditionalInstructions(options: {
  instructions: string | Ref<string>
  /** 为 false 时暂不生效 */
  available?: Ref<boolean> | boolean
}): { remove: () => void } {
  const store = useCopilot()
  const id = genId('instr')

  const stopWatch = watchEffect(() => {
    const available = typeof options.available === 'object' ? options.available.value : (options.available ?? true)
    const text = typeof options.instructions === 'string' ? options.instructions : options.instructions.value
    if (available && text) {
      store.additionalInstructions.set(id, text)
    } else {
      store.additionalInstructions.delete(id)
    }
  })

  const remove = () => {
    stopWatch()
    store.additionalInstructions.delete(id)
  }
  onUnmounted(remove)
  return { remove }
}
