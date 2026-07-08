/**
 * a2a — A2A（Agent-to-Agent）协议适配器
 * https://a2a-protocol.org — Google 发起、Linux 基金会托管的智能体互操作标准。
 *
 * 传输：JSON-RPC 2.0 over HTTP，message/stream 方法返回 SSE。
 * 概念映射：
 *   Task 状态机（submitted/working/input-required/completed/failed/canceled）
 *     → STAGE_* 流水线事件 + AGENT_STATE_DELTA（暴露 a2aTask 状态给 UI）
 *   Message(role=agent).parts[text]  → 文本增量
 *   Artifact                          → STRUCTURED_PAYLOAD（artifact 载荷）
 *   input-required                    → INTERRUPT_REQUEST（HITL：任务等待补充输入）
 *
 * extra 支持：{ agentUrl?: string }（Agent Card 中的服务地址，缺省用 endpoint）
 */
import type { AgentEvent, RunInput } from '../../types'
import type { AgentAdapterOptions, AgentRequestSpec, AgentStreamAdapter } from '../types'
import { ev, parseSse, safeJson, TextMessageEmitter } from './stream-utils'

/** A2A Task 状态 → 中文标签（供 UI 徽章使用） */
export const A2A_TASK_STATES: Record<string, string> = {
  submitted: '已提交',
  working: '处理中',
  'input-required': '等待输入',
  completed: '已完成',
  failed: '已失败',
  canceled: '已取消',
  rejected: '已拒绝',
  'auth-required': '需要认证',
}

function extractText(message: any): string {
  if (!message?.parts) return ''
  return message.parts
    .filter((p: any) => p.kind === 'text' || p.type === 'text')
    .map((p: any) => p.text ?? '')
    .join('')
}

export const a2aAdapter: AgentStreamAdapter = {
  id: 'a2a',
  capabilities: { streaming: true, tools: false, hitl: true, sharedState: true, pipeline: true },

  buildRunRequest(input: RunInput, options: AgentAdapterOptions): AgentRequestSpec {
    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user')
    return {
      url: (options.extra?.agentUrl as string) ?? options.endpoint,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        ...options.headers,
      },
      body: {
        jsonrpc: '2.0',
        id: input.runId,
        method: 'message/stream',
        params: {
          message: {
            role: 'user',
            parts: [{ kind: 'text', text: lastUser?.content ?? '' }],
            messageId: lastUser?.id ?? input.runId,
            // 会话续聊：contextId 由服务端首次响应分配，客户端透传
            ...(options.extra?.contextId ? { contextId: options.extra.contextId } : {}),
            ...(options.extra?.taskId ? { taskId: options.extra.taskId } : {}),
          },
          configuration: { acceptedOutputModes: ['text/plain', 'application/json'] },
        },
      },
    }
  },

  buildResumeRequest(sessionId, runId, response, options): AgentRequestSpec {
    // input-required 恢复：把用户补充内容作为新消息发到同一 task
    return {
      url: (options.extra?.agentUrl as string) ?? options.endpoint,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        ...options.headers,
      },
      body: {
        jsonrpc: '2.0',
        id: `${runId}_resume`,
        method: 'message/stream',
        params: {
          message: {
            role: 'user',
            parts: [{ kind: 'text', text: response.comment ?? (response.approved ? '确认' : '取消') }],
            messageId: `${runId}_resume_msg`,
            taskId: response.interruptId, // interruptId 即 A2A taskId
          },
        },
      },
    }
  },

  buildCancelRequest(sessionId, runId, options): AgentRequestSpec | null {
    const taskId = options.extra?.taskId
    if (!taskId) return null
    return {
      url: (options.extra?.agentUrl as string) ?? options.endpoint,
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        ...options.headers,
      },
      body: { jsonrpc: '2.0', id: `${runId}_cancel`, method: 'tasks/cancel', params: { id: taskId } },
    }
  },

  async *parseStream(body, runId, _options): AsyncIterable<AgentEvent> {
    const text = new TextMessageEmitter(runId)
    let started = false
    let lastState = ''

    for await (const frame of parseSse(body)) {
      const rpc = safeJson(frame.data)
      const result = rpc?.result
      if (!result) continue

      if (!started) {
        started = true
        yield ev('RUN_STARTED', runId, {})
      }

      // Task 对象或 TaskStatusUpdateEvent
      const status = result.status ?? (result.kind === 'status-update' ? result : null)
      const state: string | undefined = status?.state ?? result.status?.state

      if (state && state !== lastState) {
        lastState = state
        // 状态机 → 流水线阶段 + 共享状态
        yield ev('AGENT_STATE_DELTA', runId, {
          a2aTask: { id: result.taskId ?? result.id, state, label: A2A_TASK_STATES[state] ?? state },
        })
        if (state === 'working') {
          yield ev('STAGE_STARTED', runId, { stage: 'acting', label: 'A2A 任务处理中' })
        }
        if (state === 'input-required') {
          yield* text.end()
          yield ev('INTERRUPT', runId, {
            interruptId: result.taskId ?? result.id ?? runId,
            kind: 'input',
            title: 'Agent 需要补充输入',
            description: extractText(status?.message) || '远端 Agent 等待更多信息才能继续',
          })
          continue
        }
        if (state === 'completed') {
          yield ev('STAGE_FINISHED', runId, { stage: 'acting' })
        }
        if (state === 'failed') {
          yield* text.end()
          yield ev('RUN_ERROR', runId, { message: extractText(status?.message) || 'A2A 任务失败' })
          continue
        }
      }

      // 增量消息文本（status.message 或流式 Message 事件）
      const msgText = result.kind === 'message' ? extractText(result) : extractText(status?.message)
      if (msgText && state !== 'input-required' && state !== 'failed') {
        yield* text.delta(msgText)
      }

      // Artifact → 结构化载荷
      if (result.kind === 'artifact-update' && result.artifact) {
        const a = result.artifact
        const textPart = (a.parts ?? []).find((p: any) => p.kind === 'text')
        const dataPart = (a.parts ?? []).find((p: any) => p.kind === 'data')
        if (dataPart?.data?.type) {
          yield ev('STRUCTURED_PAYLOAD', runId, dataPart.data)
        } else if (textPart?.text) {
          yield ev('STRUCTURED_PAYLOAD', runId, {
            type: 'document', title: a.name ?? 'Artifact', data: { text: textPart.text },
          })
        }
      }

      // final 标记：任务终态
      if (result.final === true || lastState === 'completed' || lastState === 'canceled') {
        yield* text.end()
        yield ev('RUN_FINISHED', runId, {})
        return
      }
    }
    yield* text.end()
    yield ev('RUN_FINISHED', runId, {})
  },
}
