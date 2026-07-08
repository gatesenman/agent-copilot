/**
 * 协议适配器纯函数级单测：buildRunRequest 请求构造 + parseStream 帧解析。
 * mock 帧与 Java 后端 ProtocolMockController 保持同构，不依赖网络。
 */
import { describe, expect, it } from 'vitest'
import type { AgentEvent, RunInput } from '../types'
import type { AgentStreamAdapter } from '../protocols/types'
import {
  agUiAdapter, langgraphAdapter, langserveAdapter, agentscopeAdapter,
  aiSdkAdapter, difyAdapter, cozeAdapter, fastgptAdapter,
  a2aAdapter, acpAdapter, openaiAssistantsAdapter,
} from '../protocols'

// ============ 工具：字符串帧 → ReadableStream / 事件收集 ============

function sseBody(frames: string[]): ReadableStream<Uint8Array> {
  const text = frames.map((f) => `data: ${f}\n\n`).join('')
  return new Response(text).body!
}

function sseNamedBody(frames: { event?: string; data: string }[]): ReadableStream<Uint8Array> {
  const text = frames
    .map((f) => (f.event ? `event: ${f.event}\ndata: ${f.data}\n\n` : `data: ${f.data}\n\n`))
    .join('')
  return new Response(text).body!
}

async function collect(adapter: AgentStreamAdapter, body: ReadableStream<Uint8Array>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = []
  for await (const ev of adapter.parseStream(body, 'test_run', {
    endpoint: '/api/mock', apiKey: 'k',
  })) events.push(ev)
  return events
}

const INPUT: RunInput = {
  sessionId: 's1', runId: 'r1',
  messages: [{ id: 'm1', role: 'user', content: '你好', createdAt: Date.now() }],
  readables: [], actions: [], additionalInstructions: [],
}

const j = JSON.stringify

// ============ buildRunRequest 通用契约 ============

describe('buildRunRequest 通用契约', () => {
  const adapters = [
    agUiAdapter, langgraphAdapter, langserveAdapter, agentscopeAdapter,
    aiSdkAdapter, difyAdapter, cozeAdapter, fastgptAdapter,
    a2aAdapter, acpAdapter, openaiAssistantsAdapter,
  ]

  it.each(adapters.map((a) => [a.id, a] as const))('%s: url 基于 endpoint 且携带 Authorization', (_id, adapter) => {
    const spec = adapter.buildRunRequest(INPUT, { endpoint: 'https://api.example.com', apiKey: 'sk-test' })
    expect(spec.url).toContain('https://api.example.com')
    expect(spec.headers.Authorization ?? spec.headers.authorization ?? spec.headers['x-api-key']).toBeTruthy()
    expect(spec.body).toBeTruthy()
  })

  it('自定义 headers 透传且可覆盖', () => {
    const spec = agUiAdapter.buildRunRequest(INPUT, {
      endpoint: '/api', headers: { 'X-Tenant': 'acme' },
    })
    expect(spec.headers['X-Tenant']).toBe('acme')
  })
})

// ============ 各协议 parseStream ============

describe('ag-ui parseStream', () => {
  it('完整事件序列：文本/工具/快照/载荷/结束', async () => {
    const events = await collect(agUiAdapter, sseBody([
      j({ type: 'RUN_STARTED', threadId: 't1', runId: 'run1' }),
      j({ type: 'TEXT_MESSAGE_START', messageId: 'm1' }),
      j({ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: '你好' }),
      j({ type: 'TEXT_MESSAGE_END', messageId: 'm1' }),
      j({ type: 'TOOL_CALL_START', toolCallId: 'tc1', toolCallName: 'get_weather' }),
      j({ type: 'TOOL_CALL_ARGS', toolCallId: 'tc1', delta: '{"city":"北京"}' }),
      j({ type: 'TOOL_CALL_END', toolCallId: 'tc1' }),
      j({ type: 'TOOL_CALL_RESULT', toolCallId: 'tc1', content: '{"temp":21}' }),
      j({ type: 'RUN_FINISHED' }),
    ]))
    const types = events.map((e) => e.type)
    expect(types[0]).toBe('RUN_STARTED')
    expect(types).toContain('TEXT_DELTA')
    expect(types).toContain('TOOL_CALL_START')
    expect(types).toContain('TOOL_CALL_RESULT')
    expect(types[types.length - 1]).toBe('RUN_FINISHED')
  })

  it('畸形帧被跳过不中断解析', async () => {
    const events = await collect(agUiAdapter, sseBody([
      j({ type: 'RUN_STARTED' }),
      '{broken json',
      'not-json',
      j({ type: 'RUN_FINISHED' }),
    ]))
    expect(events.map((e) => e.type)).toContain('RUN_FINISHED')
  })
})

describe('langgraph parseStream', () => {
  it('messages/partial 增量与工具块聚合', async () => {
    const events = await collect(langgraphAdapter, sseNamedBody([
      { event: 'messages/partial', data: j([{ content: '你' }, {}]) },
      { event: 'messages/partial', data: j([{ content: '好' }, {}]) },
      { event: 'messages/partial', data: j([{ content: '', tool_call_chunks: [{ index: 0, id: 'tc1', name: 'search', args: '{"q":' }] }, {}]) },
      { event: 'messages/partial', data: j([{ content: '', tool_call_chunks: [{ index: 0, args: '"x"}' }] }, {}]) },
      { event: 'messages/partial', data: j([{ type: 'tool', tool_call_id: 'tc1', content: '{"hits":3}', status: 'success' }, {}]) },
    ]))
    const types = events.map((e) => e.type)
    expect(types).toContain('TEXT_DELTA')
    expect(types).toContain('TOOL_CALL_START')
    expect(types).toContain('TOOL_CALL_RESULT')
    // 注：RUN_FINISHED 由 ProtocolAgentRuntime 统一兜底，适配器层不强制
  })
})

describe('agentscope parseStream（AgentEvent 透传）', () => {
  it('事件原样透传且保留远端 runId', async () => {
    const events = await collect(agentscopeAdapter, sseBody([
      j({ type: 'RUN_STARTED', runId: 'remote_run', timestamp: 1, data: {} }),
      j({ type: 'TEXT_DELTA', runId: 'remote_run', timestamp: 2, data: { messageId: 'm1', delta: '你好' } }),
      j({ type: 'USAGE', runId: 'remote_run', timestamp: 3, data: { promptTokens: 1, completionTokens: 2, totalTokens: 3 } }),
      j({ type: 'RUN_FINISHED', runId: 'remote_run', timestamp: 4, data: {} }),
    ]))
    expect(events.map((e) => e.type)).toEqual(['RUN_STARTED', 'TEXT_DELTA', 'USAGE', 'RUN_FINISHED'])
    // 透传协议保留远端 runId（事件归属由远端控制）
    expect(events[0].runId).toBe('remote_run')
  })
})

describe('ai-sdk parseStream', () => {
  it('text-delta 与工具输入输出闭环', async () => {
    const events = await collect(aiSdkAdapter, sseBody([
      j({ type: 'text-delta', delta: '你好' }),
      j({ type: 'tool-input-start', toolCallId: 'tc1', toolName: 'search' }),
      j({ type: 'tool-input-delta', toolCallId: 'tc1', inputTextDelta: '{"q":"x"}' }),
      j({ type: 'tool-input-available', toolCallId: 'tc1' }),
      j({ type: 'tool-output-available', toolCallId: 'tc1', output: { n: 2 } }),
      j({ type: 'finish' }),
      '[DONE]',
    ]))
    const types = events.map((e) => e.type)
    expect(types).toContain('TEXT_DELTA')
    expect(types).toContain('TOOL_CALL_START')
    expect(types).toContain('TOOL_CALL_RESULT')
  })
})

describe('dify parseStream', () => {
  it('message 增量 + agent_thought + message_end usage', async () => {
    const events = await collect(difyAdapter, sseBody([
      j({ event: 'message', answer: '你好', conversation_id: 'c1' }),
      j({ event: 'agent_thought', id: 'th1', tool: 'search', tool_input: '{"q":"x"}', observation: '{"n":1}' }),
      j({ event: 'message_end', metadata: { usage: { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 } } }),
    ]))
    const types = events.map((e) => e.type)
    expect(types).toContain('TEXT_DELTA')
    expect(types).toContain('USAGE')
  })
})

describe('coze parseStream', () => {
  it('function_call 后 tool_response 关闭工具调用', async () => {
    const events = await collect(cozeAdapter, sseNamedBody([
      { event: 'conversation.message.delta', data: j({ role: 'assistant', type: 'answer', content: '你好' }) },
      { event: 'conversation.message.completed', data: j({ role: 'assistant', type: 'function_call', content: j({ name: 'plugin_x', arguments: { a: 1 } }) }) },
      { event: 'conversation.message.completed', data: j({ role: 'assistant', type: 'tool_response', content: '{"ok":true}' }) },
      { event: 'conversation.chat.completed', data: j({ usage: { token_count: 30, input_count: 10, output_count: 20 } }) },
      { event: 'done', data: '"[DONE]"' },
    ]))
    const types = events.map((e) => e.type)
    expect(types).toContain('TOOL_CALL_START')
    expect(types).toContain('TOOL_CALL_RESULT')
  })
})

describe('fastgpt parseStream', () => {
  it('answer 增量 + flowResponses 工具轨迹', async () => {
    const events = await collect(fastgptAdapter, sseNamedBody([
      { event: 'answer', data: j({ choices: [{ delta: { content: '你好' } }] }) },
      { event: 'flowResponses', data: j([{ moduleType: 'tools', moduleName: '搜索', runningTime: 1.2 }]) },
      { event: 'answer', data: '[DONE]' },
    ]))
    const types = events.map((e) => e.type)
    expect(types).toContain('TEXT_DELTA')
  })
})

describe('a2a parseStream（JSON-RPC）', () => {
  it('status-update 文本 + artifact-update 载荷 + final 结束', async () => {
    const events = await collect(a2aAdapter, sseBody([
      j({ jsonrpc: '2.0', id: '1', result: { kind: 'status-update', taskId: 't1', status: { state: 'working', message: { role: 'agent', parts: [{ kind: 'text', text: '处理中' }] } } } }),
      j({ jsonrpc: '2.0', id: '1', result: { kind: 'artifact-update', taskId: 't1', artifact: { name: '报告', parts: [{ kind: 'data', data: { type: 'metric', title: 'KPI', data: { value: 1, label: 'KPI' } } }] } } }),
      j({ jsonrpc: '2.0', id: '1', result: { kind: 'status-update', taskId: 't1', final: true, status: { state: 'completed' } } }),
    ]))
    const types = events.map((e) => e.type)
    expect(types).toContain('TEXT_DELTA')
    expect(types).toContain('STRUCTURED_PAYLOAD')
    expect(types[types.length - 1]).toBe('RUN_FINISHED')
  })
})

describe('openai-assistants parseStream', () => {
  it('step.completed 的 function.output 产出 TOOL_CALL_RESULT', async () => {
    const events = await collect(openaiAssistantsAdapter, sseNamedBody([
      { event: 'thread.run.created', data: j({ id: 'run1' }) },
      { event: 'thread.run.step.delta', data: j({ delta: { step_details: { tool_calls: [{ type: 'function', id: 'tc1', function: { name: 'lookup', arguments: '{"id":7}' } }] } } }) },
      { event: 'thread.run.step.completed', data: j({ step_details: { tool_calls: [{ type: 'function', id: 'tc1', function: { name: 'lookup', arguments: '{"id":7}', output: '{"tier":"VIP"}' } }] } }) },
      { event: 'thread.message.delta', data: j({ delta: { content: [{ type: 'text', text: { value: '你好' } }] } }) },
      { event: 'thread.run.completed', data: j({ usage: { prompt_tokens: 5, completion_tokens: 6, total_tokens: 11 } }) },
      { event: 'done', data: '[DONE]' },
    ]))
    const types = events.map((e) => e.type)
    expect(types).toContain('TOOL_CALL_RESULT')
    expect(types).toContain('USAGE')
    expect(types[types.length - 1]).toBe('RUN_FINISHED')
  })
})

describe('langserve / acp parseStream', () => {
  it('langserve: on_chat_model_stream 文本与工具事件', async () => {
    const events = await collect(langserveAdapter, sseBody([
      j({ event: 'on_chat_model_stream', data: { chunk: { content: '你好' } } }),
      j({ event: 'on_tool_start', run_id: 'r1', name: 'calc', data: { input: { expr: '1+1' } } }),
      j({ event: 'on_tool_end', run_id: 'r1', data: { output: '2' } }),
    ]))
    const types = events.map((e) => e.type)
    expect(types).toContain('TEXT_DELTA')
    expect(types).toContain('TOOL_CALL_RESULT')
  })

  it('acp: message.part 文本增量与 run.completed 结束', async () => {
    const events = await collect(acpAdapter, sseBody([
      j({ type: 'message.part', part: { content_type: 'text/plain', content: '你好' } }),
      j({ type: 'run.completed', run: { run_id: 'r1', status: 'completed' } }),
    ]))
    const types = events.map((e) => e.type)
    expect(types).toContain('TEXT_DELTA')
    expect(types[types.length - 1]).toBe('RUN_FINISHED')
  })
})
