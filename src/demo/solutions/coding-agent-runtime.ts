/**
 * Coding Agent 演示运行时 — 脚本化播放 Agentic 事件流。
 *
 * 不依赖真实 LLM：按剧本回放 THINKING / PLAN_UPDATE / TASK_UPDATE /
 * TOOL_CALL / FILE_CHANGE / TERMINAL_APPEND / TEXT_DELTA 事件，
 * 用于确定性演示 AgentWorkspace 全部面板联动。
 */
import type { AgentEvent, AgentRuntime, RunInput } from '../../lib/agent-copilot'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let seq = 0
const uid = (p: string) => `${p}_${Date.now()}_${seq++}`

/** 演示用文件变更 diff */
const LOGIN_DIFF = `@@ -12,6 +12,18 @@ export function LoginForm() {
   const [email, setEmail] = useState('')
   const [password, setPassword] = useState('')
+  const [error, setError] = useState<string | null>(null)
+  const [loading, setLoading] = useState(false)
+
+  async function handleSubmit(e: FormEvent) {
+    e.preventDefault()
+    setLoading(true)
+    setError(null)
+    const res = await signIn(email, password)
+    if (!res.ok) setError(res.message)
+    setLoading(false)
+  }
`

const VALIDATE_DIFF = `@@ -1,3 +1,15 @@
+const EMAIL_RE = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/
+
+export function validateEmail(v: string): string | null {
+  if (!v.trim()) return '邮箱不能为空'
+  if (!EMAIL_RE.test(v)) return '邮箱格式不正确'
+  return null
+}
+
+export function validatePassword(v: string): string | null {
+  if (v.length < 8) return '密码至少 8 位'
+  return null
+}
`

async function* playScript(input: RunInput): AsyncIterable<AgentEvent> {
  const runId = input.runId
  const now = () => Date.now()
  const ev = (type: AgentEvent['type'], data?: unknown): AgentEvent => ({
    type, runId, timestamp: now(), data,
  })

  yield ev('RUN_STARTED')

  // 1. 思考
  yield ev('THINKING_START')
  const thinking = '用户要求给登录表单加校验和错误处理。先查看现有 LoginForm 组件的结构，确认表单提交路径，然后：1) 抽一个 validators 工具模块；2) 在组件中接入校验与错误态；3) 运行测试确认无回归。'
  for (const chunk of thinking.match(/.{1,18}/g) ?? []) {
    yield ev('THINKING_DELTA', { delta: chunk })
    await sleep(60)
  }
  yield ev('THINKING_END')

  // 2. 计划
  yield ev('PLAN_UPDATE', {
    id: uid('plan'),
    title: '为登录表单添加校验与错误处理',
    status: 'executing',
    steps: [
      { id: 's1', title: '读取现有 LoginForm 组件', status: 'running' },
      { id: 's2', title: '新建 validators.ts 校验模块', status: 'pending' },
      { id: 's3', title: '接入校验与错误提示', status: 'pending' },
      { id: 's4', title: '运行单元测试验证', status: 'pending' },
    ],
  })
  yield ev('TASK_UPDATE', {
    tasks: [
      { id: 't1', title: '读取现有代码', status: 'active' },
      { id: 't2', title: '编写校验模块', status: 'pending' },
      { id: 't3', title: '修改登录组件', status: 'pending' },
      { id: 't4', title: '运行测试', status: 'pending' },
    ],
  })
  await sleep(400)

  // 3. 读文件（工具调用）
  const readId = uid('tool')
  yield ev('TOOL_CALL_START', { toolCallId: readId, name: 'read_file', label: '读取文件 LoginForm.tsx' })
  await sleep(500)
  yield ev('TOOL_CALL_RESULT', { toolCallId: readId, status: 'success', result: '读取 86 行 — 表单无校验逻辑，提交直接调用 signIn' })
  yield ev('TASK_UPDATE', { task: { id: 't1', title: '读取现有代码', status: 'done' } })
  yield ev('TASK_UPDATE', { task: { id: 't2', title: '编写校验模块', status: 'active' } })
  yield ev('PLAN_UPDATE', {
    id: 'plan_current', title: '为登录表单添加校验与错误处理', status: 'executing',
    steps: [
      { id: 's1', title: '读取现有 LoginForm 组件', status: 'done' },
      { id: 's2', title: '新建 validators.ts 校验模块', status: 'running' },
      { id: 's3', title: '接入校验与错误提示', status: 'pending' },
      { id: 's4', title: '运行单元测试验证', status: 'pending' },
    ],
  })
  await sleep(300)

  // 4. 写校验模块（文件变更 1）
  const writeId = uid('tool')
  yield ev('TOOL_CALL_START', { toolCallId: writeId, name: 'write_file', label: '新建 validators.ts' })
  await sleep(600)
  yield ev('TOOL_CALL_RESULT', { toolCallId: writeId, status: 'success', result: '新建 15 行' })
  yield ev('FILE_CHANGE', {
    id: 'chg_validators',
    path: 'src/lib/validators.ts',
    kind: 'create',
    diff: VALIDATE_DIFF,
    language: 'typescript',
    additions: 12,
    deletions: 0,
    status: 'pending',
  })
  yield ev('TASK_UPDATE', { task: { id: 't2', title: '编写校验模块', status: 'done' } })
  yield ev('TASK_UPDATE', { task: { id: 't3', title: '修改登录组件', status: 'active' } })
  await sleep(300)

  // 5. 修改登录组件（文件变更 2）
  const editId = uid('tool')
  yield ev('TOOL_CALL_START', { toolCallId: editId, name: 'edit_file', label: '编辑 LoginForm.tsx' })
  await sleep(700)
  yield ev('TOOL_CALL_RESULT', { toolCallId: editId, status: 'success', result: '+12 -0' })
  yield ev('FILE_CHANGE', {
    id: 'chg_login',
    path: 'src/components/LoginForm.tsx',
    kind: 'modify',
    diff: LOGIN_DIFF,
    language: 'tsx',
    additions: 12,
    deletions: 0,
    status: 'pending',
  })
  yield ev('TASK_UPDATE', { task: { id: 't3', title: '修改登录组件', status: 'done' } })
  yield ev('TASK_UPDATE', { task: { id: 't4', title: '运行测试', status: 'active' } })
  yield ev('PLAN_UPDATE', {
    id: 'plan_current', title: '为登录表单添加校验与错误处理', status: 'executing',
    steps: [
      { id: 's1', title: '读取现有 LoginForm 组件', status: 'done' },
      { id: 's2', title: '新建 validators.ts 校验模块', status: 'done' },
      { id: 's3', title: '接入校验与错误提示', status: 'done' },
      { id: 's4', title: '运行单元测试验证', status: 'running' },
    ],
  })
  await sleep(300)

  // 6. 运行测试（终端流）
  const runToolId = uid('tool')
  yield ev('TOOL_CALL_START', { toolCallId: runToolId, name: 'run_command', label: '运行 pnpm test' })
  yield ev('TERMINAL_APPEND', { entries: [{ id: uid('te'), kind: 'cmd', text: 'pnpm test -- validators' }] })
  await sleep(500)
  const outputs = [
    { kind: 'out', text: '> vitest run src/lib/validators.test.ts' },
    { kind: 'out', text: ' ✓ validateEmail 拒绝空值 (2ms)' },
    { kind: 'out', text: ' ✓ validateEmail 拒绝非法格式 (1ms)' },
    { kind: 'out', text: ' ✓ validatePassword 长度校验 (1ms)' },
    { kind: 'out', text: 'Test Files  1 passed (1)' },
    { kind: 'info', text: '退出码 0 — 全部通过' },
  ]
  for (const o of outputs) {
    yield ev('TERMINAL_APPEND', { entries: [{ id: uid('te'), ...o }] })
    await sleep(240)
  }
  yield ev('TOOL_CALL_RESULT', { toolCallId: runToolId, status: 'success', result: '3 个测试全部通过' })
  yield ev('TASK_UPDATE', { task: { id: 't4', title: '运行测试', status: 'done' } })
  yield ev('PLAN_UPDATE', {
    id: 'plan_current', title: '为登录表单添加校验与错误处理', status: 'done',
    steps: [
      { id: 's1', title: '读取现有 LoginForm 组件', status: 'done' },
      { id: 's2', title: '新建 validators.ts 校验模块', status: 'done' },
      { id: 's3', title: '接入校验与错误提示', status: 'done' },
      { id: 's4', title: '运行单元测试验证', status: 'done' },
    ],
  })

  // 7. 总结（文本流）
  const summary = '已完成登录表单的校验与错误处理：\n\n1. **新建** `src/lib/validators.ts` — 邮箱格式与密码长度校验\n2. **修改** `src/components/LoginForm.tsx` — 接入校验、错误提示与 loading 态\n3. **测试** 3 个单元测试全部通过\n\n有 **2 处文件变更**等待你在右侧「变更」面板中审查。'
  for (const chunk of summary.match(/.{1,16}/g) ?? []) {
    yield ev('TEXT_DELTA', { delta: chunk })
    await sleep(40)
  }
  yield ev('RUN_FINISHED')
}

/** 脚本化 Coding Agent 运行时（实现 AgentRuntime 接口） */
export const codingAgentRuntime: AgentRuntime = {
  kind: 'browser',
  run: (input) => playScript(input),
  // eslint-disable-next-line require-yield
  resume: async function* () {
    // 演示脚本不使用 HITL 中断
  },
  cancel: async () => {},
}

/** 演示工作区文件树 */
export const demoWorkspaceFiles = [
  {
    path: 'src', kind: 'dir' as const, children: [
      {
        path: 'src/components', kind: 'dir' as const, children: [
          {
            path: 'src/components/LoginForm.tsx', kind: 'file' as const, language: 'tsx',
            content: `export function LoginForm() {\n  const [email, setEmail] = useState('')\n  const [password, setPassword] = useState('')\n  const [error, setError] = useState<string | null>(null)\n  const [loading, setLoading] = useState(false)\n\n  async function handleSubmit(e: FormEvent) {\n    e.preventDefault()\n    const emailErr = validateEmail(email)\n    if (emailErr) return setError(emailErr)\n    setLoading(true)\n    const res = await signIn(email, password)\n    if (!res.ok) setError(res.message)\n    setLoading(false)\n  }\n\n  return (\n    <form onSubmit={handleSubmit}>{/* … */}</form>\n  )\n}`,
          },
        ],
      },
      {
        path: 'src/lib', kind: 'dir' as const, children: [
          {
            path: 'src/lib/validators.ts', kind: 'file' as const, language: 'typescript',
            content: `const EMAIL_RE = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/\n\nexport function validateEmail(v: string): string | null {\n  if (!v.trim()) return '邮箱不能为空'\n  if (!EMAIL_RE.test(v)) return '邮箱格式不正确'\n  return null\n}\n\nexport function validatePassword(v: string): string | null {\n  if (v.length < 8) return '密码至少 8 位'\n  return null\n}`,
          },
        ],
      },
    ],
  },
  { path: 'package.json', kind: 'file' as const, language: 'json', content: '{\n  "name": "demo-app",\n  "scripts": { "test": "vitest" }\n}' },
]
