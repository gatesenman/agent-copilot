/**
 * agentscope — 本项目 Java (Spring Boot) 后端协议适配器
 *
 * 服务端事件本身就是 AgentEvent（AG-UI 风格），直接透传。
 * 全能力：流式 / 前端工具 / HITL / 共享状态 / 5+1 流水线可观测。
 *
 * 端点：
 *   POST {endpoint}/chat    发起运行
 *   POST {endpoint}/resume  恢复 HITL 中断
 *   POST {endpoint}/cancel  取消
 */
import type { AgentEvent, RunInput } from '../../types'
import type { AgentAdapterOptions, AgentRequestSpec, AgentStreamAdapter } from '../types'
import { parseSse, safeJson } from './stream-utils'

function headers(options: AgentAdapterOptions): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
    ...options.headers,
  }
}

export const agentscopeAdapter: AgentStreamAdapter = {
  id: 'agentscope',
  capabilities: { streaming: true, tools: true, hitl: true, sharedState: true, pipeline: true },

  buildRunRequest(input: RunInput, options: AgentAdapterOptions): AgentRequestSpec {
    return {
      url: `${options.endpoint}/chat`,
      headers: headers(options),
      body: {
        sessionId: input.sessionId,
        runId: input.runId,
        messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
        readables: input.readables,
        // 前端 Action 仅传定义（handler 无法序列化）；
        // 后端注册为 client-side 工具，通过 TOOL_CALL_* 事件回传前端执行
        actions: input.actions.map((a) => ({
          name: a.name,
          label: a.label,
          description: a.description,
          parameters: a.parameters,
          requiresApproval: a.requiresApproval,
        })),
        additionalInstructions: input.additionalInstructions,
        systemPrompt: input.systemPrompt,
        model: input.model,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        // 运行元数据（agentMode / thinking 等，后端据此启用 reasoning 与审批策略）
        metadata: input.metadata,
      },
    }
  },

  buildResumeRequest(sessionId, runId, response, options): AgentRequestSpec {
    return {
      url: `${options.endpoint}/resume`,
      headers: headers(options),
      body: { sessionId, runId, ...response },
    }
  },

  buildCancelRequest(sessionId, runId, options): AgentRequestSpec {
    return {
      url: `${options.endpoint}/cancel`,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: { sessionId, runId },
    }
  },

  async *parseStream(body, _runId, _options): AsyncIterable<AgentEvent> {
    for await (const frame of parseSse(body)) {
      if (!frame.data || frame.data === '[DONE]') continue
      const event = safeJson<AgentEvent>(frame.data)
      if (event?.type) yield event
    }
  },
}
