/**
 * ollama-native — Ollama /api/chat 原生协议适配器
 *
 * 协议差异：
 * - NDJSON 流（每行一个 JSON 对象，非 SSE）
 * - 工具调用在 message.tool_calls（整体到达，非增量）
 * - 结束帧 done: true 带 token 统计（prompt_eval_count / eval_count）
 * - 本地服务默认无认证
 */
import type { LlmChatParams, LlmMessage, LlmStreamChunk, LlmToolDef } from '../../runtime/llm-client'
import type { ModelAdapter, ModelAdapterOptions } from '../types'

export function createOllamaNativeAdapter(opts: ModelAdapterOptions): ModelAdapter {
  function convertMessages(messages: LlmMessage[]): unknown[] {
    return messages.map((m) => {
      if (m.role === 'assistant' && m.tool_calls?.length) {
        return {
          role: 'assistant',
          content: m.content ?? '',
          tool_calls: m.tool_calls.map((tc) => ({
            function: { name: tc.function.name, arguments: safeParse(tc.function.arguments) },
          })),
        }
      }
      if (m.role === 'tool') return { role: 'tool', content: m.content }
      return { role: m.role, content: m.content }
    })
  }

  function convertTools(tools?: LlmToolDef[]): unknown[] | undefined {
    if (!tools || tools.length === 0) return undefined
    return tools // Ollama 使用 OpenAI 相同的工具定义格式
  }

  function buildBody(params: LlmChatParams, stream: boolean): unknown {
    return {
      model: opts.model,
      messages: convertMessages(params.messages),
      tools: convertTools(params.tools),
      stream,
      options: {
        temperature: params.temperature ?? 0.3,
        num_predict: params.maxTokens ?? 2048,
      },
      ...(params.jsonMode ? { format: 'json' } : {}),
    }
  }

  return {
    async *chatStream(params: LlmChatParams): AsyncIterable<LlmStreamChunk> {
      const res = await fetch(`${opts.apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        body: JSON.stringify(buildBody(params, true)),
        signal: params.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Ollama 请求失败 (${res.status}): ${text.slice(0, 300)}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let toolIndex = 0
      let sawToolCall = false

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.trim()) continue
            let json: any
            try { json = JSON.parse(line) } catch { continue }

            if (json.message?.content) yield { delta: json.message.content }

            for (const tc of json.message?.tool_calls ?? []) {
              sawToolCall = true
              const idx = toolIndex++
              yield {
                toolCallDelta: {
                  index: idx,
                  id: `ollama_call_${Date.now()}_${idx}`,
                  name: tc.function?.name,
                  argumentsDelta: JSON.stringify(tc.function?.arguments ?? {}),
                },
              }
            }

            if (json.done) {
              if (json.prompt_eval_count != null || json.eval_count != null) {
                const p = json.prompt_eval_count ?? 0
                const c = json.eval_count ?? 0
                yield { usage: { prompt_tokens: p, completion_tokens: c, total_tokens: p + c } }
              }
              yield { finishReason: sawToolCall ? 'tool_calls' : 'stop' }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    },

    async chatOnce(params: LlmChatParams): Promise<string> {
      const res = await fetch(`${opts.apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        body: JSON.stringify(buildBody(params, false)),
        signal: params.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Ollama 请求失败 (${res.status}): ${text.slice(0, 300)}`)
      }
      const json = await res.json()
      return json.message?.content ?? ''
    },
  }
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s || '{}') } catch { return {} }
}
