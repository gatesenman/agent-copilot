/**
 * agent-backend — 真实的 Node Agent 后端（Vite 插件形态）
 *
 * 与前端 HttpAgentRuntime 的 SSE 协议完全对齐（provider: agentscope）：
 *   POST /api/agent/chat    发起运行（SSE AgentEvent 流）
 *   POST /api/agent/resume  恢复 HITL 中断（SSE AgentEvent 流）
 *   POST /api/agent/cancel  取消运行
 *
 * 一切都是真实执行：
 *   - LLM：Vercel AI Gateway（OpenAI 兼容流式接口，需 AI_GATEWAY_API_KEY）
 *   - 文件工具：真实读写 .agent-workspace/ 沙箱目录（FILE_CHANGE 事件）
 *   - 终端工具：真实 child_process 执行白名单命令（TERMINAL_APPEND 事件）
 *   - 任务/计划：LLM 驱动的 TASK_UPDATE / PLAN_UPDATE
 *   - 表单：FORM_REQUEST；审批：INTERRUPT + /resume 续跑
 *   - 深度思考：reasoning 增量转 THINKING_* 事件
 *   - 结构化产物：show_table / show_chart / show_code → STRUCTURED_PAYLOAD
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'
const DEFAULT_MODEL = 'openai/gpt-4o-mini'
const THINKING_MODEL = 'deepseek/deepseek-r1'
/** 前端 ModelSelector 值 → AI Gateway 模型 ID */
const MODEL_MAP = {
  'qwen3-max': 'alibaba/qwen3-max', 'qwen-plus': 'alibaba/qwen-plus',
  'deepseek-v3': 'deepseek/deepseek-v3.2', 'deepseek-r1': 'deepseek/deepseek-r1',
  'gpt-4o': 'openai/gpt-4o', 'gpt-4o-mini': 'openai/gpt-4o-mini',
  'claude-sonnet': 'anthropic/claude-sonnet-4.5',
}

const WORKSPACE = resolve(process.cwd(), '.agent-workspace')
const CMD_WHITELIST = new Set(['node', 'ls', 'cat', 'echo', 'pwd', 'date', 'wc', 'head', 'tail', 'mkdir', 'touch', 'grep', 'find', 'sort', 'uniq'])

/** 挂起的 HITL 中断： interruptId -> 续跑上下文 */
const pendingInterrupts = new Map()
/** 运行取消标记 */
const cancelledRuns = new Set()

// ============ 工具箱（全部真实执行） ============

function safePath(rel) {
  const p = resolve(WORKSPACE, String(rel || '').replace(/^\/+/, ''))
  if (!p.startsWith(WORKSPACE)) throw new Error(`路径越界: ${rel}`)
  return p
}

function simpleDiff(oldText, newText, path) {
  const o = (oldText ?? '').split('\n')
  const n = (newText ?? '').split('\n')
  const lines = [`--- a/${path}`, `+++ b/${path}`, `@@ -1,${o.length} +1,${n.length} @@`]
  for (const l of o) lines.push(`-${l}`)
  for (const l of n) lines.push(`+${l}`)
  return lines.join('\n')
}

export const SERVER_TOOLS = [
  {
    name: 'list_files', label: '列出文件', write: false,
    description: '列出工作区（沙箱目录）中的文件与子目录',
    parameters: { type: 'object', properties: { dir: { type: 'string', description: '相对目录，默认根' } } },
    async exec(args, ctx) {
      mkdirSync(WORKSPACE, { recursive: true })
      const dir = safePath(args.dir || '.')
      const walk = (d, prefix = '') => readdirSync(d).flatMap((f) => {
        const full = join(d, f)
        const rel = prefix ? `${prefix}/${f}` : f
        return statSync(full).isDirectory() ? [rel + '/', ...walk(full, rel)] : [rel]
      })
      const files = existsSync(dir) ? walk(dir) : []
      return { files, count: files.length }
    },
  },
  {
    name: 'read_file', label: '读取文件', write: false,
    description: '读取工作区中某个文件的内容',
    parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    async exec(args) {
      const p = safePath(args.path)
      if (!existsSync(p)) return { error: `文件不存在: ${args.path}` }
      return { path: args.path, content: readFileSync(p, 'utf8').slice(0, 8000) }
    },
  },
  {
    name: 'write_file', label: '写入文件', write: true,
    description: '在工作区创建或覆盖文件（高影响操作，可能需要用户审批）。写入后会出现在"变更审查"面板。',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' }, content: { type: 'string' } },
      required: ['path', 'content'],
    },
    async exec(args, ctx) {
      const p = safePath(args.path)
      const exists = existsSync(p)
      const oldContent = exists ? readFileSync(p, 'utf8') : ''
      mkdirSync(dirname(p), { recursive: true })
      writeFileSync(p, String(args.content), 'utf8')
      ctx.emit('FILE_CHANGE', {
        id: `fc_${randomUUID().slice(0, 8)}`,
        path: args.path,
        kind: exists ? 'modify' : 'create',
        diff: simpleDiff(oldContent, args.content, args.path),
        content: String(args.content).slice(0, 4000),
        additions: String(args.content).split('\n').length,
        deletions: exists ? oldContent.split('\n').length : 0,
        status: 'pending',
      })
      return { ok: true, path: args.path, bytes: Buffer.byteLength(String(args.content)) }
    },
  },
  {
    name: 'delete_file', label: '删除文件', write: true,
    description: '删除工作区中的文件（高影响操作）',
    parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
    async exec(args, ctx) {
      const p = safePath(args.path)
      if (!existsSync(p)) return { error: `文件不存在: ${args.path}` }
      rmSync(p)
      ctx.emit('FILE_CHANGE', {
        id: `fc_${randomUUID().slice(0, 8)}`, path: args.path, kind: 'delete', status: 'pending',
      })
      return { ok: true, deleted: args.path }
    },
  },
  {
    name: 'run_command', label: '执行命令', write: true,
    description: `在工作区沙箱内真实执行 shell 命令（白名单: ${[...CMD_WHITELIST].join('/')}），输出实时进入"终端"面板`,
    parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
    async exec(args, ctx) {
      const cmd = String(args.command || '').trim()
      const first = cmd.split(/\s+/)[0]
      if (!CMD_WHITELIST.has(first)) return { error: `命令 ${first} 不在白名单内` }
      if (/[;&|><`$(){}]/.test(cmd.replace(/\|/g, ''))) {
        // 允许单个管道，拒绝其他 shell 元字符
        if (!/^[^;&><`$(){}]+(\|[^;&><`$(){}]+)*$/.test(cmd)) return { error: '命令包含被禁止的 shell 元字符' }
      }
      mkdirSync(WORKSPACE, { recursive: true })
      ctx.emit('TERMINAL_APPEND', { id: `t_${randomUUID().slice(0, 8)}`, kind: 'command', text: cmd, timestamp: Date.now() })
      return await new Promise((done) => {
        const child = spawn('sh', ['-c', cmd], { cwd: WORKSPACE, timeout: 8000, env: { PATH: process.env.PATH } })
        let out = ''; let err = ''
        child.stdout.on('data', (d) => {
          out += d
          ctx.emit('TERMINAL_APPEND', { id: `t_${randomUUID().slice(0, 8)}`, kind: 'output', text: String(d).trimEnd(), timestamp: Date.now() })
        })
        child.stderr.on('data', (d) => {
          err += d
          ctx.emit('TERMINAL_APPEND', { id: `t_${randomUUID().slice(0, 8)}`, kind: 'error', text: String(d).trimEnd(), timestamp: Date.now() })
        })
        child.on('close', (code) => {
          ctx.emit('TERMINAL_APPEND', { id: `t_${randomUUID().slice(0, 8)}`, kind: 'info', text: `退出码 ${code}`, timestamp: Date.now() })
          done({ exitCode: code, stdout: out.slice(0, 4000), stderr: err.slice(0, 2000) })
        })
        child.on('error', (e) => done({ error: e.message }))
      })
    },
  },
  {
    name: 'set_tasks', label: '更新任务清单', write: false,
    description: '设置/更新任务清单（前端"任务"面板实时展示）。tasks 为数组，每项 { id, title, status: todo|in_progress|done }',
    parameters: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, status: { type: 'string', enum: ['todo', 'in_progress', 'done'] } }, required: ['id', 'title', 'status'] },
        },
      },
      required: ['tasks'],
    },
    async exec(args, ctx) {
      ctx.emit('TASK_UPDATE', { tasks: args.tasks })
      return { ok: true, count: args.tasks?.length ?? 0 }
    },
  },
  {
    name: 'set_plan', label: '更新执行计划', write: false,
    description: '设置执行计划（前端"计划"面板展示）。{ title, steps: [{ id, title, detail?, status: pending|active|done }] }',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        steps: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, detail: { type: 'string' }, status: { type: 'string' } }, required: ['id', 'title'] } },
      },
      required: ['title', 'steps'],
    },
    async exec(args, ctx) {
      ctx.emit('PLAN_UPDATE', { title: args.title, steps: args.steps })
      return { ok: true }
    },
  },
  {
    name: 'request_form', label: '请求表单输入', write: false,
    description: '向用户展示结构化表单收集输入。fields 每项 { name, label, type(text|textarea|select|number|date|switch), required?, options?[{label,value}] }。用户提交的内容会以下一条消息回来。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        fields: { type: 'array', items: { type: 'object' } },
      },
      required: ['title', 'fields'],
    },
    async exec(args, ctx) {
      ctx.emit('FORM_REQUEST', {
        formId: `form_${randomUUID().slice(0, 8)}`,
        title: args.title, description: args.description,
        fields: args.fields, submitLabel: '提交',
      })
      return { ok: true, note: '表单已展示给用户，等待用户填写后以消息形式回��' }
    },
  },
  {
    name: 'show_table', label: '展示表格', write: false,
    description: '以结构化表格卡片展示数据。columns: [{key,label}], rows: [{...}]',
    parameters: {
      type: 'object',
      properties: { title: { type: 'string' }, columns: { type: 'array', items: { type: 'object' } }, rows: { type: 'array', items: { type: 'object' } } },
      required: ['columns', 'rows'],
    },
    async exec(args, ctx) {
      ctx.emit('STRUCTURED_PAYLOAD', { type: 'table', title: args.title, data: { columns: args.columns, rows: args.rows } })
      return { ok: true }
    },
  },
  {
    name: 'show_chart', label: '展示图表', write: false,
    description: '以图表卡片展示数据。kind: bar|line|pie, labels: string[], series: [{name, values:number[]}]',
    parameters: {
      type: 'object',
      properties: { title: { type: 'string' }, kind: { type: 'string' }, labels: { type: 'array', items: { type: 'string' } }, series: { type: 'array', items: { type: 'object' } }, unit: { type: 'string' } },
      required: ['kind', 'labels', 'series'],
    },
    async exec(args, ctx) {
      ctx.emit('STRUCTURED_PAYLOAD', { type: 'chart', title: args.title, data: { kind: args.kind, labels: args.labels, series: args.series, unit: args.unit } })
      return { ok: true }
    },
  },
  {
    name: 'show_code', label: '展示代码', write: false,
    description: '以代码卡片展示一段代码。language, filename?, code',
    parameters: {
      type: 'object',
      properties: { title: { type: 'string' }, language: { type: 'string' }, filename: { type: 'string' }, code: { type: 'string' } },
      required: ['language', 'code'],
    },
    async exec(args, ctx) {
      ctx.emit('STRUCTURED_PAYLOAD', { type: 'code', title: args.title, data: { language: args.language, filename: args.filename, code: args.code } })
      return { ok: true }
    },
  },
]

// ============ 引擎 ============

function toOpenAiTools(serverTools, clientActions) {
  const t = serverTools.map((s) => ({
    type: 'function',
    function: { name: s.name, description: s.description, parameters: s.parameters },
  }))
  for (const a of clientActions ?? []) {
    t.push({
      type: 'function',
      function: {
        name: a.name,
        description: `[前端动作] ${a.description ?? a.label ?? a.name}`,
        parameters: a.parameters ?? { type: 'object', properties: {} },
      },
    })
  }
  return t
}

function requiresApproval(toolName, tool, agentMode, clientAction) {
  if (agentMode === 'plan') return true
  const declared = clientAction?.requiresApproval ?? false
  if (agentMode === 'full_access' || agentMode === 'auto_edit') return declared
  return declared || (tool?.write ?? false)
}

async function* streamLLM({ model, messages, tools, temperature, apiKey }) {
  const res = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model, messages, tools, temperature: temperature ?? 0.3,
      stream: true, stream_options: { include_usage: true },
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`LLM 请求失败 (${res.status}): ${text.slice(0, 400)}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      for (const line of part.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try { yield JSON.parse(payload) } catch { /* skip */ }
      }
    }
  }
}

/** 单轮 LLM 流式调用：收集文本/思考/工具调用并即时发事件 */
async function llmTurn(ctx, llmMessages, tools) {
  const messageId = `msg_${randomUUID().slice(0, 12)}`
  let textStarted = false
  let thinkingStarted = false
  let text = ''
  const calls = new Map() // index -> {id,name,args}
  let usage = null

  for await (const chunk of streamLLM({
    model: ctx.model, messages: llmMessages, tools,
    temperature: ctx.temperature, apiKey: ctx.apiKey,
  })) {
    if (cancelledRuns.has(ctx.runId)) throw new Error('__cancelled__')
    if (chunk.usage) usage = chunk.usage
    const delta = chunk.choices?.[0]?.delta
    if (!delta) continue

    const reasoning = delta.reasoning_content ?? delta.reasoning
    if (reasoning) {
      if (!thinkingStarted) { thinkingStarted = true; ctx.emit('THINKING_START', { messageId }) }
      ctx.emit('THINKING_DELTA', { messageId, delta: reasoning })
    }
    if (delta.content) {
      if (thinkingStarted) { thinkingStarted = false; ctx.emit('THINKING_END', { messageId }) }
      if (!textStarted) { textStarted = true; ctx.emit('TEXT_MESSAGE_START', { messageId }) }
      text += delta.content
      ctx.emit('TEXT_DELTA', { messageId, delta: delta.content })
    }
    for (const tc of delta.tool_calls ?? []) {
      const idx = tc.index ?? 0
      if (!calls.has(idx)) calls.set(idx, { id: tc.id || `call_${randomUUID().slice(0, 8)}`, name: '', args: '' })
      const c = calls.get(idx)
      if (tc.function?.name) c.name += tc.function.name
      if (tc.function?.arguments) c.args += tc.function.arguments
    }
  }
  if (thinkingStarted) ctx.emit('THINKING_END', { messageId })
  if (textStarted) ctx.emit('TEXT_MESSAGE_END', { messageId })
  if (usage) {
    ctx.emit('USAGE', {
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
    })
  }
  return { text, calls: [...calls.values()] }
}

/** 执行一个工具调用（服务端工具真实执行；前端动作回传 TOOL_CALL 事件由前端处理） */
async function executeToolCall(ctx, call) {
  const tool = SERVER_TOOLS.find((t) => t.name === call.name)
  const clientAction = ctx.clientActions.find((a) => a.name === call.name)
  let args = {}
  try { args = call.args ? JSON.parse(call.args) : {} } catch { args = { __raw: call.args } }

  ctx.emit('TOOL_CALL_START', {
    toolCallId: call.id, name: call.name,
    label: tool?.label ?? clientAction?.label ?? call.name,
    origin: tool ? 'backend' : 'frontend',
  })
  ctx.emit('TOOL_CALL_ARGS', { toolCallId: call.id, args })
  ctx.emit('REACT_STEP', { type: 'action', content: `调用 ${call.name}`, toolCallId: call.id })

  let result
  if (tool) {
    try {
      result = await tool.exec(args, ctx)
    } catch (e) {
      result = { error: e.message }
    }
  } else if (clientAction) {
    // 前端动作：后端无法执行 handler，返回声明式结果（真实场景前端通过双向通道回传）
    result = { ok: true, note: `前端动作 ${call.name} 已派发（参数见 args），由浏览器端执行` }
  } else {
    result = { error: `未知工具: ${call.name}` }
  }

  const failed = result && typeof result === 'object' && 'error' in result
  ctx.emit('TOOL_CALL_RESULT', {
    toolCallId: call.id, status: failed ? 'error' : 'success',
    result: failed ? undefined : result, error: failed ? result.error : undefined,
  })
  ctx.emit('REACT_STEP', { type: 'observation', content: JSON.stringify(result).slice(0, 500), toolCallId: call.id })
  ctx.emit('GOVERNANCE_EVENT', {
    id: `gov_${randomUUID().slice(0, 8)}`, hook: 'post_tool',
    severity: failed ? 'warn' : 'info', rule: 'AUDIT-TOOL',
    message: `${call.name} 执行${failed ? '失败' : '成功'}`, timestamp: Date.now(),
  })
  return result
}

/** ReAct 主循环（支持从中断处续跑） */
async function reactLoop(ctx, llmMessages, tools, startRound = 0) {
  const MAX_ROUNDS = 8
  for (let round = startRound; round < MAX_ROUNDS; round++) {
    const { text, calls } = await llmTurn(ctx, llmMessages, tools)

    if (calls.length === 0) {
      if (text) ctx.emit('REACT_STEP', { type: 'final', content: text.slice(0, 300) })
      return
    }

    llmMessages.push({
      role: 'assistant', content: text || null,
      tool_calls: calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.args || '{}' } })),
    })

    for (let i = 0; i < calls.length; i++) {
      const call = calls[i]
      const tool = SERVER_TOOLS.find((t) => t.name === call.name)
      const clientAction = ctx.clientActions.find((a) => a.name === call.name)

      if (requiresApproval(call.name, tool, ctx.agentMode, clientAction)) {
        let args = {}
        try { args = call.args ? JSON.parse(call.args) : {} } catch { /* keep */ }
        const interruptId = `int_${randomUUID().slice(0, 10)}`
        pendingInterrupts.set(interruptId, {
          ctxData: {
            runId: ctx.runId, sessionId: ctx.sessionId, model: ctx.model,
            temperature: ctx.temperature, apiKey: ctx.apiKey,
            agentMode: ctx.agentMode, clientActions: ctx.clientActions,
          },
          llmMessages, tools, calls, callIndex: i, round,
        })
        ctx.emit('GOVERNANCE_EVENT', {
          id: `gov_${randomUUID().slice(0, 8)}`, hook: 'pre_tool', severity: 'warn',
          rule: 'RULE-006', message: `高影响动作 ${call.name} 触发 HITL 审批`, timestamp: Date.now(),
        })
        ctx.emit('INTERRUPT', {
          id: interruptId, runId: ctx.runId, kind: 'approval',
          title: `确认执行「${tool?.label ?? call.name}」？`,
          description: ctx.agentMode === 'plan' ? '当前为 Plan 模式，所有工具执行均需确认' : '该操作会产生真实副作用（写文件/执行命令）',
          action: { name: call.name, label: tool?.label, args },
          timestamp: Date.now(),
        })
        return 'interrupted'
      }

      const result = await executeToolCall(ctx, call)
      llmMessages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result ?? {}) })
    }
  }
  ctx.emit('TEXT_MESSAGE_START', { messageId: `msg_${randomUUID().slice(0, 8)}` })
  ctx.emit('TEXT_DELTA', { delta: '（已达最大工具调用轮次）' })
}

const SYSTEM_PROMPT = `你是 Agent Copilot 的全功能演示 Agent，运行在真实的 Node 后端上。你拥有以下真实能力，应根据用户请求主动使用：
- 文件：list_files / read_file / write_file / delete_file（真实读写服务器沙箱 .agent-workspace/）
- 终端：run_command（真实执行白名单命令，如 node -e "..."、ls、cat）
- 任务与计划：set_tasks / set_plan（前端面板实时可视化）
- 表单：request_form（收集结构化输入）
- 结构化产物：show_table / show_chart / show_code
处理复杂请求时先用 set_plan 列出计划、set_tasks 建任务清单，再逐步执行并更新状态。回答用中文，简洁专业。`

async function runPipeline(ctx, body) {
  ctx.emit('RUN_STARTED', {})
  const stages = ['input_understanding', 'ontology_reasoning', 'readiness_gate']
  ctx.emit('STAGE_STARTED', { stage: 'input_understanding' })
  ctx.emit('REACT_STEP', { type: 'thought', content: '解析用户输入与会话上下文' })
  ctx.emit('STAGE_FINISHED', { stage: 'input_understanding', status: 'succeeded', summary: `${body.messages?.length ?? 0} 条消息` })
  ctx.emit('STAGE_STARTED', { stage: 'ontology_reasoning' })
  ctx.emit('STAGE_FINISHED', { stage: 'ontology_reasoning', status: 'succeeded', summary: `${SERVER_TOOLS.length} 个服务端工具 + ${ctx.clientActions.length} 个前端动作` })
  ctx.emit('STAGE_STARTED', { stage: 'readiness_gate' })
  ctx.emit('GATE_DECISION', { decision: 'pass', reason: 'API 密钥就绪，工具箱可用', timestamp: Date.now() })
  ctx.emit('STAGE_FINISHED', { stage: 'readiness_gate', status: 'succeeded' })

  ctx.emit('STAGE_STARTED', { stage: 'react_execution' })
  const llmMessages = [
    { role: 'system', content: [SYSTEM_PROMPT, body.systemPrompt, body.additionalInstructions].filter(Boolean).join('\n\n') },
    ...(body.messages ?? []).map((m) => ({ role: m.role, content: m.content })),
  ]
  const tools = toOpenAiTools(SERVER_TOOLS, ctx.clientActions)
  const outcome = await reactLoop(ctx, llmMessages, tools)
  if (outcome === 'interrupted') return // 等待 /resume，流由调用方关闭

  ctx.emit('STAGE_FINISHED', { stage: 'react_execution', status: 'succeeded' })
  ctx.emit('STAGE_STARTED', { stage: 'output_management' })
  ctx.emit('STAGE_FINISHED', { stage: 'output_management', status: 'succeeded' })
  ctx.emit('RUN_FINISHED', {})
}

// ============ HTTP 层 ============

function sseHeaders(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
}

function makeCtx(res, { runId, sessionId, model, temperature, apiKey, agentMode, clientActions }) {
  return {
    runId, sessionId, model, temperature, apiKey, agentMode,
    clientActions: clientActions ?? [],
    emit(type, data) {
      res.write(`data: ${JSON.stringify({ type, runId, timestamp: Date.now(), data })}\n\n`)
    },
  }
}

async function readBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

function resolveModel(body) {
  const thinking = body.metadata?.thinking === true
  const raw = body.model
  if (raw && MODEL_MAP[raw]) return MODEL_MAP[raw]
  if (raw && raw.includes('/')) return raw
  return thinking ? THINKING_MODEL : DEFAULT_MODEL
}

async function handleChat(req, res) {
  const body = await readBody(req)
  const apiKey = process.env.AI_GATEWAY_API_KEY
  const runId = body.runId || `run_${randomUUID().slice(0, 10)}`
  sseHeaders(res)
  const ctx = makeCtx(res, {
    runId, sessionId: body.sessionId,
    model: resolveModel(body), temperature: body.temperature,
    apiKey, agentMode: body.metadata?.agentMode ?? 'confirm_edits',
    clientActions: body.actions ?? [],
  })
  if (!apiKey) {
    ctx.emit('RUN_STARTED', {})
    ctx.emit('RUN_ERROR', { message: '缺少 AI_GATEWAY_API_KEY 环境变量：请在项目设置 → Vars 中配置后重试（真实 LLM 通过 Vercel AI Gateway 调用）' })
    res.end()
    return
  }
  try {
    await runPipeline(ctx, body)
  } catch (e) {
    if (e.message !== '__cancelled__') {
      ctx.emit('RUN_ERROR', { message: e.message })
    }
  } finally {
    cancelledRuns.delete(runId)
    res.end()
  }
}

async function handleResume(req, res) {
  const body = await readBody(req)
  const saved = pendingInterrupts.get(body.interruptId)
  sseHeaders(res)
  if (!saved) {
    res.write(`data: ${JSON.stringify({ type: 'RUN_ERROR', runId: body.runId ?? '', timestamp: Date.now(), data: { message: '中断已过期或不存在' } })}\n\n`)
    res.end()
    return
  }
  pendingInterrupts.delete(body.interruptId)
  const ctx = makeCtx(res, saved.ctxData)
  try {
    const { llmMessages, tools, calls, callIndex } = saved
    const call = calls[callIndex]
    if (body.approved) {
      const result = await executeToolCall(ctx, call)
      llmMessages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result ?? {}) })
    } else {
      ctx.emit('GOVERNANCE_EVENT', {
        id: `gov_${randomUUID().slice(0, 8)}`, hook: 'pre_tool', severity: 'block',
        rule: 'RULE-006', message: `用户拒绝执行 ${call.name}`, timestamp: Date.now(),
      })
      llmMessages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ denied: true, comment: body.comment ?? '用户拒绝了该操作' }) })
    }
    // 处理同轮剩余调用 + 继续循环
    for (let i = callIndex + 1; i < calls.length; i++) {
      const result = await executeToolCall(ctx, calls[i])
      llmMessages.push({ role: 'tool', tool_call_id: calls[i].id, content: JSON.stringify(result ?? {}) })
    }
    const outcome = await reactLoop(ctx, llmMessages, tools, saved.round + 1)
    if (outcome !== 'interrupted') {
      ctx.emit('STAGE_FINISHED', { stage: 'react_execution', status: 'succeeded' })
      ctx.emit('STAGE_STARTED', { stage: 'output_management' })
      ctx.emit('STAGE_FINISHED', { stage: 'output_management', status: 'succeeded' })
      ctx.emit('RUN_FINISHED', {})
    }
  } catch (e) {
    if (e.message !== '__cancelled__') {
      ctx.emit('RUN_ERROR', { message: e.message })
    }
  } finally {
    res.end()
  }
}

/** Vite 插件：把真实 Agent 后端挂到开发服务器 */
export function agentBackendPlugin() {
  return {
    name: 'agent-backend',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (!url?.startsWith('/api/agent/')) return next()
        try {
          if (req.method === 'POST' && url === '/api/agent/chat') return await handleChat(req, res)
          if (req.method === 'POST' && url === '/api/agent/resume') return await handleResume(req, res)
          if (req.method === 'POST' && url === '/api/agent/cancel') {
            const body = await readBody(req)
            if (body.runId) cancelledRuns.add(body.runId)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end('{"ok":true}')
          }
          if (req.method === 'GET' && url === '/api/agent/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ ok: true, llmReady: Boolean(process.env.AI_GATEWAY_API_KEY), tools: SERVER_TOOLS.map((t) => t.name) }))
          }
          res.writeHead(404); res.end()
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    },
  }
}
