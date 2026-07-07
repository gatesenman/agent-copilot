/**
 * useCopilotReadable — 将应用状态注入 LLM 上下文
 * 对齐 CopilotKit 的 useCopilotReadable。
 */
import { onUnmounted } from 'vue'
import { genId, type ReadableContext } from '../types'
import { useCopilot } from './useCopilot'

export interface UseCopilotReadableOptions {
  /** 该状态的自然语言描述（LLM 用它理解数据含义） */
  description: string
  /** 取值函数（每次运行时实时求值，天然响应最新状态） */
  value: () => unknown
  /** 分类标签 */
  categories?: string[]
}

export function useCopilotReadable(options: UseCopilotReadableOptions): { remove: () => void } {
  const store = useCopilot()
  const id = genId('readable')

  const ctx: ReadableContext = {
    id,
    description: options.description,
    value: options.value,
    categories: options.categories,
  }
  store.readables.set(id, ctx)

  const remove = () => store.readables.delete(id)
  onUnmounted(remove)
  return { remove }
}
