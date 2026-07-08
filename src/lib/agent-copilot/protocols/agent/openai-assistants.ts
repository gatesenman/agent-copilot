/**
 * openai-assistants — OpenAI Assistants API v2 适配器
 *
 * 传输：POST /threads/runs（createThreadAndRun, stream=true）SSE。
 * 事件映射：
 *   thread.run.created / queued / in_progress → RUN_STARTED + 流水线阶段
 *   thread.message.delta                       → 文本增量
 *   thread.run.step.delta（tool_calls）        → TOOL_CALL_*（前端工具下发）
 *   thread.run.requires_action                 → INTERRUPT_REQUEST（submit_tool_outputs）
 *   thread.run.completed / failed              → RUN_FINISHED / RUN_ERROR
 *
 * extra 支持：{ assistantId: string }（必填）
 */
import type { AgentEvent, RunInput } from '../../types'
import type { AgentAdapterOptions, AgentRequestSpec, AgentStreamAdapter } from '../types'
import { ev, parseSse, safeJson, TextMessageEmitter, ToolCallAggregator } from './stream-utils'

export const openaiAssistantsAdapter: AgentStreamAdapter = {
  id: 'openai-assistants' as any,
  capabilities: { streaming: true, tools: true, hitl: true, sharedState: false, pipeline: true },

  buildRunRequest(input: RunInput, options: AgentAdapterOptions): AgentRequestSpec {
    return {
      url: `${options.endpoint.replace(/\/$/, '')}/threads/runs`,
      headers: {
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        ...options.headers,
      },
      body: {
        assistant_id: options.extra?.assistantId,
        stream: true,
        thread: {
          messages: input.messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content })),
        },
        // 前端注册的工具下发为 function tools
        tools: input.actions.map((a) => ({
          type: 'function',
          function: {
            name: a.name,
            description: a.description,
            parameters: {
              type: 'object',
              properties: Object.fromEntries(
                (a.parameters ?? []).map((p) => [p.name, { type: p.type, description: p.description }]),
              ),
              required: (a.parameters ?? []).filter((p) => p.required).map((p) => p.name),
            },
          },
        })),
      },
    }
  },

  buildResumeRequest(sessionId, runId, response, options): AgentRequestSpec {
    // requires_action 恢复：submit_tool_outputs（interruptId 格式 threadId:runId:toolCallId）
    const [threadId, oaRunId, toolCallId] = response.interruptId.split(':')
    return {
      url: `${options.endpoint.replace(/\/$/, '')}/threads/${threadId}/runs/${oaRunId}/submit_tool_outputs`,
      headers: {
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        ...options.headers,
      },
      body: {
        stream: true,
        tool_outputs: [{
          tool_call_id: toolCallId,
          output: JSON.stringify(response.payload ?? { approved: response.approved, comment: response.comment }),
        }],
      },
    }
  },

  async *parseStream(body, runId, _options): AsyncIterable<AgentEvent> {
    const text = new TextMessageEmitter(runId)
    const tools = new ToolCallAggregator(runId)
    let started = false

    for await (const frame of parseSse(body)) {
      if (frame.data === '[DONE]') break
      const data = safeJson(frame.data)
      if (!data) continue
      const eventType = frame.event ?? data.object ?? ''

      if (eventType === 'thread.run.created') {
        started = true
        yield ev('RUN_STARTED', runId, { threadId: data.thread_id })
        continue
      }
      if (!started) {
        started = true
        yield ev('RUN_STARTED', runId, {})
      }

      switch (eventType) {
        case 'thread.run.in_progress':
          yield ev('STAGE_STARTED', runId, { stage: 'acting', label: 'Assistant 处理中' })
          break

        case 'thread.message.delta': {
          const parts = data.delta?.content ?? []
          for (const p of parts) {
            if (p.type === 'text' && p.text?.value) yield* text.delta(p.text.value)
          }
          break
        }

        case 'thread.run.step.delta': {
          const toolCalls = data.delta?.step_details?.tool_calls ?? []
          for (const tc of toolCalls) {
            if (tc.type !== 'function' || !tc.id) continue
            if (tc.function?.name) yield tools.start(tc.id, tc.function.name)
            if (tc.function?.arguments) tools.appendArgs(tc.id, tc.function.arguments)
          }
          break
        }

        case 'thread.run.step.completed': {
          // 工具步骤完成：function.output 即工具结果（code_interpreter / 已提交输出的 function）
          const doneCalls = data.step_details?.tool_calls ?? []
          for (const tc of doneCalls) {
            if (!tc.id) continue
            if (tc.type === 'function' && tc.function?.output != null) {
              yield* tools.result(tc.id, safeJson(tc.function.output) ?? tc.function.output)
            } else if (tc.type === 'code_interpreter' && tc.code_interpreter?.outputs) {
              yield* tools.result(tc.id, tc.code_interpreter.outputs)
            }
          }
          break
        }

        case 'thread.run.requires_action': {
          yield* text.end()
          const calls = data.required_action?.submit_tool_outputs?.tool_calls ?? []
          for (const tc of calls) {
            yield* tools.flushArgs(tc.id)
            yield ev('INTERRUPT', runId, {
              interruptId: `${data.thread_id}:${data.id}:${tc.id}`,
              kind: 'approval',
              title: `工具调用等待确认：${tc.function?.name ?? ''}`,
              description: tc.function?.arguments ?? '',
              payload: safeJson(tc.function?.arguments ?? '') ?? {},
            })
          }
          break
        }

        case 'thread.run.completed':
          yield* text.end()
          yield ev('STAGE_FINISHED', runId, { stage: 'acting' })
          if (data.usage) {
            yield ev('USAGE', runId, {
              promptTokens: data.usage.prompt_tokens ?? 0,
              completionTokens: data.usage.completion_tokens ?? 0,
              totalTokens: data.usage.total_tokens ?? 0,
            })
          }
          yield ev('RUN_FINISHED', runId, {})
          return

        case 'thread.run.failed':
          yield* text.end()
          yield ev('RUN_ERROR', runId, { message: data.last_error?.message ?? 'Assistants 运行失败' })
          return

        case 'thread.message.completed':
          yield* text.end()
          break
      }
    }
    yield* text.end()
    yield ev('RUN_FINISHED', runId, {})
  },
}
