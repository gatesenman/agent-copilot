/**
 * OpenAI 兼容流式客户端（硅基流动）
 * BrowserAgentRuntime 内部使用；也可独立用于 Textarea 补全、建议问题生成。
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: LlmToolCall[]
  tool_call_id?: string
}

export interface LlmToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface LlmToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

export interface LlmStreamChunk {
  /** 文本增量 */
  delta?: string
  /** 工具调用增量（按 index 聚合） */
  toolCallDelta?: { index: number; id?: string; name?: string; argumentsDelta?: string }
  /** 结束原因 */
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter'
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export interface LlmClientOptions {
  apiBase: string
  apiKey: string
  model: string
  temperature?: number
  maxTokens?: number
  /** 附加请求头（覆盖默认头，如 Azure 的 api-key） */
  extraHeaders?: Record<string, string>
  /** URL 查询参数（如 Azure 的 api-version） */
  queryParams?: Record<string, string>
  /** 认证方式：bearer（默认）/ header-api-key（Azure）/ none */
  authStyle?: 'bearer' | 'api-key-header' | 'none'
}

export interface LlmChatParams {
  messages: LlmMessage[]
  tools?: LlmToolDef[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  /** 强制 JSON 输出 */
  jsonMode?: boolean
}

export class LlmClient {
  constructor(private opts: LlmClientOptions) {}

  /** 构造请求 URL（含查询参数，如 Azure api-version） */
  private buildUrl(): string {
    const base = `${this.opts.apiBase}/chat/completions`
    const qp = this.opts.queryParams
    if (!qp || Object.keys(qp).length === 0) return base
    const url = new URL(base)
    for (const [k, v] of Object.entries(qp)) url.searchParams.set(k, v)
    return url.toString()
  }

  /** 构造请求头（支持 bearer / api-key 头 / 无认证 + 附加头） */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const style = this.opts.authStyle ?? 'bearer'
    if (style === 'bearer' && this.opts.apiKey) headers.Authorization = `Bearer ${this.opts.apiKey}`
    if (style === 'api-key-header') headers['api-key'] = this.opts.apiKey
    return { ...headers, ...this.opts.extraHeaders }
  }

  /** 流式对话，产出增量 chunk */
  async *chatStream(params: LlmChatParams): AsyncIterable<LlmStreamChunk> {
    const res = await fetch(this.buildUrl(), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.opts.model,
        messages: params.messages,
        tools: params.tools && params.tools.length > 0 ? params.tools : undefined,
        temperature: params.temperature ?? this.opts.temperature ?? 0.3,
        max_tokens: params.maxTokens ?? this.opts.maxTokens ?? 2048,
        stream: true,
        stream_options: { include_usage: true },
        response_format: params.jsonMode ? { type: 'json_object' } : undefined,
      }),
      signal: params.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`LLM 请求失败 (${res.status}): ${text.slice(0, 300)}`)
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') return

          let json: any
          try {
            json = JSON.parse(payload)
          } catch {
            continue
          }

          if (json.usage) {
            yield { usage: json.usage }
          }

          const choice = json.choices?.[0]
          if (!choice) continue

          const delta = choice.delta
          if (delta?.content) {
            yield { delta: delta.content }
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              yield {
                toolCallDelta: {
                  index: tc.index ?? 0,
                  id: tc.id,
                  name: tc.function?.name,
                  argumentsDelta: tc.function?.arguments,
                },
              }
            }
          }
          if (choice.finish_reason) {
            yield { finishReason: choice.finish_reason }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /** 非流式一次性调用（用于分类、JSON 结构化任务） */
  async chatOnce(params: LlmChatParams): Promise<string> {
    const res = await fetch(this.buildUrl(), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.opts.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.1,
        max_tokens: params.maxTokens ?? 1024,
        stream: false,
        response_format: params.jsonMode ? { type: 'json_object' } : undefined,
      }),
      signal: params.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`LLM 请求失败 (${res.status}): ${text.slice(0, 300)}`)
    }
    const json = await res.json()
    return json.choices?.[0]?.message?.content ?? ''
  }
}
