<script setup lang="ts">
/**
 * Agentic 工作台组件页签 —— 模式选择 / 思考块 / 任务追踪 / 计划审批 /
 * 变更审查 / 工具动作卡 / 表单卡 / 澄清卡 / 工作区面板（静态演示数据）
 */
import { ref } from 'vue'
import ModeSelector from '../../lib/agent-copilot/components/agentic/ModeSelector.vue'
import ThinkingBlock from '../../lib/agent-copilot/components/agentic/ThinkingBlock.vue'
import TaskTracker from '../../lib/agent-copilot/components/agentic/TaskTracker.vue'
import PlanPanel from '../../lib/agent-copilot/components/agentic/PlanPanel.vue'

import ChangeReviewPanel from '../../lib/agent-copilot/components/agentic/ChangeReviewPanel.vue'
import ToolActionCard from '../../lib/agent-copilot/components/agentic/ToolActionCard.vue'
import AgentFormCard from '../../lib/agent-copilot/components/agentic/AgentFormCard.vue'
import ClarifyCard from '../../lib/agent-copilot/components/agentic/ClarifyCard.vue'
import AgentStepList from '../../lib/agent-copilot/components/agentic/AgentStepList.vue'
import type { AgentStep } from '../../lib/agent-copilot/components/agentic/AgentStepList.vue'
import CheckpointCard from '../../lib/agent-copilot/components/agentic/CheckpointCard.vue'
import WorkSummary from '../../lib/agent-copilot/components/agentic/WorkSummary.vue'
import FilePanel from '../../lib/agent-copilot/components/workspace/FilePanel.vue'
import TerminalPanel from '../../lib/agent-copilot/components/workspace/TerminalPanel.vue'
import ArtifactPanel from '../../lib/agent-copilot/components/workspace/ArtifactPanel.vue'
import type {
  AgentMode, AgentTask, ChatMessage, FileChange, PlanSpec, TerminalEntry, ToolCallState, WorkspaceFile,
} from '../../lib/agent-copilot/types'

const toolCalls: ToolCallState[] = [
  { id: 'tc1', name: 'read_file', args: { path: 'src/components/LoginForm.tsx' }, status: 'succeeded', result: '86 行 · 表单无校验逻辑', origin: 'backend' },
  { id: 'tc2', name: 'write_file', args: { path: 'src/lib/validators.ts' }, status: 'succeeded', result: '+15 行', origin: 'backend' },
  { id: 'tc3', name: 'edit_file', args: { path: 'src/components/LoginForm.tsx' }, status: 'succeeded', result: '+12 -2', origin: 'backend' },
  { id: 'tc4', name: 'run_command', args: { command: 'pnpm test -- validators' }, status: 'succeeded', result: 'PASS · 2 个测试通过', origin: 'backend' },
]

const mode = ref<AgentMode>('confirm_edits')

const tasks = ref<AgentTask[]>([
  { id: 't1', title: '分析登录表单现状', status: 'done' },
  { id: 't2', title: '新建校验工具函数', status: 'done' },
  { id: 't3', title: '接入表单错误提示', status: 'active', detail: '正在编辑 LoginForm.tsx' },
  { id: 't4', title: '运行测试验证', status: 'pending' },
])

const plan = ref<PlanSpec>({
  id: 'plan_demo',
  title: '登录表单校验改造',
  status: 'draft',
  steps: [
    { id: 's1', title: '读取 LoginForm 现有实现', status: 'pending' },
    { id: 's2', title: '抽取 validators.ts 校验函数', detail: '邮箱格式 + 密码长度', status: 'pending' },
    { id: 's3', title: '接入错误提示与禁用态', status: 'pending' },
    { id: 's4', title: '运行单元测试', status: 'pending' },
  ],
})

const changes = ref<FileChange[]>([
  {
    id: 'c1', path: 'src/lib/validators.ts', kind: 'create', status: 'pending',
    additions: 15, deletions: 0, language: 'typescript',
    content: `export function validateEmail(v: string) {\n  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)\n}\n\nexport function validatePassword(v: string) {\n  return v.length >= 8\n}`,
  },
  {
    id: 'c2', path: 'src/components/LoginForm.tsx', kind: 'modify', status: 'pending',
    additions: 12, deletions: 2, language: 'diff',
    diff: `@@ -1,6 +1,10 @@\n+import { validateEmail, validatePassword } from '../lib/validators'\n+\n function LoginForm() {\n-  const onSubmit = () => signIn(email, password)\n+  const [errors, setErrors] = useState<string[]>([])\n+  const onSubmit = () => {\n+    if (!validateEmail(email)) return setErrors(['邮箱格式不正确'])\n+    if (!validatePassword(password)) return setErrors(['密码至少 8 位'])\n+    signIn(email, password)\n+  }`,
  },
])

function onReview(changeId: string | 'all', decision: 'accepted' | 'rejected') {
  changes.value = changes.value.map((c) =>
    changeId === 'all' ? (c.status === 'pending' ? { ...c, status: decision } : c) : c.id === changeId ? { ...c, status: decision } : c,
  )
}

const files: WorkspaceFile[] = [
  {
    path: 'src', kind: 'dir',
    children: [
      {
        path: 'src/components', kind: 'dir',
        children: [
          { path: 'src/components/LoginForm.tsx', kind: 'file', language: 'tsx', content: `function LoginForm() {\n  const onSubmit = () => signIn(email, password)\n  return <form onSubmit={onSubmit}>…</form>\n}` },
        ],
      },
      {
        path: 'src/lib', kind: 'dir',
        children: [
          { path: 'src/lib/validators.ts', kind: 'file', language: 'typescript', content: `export function validateEmail(v: string) {\n  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)\n}` },
        ],
      },
    ],
  },
]

// ---- TerminalPanel 演示：真实交互模拟 shell（ANSI 着色 / 历史 / 退出码 / busy / 中断） ----
const terminal = ref<TerminalEntry[]>([
  { id: 'te1', kind: 'cmd', text: 'pnpm test -- validators', exitCode: 0 },
  { id: 'te2', kind: 'out', text: '\x1b[1m\x1b[32mPASS\x1b[0m src/lib/validators.test.ts' },
  { id: 'te3', kind: 'out', text: '  \x1b[32m✓\x1b[0m validateEmail 校验邮箱格式 \x1b[2m(2 ms)\x1b[0m' },
  { id: 'te4', kind: 'out', text: '  \x1b[32m✓\x1b[0m validatePassword 校验密码长度 \x1b[2m(1 ms)\x1b[0m' },
  { id: 'te5', kind: 'info', text: 'Tests: 2 passed, 2 total · 输入 help 查看可用命令' },
])

const termBusy = ref(false)
let termSeq = 10
let termTimers: ReturnType<typeof setTimeout>[] = []

function termPush(entry: Omit<TerminalEntry, 'id'>) {
  terminal.value.push({ ...entry, id: `te${termSeq++}` })
}

/** 模拟命令执行：分帧流式输出 ANSI 着色结果并回填退出码 */
function onTermCommand(cmd: string) {
  const cmdId = `te${termSeq++}`
  terminal.value.push({ id: cmdId, kind: 'cmd', text: cmd })
  termBusy.value = true
  termTimers = []

  const finish = (exitCode: number, delay: number) => {
    termTimers.push(setTimeout(() => {
      // 经响应式数组代理回填，直接改闭包原始对象不会触发视图更新
      const entry = terminal.value.find((e) => e.id === cmdId)
      if (entry) entry.exitCode = exitCode
      termBusy.value = false
    }, delay))
  }
  const out = (text: string, delay: number, kind: TerminalEntry['kind'] = 'out') => {
    termTimers.push(setTimeout(() => termPush({ kind, text }), delay))
  }

  const bin = cmd.split(/\s+/)[0]
  if (bin === 'help') {
    out('可用命令：\x1b[36mls\x1b[0m · \x1b[36mgit status\x1b[0m · \x1b[36mpnpm build\x1b[0m · \x1b[36mecho <文本>\x1b[0m · \x1b[36mclear\x1b[0m', 150, 'info')
    out('快捷键：\x1b[2m↑/↓ 历史　Ctrl+C 中断　Ctrl+L 清屏\x1b[0m', 300, 'info')
    finish(0, 360)
  } else if (bin === 'ls') {
    out('\x1b[1m\x1b[34msrc\x1b[0m  \x1b[1m\x1b[34mdocs\x1b[0m  \x1b[1m\x1b[34mpublic\x1b[0m  package.json  tsconfig.json  vite.config.ts', 260)
    finish(0, 320)
  } else if (bin === 'pnpm' || bin === 'npm') {
    out('\x1b[2m> vite build\x1b[0m', 300)
    out('\x1b[36mvite v6.0.3\x1b[0m building for production...', 800)
    out('\x1b[32m✓\x1b[0m 217 modules transformed.', 1600)
    out('dist/index.html                 \x1b[2m0.46 kB\x1b[0m', 2000)
    out('dist/assets/index.js  \x1b[1m\x1b[33m182.30 kB\x1b[0m \x1b[2mgzip: 58.71 kB\x1b[0m', 2200)
    out('\x1b[32m✓ built in 1.62s\x1b[0m', 2500)
    finish(0, 2600)
  } else if (bin === 'git') {
    out('On branch \x1b[1mmain\x1b[0m', 260)
    out("Your branch is up to date with 'origin/main'.", 420)
    out('nothing to commit, working tree clean', 580)
    finish(0, 640)
  } else if (bin === 'echo') {
    out(cmd.slice(5) || '', 150)
    finish(0, 200)
  } else {
    out(`bash: ${bin}: command not found`, 240, 'err')
    finish(127, 300)
  }
}

/** Ctrl+C：中断执行中的模拟命令 */
function onTermInterrupt() {
  for (const t of termTimers) clearTimeout(t)
  termTimers = []
  termPush({ kind: 'err', text: '^C' })
  const lastCmd = [...terminal.value].reverse().find((e) => e.kind === 'cmd')
  if (lastCmd && lastCmd.exitCode === undefined) lastCmd.exitCode = 130
  termBusy.value = false
}

function onTermClear() {
  for (const t of termTimers) clearTimeout(t)
  termTimers = []
  terminal.value = []
  termBusy.value = false
}

const formResult = ref('')
const clarifyResult = ref('')

// ---- 执行步骤时间流演示数据 ----
const agentSteps: AgentStep[] = [
  { id: 'st1', kind: 'thinking', title: 'Thought for 2s', note: '思考', detail: '需要先定位登录表单的现有实现，确认校验缺失的范围，再决定抽取公共校验函数还是内联处理。', expanded: false },
  { id: 'st2', kind: 'search', title: 'Explore', note: '2 Files', detail: 'src/components/LoginForm.tsx\nsrc/lib/validators.ts' },
  { id: 'st3', kind: 'terminal', title: 'Checked view heights', detail: '$ grep -n "height" src/components/LoginForm.tsx\n42:  height: 100%;\n88:  height: 40px;' },
  { id: 'st4', kind: 'file', title: 'Added validators', note: '+15 行' },
  { id: 'st5', kind: 'tool', title: 'Running tests', status: 'running' },
]

// ---- PlanReviewCard 演示：Markdown 长文计划 ----
const reviewPlanStatus = ref<'draft' | 'approved' | 'rejected'>('draft')
const reviewPlanContent = ref(`我将以"产品经理 + 原型验收负责人"的角色推进：先做严格的原型查漏补缺，再按优先级补齐关键交互，最终用可运行页面、构建结果和验收清单证明原型完成。

## 一、我对目标的具体化

**用户目标**：你扮演产品经理给我查漏补缺，直到原型制作完成。逻辑严谨。

我会把它落成以下交付标准：

1. **原型主流程完整**
   - 从本体列表进入"设计"工作台。
   - 设计工作台内能切换：总览、对象类型、链接类型、动作类型、指标。
   - 指标模块能完成新增、查看、编辑、删除、表达式配置、过滤条件、分析维度、SQL 预览。
2. **关键按钮不是摆设**
   - 每个可点击控件都有明确行为或提示。
   - 表单校验完整，异常路径有反馈。
3. **验收可回归**
   - 提供验收清单，每项可独立复验。
   - 构建通过、无类型错误。

## 二、执行顺序

1. 全量走查现有原型，输出缺陷清单（按 P0/P1/P2 分级）
2. 修复 P0 主流程断点
3. 补齐 P1 关键交互
4. 回归验收 + 构建证明`)

// ---- WorkSummary 演示：运行中实时走秒 ----
const workStartedAt = Date.now() - 47_000

// ---- ChangeReviewPanel collapsible 形态演示数据 ----
const barChanges = ref<FileChange[]>([
  {
    id: 'bc1', path: 'src/app/components/OntologyTable.tsx', kind: 'modify', status: 'pending',
    additions: 62, deletions: 0, language: 'diff',
    diff: `@@ -1,4 +1,10 @@\n+function formatMetricExpression(value: string) {\n+  const normalized = value\n+    .replace(/\\s+/g, ' ')\n+    .trim()\n+  return normalized\n+}`,
  },
])

function onBarReview(changeId: string | 'all', decision: 'accepted' | 'rejected') {
  barChanges.value = barChanges.value.map((c) =>
    changeId === 'all' ? (c.status === 'pending' ? { ...c, status: decision } : c) : c.id === changeId ? { ...c, status: decision } : c,
  )
}

// ---- 版本快照卡演示数据 ----
const checkpointFiles: FileChange[] = [
  { id: 'cp1', path: 'src/lib/validators.ts', kind: 'create', status: 'accepted', additions: 15, deletions: 0 },
  { id: 'cp2', path: 'src/components/LoginForm.tsx', kind: 'modify', status: 'accepted', additions: 12, deletions: 2 },
]
const checkpointMsg = ref('')

// ---- 产物面板演示数据（模拟一段含产物的会话消息流） ----
const artifactMessages: ChatMessage[] = [
  { id: 'am1', role: 'user', content: '给登录表单加校验，并给出改造前后的指标对比', createdAt: Date.now() - 300_000 },
  {
    id: 'am2', role: 'assistant', content: '已完成校验逻辑，以下是新增代码与指标对比。', createdAt: Date.now() - 240_000,
    payloads: [
      {
        type: 'code', title: 'validators.ts',
        data: { language: 'typescript', filename: 'src/lib/validators.ts', code: `export function validateEmail(v: string) {\n  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)\n}\n\nexport function validatePassword(v: string) {\n  return v.length >= 8\n}` },
      },
      {
        type: 'table', title: '改造前后对比',
        data: {
          columns: [
            { key: 'metric', label: '指标' },
            { key: 'before', label: '改造前' },
            { key: 'after', label: '改造后' },
          ],
          rows: [
            { metric: '无效提交率', before: '18%', after: '2%' },
            { metric: '表单错误定位耗时', before: '手动排查', after: '内联提示' },
          ],
        },
      },
      {
        type: 'chart', title: '每周无效提交趋势',
        data: { kind: 'bar', labels: ['W1', 'W2', 'W3', 'W4'], series: [{ name: '无效提交数', values: [124, 118, 36, 12] }], unit: '次' },
      },
    ],
  },
]
</script>

<template>
  <div class="agp">
    <section class="agp__section">
      <h2>ModeSelector — 运行模式选择</h2>
      <p class="agp__desc">四种权限模式：变更前确认 / 自动编辑 / 计划模式 / 完全访问。当前：{{ mode }}</p>
      <ModeSelector v-model:mode="mode" />
    </section>

    <div class="agp__grid">
      <section class="agp__section">
        <h2>ThinkingBlock — 思考块</h2>
        <p class="agp__desc">折叠的模型推理内容，支持流式追加与耗时显示。</p>
        <ThinkingBlock
          content="用户要求给登录表单添加校验。首先需要读取现有实现确认表单结构，然后决定校验逻辑放在独立的 validators 模块中以便复用与测试，最后接入错误提示。"
          :duration="3200"
        />
      </section>

      <section class="agp__section">
        <h2>TaskTracker — 任务追踪</h2>
        <p class="agp__desc">TodoList 式任务进度：完成 / 进行中 / 待处理。</p>
        <TaskTracker :tasks="tasks" />
      </section>
    </div>

    <div class="agp__grid">
      <section class="agp__section">
        <h2>AgentStepList — 执行步骤时间流</h2>
        <p class="agp__desc">思考 / 检索 / 终端 / 文件 / 工具动作按时间线排成可折叠日志（点击带箭头的步骤展开详情）。</p>
        <AgentStepList :steps="agentSteps" />
      </section>

      <section class="agp__section">
        <h2>CheckpointCard — 版本快照卡</h2>
        <p class="agp__desc">一次变更的快照摘要：版本标签、聚合差异统计、逐文件增删行数与一键回滚。{{ checkpointMsg }}</p>
        <CheckpointCard
          title="登录表单校验改造"
          version="v14"
          :files="checkpointFiles"
          @revert="checkpointMsg = '（已触发 revert 事件）'"
          @select-file="(f) => (checkpointMsg = `（点击了 ${f.path}）`)"
        />
      </section>
    </div>

    <section class="agp__section">
      <h2>PlanPanel — 计划预览 / 编辑 / 审批</h2>
      <p class="agp__desc">计划模式下 Agent 产出执行计划，用户可编辑步骤后批准或驳回。</p>
      <PlanPanel :plan="plan" editable @approve="(s) => { if (Array.isArray(s)) plan = { ...plan, status: 'approved', steps: s } }" @reject="plan = { ...plan, status: 'rejected' }" @update:plan="(p) => (plan = p)" />
    </section>

    <section class="agp__section">
      <h2>PlanPanel（Markdown 长文形态）— 整篇计划审查</h2>
      <p class="agp__desc">
        同一个 PlanPanel 组件：传 content（Markdown 字符串）即切换为长文审查形态——折叠预览（渐隐 + 居中"展开计划"按钮）→ 展开阅读 → 手动编辑全文 → 确认 / 驳回。
      </p>
      <PlanPanel
        v-model:content="reviewPlanContent"
        :status="reviewPlanStatus"
        @approve="reviewPlanStatus = 'approved'"
        @reject="reviewPlanStatus = 'rejected'"
      />
    </section>

    <section class="agp__section">
      <h2>ChangeReviewPanel — 变更审查</h2>
      <p class="agp__desc">逐文件 Diff 审查，支持单个与全部接受/拒绝。</p>
      <ChangeReviewPanel :changes="changes" @review="onReview" />
    </section>

    <div class="agp__grid">
      <section class="agp__section">
        <h2>WorkSummary — 工作耗时摘要行</h2>
        <p class="agp__desc">Agent 回合的耗时分隔条：运行中实时走秒，结束后定格总耗时。</p>
        <WorkSummary :started-at="workStartedAt" running />
        <WorkSummary :duration-ms="125_000" />
      </section>

      <section class="agp__section">
        <h2>ChangeReviewPanel — 折叠汇总条形态</h2>
        <p class="agp__desc">collapsible 时折叠为"N 个文件已更改 +x -y [撤销]"汇总条，点击展开文件列表。</p>
        <ChangeReviewPanel :changes="barChanges" collapsible @review="onBarReview" />
      </section>
    </div>

    <section class="agp__section">
      <h2>ToolActionCard — 工具动作特化卡</h2>
      <p class="agp__desc">按动作类型（读/写/编辑文件、执行命令、搜索、浏览）特化图标与摘要。</p>
      <div class="agp__cards">
        <ToolActionCard v-for="tc in toolCalls" :key="tc.id" :tool-call="tc" />
      </div>
    </section>

    <div class="agp__grid">
      <section class="agp__section">
        <h2>AgentFormCard — Agent 请求表单</h2>
        <p class="agp__desc">Agent 需要结构化输入时向用户发起表单。{{ formResult }}</p>
        <AgentFormCard
          :form="{
            formId: 'f_demo',
            title: '部署配置确认',
            fields: [
              { name: 'env', label: '目标环境', type: 'select', required: true, options: [{ label: '预发', value: 'staging' }, { label: '生产', value: 'prod' }] },
              { name: 'note', label: '发布说明', type: 'textarea', placeholder: '本次变更内容…' },
            ],
          }"
          @submit="(v) => (formResult = `已提交：${JSON.stringify(v)}`)"
        />
      </section>

      <section class="agp__section">
        <h2>ClarifyCard — 澄清选择</h2>
        <p class="agp__desc">Agent 对模糊需求发起澄清。{{ clarifyResult }}</p>
        <ClarifyCard
          :questions="[
            {
              id: 'q1',
              question: '校验失败的提示以哪种方式展示？',
              options: [
                { label: '字段下方内联提示', description: '每个字段独立展示错误' },
                { label: '表单顶部汇总', description: '统一列出所有错误' },
                { label: 'Toast 弹出' },
              ],
            },
          ]"
          @submit="(a) => (clarifyResult = `已选择：${JSON.stringify(a)}`)"
        />
      </section>
    </div>

    <div class="agp__grid">
      <section class="agp__section">
        <h2>FilePanel — 文件树 + 预览</h2>
        <p class="agp__desc">工作区文件浏览，点击文件查看内容。</p>
        <div class="agp__panel-box">
          <FilePanel :files="files" />
        </div>
      </section>

      <section class="agp__section">
        <h2>TerminalPanel — 交互式终端</h2>
        <p class="agp__desc">
          真实终端能力：ANSI 颜色解析、命令历史（↑/↓）、Ctrl+C 中断、Ctrl+L 清屏、退出码标记、
          上翻锁定滚动。试试输入 <code>help</code> / <code>pnpm build</code>。
        </p>
        <div class="agp__panel-box">
          <TerminalPanel
            :entries="terminal"
            interactive
            :busy="termBusy"
            cwd="~/agent-copilot"
            @command="onTermCommand"
            @interrupt="onTermInterrupt"
            @clear="onTermClear"
          />
        </div>
      </section>
    </div>

    <section class="agp__section">
      <h2>ArtifactPanel — 会话产物归集</h2>
      <p class="agp__desc">
        自动从消息流收集代码 / 表格 / 图表 / 图片等产出型载荷，支持点击预览、单个下载与整段会话导出
        （Markdown / JSON）。传入 <code>:messages</code> 即可，无需手动维护清单。
      </p>
      <ArtifactPanel :messages="artifactMessages" />
    </section>

    <p class="agp__note">
      以上组件均为散装可独立使用；「解决方案 → Coding Agent 工作台」演示了它们通过
      <strong>AgentWorkspace</strong> 组合 Shell 与事件流（THINKING / PLAN_UPDATE / TASK_UPDATE /
      FILE_CHANGE / TERMINAL_APPEND）实时联动的完整形态。
    </p>
  </div>
</template>

<style scoped>
.agp {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 1080px;
}
.agp__section h2 {
  font-size: 17px;
  margin: 0 0 6px;
}
.agp__desc {
  color: var(--ac-muted);
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 12px;
}
.agp__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: start;
}
@media (min-width: 960px) {
  .agp__grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}
.agp__cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.agp__panel-box {
  height: 320px;
  border: 1px solid var(--ac-border);
  border-radius: 10px;
  overflow: hidden;
}
.agp__note {
  font-size: 13px;
  line-height: 1.7;
  color: var(--ac-muted);
  border: 1px dashed var(--ac-border);
  border-radius: 10px;
  padding: 12px 14px;
  margin: 0;
  text-wrap: pretty;
}
</style>
