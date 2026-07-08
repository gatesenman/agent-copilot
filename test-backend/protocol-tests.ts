/**
 * 协议接入端到端测试 — 直接驱动真实适配器与运行时，对打 test-backend/server.mjs
 *
 * 覆盖：
 *   1. AG-UI    ProtocolAgentRuntime + agUiAdapter：事件边界 / 文本流 / 工具调用聚合 / 状态快照+增量 / CUSTOM 载荷
 *   2. A2A      ProtocolAgentRuntime + a2aAdapter：状态机→流水线事件 / artifact→载荷 / input-required→INTERRUPT / resume 恢复
 *   3. OpenAI   createOpenAICompatibleAdapter：chatStream（含 tool_calls 增量聚合）/ chatOnce
 *   4. 端到端   BrowserAgentRuntime + 前端工具：完整 ReAct 循环（首轮 tool_calls → 本地执行 → 二轮最终文本）
 *
 * 运行：pnpm exec tsx test-backend/protocol-tests.ts（需 server.mjs 已在 9200 端口运行）
 */
import { ProtocolAgentRuntime } from '../src/lib/agent-copilot/runtime/ProtocolAgentRuntime'
import { BrowserAgentRuntime } from '../src/lib/agent-copilot/runtime/BrowserAgentRuntime'
import { agUiAdapter } from '../src/lib/agent-copilot/protocols/agent/ag-ui'
import { a2aAdapter } from '../src/lib/agent-copilot/protocols/agent/a2a'
import { createOpenAICompatibleAdapter } from '../src/lib/agent-copilot/protocols/model/openai-compatible'
import type { AgentEvent, RunInput } from '../src/lib/agent-copilot/types'

const BASE = process.env.TEST_BACKEND ?? 'http://localhost:9200'

// ---------- 断言工具 ----------

let passed = 0
let failed = 0
const failures: string[] = []

function assert(cond: boolean, label: string) {
  if (cond) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    failures.push(label)
    console.log(`  ✗ ${label}`)
  }
}

function types(events: AgentEvent[]): string[] {
  return events.map((e) => e.type)
}

function fullText(events: AgentEvent[]): string {
  return events
    .filter((e) => e.type === 'TEXT_DELTA')
    .map((e) => (e.data as any)?.delta ?? '')
    .join('')
}

async function collect(iter: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const out: AgentEvent[] = []
  for await (const e of iter) out.push(e)
  return out
}

function makeInput(content: string, withAction = false): RunInput {
  return {
    sessionId: 'sess_test',
    runId: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    messages: [{ id: 'm1', role: 'user', content, createdAt: Date.now() }],
    readables: [{ description: '当前页面', value: { page: 'dashboard' } }],
    actions: withAction
      ? [{
          name: 'get_weather',
          description: '查询城市天气',
          parameters: [{ name: 'city', type: 'string', description: '城市名', required: true }],
          handler: async (args: Record<string, unknown>) => ({ city: args.city, temp: 21 }),
        }]
      : [],
    additionalInstructions: [],
  }
}

// ---------- 1. AG-UI ----------

async function testAgUi() {
  console.log('\n[1] AG-UI 协议（ProtocolAgentRuntime + agUiAdapter）')
  const rt = new ProtocolAgentRuntime(agUiAdapter, { endpoint: `${BASE}/ag-ui` })

  // 1a. 普通文本流
  const ev1 = await collect(rt.run(makeInput('你好')))
  const t1 = types(ev1)
  assert(t1[0] === 'RUN_STARTED', 'AG-UI: 事件流以 RUN_STARTED 开始')
  assert(t1[t1.length - 1] === 'RUN_FINISHED', 'AG-UI: 事件流以 RUN_FINISHED 结束')
  assert(t1.filter((t) => t === 'RUN_STARTED').length === 1, 'AG-UI: RUN_STARTED 不重复')
  assert(fullText(ev1) === '你好，这是 AG-UI 流式回复。', 'AG-UI: 文本增量按序完整拼接')
  assert(t1.includes('TEXT_MESSAGE_START') && t1.includes('TEXT_MESSAGE_END'), 'AG-UI: 文本消息生命周期完整')
  const states = ev1.filter((e) => e.type === 'AGENT_STATE_DELTA')
  assert(states.length === 2, 'AG-UI: STATE_SNAPSHOT + STATE_DELTA 各产出一次状态事件')
  assert((states[1]?.data as any)?.progress === 100, 'AG-UI: JSON Patch 增量正确合并（progress=100）')
  const payload = ev1.find((e) => e.type === 'STRUCTURED_PAYLOAD')
  assert((payload?.data as any)?.type === 'metrics', 'AG-UI: CUSTOM 事件映射为 STRUCTURED_PAYLOAD')

  // 1b. 后端工具调用（聚合增量参数）
  const ev2 = await collect(rt.run(makeInput('请调用 tool 查询天气', true)))
  const t2 = types(ev2)
  assert(t2.includes('TOOL_CALL_START'), 'AG-UI: TOOL_CALL_START 产出')
  const args = ev2.find((e) => e.type === 'TOOL_CALL_ARGS')
  assert(JSON.stringify((args?.data as any)?.args) === '{"city":"Beijing"}', 'AG-UI: 参数增量聚合为完整对象')
  const result = ev2.find((e) => e.type === 'TOOL_CALL_RESULT')
  assert((result?.data as any)?.result?.ok === true, 'AG-UI: TOOL_CALL_RESULT 内容解析正确')
  const argsIdx = t2.indexOf('TOOL_CALL_ARGS')
  assert(t2.indexOf('TOOL_CALL_START') < argsIdx && argsIdx < t2.indexOf('TOOL_CALL_RESULT'), 'AG-UI: 工具事件顺序 START→ARGS→RESULT')
}

// ---------- 2. A2A ----------

async function testA2a() {
  console.log('\n[2] A2A 协议（ProtocolAgentRuntime + a2aAdapter）')
  const rt = new ProtocolAgentRuntime(a2aAdapter, { endpoint: `${BASE}/a2a` })

  // 2a. 普通任务：状态机 + artifact
  const ev1 = await collect(rt.run(makeInput('分析数据')))
  const t1 = types(ev1)
  assert(t1[0] === 'RUN_STARTED' && t1[t1.length - 1] === 'RUN_FINISHED', 'A2A: 事件边界完整')
  const taskStates = ev1
    .filter((e) => e.type === 'AGENT_STATE_DELTA')
    .map((e) => (e.data as any)?.a2aTask?.state)
  assert(taskStates.includes('submitted') && taskStates.includes('working') && taskStates.includes('completed'),
    'A2A: Task 状态机 submitted→working→completed 全部暴露')
  assert(t1.includes('STAGE_STARTED') && t1.includes('STAGE_FINISHED'), 'A2A: working/completed 映射为流水线阶段事件')
  const artifact = ev1.find((e) => e.type === 'STRUCTURED_PAYLOAD')
  assert((artifact?.data as any)?.type === 'metrics', 'A2A: artifact data part 映射为 STRUCTURED_PAYLOAD')
  assert(fullText(ev1).includes('A2A 处理中'), 'A2A: status.message 文本增量产出')

  // 2b. HITL：input-required → INTERRUPT → resume → completed
  const ev2 = await collect(rt.run(makeInput('这个操作需要审批')))
  const interrupt = ev2.find((e) => e.type === 'INTERRUPT')
  assert(!!interrupt, 'A2A: input-required 映射为 INTERRUPT 事件')
  const interruptId = (interrupt?.data as any)?.interruptId
  assert(typeof interruptId === 'string' && interruptId.startsWith('task_'), 'A2A: interruptId 即 taskId')
  assert((interrupt?.data as any)?.description?.includes('审批意见'), 'A2A: 中断描述透传远端提示文本')

  const ev3 = await collect(rt.resume('sess_test', 'run_resume', { interruptId, approved: true, comment: '同意执行' }))
  const t3 = types(ev3)
  assert(t3[t3.length - 1] === 'RUN_FINISHED', 'A2A: resume 后流正常结束')
  assert(fullText(ev3).includes('已收到补充：同意执行'), 'A2A: resume 消息以 taskId 关联到原任务')
  const resumeStates = ev3.filter((e) => e.type === 'AGENT_STATE_DELTA').map((e) => (e.data as any)?.a2aTask?.state)
  assert(resumeStates.includes('completed'), 'A2A: resume 后任务到达 completed 终态')
}

// ---------- 3. OpenAI 兼容适配器 ----------

async function testOpenAiAdapter() {
  console.log('\n[3] OpenAI 兼容协议（createOpenAICompatibleAdapter）')
  const adapter = createOpenAICompatibleAdapter({ apiBase: `${BASE}/v1`, apiKey: 'test-key', model: 'test-model' })

  // 3a. chatOnce（非流式）
  const once = await adapter.chatOnce({ messages: [{ role: 'user', content: '分类任务' }] })
  assert(once === 'once:分类任务', 'OpenAI: chatOnce 非流式返回正确')

  // 3b. chatStream（纯文本）：LlmStreamChunk { delta?, toolCallDelta?, finishReason? }
  let streamText = ''
  let sawStop = false
  for await (const chunk of adapter.chatStream({ messages: [{ role: 'user', content: '你好' }] })) {
    if (chunk.delta) streamText += chunk.delta
    if (chunk.finishReason === 'stop') sawStop = true
  }
  assert(streamText === 'OpenAI 兼容流式回复完成。', 'OpenAI: chatStream 文本增量完整')
  assert(sawStop, 'OpenAI: finishReason=stop 正确透传')

  // 3c. chatStream（toolCallDelta 增量，按 index 聚合）
  const agg = new Map<number, { id?: string; name?: string; args: string }>()
  let sawToolFinish = false
  for await (const chunk of adapter.chatStream({
    messages: [{ role: 'user', content: '调用 tool 查天气' }],
    tools: [{ type: 'function', function: { name: 'get_weather', description: '查天气', parameters: { type: 'object', properties: { city: { type: 'string' } } } } }],
  })) {
    const d = chunk.toolCallDelta
    if (d) {
      const cur = agg.get(d.index) ?? { args: '' }
      if (d.id) cur.id = d.id
      if (d.name) cur.name = d.name
      cur.args += d.argumentsDelta ?? ''
      agg.set(d.index, cur)
    }
    if (chunk.finishReason === 'tool_calls') sawToolFinish = true
  }
  assert(agg.size === 1, 'OpenAI: toolCallDelta 按 index 聚合为单次调用')
  assert(agg.get(0)?.name === 'get_weather', 'OpenAI: 工具名正确')
  assert(agg.get(0)?.args === '{"city":"Shanghai"}', 'OpenAI: 参数增量跨帧拼接完整')
  assert(sawToolFinish, 'OpenAI: finishReason=tool_calls 正确透传')
}

// ---------- 4. 端到端 ReAct 循环 ----------

async function testBrowserRuntimeReact() {
  console.log('\n[4] 端到端 ReAct（BrowserAgentRuntime + 前端工具 + OpenAI 兼容后端）')
  const adapter = createOpenAICompatibleAdapter({ apiBase: `${BASE}/v1`, apiKey: 'test-key', model: 'test-model' })
  const rt = new BrowserAgentRuntime({
    apiBase: `${BASE}/v1`, apiKey: 'test-key', model: 'test-model',
    approvalMode: 'never', modelAdapter: adapter,
  })

  const events = await collect(rt.run(makeInput('请用 tool 查询上海天气', true)))
  const t = types(events)
  assert(t[0] === 'RUN_STARTED' && t.includes('RUN_FINISHED'), 'ReAct: 事件边界完整')
  assert(t.includes('TOOL_CALL_START') && t.includes('TOOL_CALL_RESULT'), 'ReAct: 前端工具被调用并产出结果')
  const result = events.find((e) => e.type === 'TOOL_CALL_RESULT')
  assert((result?.data as any)?.result?.city === 'Shanghai', 'ReAct: 本地 handler 收到 LLM 聚合参数并执行')
  assert(fullText(events).includes('回复完成'), 'ReAct: 二轮携带工具结果获得最终文本')
  const resultIdx = t.indexOf('TOOL_CALL_RESULT')
  const lastTextIdx = t.lastIndexOf('TEXT_DELTA')
  assert(resultIdx < lastTextIdx, 'ReAct: 工具结果先于最终答案（两轮循环时序正确）')
}

// ---------- 5. 异常路径 ----------

async function testErrorPaths() {
  console.log('\n[5] 异常路径（错误处理 / 取消 / 脏数据）')

  // 5a. HTTP 404：runtime 应产出 RUN_STARTED + RUN_ERROR，不抛异常
  const badRt = new ProtocolAgentRuntime(agUiAdapter, { endpoint: `${BASE}/not-exist` })
  const evErr = await collect(badRt.run(makeInput('hi')))
  const tErr = types(evErr)
  assert(tErr[0] === 'RUN_STARTED' && tErr[1] === 'RUN_ERROR', '错误: 非 2xx 响应转为 RUN_ERROR 事件（不抛异常）')
  assert(((evErr[1]?.data as any)?.message ?? '').includes('404'), '错误: 错误信息含状态码')

  // 5b. 连接拒绝：同样降级为 RUN_ERROR
  const downRt = new ProtocolAgentRuntime(agUiAdapter, { endpoint: 'http://localhost:9999/ag-ui' })
  const evDown = await collect(downRt.run(makeInput('hi')))
  assert(types(evDown).includes('RUN_ERROR'), '错误: 连接失败降级为 RUN_ERROR')

  // 5c. 运行中取消：AbortSignal → RUN_FINISHED { cancelled: true }
  const rt = new ProtocolAgentRuntime(agUiAdapter, { endpoint: `${BASE}/ag-ui` })
  const ac = new AbortController()
  const input = makeInput('你好')
  input.signal = ac.signal
  const cancelEvents: AgentEvent[] = []
  const runPromise = (async () => {
    for await (const e of rt.run(input)) {
      cancelEvents.push(e)
      if (e.type === 'TEXT_DELTA') ac.abort() // 收到首个增量即取消
    }
  })()
  await runPromise
  const lastCancel = cancelEvents[cancelEvents.length - 1]
  assert(lastCancel?.type === 'RUN_FINISHED' && (lastCancel?.data as any)?.cancelled === true,
    '取消: AbortSignal 中断流并以 RUN_FINISHED{cancelled} 收尾')

  // 5d. 不支持 HITL 的协议 resume → RUN_ERROR 提示
  const evResume = await collect(rt.resume('s', 'r', { interruptId: 'x', approved: true }))
  assert(evResume.some((e) => e.type === 'RUN_ERROR' && String((e.data as any)?.message).includes('不支持')),
    'HITL: AG-UI（无 resume 能力）恢复请求返回明确错误')

  // 5e. 脏 SSE 数据：parseStream 跳过非 JSON 帧不崩溃
  const dirtyStream = new ReadableStream<Uint8Array>({
    start(c) {
      const enc = new TextEncoder()
      c.enqueue(enc.encode('data: not-json\n\n'))
      c.enqueue(enc.encode('data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"m","delta":"ok"}\n\n'))
      c.enqueue(enc.encode(': comment line\n\n'))
      c.enqueue(enc.encode('data: {"type":"RUN_FINISHED"}\n\n'))
      c.close()
    },
  })
  const dirtyEvents: AgentEvent[] = []
  for await (const e of agUiAdapter.parseStream(dirtyStream, 'run_dirty', { endpoint: '' })) dirtyEvents.push(e)
  assert(fullText(dirtyEvents) === 'ok', '容错: 非 JSON 帧与注释行被跳过，有效事件正常解析')
  assert(types(dirtyEvents).includes('RUN_FINISHED'), '容错: 脏数据流仍正常终结')
}

// ---------- 主流程 ----------

async function main() {
  // 后端健康检查
  const health = await fetch(`${BASE}/health`).then((r) => r.json()).catch(() => null)
  if (!health?.ok) {
    console.error(`测试后端未就绪（${BASE}），请先运行: node test-backend/server.mjs`)
    process.exit(1)
  }
  console.log(`测试后端就绪: ${BASE}`)

  await testAgUi()
  await testA2a()
  await testOpenAiAdapter()
  await testBrowserRuntimeReact()
  await testErrorPaths()

  console.log(`\n========== 结果: ${passed} 通过, ${failed} 失败 ==========`)
  if (failures.length) {
    console.log('失败项:')
    for (const f of failures) console.log(`  - ${f}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('测试执行异常:', err)
  process.exit(1)
})
