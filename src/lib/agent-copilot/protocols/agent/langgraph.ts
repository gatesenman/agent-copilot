/**
 * langgraph — LangGraph Platform 协议适配器
 *
 * 使用 /runs/stream 无状态端点（stream_mode: ["messages", "updates"]）：
 * - messages 模式：AIMessageChunk 增量（content / tool_call_chunks）
 * - updates 模式：节点级状态更新 → AGENT_STATE；__interrupt__ → INTERRUPT（HITL）
 * - 恢复：POST /runs/stream + command: { resume: ... }（需 protocolOptions.threadId 支持）
 *
 * protocolOptions: { assistantId: 'agent' }
 */
import type { AgentEvent, RunInput } from '../../types'
import type { AgentAdapterOptions, AgentRequestSpec, AgentStreamAdapter } from '../types'
import { ev, parseSse, safeJson, TextMessageEmitter, ToolCallAggregator } from './stream-utils'

function headers(options: AgentAdapterOptions): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(options.apiKey ? { 'x-api-key': options.apiKey } : {}),
    ...options.headers,
  }
}

export const langgraphAdapter: AgentStreamAdapter = {
  id: 'langgraph',
  capabilities: { streaming: true, tools: false, hitl: true, sharedState: true, pipeline: false },

  buildRunRequest(input: RunInput, options: AgentAdapterOptions): AgentRequestSpec {
    const assistantId = (options.extra?.assistantId as string) ?? 'agent'
    return {
      url: `${options.endpoint}/threads/${encodeURIComponent(input.sessionId)}/runs/stream`,
      headers: headers(options),
      body: {
        assistant_id: assistantId,
        input: {
          messages: input.messages.map((m) => ({
            type: m.role === 'assistant' ? 'ai' : m.role === 'user' ? 'human' : 'system',
            content: m.content,
          })),
        },
        stream_mode: ['messages', 'updates'],
        if_not_exists: 'create',
        ...(typeof options.extra?.config === 'object' ? { config: options.extra.config } : {}),
      },
    }
  },

  buildResumeRequest(sessionId, _runId, response, options): AgentRequestSpec {
    const assistantId = (options.extra?.assistantId as string) ?? 'agent'
    return {
      url: `${options.endpoint}/threads/${encodeURIComponent(sessionId)}/runs/stream`,
      headers: headers(options),
      body: {
        assistant_id: assistantId,
        command: {
          resume: response.approved != null
            ? { approved: response.approved, comment: response.comment }
            : response.payload ?? response.comment,
        },
        stream_mode: ['messages', 'updates'],
      },
    }
  },

  async *parseStream(body, runId, _options): AsyncIterable<AgentEvent> {
    const text = new TextMessageEmitter(runId)
    const tools = new ToolCallAggregator(runId)
    /** tool_call_chunk index → toolCallId（已发 START 的） */
    const startedTools = new Map<number, string>()

    for await (const frame of parseSse(body)) {
      const data = safeJson(frame.data)
      if (data == null) continue
      const eventName = frame.event ?? ''

      if (eventName.startsWith('messages')) {
        // data: [AIMessageChunk, metadata]
        const chunk = Array.isArray(data) ? data[0] : data
        if (!chunk) continue

        // ToolMessage 的 content 是工具结果，不进入文本通道
        const isToolMessage = chunk.type === 'tool' && chunk.tool_call_id
        const content = typeof chunk.content === 'string'
          ? chunk.content
          : Array.isArray(chunk.content)
            ? chunk.content.filter((b: any) => b.type === 'text' || typeof b === 'string')
                .map((b: any) => (typeof b === 'string' ? b : b.text)).join('')
            : ''
        if (content && !isToolMessage) yield* text.delta(content)

        for (const tc of chunk.tool_call_chunks ?? []) {
          const idx = tc.index ?? 0
          if (tc.id && tc.name && !startedTools.has(idx)) {
            startedTools.set(idx, tc.id)
            yield tools.start(tc.id, tc.name)
          }
          const id = startedTools.get(idx)
          if (id && tc.args) tools.appendArgs(id, tc.args)
        }

        // ToolMessage（工具结果）
        if (chunk.type === 'tool' && chunk.tool_call_id) {
          yield* tools.result(
            chunk.tool_call_id,
            safeJson(chunk.content) ?? chunk.content,
            chunk.status === 'error' ? 'failed' : 'succeeded',
          )
        }
      } else if (eventName.startsWith('updates')) {
        // 节点级更新：{ nodeName: stateUpdate } 或 { __interrupt__: [...] }
        if (data.__interrupt__) {
          const intr = Array.isArray(data.__interrupt__) ? data.__interrupt__[0] : data.__interrupt__
          yield* text.end()
          yield ev('INTERRUPT', runId, {
            id: intr?.id ?? `lg_intr_${Date.now()}`,
            kind: 'approval',
            title: '需要人工确认',
            description: typeof intr?.value === 'string' ? intr.value : JSON.stringify(intr?.value ?? {}),
            payload: intr?.value,
          })
          return // 中断挂起，等待 resume
        }
        for (const [node, update] of Object.entries(data)) {
          if (node.startsWith('__')) continue
          yield ev('AGENT_STATE_DELTA', runId, { [node]: update })
        }
      } else if (eventName === 'error') {
        yield* text.end()
        yield ev('RUN_ERROR', runId, { message: data?.message ?? JSON.stringify(data).slice(0, 300) })
      }
    }
    yield* text.end()
  },
}
