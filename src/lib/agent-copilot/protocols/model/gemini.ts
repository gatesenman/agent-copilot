/**
 * gemini — Google Gemini generateContent 协议适配器
 *
 * 协议差异：
 * - 消息为 contents[]（role: user/model），system 为独立 systemInstruction
 * - 工具为 tools[{ functionDeclarations }]；模型工具调用在 parts[].functionCall；
 *   工具结果为 user content 中的 functionResponse part
 * - 流式端点 :streamGenerateContent?alt=sse
 * - 认证：x-goog-api-key 头（浏览器 Key 支持直连）
 */
import type { LlmChatParams, LlmMessage, LlmStreamChunk, LlmToolDef } from '../../runtime/llm-client'
import type { ModelAdapter, ModelAdapterOptions } from '../types'

export function createGeminiAdapter(opts: ModelAdapterOptions): ModelAdapter {
  function buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-goog-api-key': opts.apiKey,
      ...opts.headers,
    }
  }

  /** OpenAI 消息 → Gemini contents + systemInstruction */
  function convertMessages(messages: LlmMessage[]): { systemInstruction?: unknown; contents: unknown[] } {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
    const contents: unknown[] = []
    /** tool_call_id → 工具名（Gemini functionResponse 需要 name） */
    const toolNames = new Map<string, string>()

    for (const m of messages) {
      if (m.role === 'system') continue
      if (m.role === 'assistant') {
        const parts: unknown[] = []
        if (m.content) parts.push({ text: m.content })
        for (const tc of m.tool_calls ?? []) {
          toolNames.set(tc.id, tc.function.name)
          parts.push({ functionCall: { name: tc.function.name, args: safeParse(tc.function.arguments) } })
        }
        if (parts.length > 0) contents.push({ role: 'model', parts })
      } else if (m.role === 'tool') {
        const name = toolNames.get(m.tool_call_id ?? '') ?? 'tool'
        contents.push({
          role: 'user',
          parts: [{ functionResponse: { name, response: { result: safeParse(m.content) } } }],
        })
      } else {
        contents.push({ role: 'user', parts: [{ text: m.content }] })
      }
    }
    return {
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
    }
  }

  function convertTools(tools?: LlmToolDef[]): unknown[] | undefined {
    if (!tools || tools.length === 0) return undefined
    return [{
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    }]
  }

  function buildBody(params: LlmChatParams): unknown {
    const { systemInstruction, contents } = convertMessages(params.messages)
    return {
      systemInstruction,
      contents,
      tools: convertTools(params.tools),
      generationConfig: {
        temperature: params.temperature ?? 0.3,
        maxOutputTokens: params.maxTokens ?? 2048,
        ...(params.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    }
  }

  return {
    async *chatStream(params: LlmChatParams): AsyncIterable<LlmStreamChunk> {
      const url = `${opts.apiBase}/models/${opts.model}:streamGenerateContent?alt=sse`
      const res = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(buildBody(params)),
        signal: params.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Gemini 请求失败 (${res.status}): ${text.slice(0, 300)}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let toolIndex = 0
      let sawToolCall = false
      let lastUsage: any = null

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

            if (json.usageMetadata) lastUsage = json.usageMetadata

            const parts = json.candidates?.[0]?.content?.parts ?? []
            for (const part of parts) {
              if (part.text) yield { delta: part.text }
              if (part.functionCall) {
                sawToolCall = true
                const idx = toolIndex++
                // Gemini functionCall 整体到达（非增量），一次性给 id/name/完整参数
                yield {
                  toolCallDelta: {
                    index: idx,
                    id: `gemini_call_${Date.now()}_${idx}`,
                    name: part.functionCall.name,
                    argumentsDelta: JSON.stringify(part.functionCall.args ?? {}),
                  },
                }
              }
            }

            const finish = json.candidates?.[0]?.finishReason
            if (finish) {
              if (lastUsage) {
                yield {
                  usage: {
                    prompt_tokens: lastUsage.promptTokenCount ?? 0,
                    completion_tokens: lastUsage.candidatesTokenCount ?? 0,
                    total_tokens: lastUsage.totalTokenCount ?? 0,
                  },
                }
              }
              yield {
                finishReason: sawToolCall ? 'tool_calls'
                  : finish === 'MAX_TOKENS' ? 'length'
                  : 'stop',
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    },

    async chatOnce(params: LlmChatParams): Promise<string> {
      const url = `${opts.apiBase}/models/${opts.model}:generateContent`
      const res = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(buildBody(params)),
        signal: params.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Gemini 请求失败 (${res.status}): ${text.slice(0, 300)}`)
      }
      const json = await res.json()
      const parts = json.candidates?.[0]?.content?.parts ?? []
      return parts.filter((p: any) => p.text).map((p: any) => p.text).join('')
    },
  }
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s || '{}') } catch { return {} }
}
