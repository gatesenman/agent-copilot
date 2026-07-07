/**
 * fastgpt — FastGPT 协议适配器
 *
 * POST {endpoint}/v1/chat/completions（OpenAI 兼容 + detail: true 扩展）：
 *   event: answer          → OpenAI 兼容 chunk（choices[0].delta.content）
 *   event: flowNodeStatus  → 工作流节点状态 → REACT_STEP / STAGE 可观测
 *   event: toolCall/toolParams/toolResponse → 工具事件
 *   event: flowResponses   → 结束明细
 *
 * protocolOptions: { detail?: boolean, chatId?: string, variables?: {...} }
 */
import type { AgentEvent, RunInput } from '../../types'
import type { AgentAdapterOptions, AgentRequestSpec, AgentStreamAdapter } from '../types'
import { ev, parseSse, safeJson, TextMessageEmitter, ToolCallAggregator } from './stream-utils'

export const fastgptAdapter: AgentStreamAdapter = {
  id: 'fastgpt',
  capabilities: { streaming: true, tools: false, hitl: false, sharedState: false, pipeline: true },

  buildRunRequest(input: RunInput, options: AgentAdapterOptions): AgentRequestSpec {
    return {
      url: `${options.endpoint}/v1/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey ?? ''}`,
        ...options.headers,
      },
      body: {
        chatId: (options.extra?.chatId as string) ?? input.sessionId,
        stream: true,
        detail: options.extra?.detail !== false,
        variables: (options.extra?.variables as object) ?? {},
        messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
      },
    }
  },

  async *parseStream(body, runId, _options): AsyncIterable<AgentEvent> {
    const text = new TextMessageEmitter(runId)
    const tools = new ToolCallAggregator(runId)
    let toolSeq = 0
    /** FastGPT tool id → 我们的 toolCallId */
    const toolIds = new Map<string, string>()
    let stageStarted = false

    for await (const frame of parseSse(body)) {
      if (frame.data === '[DONE]') break
      const e = safeJson(frame.data)
      if (e == null) continue

      switch (frame.event) {
        case 'flowNodeStatus': {
          // 工作流节点 → 流水线可观测
          if (!stageStarted) {
            stageStarted = true
            yield ev('STAGE_STARTED', runId, { stage: 'react_execution' })
          }
          yield ev('REACT_STEP', runId, {
            type: 'action',
            content: `节点: ${e.name ?? ''} (${e.status ?? 'running'})`,
          })
          break
        }
        case 'toolCall': {
          const tool = e.tool ?? {}
          const id = `fg_tool_${Date.now()}_${toolSeq++}`
          if (tool.id) toolIds.set(tool.id, id)
          yield tools.start(id, tool.toolName ?? tool.name ?? 'tool')
          break
        }
        case 'toolParams': {
          const id = toolIds.get(e.tool?.id) ?? [...toolIds.values()].pop()
          if (id && e.tool?.params) {
            tools.appendArgs(id, e.tool.params)
          }
          break
        }
        case 'toolResponse': {
          const id = toolIds.get(e.tool?.id) ?? [...toolIds.values()].pop()
          if (id) {
            yield* tools.result(id, safeJson(e.tool?.response ?? '') ?? e.tool?.response)
          }
          break
        }
        case 'flowResponses':
          if (stageStarted) {
            yield ev('STAGE_FINISHED', runId, { stage: 'react_execution', status: 'succeeded', summary: '工作流完成' })
          }
          break
        default: {
          // answer 事件 / 无 event 名：OpenAI 兼容 chunk
          const delta = e.choices?.[0]?.delta?.content
          if (delta) yield* text.delta(delta)
          const finish = e.choices?.[0]?.finish_reason
          if (finish === 'stop') yield* text.end()
        }
      }
    }
    yield* text.end()
  },
}
