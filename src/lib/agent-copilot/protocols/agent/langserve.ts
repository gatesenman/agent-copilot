/**
 * langserve — LangChain LangServe /stream_events 协议适配器
 *
 * 事件映射（v2 事件流）：
 *   on_chat_model_stream → TEXT_DELTA（AIMessageChunk.content）
 *   on_tool_start        → TOOL_CALL_START + ARGS
 *   on_tool_end          → TOOL_CALL_RESULT
 *   on_chain_error 等    → RUN_ERROR
 */
import type { AgentEvent, RunInput } from '../../types'
import type { AgentAdapterOptions, AgentRequestSpec, AgentStreamAdapter } from '../types'
import { ev, parseSse, safeJson, TextMessageEmitter, ToolCallAggregator } from './stream-utils'

export const langserveAdapter: AgentStreamAdapter = {
  id: 'langserve',
  capabilities: { streaming: true, tools: false, hitl: false, sharedState: false, pipeline: false },

  buildRunRequest(input: RunInput, options: AgentAdapterOptions): AgentRequestSpec {
    // LangServe 链输入形状由链定义决定；默认约定 { input: { messages | question } }
    const inputKey = (options.extra?.inputKey as string) ?? 'messages'
    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user')?.content ?? ''
    const chainInput = inputKey === 'messages'
      ? { messages: input.messages.map((m) => ({ type: m.role === 'assistant' ? 'ai' : 'human', content: m.content })) }
      : { [inputKey]: lastUser }

    return {
      url: `${options.endpoint}/stream_events`,
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        ...options.headers,
      },
      body: {
        input: chainInput,
        config: (options.extra?.config as object) ?? {},
        version: 'v2',
      },
    }
  },

  async *parseStream(body, runId, _options): AsyncIterable<AgentEvent> {
    const text = new TextMessageEmitter(runId)
    const tools = new ToolCallAggregator(runId)
    let toolSeq = 0
    /** run_id → toolCallId */
    const toolIds = new Map<string, string>()

    for await (const frame of parseSse(body)) {
      const e = safeJson(frame.data)
      if (!e?.event) continue

      switch (e.event) {
        case 'on_chat_model_stream': {
          const chunk = e.data?.chunk
          const content = typeof chunk?.content === 'string'
            ? chunk.content
            : Array.isArray(chunk?.content)
              ? chunk.content.map((b: any) => (typeof b === 'string' ? b : b?.text ?? '')).join('')
              : ''
          if (content) yield* text.delta(content)
          break
        }
        case 'on_tool_start': {
          const id = `ls_tool_${Date.now()}_${toolSeq++}`
          toolIds.set(e.run_id, id)
          yield tools.start(id, e.name ?? 'tool')
          tools.appendArgs(id, JSON.stringify(e.data?.input ?? {}))
          yield* tools.flushArgs(id)
          break
        }
        case 'on_tool_end': {
          const id = toolIds.get(e.run_id)
          if (id) {
            const output = e.data?.output
            yield* tools.result(id, typeof output === 'string' ? (safeJson(output) ?? output) : output)
          }
          break
        }
        case 'on_chain_error':
        case 'on_llm_error':
        case 'on_tool_error':
          yield* text.end()
          yield ev('RUN_ERROR', runId, { message: String(e.data?.error ?? '链执行错误').slice(0, 300) })
          return
      }
    }
    yield* text.end()
  },
}
