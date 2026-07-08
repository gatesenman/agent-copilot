/**
 * 协议适配层入口 — createRuntime 工厂
 *
 * 根据 config 的 provider / protocol / runtime 字段决定运行时：
 * 1. B 类 Agent 框架协议（ag-ui / langgraph / dify / coze 等）→ ProtocolAgentRuntime
 * 2. A 类模型协议（anthropic / gemini / ollama-native / cohere）→ BrowserAgentRuntime + ModelAdapter
 * 3. openai-compatible（含 20+ 厂商预设）→ BrowserAgentRuntime + LlmClient（默认路径）
 * 4. runtime: 'http'（本项目 Java 后端）→ HttpAgentRuntime（完全向后兼容）
 */
import type { AgentRuntime, CopilotConfig } from '../types'
import { BrowserAgentRuntime } from '../runtime/BrowserAgentRuntime'
import { HttpAgentRuntime } from '../runtime/HttpAgentRuntime'
import { ProtocolAgentRuntime } from '../runtime/ProtocolAgentRuntime'
import type { AgentProtocolId, AgentStreamAdapter, ModelAdapter, ModelAdapterOptions, ProtocolId } from './types'
import { getProviderPreset } from './presets'
import { createOpenAICompatibleAdapter } from './model/openai-compatible'
import { createAnthropicAdapter } from './model/anthropic'
import { createGeminiAdapter } from './model/gemini'
import { createOllamaNativeAdapter } from './model/ollama-native'
import { createCohereAdapter } from './model/cohere'
import { agUiAdapter } from './agent/ag-ui'
import { langgraphAdapter } from './agent/langgraph'
import { langserveAdapter } from './agent/langserve'
import { agentscopeAdapter } from './agent/agentscope'
import { aiSdkAdapter } from './agent/ai-sdk'
import { difyAdapter } from './agent/dify'
import { cozeAdapter } from './agent/coze'
import { fastgptAdapter } from './agent/fastgpt'
import { a2aAdapter } from './agent/a2a'
import { acpAdapter } from './agent/acp'
import { openaiAssistantsAdapter } from './agent/openai-assistants'

// ============ 注册表 ============

const MODEL_ADAPTER_FACTORIES: Record<string, (opts: ModelAdapterOptions) => ModelAdapter> = {
  'openai-compatible': createOpenAICompatibleAdapter,
  anthropic: createAnthropicAdapter,
  gemini: createGeminiAdapter,
  'ollama-native': createOllamaNativeAdapter,
  cohere: createCohereAdapter,
}

const AGENT_ADAPTERS: Record<AgentProtocolId, AgentStreamAdapter> = {
  'ag-ui': agUiAdapter,
  langgraph: langgraphAdapter,
  langserve: langserveAdapter,
  agentscope: agentscopeAdapter,
  'ai-sdk': aiSdkAdapter,
  dify: difyAdapter,
  coze: cozeAdapter,
  fastgpt: fastgptAdapter,
  // AI 行业互操作协议
  a2a: a2aAdapter,
  acp: acpAdapter,
  'openai-assistants': openaiAssistantsAdapter,
}

/** 注册自定义 Agent 协议适配器（第 21+ 种协议的扩展点） */
export function registerAgentProtocol(id: string, adapter: AgentStreamAdapter): void {
  ;(AGENT_ADAPTERS as Record<string, AgentStreamAdapter>)[id] = adapter
}

/** 注册自定义模型协议适配器 */
export function registerModelProtocol(id: string, factory: (opts: ModelAdapterOptions) => ModelAdapter): void {
  MODEL_ADAPTER_FACTORIES[id] = factory
}

function isAgentProtocol(p: string): p is AgentProtocolId {
  return p in AGENT_ADAPTERS
}

// ============ 工厂 ============

/**
 * 根据配置创建运行时。解析优先级：
 * runtime: 'http' > provider 预设 > protocol 显式指定 > 默认 openai-compatible（browser）
 */
export function createRuntime(config: CopilotConfig): AgentRuntime {
  // 1. 本项目 Java 后端（向后兼容，最高优先）
  if (config.runtime === 'http') {
    return new HttpAgentRuntime({ endpoint: config.endpoint ?? '/api/agent', headers: config.headers })
  }

  // 2. 解析 provider 预设 → 推断 protocol / apiBase / model
  const preset = config.provider ? getProviderPreset(config.provider) : undefined
  const protocol: ProtocolId | string = config.protocol ?? preset?.protocol ?? 'openai-compatible'
  const apiBase = config.apiBase ?? preset?.apiBase ?? 'https://api.siliconflow.cn/v1'
  const model = config.model ?? preset?.defaultModel ?? 'Qwen/Qwen2.5-72B-Instruct'

  // 3. B 类：Agent 框架协议 → ProtocolAgentRuntime
  if (isAgentProtocol(protocol)) {
    const adapter = AGENT_ADAPTERS[protocol]
    return new ProtocolAgentRuntime(adapter, {
      endpoint: config.endpoint ?? apiBase,
      apiKey: config.apiKey,
      headers: config.headers,
      extra: config.protocolOptions,
      reconnect: config.network?.reconnect,
    })
  }

  // 4. A 类：模型协议 → BrowserAgentRuntime + ModelAdapter
  // 未知协议不抛错（会导致 CopilotProvider setup 崩溃、整棵组件树挂载失败），
  // 而是告警并回退到 openai-compatible，保证 UI 始终可渲染。
  let factory = MODEL_ADAPTER_FACTORIES[protocol]
  if (!factory) {
    console.error(
      `[agent-copilot] 未知协议 "${protocol}"，已回退到 openai-compatible。` +
      `内置协议: ${[...Object.keys(MODEL_ADAPTER_FACTORIES), ...Object.keys(AGENT_ADAPTERS)].join(', ')}；` +
      '或用 registerAgentProtocol / registerModelProtocol 注册自定义协议。',
    )
    factory = MODEL_ADAPTER_FACTORIES['openai-compatible']
  }

  const modelAdapter = factory({
    apiBase,
    apiKey: config.apiKey ?? '',
    model,
    headers: config.headers,
    extra: config.protocolOptions,
  })

  return new BrowserAgentRuntime({
    apiBase,
    apiKey: config.apiKey ?? '',
    model,
    approvalMode: config.approval?.mode ?? config.approvalMode,
    gateTools: config.approval?.gateTools,
    maxIterations: config.maxIterations,
    // openai-compatible 也统一走适配器（内部即 LlmClient，行为不变）
    modelAdapter,
  })
}

// ============ 再导出 ============

export type {
  ProtocolId, ModelProtocolId, AgentProtocolId,
  ModelAdapter, ModelAdapterOptions, ModelAdapterFactory,
  AgentStreamAdapter, AgentAdapterOptions, AgentRequestSpec,
  ProtocolCapabilities, ProviderPreset,
} from './types'
export { PROVIDER_PRESETS, getProviderPreset, listProviderPresets } from './presets'
export { createOpenAICompatibleAdapter } from './model/openai-compatible'
export { createAnthropicAdapter } from './model/anthropic'
export { createGeminiAdapter } from './model/gemini'
export { createOllamaNativeAdapter } from './model/ollama-native'
export { createCohereAdapter } from './model/cohere'
export { agUiAdapter } from './agent/ag-ui'
export { langgraphAdapter } from './agent/langgraph'
export { langserveAdapter } from './agent/langserve'
export { agentscopeAdapter } from './agent/agentscope'
export { aiSdkAdapter } from './agent/ai-sdk'
export { difyAdapter } from './agent/dify'
export { cozeAdapter } from './agent/coze'
export { fastgptAdapter } from './agent/fastgpt'
export { a2aAdapter, A2A_TASK_STATES } from './agent/a2a'
export { acpAdapter } from './agent/acp'
export { openaiAssistantsAdapter } from './agent/openai-assistants'
export { McpClient } from './mcp'
export type { McpClientOptions, McpTool, McpResource, McpPrompt } from './mcp'
