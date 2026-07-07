/**
 * ag-ui — AG-UI 标准协议适配器（https://docs.ag-ui.com）
 *
 * AG-UI 事件 → AgentEvent 映射：
 *   RUN_STARTED / RUN_FINISHED / RUN_ERROR       → 同名
 *   TEXT_MESSAGE_START / CONTENT / END           → TEXT_MESSAGE_START / TEXT_DELTA / TEXT_MESSAGE_END
 *   TOOL_CALL_START / ARGS / END / RESULT        → TOOL_CALL_START / TOOL_CALL_ARGS（聚合）/ TOOL_CALL_RESULT
 *   STATE_SNAPSHOT / STATE_DELTA                 → AGENT_STATE_DELTA
 *   CUSTOM（结构化载荷约定）                       → STRUCTURED_PAYLOAD
 */
import type { AgentEvent, RunInput } from '../../types'
import type { AgentAdapterOptions, AgentRequestSpec, AgentStreamAdapter } from '../types'
import { ev, parseSse, safeJson, TextMessageEmitter, ToolCallAggregator } from './stream-utils'

export const agUiAdapter: AgentStreamAdapter = {
  id: 'ag-ui',
  capabilities: { streaming: true, tools: true, hitl: false, sharedState: true, pipeline: false },

  buildRunRequest(input: RunInput, options: AgentAdapterOptions): AgentRequestSpec {
    return {
      url: options.endpoint,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        ...options.headers,
      },
      body: {
        threadId: input.sessionId,
        runId: input.runId,
        messages: input.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
        tools: input.actions.map((a) => ({
          name: a.name,
          description: a.description,
          parameters: { type: 'object', properties: Object.fromEntries(
            (a.parameters ?? []).map((p) => [p.name, { type: p.type, description: p.description }]),
          ), required: (a.parameters ?? []).filter((p) => p.required).map((p) => p.name) },
        })),
        context: input.readables.map((r) => ({ description: r.description, value: r.value })),
        state: {},
        forwardedProps: options.extra ?? {},
      },
    }
  },

  async *parseStream(body, runId, _options): AsyncIterable<AgentEvent> {
    const text = new TextMessageEmitter(runId)
    const tools = new ToolCallAggregator(runId)
    let agentState: Record<string, unknown> = {}

    for await (const frame of parseSse(body)) {
      const e = safeJson(frame.data)
      if (!e?.type) continue

      switch (e.type) {
        case 'RUN_STARTED':
          yield ev('RUN_STARTED', runId, { sessionId: e.threadId })
          break
        case 'RUN_FINISHED':
          yield* text.end()
          yield ev('RUN_FINISHED', runId, {})
          break
        case 'RUN_ERROR':
          yield* text.end()
          yield ev('RUN_ERROR', runId, { message: e.message ?? '远端运行错误' })
          break
        case 'TEXT_MESSAGE_START':
          yield ev('TEXT_MESSAGE_START', runId, { messageId: e.messageId })
          break
        case 'TEXT_MESSAGE_CONTENT':
          yield ev('TEXT_DELTA', runId, { messageId: e.messageId, delta: e.delta ?? '' })
          break
        case 'TEXT_MESSAGE_END':
          yield ev('TEXT_MESSAGE_END', runId, { messageId: e.messageId })
          break
        case 'TOOL_CALL_START':
          yield tools.start(e.toolCallId, e.toolCallName)
          break
        case 'TOOL_CALL_ARGS':
          tools.appendArgs(e.toolCallId, e.delta ?? '')
          break
        case 'TOOL_CALL_END':
          yield* tools.flushArgs(e.toolCallId)
          break
        case 'TOOL_CALL_RESULT':
          yield* tools.result(e.toolCallId, safeJson(e.content ?? '') ?? e.content)
          break
        case 'STATE_SNAPSHOT':
          agentState = e.snapshot ?? {}
          yield ev('AGENT_STATE_DELTA', runId, agentState)
          break
        case 'STATE_DELTA':
          // JSON Patch 简化处理：replace/add 直接按 path 首段合并
          for (const op of e.delta ?? []) {
            if ((op.op === 'replace' || op.op === 'add') && typeof op.path === 'string') {
              const key = op.path.replace(/^\//, '').split('/')[0]
              if (key) agentState = { ...agentState, [key]: op.value }
            }
          }
          yield ev('AGENT_STATE_DELTA', runId, agentState)
          break
        case 'CUSTOM':
          // 约定：name 为 structured_payload 时映射为生成式 UI 载荷
          if (e.name === 'structured_payload' && e.value?.type) {
            yield ev('STRUCTURED_PAYLOAD', runId, e.value)
          }
          break
      }
    }
    yield* text.end()
  },
}
