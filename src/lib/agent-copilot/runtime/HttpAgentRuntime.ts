/**
 * HttpAgentRuntime — 生产运行时
 * 通过 SSE 对接 AgentScope Java (Spring Boot) 后端。
 *
 * 协议端点：
 *   POST {endpoint}/chat    发起运行，SSE 返回 AgentEvent 流
 *   POST {endpoint}/resume  恢复 HITL 中断运行，SSE 返回 AgentEvent 流
 *   POST {endpoint}/cancel  取消运行
 */
import type { AgentEvent, AgentRuntime, InterruptResponse, RunInput } from '../types'

export interface HttpRuntimeOptions {
  /** 例: http://localhost:8080/api/agent */
  endpoint: string
  headers?: Record<string, string>
}

export class HttpAgentRuntime implements AgentRuntime {
  readonly kind = 'http' as const

  constructor(private opts: HttpRuntimeOptions) {}

  async *run(input: RunInput): AsyncIterable<AgentEvent> {
    const body = {
      sessionId: input.sessionId,
      runId: input.runId,
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
      readables: input.readables,
      // 前端 Action 仅传定义（handler 无法序列化）；
      // 后端把它们注册为 client-side 工具，通过 TOOL_CALL_* 事件回传前端执行
      actions: input.actions.map((a) => ({
        name: a.name,
        label: a.label,
        description: a.description,
        parameters: a.parameters,
        requiresApproval: a.requiresApproval,
      })),
      additionalInstructions: input.additionalInstructions,
      systemPrompt: input.systemPrompt,
      model: input.model,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      // Agent 模式 / 深度思考等运行元数据（后端据此启用 reasoning 与权限策略）
      metadata: input.metadata,
    }
    yield* this.sse(`${this.opts.endpoint}/chat`, body, input.signal)
  }

  async *resume(
    sessionId: string,
    runId: string,
    response: InterruptResponse,
    signal?: AbortSignal,
  ): AsyncIterable<AgentEvent> {
    yield* this.sse(`${this.opts.endpoint}/resume`, { sessionId, runId, ...response }, signal)
  }

  async cancel(sessionId: string, runId: string): Promise<void> {
    await fetch(`${this.opts.endpoint}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.opts.headers },
      body: JSON.stringify({ sessionId, runId }),
    }).catch(() => {})
  }

  private async *sse(url: string, body: unknown, signal?: AbortSignal): AsyncIterable<AgentEvent> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.opts.headers,
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`后端请求失败 (${res.status}): ${text.slice(0, 300)}`)
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE 事件以空行分隔
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const raw of events) {
          const dataLines = raw
            .split('\n')
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).trim())
          if (dataLines.length === 0) continue
          const payload = dataLines.join('')
          if (!payload || payload === '[DONE]') continue
          try {
            yield JSON.parse(payload) as AgentEvent
          } catch {
            // 忽略无法解析的行
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
