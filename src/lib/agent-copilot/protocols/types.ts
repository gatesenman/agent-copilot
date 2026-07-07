/**
 * 协议适配层类型体系
 *
 * 两类适配器：
 * - ModelAdapter：A 类模型协议（OpenAI 兼容 / Anthropic / Gemini / Ollama / Cohere），
 *   只负责单次 LLM 调用，ReAct 循环 / HITL / 流水线仍由 BrowserAgentRuntime 本地驱动。
 * - AgentStreamAdapter：B 类 Agent 框架协议（AG-UI / LangGraph / LangServe / AgentScope /
 *   AI SDK / Dify / Coze / FastGPT），服务端自带 Agent 循环，适配器把远端事件流
 *   归一化为 AgentEvent。
 */
import type { AgentEvent, RunInput } from '../types'
import type { LlmChatParams, LlmStreamChunk } from '../runtime/llm-client'

// ============ 协议标识 ============

/** A 类：模型协议 */
export type ModelProtocolId =
  | 'openai-compatible'
  | 'anthropic'
  | 'gemini'
  | 'ollama-native'
  | 'cohere'

/** B 类：Agent 框架协议 */
export type AgentProtocolId =
  | 'ag-ui'
  | 'langgraph'
  | 'langserve'
  | 'agentscope'
  | 'ai-sdk'
  | 'dify'
  | 'coze'
  | 'fastgpt'
  // AI 行业互操作协议
  | 'a2a'
  | 'acp'
  | 'openai-assistants'

export type ProtocolId = ModelProtocolId | AgentProtocolId

// ============ 能力矩阵 ============

export interface ProtocolCapabilities {
  /** 流式文本输出 */
  streaming: boolean
  /** 前端注册工具可下发执行 */
  tools: boolean
  /** HITL 审批中断/恢复 */
  hitl: boolean
  /** 共享状态（AGENT_STATE 事件） */
  sharedState: boolean
  /** 流水线阶段可观测（STAGE_* 事件） */
  pipeline: boolean
}

// ============ A 类：模型适配器 ============

/**
 * 模型适配器接口。
 * LlmClient（OpenAI 兼容）天然满足此接口；其他厂商协议实现同样的形状，
 * 内部做消息格式与流帧的双向转换。
 */
export interface ModelAdapter {
  /** 流式对话，产出统一的 LlmStreamChunk 增量 */
  chatStream(params: LlmChatParams): AsyncIterable<LlmStreamChunk>
  /** 非流式一次性调用（分类、JSON 结构化任务） */
  chatOnce(params: LlmChatParams): Promise<string>
}

export interface ModelAdapterOptions {
  apiBase: string
  apiKey: string
  model: string
  /** 协议特有参数（如 azure 的 apiVersion、anthropic 的 version 头） */
  extra?: Record<string, unknown>
  headers?: Record<string, string>
}

export type ModelAdapterFactory = (opts: ModelAdapterOptions) => ModelAdapter

// ============ B 类：Agent 流适配器 ============

export interface AgentRequestSpec {
  url: string
  method?: 'POST' | 'GET'
  headers: Record<string, string>
  body?: unknown
}

/**
 * Agent 框架协议适配器。
 * buildRunRequest / buildResumeRequest 构造 HTTP 请求；
 * parseStream 把响应体字节流解析为 AgentEvent 序列。
 */
export interface AgentStreamAdapter {
  readonly id: AgentProtocolId
  readonly capabilities: ProtocolCapabilities

  buildRunRequest(input: RunInput, options: AgentAdapterOptions): AgentRequestSpec
  /** 不支持 HITL 的协议可不实现 */
  buildResumeRequest?(
    sessionId: string,
    runId: string,
    response: { interruptId: string; approved?: boolean; comment?: string; payload?: unknown },
    options: AgentAdapterOptions,
  ): AgentRequestSpec
  /** 取消运行（可选，默认仅本地 abort） */
  buildCancelRequest?(sessionId: string, runId: string, options: AgentAdapterOptions): AgentRequestSpec | null

  /**
   * 把响应字节流解析为 AgentEvent。
   * @param body   fetch 响应体
   * @param runId  本次运行 ID（远端未必回传，用于事件归属）
   */
  parseStream(body: ReadableStream<Uint8Array>, runId: string, options: AgentAdapterOptions): AsyncIterable<AgentEvent>
}

export interface AgentAdapterOptions {
  /** 服务端地址（各协议含义见文档：Dify 为 https://api.dify.ai/v1 等） */
  endpoint: string
  apiKey?: string
  headers?: Record<string, string>
  /** 协议特有参数：dify 的 user、coze 的 bot_id、langgraph 的 assistant_id 等 */
  extra?: Record<string, unknown>
}

// ============ 厂商预设 ============

export interface ProviderPreset {
  /** 预设名（config.provider） */
  id: string
  label: string
  /** 归属协议 */
  protocol: ProtocolId
  /** 默认 API 地址 */
  apiBase: string
  /** 推荐默认模型（B 类协议可为空） */
  defaultModel?: string
  /** 能力提示（B 类协议以适配器声明为准） */
  notes?: string
}
