<script setup lang="ts">
/**
 * 协议一致性测试页
 *
 * 对 11 种 Agent 协议适配器做端到端验证：
 * 前端 createRuntime(protocol) → HTTP → Java 最小 Mock 后端（/api/mock/<协议>）
 * → 各协议官方流帧格式回放 → 适配器解析 → 统一 AgentEvent 流 → 自动断言。
 *
 * 每个用例断言：
 * 1. 事件边界：RUN_STARTED 开始、RUN_FINISHED 结束、无 RUN_ERROR
 * 2. 文本增量：拼接后包含预期问候语
 * 3. 工具调用：产出 TOOL_CALL_START（有工具帧的协议）
 * 4. 结构化载荷 / 用量：按协议能力断言
 */
import { computed, ref } from 'vue'
import { createRuntime } from '../../lib/agent-copilot/protocols'
import type { AgentEvent, RunInput } from '../../lib/agent-copilot/types'

interface CaseSpec {
  protocol: string
  /** mock 端点（vite 代理到 Java 8080） */
  endpoint: string
  /** 预期文本包含 */
  expectText: string
  /** 预期出现工具调用事件 */
  expectTool: boolean
  /** 预期出现结构化载荷 */
  expectPayload: boolean
  /** 预期出现用量事件 */
  expectUsage: boolean
  /** 展示名（边界用例用；默认取 protocol） */
  displayName?: string
  /** 自定义断言：提供则替代默认断言集 */
  assert?: (ctx: { types: string[]; events: AgentEvent[]; text: string; error?: string; durationMs: number }) => CheckResult[]
  /** 运行前配置：返回传给 run 的 AbortSignal（用于中断用例） */
  setup?: () => AbortSignal | undefined
}

const CASES: CaseSpec[] = [
  { protocol: 'ag-ui', endpoint: '/api/mock/ag-ui', expectText: 'AG-UI', expectTool: true, expectPayload: true, expectUsage: false },
  { protocol: 'langgraph', endpoint: '/api/mock/langgraph', expectText: 'LangGraph', expectTool: true, expectPayload: false, expectUsage: false },
  { protocol: 'langserve', endpoint: '/api/mock/langserve', expectText: 'LangServe', expectTool: true, expectPayload: false, expectUsage: false },
  { protocol: 'agentscope', endpoint: '/api/mock/agentscope', expectText: 'AgentScope', expectTool: true, expectPayload: true, expectUsage: true },
  { protocol: 'ai-sdk', endpoint: '/api/mock/ai-sdk', expectText: 'AI SDK', expectTool: true, expectPayload: true, expectUsage: false },
  { protocol: 'dify', endpoint: '/api/mock/dify', expectText: 'Dify', expectTool: true, expectPayload: false, expectUsage: true },
  { protocol: 'coze', endpoint: '/api/mock/coze', expectText: 'Coze', expectTool: true, expectPayload: false, expectUsage: true },
  { protocol: 'fastgpt', endpoint: '/api/mock/fastgpt', expectText: 'FastGPT', expectTool: true, expectPayload: false, expectUsage: false },
  { protocol: 'a2a', endpoint: '/api/mock/a2a', expectText: 'A2A', expectTool: false, expectPayload: true, expectUsage: false },
  { protocol: 'acp', endpoint: '/api/mock/acp', expectText: 'ACP', expectTool: false, expectPayload: true, expectUsage: false },
  { protocol: 'openai-assistants', endpoint: '/api/mock/openai-assistants', expectText: 'Assistants', expectTool: true, expectPayload: false, expectUsage: true },
]

/** 边界用例：统一走 ag-ui 适配器，验证运行时容错三大路径（错误传播 / 畸形帧 / 中断） */
const EDGE_CASES: CaseSpec[] = [
  {
    protocol: 'ag-ui',
    displayName: 'edge: HTTP 500',
    endpoint: '/api/mock/edge/http-error',
    expectText: '', expectTool: false, expectPayload: false, expectUsage: false,
    assert: ({ types, events, error }) => [
      { label: '不抛异常（错误转事件）', pass: !error, detail: error },
      { label: '以 RUN_STARTED 开始', pass: types[0] === 'RUN_STARTED', detail: `首事件: ${types[0] ?? '无'}` },
      { label: '以 RUN_ERROR 终止', pass: types[types.length - 1] === 'RUN_ERROR', detail: `末事件: ${types[types.length - 1] ?? '无'}` },
      {
        label: '错误信息含状态码 500',
        pass: String((events.find((e) => e.type === 'RUN_ERROR')?.data as { message?: string })?.message ?? '').includes('500'),
      },
    ],
  },
  {
    protocol: 'ag-ui',
    displayName: 'edge: 协议错误帧',
    endpoint: '/api/mock/edge/error-frame',
    expectText: '', expectTool: false, expectPayload: false, expectUsage: false,
    assert: ({ types, events, text, error }) => [
      { label: '不抛异常', pass: !error, detail: error },
      { label: '出错前文本已到达', pass: text.includes('出错前的部分输出'), detail: `实际: ${text.slice(0, 40) || '(空)'}` },
      { label: 'RUN_ERROR 透传', pass: types.includes('RUN_ERROR') },
      {
        label: '错误信息保留原文',
        pass: String((events.find((e) => e.type === 'RUN_ERROR')?.data as { message?: string })?.message ?? '').includes('超时'),
      },
      { label: '错误后不再补 RUN_FINISHED', pass: types[types.length - 1] === 'RUN_ERROR', detail: `末事件: ${types[types.length - 1] ?? '无'}` },
    ],
  },
  {
    protocol: 'ag-ui',
    displayName: 'edge: 畸形帧容错',
    endpoint: '/api/mock/edge/malformed',
    expectText: '', expectTool: false, expectPayload: false, expectUsage: false,
    assert: ({ types, text, error }) => [
      { label: '不抛异常（跳过坏帧）', pass: !error, detail: error },
      { label: '无 RUN_ERROR', pass: !types.includes('RUN_ERROR') },
      { label: '坏帧之后仍继续解析', pass: text.includes('畸形帧之后仍然存活'), detail: `实际: ${text.slice(0, 40) || '(空)'}` },
      { label: '以 RUN_FINISHED 结束', pass: types[types.length - 1] === 'RUN_FINISHED', detail: `末事件: ${types[types.length - 1] ?? '无'}` },
    ],
  },
  {
    protocol: 'ag-ui',
    displayName: 'edge: 中断取消',
    endpoint: '/api/mock/edge/slow',
    expectText: '', expectTool: false, expectPayload: false, expectUsage: false,
    setup: () => {
      const controller = new AbortController()
      // 慢速流全程约 10s；600ms 后中断，收到部分文本即取消
      setTimeout(() => controller.abort(), 600)
      return controller.signal
    },
    assert: ({ types, events, durationMs, error }) => [
      { label: '不抛异常（中断转事件）', pass: !error, detail: error },
      { label: '流被提前终止（< 3s）', pass: durationMs < 3000, detail: `耗时 ${durationMs}ms（完整流约 10s）` },
      { label: '以 RUN_FINISHED 收尾', pass: types[types.length - 1] === 'RUN_FINISHED', detail: `末事件: ${types[types.length - 1] ?? '无'}` },
      {
        label: '结束事件标记 cancelled',
        pass: (events[events.length - 1]?.data as { cancelled?: boolean })?.cancelled === true,
      },
    ],
  },
]

interface CheckResult {
  label: string
  pass: boolean
  detail?: string
}

interface CaseState {
  spec: CaseSpec
  status: 'idle' | 'running' | 'pass' | 'fail'
  checks: CheckResult[]
  events: string[]
  error?: string
  durationMs?: number
}

const cases = ref<CaseState[]>(
  [...CASES, ...EDGE_CASES].map((spec) => ({ spec, status: 'idle', checks: [], events: [] })),
)

/** 用例唯一键（边界用例 protocol 重复，需用展示名区分） */
function caseKey(spec: CaseSpec): string {
  return spec.displayName ?? spec.protocol
}
const running = ref(false)
const backendOk = ref<boolean | null>(null)

const summary = computed(() => {
  const done = cases.value.filter((c) => c.status === 'pass' || c.status === 'fail')
  const pass = cases.value.filter((c) => c.status === 'pass')
  return { done: done.length, pass: pass.length, total: cases.value.length }
})

function makeInput(runId: string): RunInput {
  return {
    sessionId: 'proto_test_session',
    runId,
    messages: [{ id: 'u1', role: 'user', content: '协议测试', createdAt: Date.now() }],
    readables: [],
    actions: [],
    additionalInstructions: [],
  }
}

async function checkBackend(): Promise<boolean> {
  try {
    const res = await fetch('/api/mock/health')
    const j = await res.json()
    backendOk.value = j?.status === 'ok'
  } catch {
    backendOk.value = false
  }
  return backendOk.value === true
}

async function runCase(state: CaseState): Promise<void> {
  state.status = 'running'
  state.checks = []
  state.events = []
  state.error = undefined
  const start = performance.now()

  const runtime = createRuntime({
    protocol: state.spec.protocol as never,
    endpoint: state.spec.endpoint,
  } as never)

  const events: AgentEvent[] = []
  let text = ''
  const signal = state.spec.setup?.()
  try {
    const input = { ...makeInput(`run_${caseKey(state.spec)}`), signal }
    for await (const ev of runtime.run(input)) {
      events.push(ev)
      state.events.push(ev.type)
      if (ev.type === 'TEXT_DELTA') {
        const d = ev.data as { delta?: string }
        text += d?.delta ?? ''
      }
    }
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
  }
  state.durationMs = Math.round(performance.now() - start)

  const types = events.map((e) => e.type)

  // 边界用例：自定义断言集
  if (state.spec.assert) {
    state.checks = state.spec.assert({ types, events, text, error: state.error, durationMs: state.durationMs })
    state.status = state.checks.every((c) => c.pass) ? 'pass' : 'fail'
    return
  }

  const checks: CheckResult[] = []

  checks.push({
    label: '以 RUN_STARTED 开始',
    pass: types[0] === 'RUN_STARTED',
    detail: types[0] ? `首事件: ${types[0]}` : '无事件',
  })
  const last = types[types.length - 1]
  checks.push({
    label: '以 RUN_FINISHED 结束',
    pass: last === 'RUN_FINISHED',
    detail: last ? `末事件: ${last}` : '无事件',
  })
  checks.push({
    label: '无 RUN_ERROR',
    pass: !types.includes('RUN_ERROR'),
    detail: types.includes('RUN_ERROR')
      ? String((events.find((e) => e.type === 'RUN_ERROR')?.data as { message?: string })?.message ?? '')
      : undefined,
  })
  checks.push({
    label: `文本包含「${state.spec.expectText}」`,
    pass: text.includes(state.spec.expectText),
    detail: `实际: ${text.slice(0, 60) || '(空)'}`,
  })
  if (state.spec.expectTool) {
    checks.push({
      label: '产出 TOOL_CALL_START',
      pass: types.includes('TOOL_CALL_START'),
    })
    checks.push({
      label: '产出 TOOL_CALL_RESULT',
      pass: types.includes('TOOL_CALL_RESULT'),
    })
  }
  if (state.spec.expectPayload) {
    checks.push({
      label: '产出 STRUCTURED_PAYLOAD',
      pass: types.includes('STRUCTURED_PAYLOAD'),
    })
  }
  if (state.spec.expectUsage) {
    checks.push({
      label: '产出 USAGE',
      pass: types.includes('USAGE'),
    })
  }

  state.checks = checks
  state.status = checks.every((c) => c.pass) && !state.error ? 'pass' : 'fail'
}

async function runAll(): Promise<void> {
  if (running.value) return
  running.value = true
  try {
    const ok = await checkBackend()
    if (!ok) {
      for (const c of cases.value) {
        c.status = 'fail'
        c.checks = [{ label: 'Java Mock 后端可达（/api/mock/health）', pass: false, detail: '请先启动 java-backend（端口 8080）' }]
      }
      return
    }
    for (const c of cases.value) {
      await runCase(c)
    }
  } finally {
    running.value = false
  }
}

const expanded = ref<Set<string>>(new Set())
function toggle(protocol: string): void {
  const next = new Set(expanded.value)
  if (next.has(protocol)) next.delete(protocol)
  else next.add(protocol)
  expanded.value = next
}
</script>

<template>
  <div class="pt-page">
    <header class="pt-header">
      <div>
        <h1 class="pt-title">协议一致性测试</h1>
        <p class="pt-sub">
          11 种 Agent 协议适配器 + 4 个边界用例（HTTP 错误 / 错误帧 / 畸形帧 / 中断取消）
          × Java 最小 Mock 后端（Spring WebFlux SSE）端到端验证：
          请求构造 → 官方帧格式回放 → 适配器解析 → 统一事件流断言。
        </p>
      </div>
      <div class="pt-actions">
        <span v-if="backendOk === false" class="pt-backend pt-backend--down">后端未启动</span>
        <span v-else-if="backendOk" class="pt-backend pt-backend--up">后端就绪</span>
        <button type="button" class="pt-run" :disabled="running" @click="runAll">
          <span v-if="running" class="ac-spin" />
          {{ running ? '测试中…' : '运行全部用例' }}
        </button>
      </div>
    </header>

    <div v-if="summary.done > 0" class="pt-summary" role="status">
      通过 {{ summary.pass }} / {{ summary.total }}
      <span v-if="summary.pass === summary.total && summary.done === summary.total" class="pt-summary__ok">全部通过</span>
      <span v-else-if="summary.done === summary.total" class="pt-summary__bad">存在失败</span>
    </div>

    <ul class="pt-list">
      <li v-for="c in cases" :key="caseKey(c.spec)" class="pt-case" :data-status="c.status">
        <button type="button" class="pt-case__head" @click="toggle(caseKey(c.spec))">
          <span class="pt-case__badge" :data-status="c.status" aria-hidden="true" />
          <span class="pt-case__name">{{ caseKey(c.spec) }}</span>
          <code class="pt-case__ep">{{ c.spec.endpoint }}</code>
          <span v-if="c.durationMs != null" class="pt-case__dur">{{ c.durationMs }}ms</span>
          <span class="pt-case__status">
            {{ c.status === 'idle' ? '待运行' : c.status === 'running' ? '运行中' : c.status === 'pass' ? '通过' : '失败' }}
          </span>
        </button>
        <div v-if="expanded.has(caseKey(c.spec)) || c.status === 'fail'" class="pt-case__body">
          <p v-if="c.error" class="pt-case__err">异常：{{ c.error }}</p>
          <ul class="pt-checks">
            <li v-for="(chk, i) in c.checks" :key="i" class="pt-check" :data-pass="chk.pass">
              <span aria-hidden="true">{{ chk.pass ? '✓' : '✗' }}</span>
              <span>{{ chk.label }}</span>
              <span v-if="chk.detail" class="pt-check__detail">{{ chk.detail }}</span>
            </li>
          </ul>
          <details v-if="c.events.length" class="pt-events">
            <summary>事件流水（{{ c.events.length }} 个事件）</summary>
            <code class="pt-events__seq">{{ c.events.join(' → ') }}</code>
          </details>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.pt-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}
.pt-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.pt-title {
  margin: 0 0 6px;
  font-size: 1.5rem;
}
.pt-sub {
  margin: 0;
  max-width: 640px;
  color: var(--ac-text-dim, #667);
  font-size: 0.9rem;
  line-height: 1.6;
}
.pt-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.pt-backend {
  font-size: 0.8rem;
  padding: 3px 10px;
  border-radius: 999px;
}
.pt-backend--up { background: color-mix(in srgb, var(--ac-success, #16a34a) 14%, transparent); color: var(--ac-success, #16a34a); }
.pt-backend--down { background: color-mix(in srgb, var(--ac-danger, #b42318) 14%, transparent); color: var(--ac-danger, #b42318); }
.pt-run {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  background: var(--ac-primary, #0f6b54);
  color: var(--ac-primary-fg, #fff);
  font-size: 0.9rem;
  cursor: pointer;
}
.pt-run:disabled { opacity: 0.6; cursor: default; }
.pt-summary {
  margin: 18px 0 0;
  font-size: 0.95rem;
  display: flex;
  gap: 10px;
  align-items: center;
}
.pt-summary__ok { color: var(--ac-success, #16a34a); font-weight: 600; }
.pt-summary__bad { color: var(--ac-danger, #b42318); font-weight: 600; }
.pt-list {
  list-style: none;
  margin: 20px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pt-case {
  border: 1px solid var(--ac-border, #e3e5e8);
  border-radius: 10px;
  background: var(--ac-bg, #fff);
  overflow: hidden;
}
.pt-case[data-status='pass'] { border-color: color-mix(in srgb, var(--ac-success, #16a34a) 45%, transparent); }
.pt-case[data-status='fail'] { border-color: color-mix(in srgb, var(--ac-danger, #b42318) 45%, transparent); }
.pt-case__head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  background: transparent;
  color: var(--ac-text, #1a1d21);
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
}
.pt-case__badge {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--ac-border, #ccc);
}
.pt-case__badge[data-status='running'] { background: var(--ac-warning, #d97706); }
.pt-case__badge[data-status='pass'] { background: var(--ac-success, #16a34a); }
.pt-case__badge[data-status='fail'] { background: var(--ac-danger, #b42318); }
.pt-case__name { font-weight: 600; min-width: 130px; }
.pt-case__ep {
  font-size: 0.78rem;
  color: var(--ac-text-dim, #667);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.pt-case__dur { font-size: 0.78rem; color: var(--ac-text-dim, #667); }
.pt-case__status { font-size: 0.82rem; flex-shrink: 0; }
.pt-case__body {
  padding: 0 14px 12px;
  border-top: 1px dashed var(--ac-border, #e3e5e8);
}
.pt-case__err {
  margin: 10px 0 0;
  color: var(--ac-danger, #b42318);
  font-size: 0.85rem;
}
.pt-checks {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pt-check {
  display: flex;
  gap: 8px;
  font-size: 0.85rem;
  align-items: baseline;
}
.pt-check[data-pass='true'] > span:first-child { color: var(--ac-success, #16a34a); }
.pt-check[data-pass='false'] > span:first-child { color: var(--ac-danger, #b42318); }
.pt-check__detail { color: var(--ac-text-dim, #667); font-size: 0.78rem; }
.pt-events { margin-top: 10px; font-size: 0.82rem; }
.pt-events summary { cursor: pointer; color: var(--ac-text-dim, #667); }
.pt-events__seq {
  display: block;
  margin-top: 6px;
  padding: 8px 10px;
  background: var(--ac-surface, #f5f6f7);
  border-radius: 6px;
  font-size: 0.75rem;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
</style>
