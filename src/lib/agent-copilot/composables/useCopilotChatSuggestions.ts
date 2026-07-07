/**
 * useCopilotChatSuggestions — 建议问题
 * 对齐 CopilotKit 的 useCopilotChatSuggestions。
 * 注意：建议配置在 Provider config.suggestions 中集中管理；
 * 本 composable 提供读取 + 手动刷新能力。
 */
import { useCopilot } from './useCopilot'

export function useCopilotChatSuggestions() {
  const store = useCopilot()
  return {
    suggestions: store.suggestions,
    loading: store.suggestionsLoading,
    refresh: store.refreshSuggestions,
  }
}
