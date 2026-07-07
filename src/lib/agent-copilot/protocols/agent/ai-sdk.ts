/**
 * ai-sdk — Vercel AI SDK UI Message Stream 协议适配器
 *
 * 对接 AI SDK 的 useChat 兼容端点（toUIMessageStreamResponse）。
 * 协议为 SSE，data 为 JSON：{ type: 'text-delta' | 'tool-input-start' |
 * 'tool-input-delta' | 'tool-output-available' | 'data-*' | 'error' | 'finish' ... }
 *
 * 兼容旧版 Data Stream Protocol（0:"text" 前缀帧）。
 */
import type { AgentEvent, RunInput } from '../../types'
import type { AgentAdapterOptions, AgentRequestSpec, AgentStreamAdapter } from '../types'
import { ev, parseSse, safeJson, TextMessageEmitter, ToolCallAggregator } from './stream-utils'

export const aiSdkAdapter: AgentStreamAdapter = {
  id: 'ai-sdk',
  capabilities: { streaming: true, tools: false, hitl: false, sharedState: false, pipeline: false },

  buildRunRequest(input: RunInput, options: AgentAdapterOptions): AgentRequestSpec {
    return {
      url: options.endpoint,
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        ...options.headers,
      },
      body: {
        id: input.sessionId,
        messages: input.messages.map((m) => ({
          id: m.id,
          role: m.role,
          parts: [{ type: 'text', text: m.content }],
        })),
        ...(options.extra ?? {}),
      },
    }
  },

  async *parseStream(body, runId, _options): AsyncIterable<AgentEvent> {
    const text = new TextMessageEmitter(runId)
    const tools = new ToolCallAggregator(runId)

    for await (const frame of parseSse(body)) {
      if (frame.data === '[DONE]') break

      // 新版 UI Message Stream：data 为 JSON 对象
      const e = safeJson(frame.data)
      if (e?.type) {
        switch (e.type) {
          case 'text-delta':
            if (e.delta) yield* text.delta(e.delta)
            break
          case 'tool-input-start':
            yield tools.start(e.toolCallId, e.toolName)
            break
          case 'tool-input-delta':
            tools.appendArgs(e.toolCallId, e.inputTextDelta ?? '')
            break
          case 'tool-input-available':
            yield* tools.flushArgs(e.toolCallId)
            break
          case 'tool-output-available':
            yield* tools.result(e.toolCallId, e.output)
            break
          case 'error':
            yield* text.end()
            yield ev('RUN_ERROR', runId, { message: e.errorText ?? '流错误' })
            return
          case 'finish':
            yield* text.end()
            break
          default:
            // data-* 自定义部件：约定 data-payload 为结构化载荷
            if (typeof e.type === 'string' && e.type === 'data-payload' && e.data?.type) {
              yield ev('STRUCTURED_PAYLOAD', runId, e.data)
            }
        }
        continue
      }

      // 旧版 Data Stream Protocol：`0:"text"` / `9:{...}` / `3:"error"` 前缀行
      const m = frame.data.match(/^([0-9a-z]+):(.*)$/s)
      if (m) {
        const [, prefix, payload] = m
        if (prefix === '0') {
          const t = safeJson<string>(payload)
          if (typeof t === 'string') yield* text.delta(t)
        } else if (prefix === '9') {
          const tc = safeJson<any>(payload)
          if (tc?.toolCallId) {
            yield tools.start(tc.toolCallId, tc.toolName)
            tools.appendArgs(tc.toolCallId, JSON.stringify(tc.args ?? {}))
            yield* tools.flushArgs(tc.toolCallId)
          }
        } else if (prefix === 'a') {
          const tr = safeJson<any>(payload)
          if (tr?.toolCallId) {
            yield* tools.result(tr.toolCallId, tr.result)
          }
        } else if (prefix === '3') {
          yield* text.end()
          yield ev('RUN_ERROR', runId, { message: safeJson<string>(payload) ?? '流错误' })
          return
        }
      }
    }
    yield* text.end()
  },
}
