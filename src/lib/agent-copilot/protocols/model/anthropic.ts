/**
 * anthropic — Anthropic Messages API 适配器
 *
 * 协议差异：
 * - system 提示词独立字段（不在 messages 中）
 * - 工具结果为 user 消息中的 tool_result 内容块；助手工具调用为 tool_use 块
 * - SSE 事件类型：message_start / content_block_start / content_block_delta /
 *   content_block_stop / message_delta / message_stop
 * - 认证：x-api-key + anthropic-version 头；浏览器直连需
 *   anthropic-dangerous-direct-browser-access: true
 */
import type { LlmChatParams, LlmMessage, LlmStreamChunk, LlmToolDef } from '../../runtime/llm-client'
import type { ModelAdapter, ModelAdapterOptions } from '../types'

export function createAnthropicAdapter(opts: ModelAdapterOptions): ModelAdapter {
  const version = (opts.extra?.version as string) ?? '2023-06-01'

  function buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': version,
      'anthropic-dangerous-direct-browser-access': 'true',
      ...opts.headers,
    }
  }

  /** OpenAI 消息 → Anthropic messages + system */
  function convertMessages(messages: LlmMessage[]): { system: string; messages: unknown[] } {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
    const out: unknown[] = []

    for (const m of messages) {
      if (m.role === 'system') continue
      if (m.role === 'assistant') {
        const blocks: unknown[] = []
        if (m.content) blocks.push({ type: 'text', text: m.content })
        for (const tc of m.tool_calls ?? []) {
          blocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: safeParse(tc.function.arguments),
          })
        }
        out.push({ role: 'assistant', content: blocks.length > 0 ? blocks : m.content })
      } else if (m.role === 'tool') {
        // 工具结果 → user 消息的 tool_result 块（连续 tool 消息合并到一条）
        const last = out[out.length - 1] as any
        const block = { type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content }
        if (last?.role === 'user' && Array.isArray(last.content) && last.content[0]?.type === 'tool_result') {
          last.content.push(block)
        } else {
          out.push({ role: 'user', content: [block] })
        }
      } else {
        out.push({ role: 'user', content: m.content })
      }
    }
    return { system, messages: out }
  }

  /** OpenAI 工具定义 → Anthropic tools */
  function convertTools(tools?: LlmToolDef[]): unknown[] | undefined {
    if (!tools || tools.length === 0) return undefined
    return tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }))
  }

  function buildBody(params: LlmChatParams, stream: boolean): unknown {
    const { system, messages } = convertMessages(params.messages)
    return {
      model: opts.model,
      system: system || undefined,
      messages,
      tools: convertTools(params.tools),
      max_tokens: params.maxTokens ?? 2048,
      temperature: params.temperature ?? 0.3,
      stream,
    }
  }

  return {
    async *chatStream(params: LlmChatParams): AsyncIterable<LlmStreamChunk> {
      const res = await fetch(`${opts.apiBase}/v1/messages`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(buildBody(params, true)),
        signal: params.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Anthropic 请求失败 (${res.status}): ${text.slice(0, 300)}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      /** content_block index → 工具调用序号（我们的 toolCallDelta.index） */
      const toolIndexMap = new Map<number, number>()
      let nextToolIndex = 0
      let inputTokens = 0

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
              case 'message_start':
                inputTokens = json.message?.usage?.input_tokens ?? 0
                break
              case 'content_block_start':
                if (json.content_block?.type === 'tool_use') {
                  const idx = nextToolIndex++
                  toolIndexMap.set(json.index, idx)
                  yield {
                    toolCallDelta: {
                      index: idx,
                      id: json.content_block.id,
                      name: json.content_block.name,
                    },
                  }
                }
                break
              case 'content_block_delta':
                if (json.delta?.type === 'text_delta' && json.delta.text) {
                  yield { delta: json.delta.text }
                } else if (json.delta?.type === 'input_json_delta') {
                  const idx = toolIndexMap.get(json.index)
                  if (idx !== undefined) {
                    yield { toolCallDelta: { index: idx, argumentsDelta: json.delta.partial_json } }
                  }
                }
                break
              case 'message_delta': {
                const stop = json.delta?.stop_reason
                if (json.usage?.output_tokens != null) {
                  yield {
                    usage: {
                      prompt_tokens: inputTokens,
                      completion_tokens: json.usage.output_tokens,
                      total_tokens: inputTokens + json.usage.output_tokens,
                    },
                  }
                }
                if (stop) {
                  yield { finishReason: stop === 'tool_use' ? 'tool_calls' : stop === 'max_tokens' ? 'length' : 'stop' }
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
      const body: any = buildBody(params, false)
      // Anthropic 无 response_format；jsonMode 用提示词兜底
      if (params.jsonMode) {
        body.system = `${body.system ?? ''}\n\n务必仅输出合法 JSON，不要包含任何其他文本。`.trim()
      }
      const res = await fetch(`${opts.apiBase}/v1/messages`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(body),
        signal: params.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Anthropic 请求失败 (${res.status}): ${text.slice(0, 300)}`)
      }
      const json = await res.json()
      return (json.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
    },
  }
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s || '{}') } catch { return {} }
}
