/**
 * acp — ACP（Agent Communication Protocol）适配器
 * IBM BeeAI 发起的 REST 风格智能体通信协议（现已并入 A2A 项目，但存量部署广泛）。
 *
 * 传输：POST /runs（stream=true 时 SSE）。
 * 概念映射：
 *   run.status（created/in-progress/awaiting/completed/failed/cancelled）
 *     → 流水线阶段 + AGENT_STATE_DELTA
 *   MessagePart（content_type=text/*）  → 文本增量
 *   MessagePart（application/json）      → STRUCTURED_PAYLOAD
 *   awaiting（await_request）            → INTERRUPT_REQUEST
 *
 * extra 支持：{ agentName: string }（必填，目标 Agent 名）
 */
import type { AgentEvent, RunInput } from '../../types'
import type { AgentAdapterOptions, AgentRequestSpec, AgentStreamAdapter } from '../types'
import { ev, parseSse, safeJson, TextMessageEmitter } from './stream-utils'

function partText(parts: any[]): string {
  return (parts ?? [])
    .filter((p) => (p.content_type ?? '').startsWith('text/') && typeof p.content === 'string')
    .map((p) => p.content)
    .join('')
}

export const acpAdapter: AgentStreamAdapter = {
  id: 'acp' as any,
  capabilities: { streaming: true, tools: false, hitl: true, sharedState: true, pipeline: true },

  buildRunRequest(input: RunInput, options: AgentAdapterOptions): AgentRequestSpec {
    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user')
    return {
      url: `${options.endpoint.replace(/\/$/, '')}/runs`,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        ...options.headers,
      },
      body: {
        agent_name: options.extra?.agentName ?? 'default',
        session_id: input.sessionId,
        input: [{
          role: 'user',
          parts: [{ content_type: 'text/plain', content: lastUser?.content ?? '' }],
        }],
        mode: 'stream',
      },
    }
  },

  buildResumeRequest(sessionId, runId, response, options): AgentRequestSpec {
    // awaiting 恢复：POST /runs/{run_id} 提交 await_resume
    return {
      url: `${options.endpoint.replace(/\/$/, '')}/runs/${response.interruptId}`,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        ...options.headers,
      },
      body: {
        await_resume: response.payload ?? { approved: response.approved, comment: response.comment },
        mode: 'stream',
      },
    }
  },

  buildCancelRequest(sessionId, runId, options): AgentRequestSpec | null {
    const acpRunId = options.extra?.acpRunId
    if (!acpRunId) return null
    return {
      url: `${options.endpoint.replace(/\/$/, '')}/runs/${acpRunId}/cancel`,
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        ...options.headers,
      },
      body: {},
    }
  },

  async *parseStream(body, runId, _options): AsyncIterable<AgentEvent> {
    const text = new TextMessageEmitter(runId)
    let started = false

    for await (const frame of parseSse(body)) {
      const e = safeJson(frame.data)
      if (!e) continue

      if (!started) {
        started = true
        yield ev('RUN_STARTED', runId, {})
      }

      const type: string = e.type ?? ''

      // run 生命周期事件
      if (type === 'run.created' || type === 'run.in-progress') {
        const status = e.run?.status ?? (type === 'run.created' ? 'created' : 'in-progress')
        yield ev('AGENT_STATE_DELTA', runId, { acpRun: { id: e.run?.run_id, status } })
        if (status === 'in-progress') {
          yield ev('STAGE_STARTED', runId, { stage: 'acting', label: 'ACP Agent 处理中' })
        }
        continue
      }

      if (type === 'run.awaiting' || e.run?.status === 'awaiting') {
        yield* text.end()
        const awaitReq = e.run?.await_request ?? {}
        yield ev('INTERRUPT', runId, {
          interruptId: e.run?.run_id ?? runId,
          kind: 'approval',
          title: awaitReq.title ?? 'Agent 等待确认',
          description: awaitReq.description ?? '远端 Agent 请求人工确认后继续',
          payload: awaitReq,
        })
        continue
      }

      if (type === 'run.completed') {
        yield* text.end()
        yield ev('STAGE_FINISHED', runId, { stage: 'acting' })
        // 非流式部分输出兜底：completed 携带完整 output
        const finalText = (e.run?.output ?? []).map((m: any) => partText(m.parts)).join('')
        if (finalText && !text.active) {
          // 若之前没有任何增量（非流式 Agent），一次性发出
          yield* text.delta(finalText)
          yield* text.end()
        }
        yield ev('RUN_FINISHED', runId, {})
        return
      }

      if (type === 'run.failed') {
        yield* text.end()
        yield ev('RUN_ERROR', runId, { message: e.run?.error?.message ?? 'ACP 运行失败' })
        return
      }

      if (type === 'run.cancelled') {
        yield* text.end()
        yield ev('RUN_FINISHED', runId, { cancelled: true })
        return
      }

      // 消息流事件：message.part（增量）/ message.completed（整条）
      if (type === 'message.part' && e.part) {
        const ct: string = e.part.content_type ?? ''
        if (ct.startsWith('text/')) {
          yield* text.delta(e.part.content ?? '')
        } else if (ct === 'application/json') {
          const data = typeof e.part.content === 'string' ? safeJson(e.part.content) : e.part.content
          if (data?.type) yield ev('STRUCTURED_PAYLOAD', runId, data)
        }
        continue
      }

      if (type === 'message.completed' && e.message) {
        const t = partText(e.message.parts)
        if (t && !text.active) yield* text.delta(t)
        yield* text.end()
      }
    }
    yield* text.end()
    yield ev('RUN_FINISHED', runId, {})
  },
}
