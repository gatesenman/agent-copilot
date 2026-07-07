/**
 * @od/agent-copilot-vue
 * Vue 3 智能协作组件库 — CopilotKit 全能力 + AgentScope (Java) 全能力
 *
 * 组件：
 *  - AgentCopilot     一体化聚合大组件（推荐入口：Provider + 顶栏 + 多会话 + 对话/工作台 + 设置）
 *  - CopilotProvider  根 Provider（细粒度拼装时必须）
 *  - CopilotChat      内嵌对话
 *  - CopilotSidebar   侧栏对话
 *  - CopilotPopup     悬浮气泡对话
 *  - CopilotTextarea  AI 辅助文本域
 *  - 生成式 UI：PayloadCard 分发器 + DataTable/Chart/Metrics/SqlResult/
 *    CodeBlock/Diff/FileTree/Terminal/Image/Citations/Plan/Form/Timeline 等
 *  - registerPayloadRenderer 注册自定义载荷渲染组件
 *
 * Composables：
 *  - useCopilot / useCopilotChat（headless）
 *  - useCopilotReadable / useCopilotAction / useCopilotAdditionalInstructions
 *  - useCoAgent / useCoAgentStateRender
 *  - useCopilotChatSuggestions / useLangGraphInterrupt
 */

// ============ 组件 ============
// ---- 一体化聚合大组件（推荐入口：一个标签开箱即用） ----
export { default as AgentCopilot } from './components/shell/AgentCopilot.vue'
export { default as CopilotShell } from './components/shell/CopilotShell.vue'

// ---- 渐进式细粒度组件（需要自由拼装时使用） ----
export { default as CopilotProvider } from './components/CopilotProvider.vue'
export { default as CopilotChat } from './components/chat/CopilotChat.vue'
export { default as CopilotSidebar } from './components/chat/CopilotSidebar.vue'
export { default as CopilotPopup } from './components/chat/CopilotPopup.vue'
export { default as CopilotTextarea } from './components/textarea/CopilotTextarea.vue'
export { default as MessageBubble } from './components/chat/MessageBubble.vue'
export { default as ChatInput } from './components/chat/ChatInput.vue'
export { default as ChatSuggestions } from './components/chat/ChatSuggestions.vue'
export { default as MarkdownText } from './components/chat/MarkdownText.vue'
export { default as ApprovalCard } from './components/generative-ui/ApprovalCard.vue'
export { default as PayloadCard } from './components/generative-ui/PayloadCard.vue'

// ---- 载荷渲染组件（可独立使用） ----
export { default as DataTableCard } from './components/generative-ui/DataTableCard.vue'
export { default as ChartCard } from './components/generative-ui/ChartCard.vue'
export { default as MetricsCard } from './components/generative-ui/MetricsCard.vue'
export { default as SqlResultCard } from './components/generative-ui/SqlResultCard.vue'
export { default as CodeBlockCard } from './components/generative-ui/CodeBlockCard.vue'
export { default as DiffCard } from './components/generative-ui/DiffCard.vue'
export { default as FileTreeCard } from './components/generative-ui/FileTreeCard.vue'
export { default as TerminalCard } from './components/generative-ui/TerminalCard.vue'
export { default as ImageCard } from './components/generative-ui/ImageCard.vue'
export { default as CitationsCard } from './components/generative-ui/CitationsCard.vue'
export { default as PlanCard } from './components/generative-ui/PlanCard.vue'
export { default as TimelineCard } from './components/generative-ui/TimelineCard.vue'
export { registerPayloadRenderer, getPayloadRenderer, listPayloadTypes } from './components/generative-ui/payload-registry'

// ---- Agentic Coding 组件（模式/思考/任务/计划/审查/工具/表单/澄清） ----
export { default as ModeSelector } from './components/agentic/ModeSelector.vue'
export { default as ThinkingBlock } from './components/agentic/ThinkingBlock.vue'
export { default as TaskTracker } from './components/agentic/TaskTracker.vue'
export { default as PlanPanel } from './components/agentic/PlanPanel.vue'
export { default as PlanReviewCard } from './components/agentic/PlanReviewCard.vue'
export { default as ChangeReviewPanel } from './components/agentic/ChangeReviewPanel.vue'
export { default as ToolActionCard } from './components/agentic/ToolActionCard.vue'
export { default as AgentFormCard } from './components/agentic/AgentFormCard.vue'
export { default as ClarifyCard } from './components/agentic/ClarifyCard.vue'
export { default as AgentStepList } from './components/agentic/AgentStepList.vue'
export type { AgentStep } from './components/agentic/AgentStepList.vue'
export { default as WorkSummary } from './components/agentic/WorkSummary.vue'
export { default as CheckpointCard } from './components/agentic/CheckpointCard.vue'
export { default as FormCard } from './components/generative-ui/FormCard.vue'

// ---- 工作台面板体系（文件/终端/浏览器/页签容器/组合 Shell） ----
export { default as FilePanel } from './components/workspace/FilePanel.vue'
export { default as TerminalPanel } from './components/workspace/TerminalPanel.vue'
export { default as BrowserPanel } from './components/workspace/BrowserPanel.vue'
export { default as PanelContainer } from './components/workspace/PanelContainer.vue'
export { default as AgentWorkspace } from './components/workspace/AgentWorkspace.vue'
export { default as ArtifactPanel } from './components/workspace/ArtifactPanel.vue'
export type { PanelTab } from './components/workspace/PanelContainer.vue'
export type { ArtifactItem } from './components/workspace/ArtifactPanel.vue'

// ---- 会话导出工具 ----
export { exportSession, sessionToMarkdown, sessionToJson, downloadText } from './utils/session-export'
export type { ExportFormat, ExportOptions } from './utils/session-export'

// ---- 输入增强组件 ----
export { default as CommandPalette } from './components/input/CommandPalette.vue'
export { default as ContextChips } from './components/input/ContextChips.vue'
export { useCommands } from './composables/useCommands'

// ---- 协议专属组件（A2A / ACP / MCP） ----
export { default as AgentCardView } from './components/protocol/AgentCardView.vue'
export { default as TaskStatusBadge } from './components/protocol/TaskStatusBadge.vue'
export { default as McpServerPanel } from './components/protocol/McpServerPanel.vue'
export { default as ProtocolBadge } from './components/protocol/ProtocolBadge.vue'
export type { A2AAgentCard } from './components/protocol/AgentCardView.vue'

// ---- 通用企业组件 ----
export { default as ModelSelector } from './components/general/ModelSelector.vue'
export { default as SessionList } from './components/general/SessionList.vue'
export { default as PromptLibrary } from './components/general/PromptLibrary.vue'
export { default as UsageMeter } from './components/general/UsageMeter.vue'
export { default as CompareView } from './components/general/CompareView.vue'
export { default as FeedbackDialog } from './components/general/FeedbackDialog.vue'
export { default as SafetyBanner } from './components/general/SafetyBanner.vue'
export { default as FileDropzone } from './components/general/FileDropzone.vue'
export { default as SourcePanel } from './components/general/SourcePanel.vue'
export { default as SettingsDialog } from './components/general/SettingsDialog.vue'
export { default as KnowledgeSelector } from './components/general/KnowledgeSelector.vue'
export { default as ThemeToggle } from './components/general/ThemeToggle.vue'
export { default as ErrorBoundary } from './components/general/ErrorBoundary.vue'
export type { SettingSection, SettingField } from './components/general/SettingsDialog.vue'
export type { KnowledgeBase } from './components/general/KnowledgeSelector.vue'
export type { SessionItem } from './components/general/SessionList.vue'
export type { PromptTemplate } from './components/general/PromptLibrary.vue'
export type { CompareSide } from './components/general/CompareView.vue'
export type { UploadingFile } from './components/general/FileDropzone.vue'
export type { SourceChunk } from './components/general/SourcePanel.vue'

// ============ Composables ============
export { useCopilot, provideCopilot, createCopilotStore, COPILOT_KEY } from './composables/useCopilot'
export type { CopilotStore, ChatStatus } from './composables/useCopilot'
export { useCopilotChat } from './composables/useCopilotChat'
export { useCopilotReadable } from './composables/useCopilotReadable'
export type { UseCopilotReadableOptions } from './composables/useCopilotReadable'
export { useCopilotAction } from './composables/useCopilotAction'
export { useCopilotAdditionalInstructions } from './composables/useCopilotAdditionalInstructions'
export { useCoAgent } from './composables/useCoAgent'
export { useCoAgentStateRender } from './composables/useCoAgentStateRender'
export { useCopilotChatSuggestions } from './composables/useCopilotChatSuggestions'
export { useLangGraphInterrupt } from './composables/useLangGraphInterrupt'
export { useTheme } from './composables/useTheme'
export type { ThemeMode, UseThemeOptions } from './composables/useTheme'
export { useFocusTrap } from './composables/useFocusTrap'
export type { UseFocusTrapOptions } from './composables/useFocusTrap'

// ============ Runtime ============
export { BrowserAgentRuntime } from './runtime/BrowserAgentRuntime'
export { HttpAgentRuntime } from './runtime/HttpAgentRuntime'
export { ProtocolAgentRuntime } from './runtime/ProtocolAgentRuntime'
export { LlmClient } from './runtime/llm-client'

// ============ 协议适配层（28 种接入方式） ============
export {
  createRuntime,
  registerAgentProtocol, registerModelProtocol,
  PROVIDER_PRESETS, getProviderPreset, listProviderPresets,
  createOpenAICompatibleAdapter, createAnthropicAdapter, createGeminiAdapter,
  createOllamaNativeAdapter, createCohereAdapter,
  agUiAdapter, langgraphAdapter, langserveAdapter, agentscopeAdapter,
  aiSdkAdapter, difyAdapter, cozeAdapter, fastgptAdapter,
  a2aAdapter, acpAdapter, openaiAssistantsAdapter, A2A_TASK_STATES,
  McpClient,
} from './protocols'
export type { McpClientOptions, McpTool, McpResource, McpPrompt } from './protocols'
export type {
  ProtocolId, ModelProtocolId, AgentProtocolId,
  ModelAdapter, ModelAdapterOptions, ModelAdapterFactory,
  AgentStreamAdapter, AgentAdapterOptions, AgentRequestSpec,
  ProtocolCapabilities, ProviderPreset,
} from './protocols'

// ============ 多语言 ============
// 内置 zh-CN / en-US；registerLocale 注册扩展语言；useI18n 在组件内取翻译函数
export { enUS, normalizeLocale, registerLocale, useI18n, zhCN } from './i18n'
export type { I18nContext, LocaleCode, LocaleMessages, TranslateFn } from './i18n'

// ============ 主题定制 ============
// Design Tokens：预设主题、品牌色派生、细粒度 token 覆盖
export { THEME_PRESETS, deriveBrandTokens, resolveThemeVars, tokensToVars } from './theme/theme-tokens'
export type { ThemeTokens, ThemeTokensConfig, ThemePresetId } from './theme/theme-tokens'

// ============ Web Component 集成通道 ============
// <agent-copilot-chat> 自定义元素：React / Angular / 原生页面框架无关接入
export { AgentCopilotChat, registerAgentCopilotElements } from './web-component'

// ============ 类型 ============
export * from './types'
