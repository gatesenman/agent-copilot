/**
 * coze — Coze（扣子）v3 chat 协议适配器
 *
 * POST {endpoint}/v3/chat（stream: true）SSE：
 *   event: conversation.message.delta      → TEXT_DELTA（type=answer）
 *   event: conversation.message.completed  → 工具调用（type=function_call）/ 知识召回等
 *   event: conversation.chat.completed     → USAGE + 结束
 *   event: conversation.chat.failed        → RUN_ERROR
 *
 * protocolOptions: { botId: 'bot_id', userId: 'user_id' }
 */
import type { AgentEvent, RunInput } from '../../types'
import type { AgentAdapterOptions, AgentRequestSpec, AgentStreamAdapter } from '../types'
import { ev, parseSse, safeJson, TextMessageEmitter, ToolCallAggregator } from './stream-utils'

export const cozeAdapter: AgentStreamAdapter = {
  id: 'coze',
  capabilities: { streaming: true, tools: false, hitl: false, sharedState: false, pipeline: false },

  buildRunRequest(input: RunInput, options: AgentAdapterOptions): AgentRequestSpec {
    return {
      url: `${options.endpoint}/v3/chat`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey ?? ''}`,
        ...options.headers,
      },
      body: {
        bot_id: (options.extra?.botId as string) ?? '',
        user_id: (options.extra?.userId as string) ?? input.sessionId,
        stream: true,
        auto_save_history: true,
        additional_messages: input.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            role: m.role,
            content: m.content,
            content_type: 'text',
          })),
      },
    }
  },

  async *parseStream(body, runId, _options): AsyncIterable<AgentEvent> {
    const text = new TextMessageEmitter(runId)
    const tools = new ToolCallAggregator(runId)
    let toolSeq = 0

    for await (const frame of parseSse(body)) {
      if (frame.data === '[DONE]' || frame.data === '"[DONE]"') break
      const e = safeJson(frame.data)
      if (e == null) continue

      switch (frame.event) {
        case 'conversation.message.delta':
          if (e.type === 'answer' && e.content) yield* text.delta(e.content)
          break
        case 'conversation.message.completed': {
          if (e.type === 'function_call') {
            const call = safeJson<any>(e.content) ?? {}
            const id = `coze_tool_${Date.now()}_${toolSeq++}`
            yield tools.start(id, call.name ?? 'plugin')
            tools.appendArgs(id, JSON.stringify(call.arguments ?? {}))
            yield* tools.flushArgs(id)
          } else if (e.type === 'tool_response') {
            yield ev('REACT_STEP', runId, { type: 'observation', content: String(e.content ?? '').slice(0, 500) })
          } else if (e.type === 'knowledge') {
            yield ev('REACT_STEP', runId, { type: 'observation', content: `知识召回: ${String(e.content ?? '').slice(0, 300)}` })
          }
          break
        }
        case 'conversation.chat.completed': {
          const u = e.usage
          if (u) {
            yield ev('USAGE', runId, {
              promptTokens: u.input_count ?? 0,
              completionTokens: u.output_count ?? 0,
              totalTokens: u.token_count ?? 0,
            })
          }
          yield* text.end()
          break
        }
        case 'conversation.chat.failed':
          yield* text.end()
          yield ev('RUN_ERROR', runId, { message: e.last_error?.msg ?? 'Coze 运行失败' })
          return
      }
    }
    yield* text.end()
  },
}
