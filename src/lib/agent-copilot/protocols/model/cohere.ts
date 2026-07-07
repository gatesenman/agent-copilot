/**
 * cohere — Cohere Chat API v2 适配器
 *
 * 协议差异：
 * - v2 已对齐 OpenAI 风格 messages，但流为专有 SSE 事件：
 *   message-start / content-delta / tool-plan-delta / tool-call-start /
 *   tool-call-delta / tool-call-end / message-end
 * - 工具结果为 role: tool 消息（tool_call_id + content 块数组）
 */
import type { LlmChatParams, LlmMessage, LlmStreamChunk, LlmToolDef } from '../../runtime/llm-client'
import type { ModelAdapter, ModelAdapterOptions } from '../types'

export function createCohereAdapter(opts: ModelAdapterOptions): ModelAdapter {
  function buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
      ...opts.headers,
    }
  }

  function convertMessages(messages: LlmMessage[]): unknown[] {
    return messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: m.tool_call_id,
          content: [{ type: 'document', document: { data: m.content } }],
        }
      }
      if (m.role === 'assistant' && m.tool_calls?.length) {
        return {
          role: 'assistant',
          content: m.content || undefined,
          tool_calls: m.tool_calls,
          tool_plan: m.content || undefined,
        }
      }
      return { role: m.role, content: m.content }
    })
  }

  function buildBody(params: LlmChatParams, stream: boolean): unknown {
    return {
      model: opts.model,
      messages: convertMessages(params.messages),
      tools: params.tools && params.tools.length > 0 ? (params.tools as LlmToolDef[]) : undefined,
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 2048,
      stream,
      ...(params.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }
  }

  return {
    async *chatStream(params: LlmChatParams): AsyncIterable<LlmStreamChunk> {
      const res = await fetch(`${opts.apiBase}/v2/chat`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(buildBody(params, true)),
        signal: params.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Cohere 请求失败 (${res.status}): ${text.slice(0, 300)}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      /** Cohere tool call index → 我们的 index（一致，但记录 id/name 已发） */
      let sawToolCall = false

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
            let json: any
            try { json = JSON.parse(trimmed.slice(5).trim()) } catch { continue }

            switch (json.type) {
              case 'content-delta': {
                const text = json.delta?.message?.content?.text
                if (text) yield { delta: text }
                break
              }
              case 'tool-call-start': {
                sawToolCall = true
                const tc = json.delta?.message?.tool_calls
                yield {
                  toolCallDelta: {
                    index: json.index ?? 0,
                    id: tc?.id,
                    name: tc?.function?.name,
                    argumentsDelta: tc?.function?.arguments ?? '',
                  },
                }
                break
              }
              case 'tool-call-delta': {
                const args = json.delta?.message?.tool_calls?.function?.arguments
                if (args) {
                  yield { toolCallDelta: { index: json.index ?? 0, argumentsDelta: args } }
                }
                break
              }
              case 'message-end': {
                const usage = json.delta?.usage?.billed_units
                if (usage) {
                  const p = usage.input_tokens ?? 0
                  const c = usage.output_tokens ?? 0
                  yield { usage: { prompt_tokens: p, completion_tokens: c, total_tokens: p + c } }
                }
                const finish = json.delta?.finish_reason
                yield {
                  finishReason: sawToolCall || finish === 'TOOL_CALL' ? 'tool_calls'
                    : finish === 'MAX_TOKENS' ? 'length'
                    : 'stop',
                }
                break
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    },

    async chatOnce(params: LlmChatParams): Promise<string> {
      const res = await fetch(`${opts.apiBase}/v2/chat`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(buildBody(params, false)),
        signal: params.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Cohere 请求失败 (${res.status}): ${text.slice(0, 300)}`)
      }
      const json = await res.json()
      const content = json.message?.content ?? []
      return content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
    },
  }
}
