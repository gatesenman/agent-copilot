/**
 * 协议适配层冒烟测试 —— 对 8 个 B 类适配器灌入按官方协议构造的 mock 流，
 * 校验解析出的 AgentEvent 序列（文本增量 / 工具事件 / 错误 / 结束）。
 * 运行：npx tsx scripts/protocol-smoke.ts
 */
import type { AgentEvent } from '../src/lib/agent-copilot/types'
import type { AgentStreamAdapter } from '../src/lib/agent-copilot/protocols/types'
import { agUiAdapter } from '../src/lib/agent-copilot/protocols/agent/ag-ui'
import { langgraphAdapter } from '../src/lib/agent-copilot/protocols/agent/langgraph'
import { langserveAdapter } from '../src/lib/agent-copilot/protocols/agent/langserve'
import { agentscopeAdapter } from '../src/lib/agent-copilot/protocols/agent/agentscope'
import { aiSdkAdapter } from '../src/lib/agent-copilot/protocols/agent/ai-sdk'
import { difyAdapter } from '../src/lib/agent-copilot/protocols/agent/dify'
import { cozeAdapter } from '../src/lib/agent-copilot/protocols/agent/coze'
import { fastgptAdapter } from '../src/lib/agent-copilot/protocols/agent/fastgpt'

function sseStream(frames: { event?: string; data: unknown }[]): ReadableStream<Uint8Array> {
  const text = frames
    .map((f) => `${f.event ? `event: ${f.event}\n` : ''}data: ${typeof f.data === 'string' ? f.data : JSON.stringify(f.data)}\n\n`)
    .join('')
  return new Blob([text]).stream() as unknown as ReadableStream<Uint8Array>
}

async function collect(adapter: AgentStreamAdapter, frames: { event?: string; data: unknown }[]): Promise<AgentEvent[]> {
  const events: AgentEvent[] = []
  for await (const e of adapter.parseStream(sseStream(frames), 'run_test', { endpoint: 'http://mock' })) {
    events.push(e)
  }
  return events
}

function assert(cond: boolean, label: string) {
  if (!cond) throw new Error(`断言失败: ${label}`)
  console.log(`  ✓ ${label}`)
}

function textOf(events: AgentEvent[]): string {
  return events.filter((e) => e.type === 'TEXT_DELTA').map((e) => (e.data as any).delta).join('')
}

async function main() {
  // ---- ag-ui ----
  console.log('[ag-ui]')
  {
    const events = await collect(agUiAdapter, [
      { data: { type: 'RUN_STARTED', threadId: 't1' } },
      { data: { type: 'TEXT_MESSAGE_START', messageId: 'm1' } },
      { data: { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: '你好' } },
      { data: { type: 'TEXT_MESSAGE_END', messageId: 'm1' } },
      { data: { type: 'TOOL_CALL_START', toolCallId: 'tc1', toolCallName: 'search' } },
      { data: { type: 'TOOL_CALL_ARGS', toolCallId: 'tc1', delta: '{"q":"a"}' } },
      { data: { type: 'TOOL_CALL_END', toolCallId: 'tc1' } },
      { data: { type: 'TOOL_CALL_RESULT', toolCallId: 'tc1', content: '{"ok":true}' } },
      { data: { type: 'STATE_SNAPSHOT', snapshot: { step: 1 } } },
      { data: { type: 'RUN_FINISHED' } },
    ])
    assert(textOf(events) === '你好', '文本增量')
    assert(events.some((e) => e.type === 'TOOL_CALL_ARGS' && (e.data as any).args.q === 'a'), '工具参数聚合')
    assert(events.some((e) => e.type === 'TOOL_CALL_RESULT'), '工具结果')
    assert(events.some((e) => e.type === 'AGENT_STATE_DELTA'), '状态快照')
    assert(events.at(-1)?.type === 'RUN_FINISHED', '结束事件')
  }

  // ---- langgraph ----
  console.log('[langgraph]')
  {
    const events = await collect(langgraphAdapter, [
      { event: 'messages/partial', data: [{ content: 'Hello ', tool_call_chunks: [] }, {}] },
      { event: 'messages/partial', data: [{ content: '', tool_call_chunks: [{ index: 0, id: 'tc1', name: 'lookup', args: '{"x":' }] }, {}] },
      { event: 'messages/partial', data: [{ content: '', tool_call_chunks: [{ index: 0, args: '1}' }] }, {}] },
      { event: 'messages/partial', data: [{ type: 'tool', tool_call_id: 'tc1', name: 'lookup', content: '{"y":2}' }, {}] },
      { event: 'updates', data: { planner: { plan: ['a'] } } },
    ])
    assert(textOf(events) === 'Hello ', '文本增量')
    const args = events.find((e) => e.type === 'TOOL_CALL_ARGS')
    assert((args?.data as any)?.args?.x === 1, '工具参数跨帧聚合')
    assert(events.some((e) => e.type === 'AGENT_STATE_DELTA'), '节点状态更新')

    // HITL 中断
    const intr = await collect(langgraphAdapter, [
      { event: 'updates', data: { __interrupt__: [{ id: 'i1', value: '需要审批' }] } },
    ])
    assert(intr.some((e) => e.type === 'INTERRUPT'), 'HITL 中断')
  }

  // ---- langserve ----
  console.log('[langserve]')
  {
    const events = await collect(langserveAdapter, [
      { data: { event: 'on_chat_model_stream', data: { chunk: { content: '答案' } } } },
      { data: { event: 'on_tool_start', run_id: 'r1', name: 'calc', data: { input: { a: 1 } } } },
      { data: { event: 'on_tool_end', run_id: 'r1', name: 'calc', data: { output: '42' } } },
    ])
    assert(textOf(events) === '答案', '文本增量')
    assert(events.some((e) => e.type === 'TOOL_CALL_RESULT' && (e.data as any).result === 42), '工具结果')
  }

  // ---- agentscope ----
  console.log('[agentscope]')
  {
    const events = await collect(agentscopeAdapter, [
      { data: { type: 'RUN_STARTED', runId: 'r1' } },
      { data: { type: 'STAGE_STARTED', data: { stage: 'input_understanding' } } },
      { data: { type: 'TEXT_DELTA', data: { delta: '流水线' } } },
      { data: { type: 'RUN_FINISHED', data: {} } },
    ])
    assert(textOf(events) === '流水线', '文本增量')
    assert(events.some((e) => e.type === 'STAGE_STARTED'), '流水线阶段透传')
  }

  // ---- ai-sdk（新版 UI Message Stream） ----
  console.log('[ai-sdk]')
  {
    const events = await collect(aiSdkAdapter, [
      { data: { type: 'text-delta', delta: 'AI SDK' } },
      { data: { type: 'tool-input-start', toolCallId: 'tc1', toolName: 'weather' } },
      { data: { type: 'tool-input-delta', toolCallId: 'tc1', inputTextDelta: '{"city":"北京"}' } },
      { data: { type: 'tool-input-available', toolCallId: 'tc1' } },
      { data: { type: 'tool-output-available', toolCallId: 'tc1', output: { temp: 25 } } },
      { data: { type: 'finish' } },
    ])
    assert(textOf(events) === 'AI SDK', '文本增量')
    assert(events.some((e) => e.type === 'TOOL_CALL_ARGS' && (e.data as any).args.city === '北京'), '工具参数')
    assert(events.some((e) => e.type === 'TOOL_CALL_RESULT' && (e.data as any).result?.temp === 25), '工具结果')

    // 旧版 Data Stream Protocol
    const legacy = await collect(aiSdkAdapter, [
      { data: '0:"旧版文本"' },
      { data: '9:{"toolCallId":"t1","toolName":"f","args":{"k":1}}' },
      { data: 'a:{"toolCallId":"t1","result":"ok"}' },
    ])
    assert(textOf(legacy) === '旧版文本', '旧版文本帧')
    assert(legacy.some((e) => e.type === 'TOOL_CALL_RESULT'), '旧版工具帧')
  }

  // ---- dify ----
  console.log('[dify]')
  {
    const events = await collect(difyAdapter, [
      { data: { event: 'message', answer: 'Dify 回答' } },
      { data: { event: 'agent_thought', thought: '我需要查询', tool: 'search', tool_input: '{"q":"x"}', observation: '{"hits":3}' } },
      { data: { event: 'message_end', metadata: { usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } } } },
    ])
    assert(textOf(events) === 'Dify 回答', '文本增量')
    assert(events.some((e) => e.type === 'REACT_STEP'), 'Agent 思考步')
    assert(events.some((e) => e.type === 'TOOL_CALL_RESULT' && (e.data as any).result?.hits === 3), '工具结果')
    assert(events.some((e) => e.type === 'USAGE' && (e.data as any).totalTokens === 15), '用量')
  }

  // ---- coze ----
  console.log('[coze]')
  {
    const events = await collect(cozeAdapter, [
      { event: 'conversation.message.delta', data: { type: 'answer', content: '扣子' } },
      { event: 'conversation.message.completed', data: { type: 'function_call', content: '{"name":"plugin_x","arguments":{"a":1}}' } },
      { event: 'conversation.chat.completed', data: { usage: { input_count: 8, output_count: 4, token_count: 12 } } },
    ])
    assert(textOf(events) === '扣子', '文本增量')
    assert(events.some((e) => e.type === 'TOOL_CALL_START' && (e.data as any).name === 'plugin_x'), '插件调用')
    assert(events.some((e) => e.type === 'USAGE'), '用量')
  }

  // ---- fastgpt ----
  console.log('[fastgpt]')
  {
    const events = await collect(fastgptAdapter, [
      { event: 'flowNodeStatus', data: { name: 'AI 对话', status: 'running' } },
      { event: 'answer', data: { choices: [{ delta: { content: 'FastGPT' } }] } },
      { event: 'toolCall', data: { tool: { id: 't1', toolName: 'kb_search' } } },
      { event: 'toolParams', data: { tool: { id: 't1', params: '{"kw":"报销"}' } } },
      { event: 'toolResponse', data: { tool: { id: 't1', toolName: 'kb_search', response: '{"docs":2}' } } },
      { event: 'answer', data: { choices: [{ delta: {}, finish_reason: 'stop' }] } },
    ])
    assert(textOf(events) === 'FastGPT', '文本增量')
    assert(events.some((e) => e.type === 'REACT_STEP'), '工作流节点')
    assert(events.some((e) => e.type === 'TOOL_CALL_ARGS' && (e.data as any).args.kw === '报销'), '工具参数')
    assert(events.some((e) => e.type === 'TOOL_CALL_RESULT' && (e.data as any).result?.docs === 2), '工具结果')
  }

  console.log('\n全部 8 个 B 类适配器冒烟测试通过')
}

main().catch((err) => {
  console.error('冒烟测试失败:', err.message)
  process.exit(1)
})
