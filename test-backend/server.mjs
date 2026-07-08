/**
 * 协议接入测试用最小后端（零依赖，node:http）
 *
 * 同时实现三种协议端点，用于验证 agent-copilot 协议适配层：
 *   POST /ag-ui                   — AG-UI 标准 SSE（文本流 + 工具调用 + 状态快照/增量 + CUSTOM 载荷）
 *   POST /a2a                     — A2A JSON-RPC 2.0 message/stream（Task 状态机 + artifact + input-required HITL）
 *   POST /v1/chat/completions     — OpenAI 兼容 SSE（首轮返回 tool_calls，二轮返回最终文本，驱动前端 ReAct 循环）
 *
 * 启动：node test-backend/server.mjs [port]（默认 9200）
 */
import { createServer } from 'node:http'

const PORT = Number(process.argv[2] ?? 9200)

// ---------- 通用 ----------

function readBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch { resolve({}) }
    })
  })
}

function sseHead(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })
}

function send(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- 1. AG-UI 端点 ----------

async function handleAgUi(req, res) {
  const body = await readBody(req)
  const { threadId, runId, messages = [], tools = [] } = body
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  sseHead(res)

  send(res, { type: 'RUN_STARTED', threadId, runId })
  await sleep(20)

  // 状态快照
  send(res, { type: 'STATE_SNAPSHOT', snapshot: { step: 'thinking', progress: 0 } })
  await sleep(20)

  // 若前端注册了工具且用户消息包含 "tool"，演示一轮后端工具调用
  if (tools.length > 0 && /tool/i.test(lastUser)) {
    const tc = 'tc_agui_1'
    send(res, { type: 'TOOL_CALL_START', toolCallId: tc, toolCallName: tools[0].name })
    await sleep(10)
    send(res, { type: 'TOOL_CALL_ARGS', toolCallId: tc, delta: '{"city":' })
    send(res, { type: 'TOOL_CALL_ARGS', toolCallId: tc, delta: '"Beijing"}' })
    send(res, { type: 'TOOL_CALL_END', toolCallId: tc })
    await sleep(10)
    send(res, { type: 'TOOL_CALL_RESULT', toolCallId: tc, content: '{"temp":21,"ok":true}' })
    await sleep(10)
  }

  // 流式文本（3 段增量）
  const msgId = 'agui_msg_1'
  send(res, { type: 'TEXT_MESSAGE_START', messageId: msgId, role: 'assistant' })
  for (const chunk of ['你好，', '这是 AG-UI ', '流式回复。']) {
    await sleep(15)
    send(res, { type: 'TEXT_MESSAGE_CONTENT', messageId: msgId, delta: chunk })
  }
  send(res, { type: 'TEXT_MESSAGE_END', messageId: msgId })

  // 状态增量（JSON Patch）
  send(res, { type: 'STATE_DELTA', delta: [{ op: 'replace', path: '/progress', value: 100 }] })

  // CUSTOM 结构化载荷
  send(res, {
    type: 'CUSTOM',
    name: 'structured_payload',
    value: { type: 'metrics', title: '测试指标', data: { items: [{ label: '延迟', value: '45ms' }] } },
  })

  send(res, { type: 'RUN_FINISHED', threadId, runId })
  res.end()
}

// ---------- 2. A2A 端点 ----------

// taskId → 已进入 input-required 的任务（等待 resume）
const a2aPendingTasks = new Set()

async function handleA2a(req, res) {
  const rpc = await readBody(req)
  const { id: rpcId, method, params } = rpc

  if (method === 'tasks/cancel') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify({ jsonrpc: '2.0', id: rpcId, result: { id: params?.id, status: { state: 'canceled' } } }))
    return
  }

  if (method !== 'message/stream') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify({ jsonrpc: '2.0', id: rpcId, error: { code: -32601, message: `未知方法 ${method}` } }))
    return
  }

  const userText = (params?.message?.parts ?? []).filter((p) => p.kind === 'text').map((p) => p.text).join('')
  const incomingTaskId = params?.message?.taskId
  sseHead(res)

  const wrap = (result) => ({ jsonrpc: '2.0', id: rpcId, result })

  // —— resume 分支：收到带 taskId 的后续消息，完成任务 ——
  if (incomingTaskId && a2aPendingTasks.has(incomingTaskId)) {
    a2aPendingTasks.delete(incomingTaskId)
    send(res, wrap({ id: incomingTaskId, kind: 'task', status: { state: 'working' } }))
    await sleep(20)
    send(res, wrap({
      id: incomingTaskId, kind: 'status-update', taskId: incomingTaskId, final: false,
      status: { state: 'working', message: { role: 'agent', parts: [{ kind: 'text', text: `已收到补充：${userText}。` }] } },
    }))
    await sleep(20)
    send(res, wrap({
      id: incomingTaskId, kind: 'status-update', taskId: incomingTaskId, final: true,
      status: { state: 'completed', message: { role: 'agent', parts: [{ kind: 'text', text: '任务完成。' }] } },
    }))
    res.end()
    return
  }

  const taskId = `task_${Date.now()}`

  // —— HITL 分支：消息包含 "审批" 时进入 input-required ——
  if (/审批|input/i.test(userText)) {
    a2aPendingTasks.add(taskId)
    send(res, wrap({ id: taskId, kind: 'task', contextId: 'ctx_1', status: { state: 'submitted' } }))
    await sleep(20)
    send(res, wrap({ id: taskId, kind: 'status-update', taskId, final: false, status: { state: 'working' } }))
    await sleep(20)
    send(res, wrap({
      id: taskId, kind: 'status-update', taskId, final: true,
      status: {
        state: 'input-required',
        message: { role: 'agent', parts: [{ kind: 'text', text: '请提供审批意见后继续。' }] },
      },
    }))
    res.end()
    return
  }

  // —— 普通分支：working → 文本 → artifact → completed ——
  send(res, wrap({ id: taskId, kind: 'task', contextId: 'ctx_1', status: { state: 'submitted' } }))
  await sleep(20)
  send(res, wrap({
    id: taskId, kind: 'status-update', taskId, final: false,
    status: { state: 'working', message: { role: 'agent', parts: [{ kind: 'text', text: 'A2A 处理中…' }] } },
  }))
  await sleep(20)
  send(res, wrap({
    kind: 'artifact-update', taskId,
    artifact: {
      artifactId: 'art_1', name: '分析结果',
      parts: [{ kind: 'data', data: { type: 'metrics', title: 'A2A 指标', data: { items: [{ label: '得分', value: '98' }] } } }],
    },
  }))
  await sleep(20)
  send(res, wrap({
    id: taskId, kind: 'status-update', taskId, final: true,
    status: { state: 'completed', message: { role: 'agent', parts: [{ kind: 'text', text: '完成。' }] } },
  }))
  res.end()
}

// ---------- 3. OpenAI 兼容端点 ----------

async function handleChatCompletions(req, res) {
  const body = await readBody(req)
  const { messages = [], tools = [], stream } = body
  const hasToolResult = messages.some((m) => m.role === 'tool')
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''

  // 非流式（chatOnce 路径：分类 / JSON 任务）
  if (!stream) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify({
      id: 'cmpl_once', object: 'chat.completion',
      choices: [{ index: 0, message: { role: 'assistant', content: `once:${lastUser.slice(0, 20)}` }, finish_reason: 'stop' }],
    }))
    return
  }

  sseHead(res)
  const chunk = (delta, finish = null) => ({
    id: 'cmpl_stream', object: 'chat.completion.chunk',
    choices: [{ index: 0, delta, finish_reason: finish }],
  })

  // 首轮：注册了工具且用户消息含 "tool" 且尚无工具结果 → 返回 tool_calls，驱动前端 ReAct 循环
  if (tools.length > 0 && /tool/i.test(lastUser) && !hasToolResult) {
    send(res, chunk({ role: 'assistant' }))
    send(res, chunk({ tool_calls: [{ index: 0, id: 'tc_oai_1', type: 'function', function: { name: tools[0].function.name, arguments: '{"city":"Sh' } }] }))
    await sleep(10)
    send(res, chunk({ tool_calls: [{ index: 0, function: { arguments: 'anghai"}' } }] }))
    send(res, chunk({}, 'tool_calls'))
    res.write('data: [DONE]\n\n')
    res.end()
    return
  }

  // 二轮（或普通问答）：流式文本
  send(res, chunk({ role: 'assistant' }))
  for (const piece of ['OpenAI ', '兼容流式', '回复完成。']) {
    await sleep(15)
    send(res, chunk({ content: piece }))
  }
  send(res, chunk({}, 'stop'))
  res.write('data: [DONE]\n\n')
  res.end()
}

// ---------- 路由 ----------

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    })
    res.end()
    return
  }
  try {
    if (req.url === '/ag-ui' && req.method === 'POST') return await handleAgUi(req, res)
    if (req.url === '/a2a' && req.method === 'POST') return await handleA2a(req, res)
    if (req.url === '/v1/chat/completions' && req.method === 'POST') return await handleChatCompletions(req, res)
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ ok: true, endpoints: ['/ag-ui', '/a2a', '/v1/chat/completions'] }))
      return
    }
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: `未知路径 ${req.url}` }))
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: String(err) }))
  }
})

server.listen(PORT, () => {
  console.log(`[test-backend] listening on http://localhost:${PORT} (/ag-ui, /a2a, /v1/chat/completions)`)
})
