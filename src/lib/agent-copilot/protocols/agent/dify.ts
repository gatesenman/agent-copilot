/**
 * dify — Dify chat-messages 协议适配器
 *
 * POST {endpoint}/chat-messages（response_mode: streaming）SSE 事件：
 *   message              → TEXT_DELTA（answer 增量）
 *   agent_message        → TEXT_DELTA（Agent 应用）
 *   agent_thought        → REACT_STEP（thought/tool/observation）
 *   message_end          → USAGE + 结束
 *   workflow_started/…   → PIPELINE 阶段事件（工作流应用）
 *   error                → RUN_ERROR
 *
 * 注意：工具由 Dify 服务端编排，前端注册工具不可下发（capabilities.tools = false）。
 * protocolOptions: { user: '用户标识', inputs: {...}, conversationId?: string }
 */
import type { AgentEvent, RunInput } from '../../types'
import type { AgentAdapterOptions, AgentRequestSpec, AgentStreamAdapter } from '../types'
import { ev, parseSse, safeJson, TextMessageEmitter, ToolCallAggregator } from './stream-utils'

export const difyAdapter: AgentStreamAdapter = {
  id: 'dify',
  capabilities: { streaming: true, tools: false, hitl: false, sharedState: false, pipeline: true },

  buildRunRequest(input: RunInput, options: AgentAdapterOptions): AgentRequestSpec {
    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user')?.content ?? ''
    return {
      url: `${options.endpoint}/chat-messages`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey ?? ''}`,
        ...options.headers,
      },
      body: {
        query: lastUser,
        inputs: (options.extra?.inputs as object) ?? {},
        response_mode: 'streaming',
        user: (options.extra?.user as string) ?? input.sessionId,
        conversation_id: (options.extra?.conversationId as string) ?? '',
        auto_generate_name: false,
      },
    }
  },

  async *parseStream(body, runId, _options): AsyncIterable<AgentEvent> {
    const text = new TextMessageEmitter(runId)
    const tools = new ToolCallAggregator(runId)
    let thoughtSeq = 0

    for await (const frame of parseSse(body)) {
      const e = safeJson(frame.data)
      if (!e?.event) continue

      switch (e.event) {
        case 'message':
        case 'agent_message':
          if (e.answer) yield* text.delta(e.answer)
          break
        case 'agent_thought': {
          // Dify Agent 思考步：thought + tool + observation
          if (e.thought) {
            yield ev('REACT_STEP', runId, { type: 'thought', content: e.thought })
          }
          if (e.tool) {
            const id = `dify_tool_${Date.now()}_${thoughtSeq++}`
            yield tools.start(id, e.tool)
            tools.appendArgs(id, e.tool_input ?? '{}')
            if (e.observation) {
              yield* tools.result(id, safeJson(e.observation) ?? e.observation)
            } else {
              yield* tools.flushArgs(id)
            }
          }
          break
        }
        case 'workflow_started':
          yield ev('STAGE_STARTED', runId, { stage: 'react_execution' })
          break
        case 'node_started':
          yield ev('REACT_STEP', runId, { type: 'action', content: `节点: ${e.data?.title ?? e.data?.node_type ?? ''}` })
          break
        case 'node_finished':
          yield ev('REACT_STEP', runId, { type: 'observation', content: `节点完成: ${e.data?.title ?? ''}` })
          break
        case 'workflow_finished':
          yield ev('STAGE_FINISHED', runId, { stage: 'react_execution', status: 'succeeded', summary: '工作流完成' })
          break
        case 'message_end': {
          const u = e.metadata?.usage
          if (u) {
            yield ev('USAGE', runId, {
              promptTokens: u.prompt_tokens ?? 0,
              completionTokens: u.completion_tokens ?? 0,
              totalTokens: u.total_tokens ?? 0,
            })
          }
          yield* text.end()
          break
        }
        case 'error':
          yield* text.end()
          yield ev('RUN_ERROR', runId, { message: e.message ?? 'Dify 运行错误' })
          return
      }
    }
    yield* text.end()
  },
}
