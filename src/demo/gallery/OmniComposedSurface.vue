<script setup lang="ts">
/**
 * OmniComposedSurface — 全能助手「超级复合」演示面。
 * 覆盖库中全部组件域，全部通过 useCopilot() 共享同一会话状态：
 *  - 顶栏：ThemeToggle + UsageMeter + SettingsDialog + FeedbackDialog
 *  - 安全：SafetyBanner
 *  - 左轨：PanelContainer（SessionList / PromptLibrary / KnowledgeSelector + FileDropzone）
 *  - 中栏：MessageBubble(ThinkingBlock) + ApprovalCard + ChatSuggestions
 *          + ModeSelector + ModelSelector + ChatInput（斜杠命令/@提及/#引用/附件/思考开关）
 *  - 右轨：PanelContainer（TaskTracker+PlanPanel / ChangeReviewPanel /
 *          TerminalPanel / ArtifactPanel / SourcePanel / 协议组件）
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useCopilot } from '../../lib/agent-copilot/composables/useCopilot'
import MessageBubble from '../../lib/agent-copilot/components/chat/MessageBubble.vue'
import ChatInput from '../../lib/agent-copilot/components/chat/ChatInput.vue'
import ChatSuggestions from '../../lib/agent-copilot/components/chat/ChatSuggestions.vue'
import ApprovalCard from '../../lib/agent-copilot/components/generative-ui/ApprovalCard.vue'
import ModeSelector from '../../lib/agent-copilot/components/agentic/ModeSelector.vue'
import TaskTracker from '../../lib/agent-copilot/components/agentic/TaskTracker.vue'
import PlanPanel from '../../lib/agent-copilot/components/agentic/PlanPanel.vue'
import ChangeReviewPanel from '../../lib/agent-copilot/components/agentic/ChangeReviewPanel.vue'
import PanelContainer, { type PanelTab } from '../../lib/agent-copilot/components/workspace/PanelContainer.vue'
import TerminalPanel from '../../lib/agent-copilot/components/workspace/TerminalPanel.vue'
import ArtifactPanel from '../../lib/agent-copilot/components/workspace/ArtifactPanel.vue'
import UsageMeter from '../../lib/agent-copilot/components/general/UsageMeter.vue'
import ModelSelector from '../../lib/agent-copilot/components/general/ModelSelector.vue'
import ThemeToggle from '../../lib/agent-copilot/components/general/ThemeToggle.vue'
import SessionList, { type SessionItem } from '../../lib/agent-copilot/components/general/SessionList.vue'
import PromptLibrary, { type PromptTemplate } from '../../lib/agent-copilot/components/general/PromptLibrary.vue'
import KnowledgeSelector, { type KnowledgeBase } from '../../lib/agent-copilot/components/general/KnowledgeSelector.vue'
import FileDropzone, { type UploadingFile } from '../../lib/agent-copilot/components/general/FileDropzone.vue'
import SourcePanel, { type SourceChunk } from '../../lib/agent-copilot/components/general/SourcePanel.vue'
import SafetyBanner from '../../lib/agent-copilot/components/general/SafetyBanner.vue'
import FeedbackDialog from '../../lib/agent-copilot/components/general/FeedbackDialog.vue'
import SettingsDialog, { type SettingSection } from '../../lib/agent-copilot/components/general/SettingsDialog.vue'
import ProtocolBadge from '../../lib/agent-copilot/components/protocol/ProtocolBadge.vue'
import TaskStatusBadge from '../../lib/agent-copilot/components/protocol/TaskStatusBadge.vue'
import AgentCardView, { type A2AAgentCard } from '../../lib/agent-copilot/components/protocol/AgentCardView.vue'
import type { ThemeMode } from '../../lib/agent-copilot/composables/useTheme'
import type {
  AgentTask, ChatMessage, FileChange, PlanSpec, SlashCommand, TerminalEntry,
} from '../../lib/agent-copilot/types'

/** 功能开关：演练场等宿主可细粒度控制每个组件域的显隐（默认全开） */
interface OmniFeatures {
  modelSelector: boolean
  themeToggle: boolean
  usageMeter: boolean
  banner: boolean
  leftRail: boolean
  sessions: boolean
  prompts: boolean
  knowledge: boolean
  suggestions: boolean
  modeSelector: boolean
  thinkingToggle: boolean
  attachments: boolean
  commands: boolean
  mentions: boolean
  rightRail: boolean
  tasks: boolean
  changes: boolean
  terminal: boolean
  artifacts: boolean
  sources: boolean
  protocol: boolean
  assemblyCode: boolean
  compLabels: boolean
}
const ALL_ON: OmniFeatures = {
  modelSelector: true, themeToggle: true, usageMeter: true,
  banner: true,
  leftRail: true, sessions: true, prompts: true, knowledge: true,
  suggestions: true, modeSelector: true,
  thinkingToggle: true, attachments: true, commands: true, mentions: true,
  rightRail: true, tasks: true, changes: true, terminal: true,
  artifacts: true, sources: true, protocol: true,
  assemblyCode: true, compLabels: true,
}
const props = defineProps<{ features?: Partial<OmniFeatures> }>()
const f = computed<OmniFeatures>(() => ({ ...ALL_ON, ...props.features }))

const store = useCopilot()
const scrollRef = ref<HTMLElement | null>(null)
const showCode = ref(false)

// ---- 布局开关 ----
const showLeft = ref(true)
const showRight = ref(true)
/** 轨道实际可见性 = 用户开关 && 功能开关 && 有可见页签 */
const leftVisible = computed(() => showLeft.value && f.value.leftRail && leftPanels.value.length > 0)
const rightVisible = computed(() => showRight.value && f.value.rightRail && rightPanels.value.length > 0)

// ---- 顶栏状态 ----
const model = ref('siliconflow')
const themeMode = ref<ThemeMode>('light')
const settingsOpen = ref(false)
const feedbackOpen = ref(false)
const bannerVisible = ref(true)

const settingsValues = ref<Record<string, unknown>>({ streaming: true, lang: 'zh', temperature: 0.3 })
const settingsSections: SettingSection[] = [
  {
    id: 'general', title: '通用',
    fields: [
      { key: 'streaming', label: '流式输出', type: 'switch' },
      { key: 'lang', label: '回复语言', type: 'select', options: [{ label: '简体中文', value: 'zh' }, { label: 'English', value: 'en' }] },
      { key: 'temperature', label: '温度', type: 'slider', min: 0, max: 1, step: 0.1 },
    ],
  },
]

/** @提及候选（仅作为 mentionProvider 数据源） */
const teamAgents = [
  { id: 'a1', name: '知识官', role: '知识检索与问答' },
  { id: 'a2', name: '码匠', role: '代码生成与测试' },
  { id: 'a3', name: '数析', role: 'SQL 与图表分析' },
]

// ---- 左轨数据 ----
const leftTab = ref('sessions')
const leftPanels = computed<PanelTab[]>(() => [
  ...(f.value.sessions ? [{ id: 'sessions', label: '会话' }] : []),
  ...(f.value.prompts ? [{ id: 'prompts', label: '提示词' }] : []),
  ...(f.value.knowledge ? [{ id: 'knowledge', label: '知识库' }] : []),
])
watch(leftPanels, (panels) => {
  if (panels.length && !panels.some((p) => p.id === leftTab.value)) leftTab.value = panels[0].id
})
const sessions = ref<SessionItem[]>([
  { id: 's1', title: '当前会话', preview: '知识/代码/数据/设计 全域演示', updatedAt: Date.now(), pinned: true },
  { id: 's2', title: '差旅报销咨询', preview: '流程是什么？需要哪些票据…', updatedAt: Date.now() - 86_400_000 },
  { id: 's3', title: '季度指标分析', preview: '画一个部门对比柱状图', updatedAt: Date.now() - 172_800_000, unread: 2 },
])
const activeSession = ref('s1')

const promptTemplates: PromptTemplate[] = [
  { id: 'p1', title: '知识问答', category: '知识', content: '请查询知识库回答：{问题}，并给出引用来源', description: '先检索再回答' },
  { id: 'p2', title: '代码生成', category: '代码', content: '用 TypeScript 实现 {功能}，附带单元测试', description: '生成代码并跑测试' },
  { id: 'p3', title: '数据分析', category: '数据', content: '分析 {指标} 的近四周趋势，输出图表与结论', description: 'SQL + 图表' },
  { id: 'p4', title: '设计规范', category: '设计', content: '为 {产品} 输出配色方案与设计 Token 规范', description: '配色 + 设计规范' },
]

const knowledgeBases: KnowledgeBase[] = [
  { id: 'kb1', name: '企业制度库', docCount: 342 },
  { id: 'kb2', name: '技术文档库', docCount: 128 },
  { id: 'kb3', name: '设计资产库', docCount: 56 },
]
const selectedKbs = ref<string[]>(['kb1'])
const uploads = ref<UploadingFile[]>([])

function onFilesAdd(files: File[]) {
  for (const f of files) {
    const id = `up_${Date.now()}_${f.name}`
    uploads.value = [...uploads.value, { id, name: f.name, size: f.size, progress: 100 }]
    store.attachContext({ id, source: 'file', label: f.name, type: 'file' })
  }
}
function onFileRemove(id: string) {
  uploads.value = uploads.value.filter((f) => f.id !== id)
  store.removeContext(id)
}

// ---- 中栏：输入增强 ----
const slashCommands: SlashCommand[] = [
  { name: 'summarize', description: '总结当前会话', icon: '§' },
  { name: 'translate', description: '翻译为英文', icon: '译', hint: '<文本>' },
  { name: 'sql', description: '生成 SQL 查询', icon: '数', hint: '<需求>' },
]
async function mentionProvider(query: string) {
  return teamAgents
    .filter((a) => a.name.includes(query) || !query)
    .map((a) => ({ id: a.id, label: a.name, type: 'agent' as const, description: a.role }))
}

const isRunning = computed(() => store.status.value === 'running')
const welcome = computed(() => store.config.welcomeScreen)

const visibleMessages = computed(() =>
  store.messages.value.filter((m) => m.role === 'user' || m.role === 'assistant'),
)
const showSuggestionsNow = computed(
  () =>
    !isRunning.value &&
    !store.interrupt.value &&
    visibleMessages.value.filter((m) => m.role === 'user').length === 0,
)

// ---- 右轨：数据（store 实时数据优先，空时用演示样本兜底） ----
const DEMO_TASKS: AgentTask[] = [
  { id: 't1', title: '理解用户意图并检索知识库', status: 'done' },
  { id: 't2', title: '生成代码与单元测试', status: 'active', detail: '正在运行 vitest…' },
  { id: 't3', title: '汇总数据指标并绘图', status: 'pending' },
]
const DEMO_PLAN: PlanSpec = {
  id: 'plan_demo', title: '企业工作台改版计划', status: 'draft',
  steps: [
    { id: 'ps1', title: '梳理现有信息架构', status: 'pending' },
    { id: 'ps2', title: '输出新配色与设计 Token', status: 'pending' },
    { id: 'ps3', title: '重构首页组件并灰度发布', status: 'pending' },
  ],
}
const demoPlan = ref<PlanSpec | null>(DEMO_PLAN)
const DEMO_CHANGES: FileChange[] = [
  {
    id: 'fc1', path: 'src/utils/debounce.ts', kind: 'create', status: 'pending', additions: 12, deletions: 0,
    language: 'typescript',
    content: `export function debounce<T extends (...args: never[]) => void>(fn: T, wait = 300) {\n  let timer: ReturnType<typeof setTimeout> | null = null\n  return (...args: Parameters<T>) => {\n    if (timer) clearTimeout(timer)\n    timer = setTimeout(() => fn(...args), wait)\n  }\n}`,
  },
  {
    id: 'fc2', path: 'src/pages/dashboard.vue', kind: 'modify', status: 'pending', additions: 8, deletions: 3,
    diff: `@@ -12,7 +12,12 @@\n-  const metrics = ref([])\n+  const metrics = ref<Metric[]>([])\n+  const loading = ref(true)\n   onMounted(async () => {\n-    metrics.value = await fetchMetrics()\n+    try {\n+      metrics.value = await fetchMetrics()\n+    } finally {\n+      loading.value = false\n+    }\n   })`,
  },
]
const demoChanges = ref<FileChange[]>(DEMO_CHANGES)
const DEMO_TERMINAL: TerminalEntry[] = [
  { id: 'te1', kind: 'cmd', text: 'pnpm vitest run src/utils/debounce.test.ts' },
  { id: 'te2', kind: 'out', text: '✓ debounce 延迟触发 (12ms)\n✓ debounce 重复调用只执行最后一次 (8ms)' },
  { id: 'te3', kind: 'info', text: 'Test Files  1 passed | Tests  2 passed' },
]
const DEMO_SOURCES: SourceChunk[] = [
  { id: 'sc1', title: '差旅费用管理办法', snippet: '员工出差需提前在 OA 系统提交差旅申请，报销时需附发票原件与行程单……', score: 0.94, location: '企业制度库/费用管理.pdf · 第 3 页' },
  { id: 'sc2', title: '报销时限规定', snippet: '差旅结束后 30 个自然日内完成报销申请，逾期需部门负责人特批……', score: 0.87, location: '企业制度库/费用管理.pdf · 第 5 页' },
]
const DEMO_ARTIFACT_MESSAGES: ChatMessage[] = [
  {
    id: 'da1', role: 'assistant', content: '演示产物：防抖函数与指标对比。', createdAt: Date.now() - 60_000,
    payloads: [
      { type: 'code', title: 'debounce.ts', data: { language: 'typescript', filename: 'src/utils/debounce.ts', code: 'export function debounce(fn, wait = 300) { /* … */ }' } },
      { type: 'table', title: '季度指标', data: { columns: [{ key: 'dept', label: '部门' }, { key: 'kpi', label: '达成率' }], rows: [{ dept: '运营', kpi: '92%' }, { dept: '研发', kpi: '88%' }] } },
    ],
  },
]

const A2A_CARD: A2AAgentCard = {
  name: '全能助手',
  description: '知识问答 / 代码生成 / 数据分析 三域聚合 Agent',
  url: 'https://agents.example.com/omni',
  version: '0.5.0',
  capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: true },
  skills: [
    { id: 'knowledge', name: '知识问答', description: '检索企业知识库并引用来源' },
    { id: 'coding', name: '代码生成', description: '生成代码、Diff 与测试' },
    { id: 'data', name: '数据分析', description: 'SQL 查询与图表' },
    { id: 'design', name: '设计辅助', description: '配色与设计规范' },
  ],
}

const tasksView = computed(() => (store.tasks.value.length ? store.tasks.value : DEMO_TASKS))
const planView = computed(() => store.plan.value ?? demoPlan.value)
const changesView = computed(() => (store.fileChanges.value.length ? store.fileChanges.value : demoChanges.value))
const terminalView = computed(() => (store.terminal.value.length ? store.terminal.value : DEMO_TERMINAL))
const artifactMessages = computed(() =>
  store.messages.value.some((m) => m.payloads?.length) ? store.messages.value : DEMO_ARTIFACT_MESSAGES,
)

const pendingChanges = computed(() => changesView.value.filter((c) => c.status === 'pending').length)
const rightTab = ref('tasks')
const rightPanels = computed<PanelTab[]>(() => [
  ...(f.value.tasks ? [{ id: 'tasks', label: '任务', badge: tasksView.value.filter((t) => t.status !== 'done').length }] : []),
  ...(f.value.changes ? [{ id: 'changes', label: '变更', badge: pendingChanges.value, badgeTone: 'warning' as const }] : []),
  ...(f.value.terminal ? [{ id: 'terminal', label: '终端' }] : []),
  ...(f.value.artifacts ? [{ id: 'artifacts', label: '产物' }] : []),
  ...(f.value.sources ? [{ id: 'sources', label: '来源' }] : []),
  ...(f.value.protocol ? [{ id: 'protocol', label: '协议' }] : []),
])
watch(rightPanels, (panels) => {
  if (panels.length && !panels.some((p) => p.id === rightTab.value)) rightTab.value = panels[0].id
})

function reviewChange(changeId: string | 'all', decision: 'accepted' | 'rejected') {
  if (store.fileChanges.value.length) {
    store.reviewFileChange(changeId, decision)
    return
  }
  demoChanges.value = demoChanges.value.map((c) =>
    (changeId === 'all' ? c.status === 'pending' : c.id === changeId) ? { ...c, status: decision } : c,
  )
}
function decidePlanLocal(decision: 'approved' | 'rejected', steps?: PlanSpec['steps']) {
  if (store.plan.value) {
    store.decidePlan(decision, steps)
    return
  }
  if (demoPlan.value) demoPlan.value = { ...demoPlan.value, status: decision, steps: steps ?? demoPlan.value.steps }
}

watch(
  () => [
    store.messages.value.length,
    store.messages.value[store.messages.value.length - 1]?.content,
    store.interrupt.value,
  ],
  async () => {
    await nextTick()
    const el = scrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  },
)

const ASSEMBLY_CODE = `<!-- 超级复合：全部组件域通过 useCopilot() 共享同一会话状态 -->
<\u0073cript setup>
import {
  CopilotProvider, useCopilot,
  // 对话核心
  MessageBubble, ChatInput, ChatSuggestions, ApprovalCard,
  // Agentic
  ModeSelector, TaskTracker, PlanPanel, ChangeReviewPanel,
  // 工作台
  PanelContainer, TerminalPanel, ArtifactPanel,
  // 企业通用
  UsageMeter, ModelSelector, ThemeToggle, SessionList, PromptLibrary,
  KnowledgeSelector, FileDropzone, SourcePanel,
  SafetyBanner, FeedbackDialog, SettingsDialog,
  // 协议
  ProtocolBadge, TaskStatusBadge, AgentCardView,
} from 'agent-copilot'

const store = useCopilot() // 在 <CopilotProvider> 内调用
<\/script>

<CopilotProvider :config="config">
  <header>  <!-- 主题 / 用量 / 设置 -->
    <ThemeToggle v-model:mode="theme" />
    <UsageMeter compact :prompt-tokens="store.totalUsage.promptTokens"
      :completion-tokens="store.totalUsage.completionTokens" />
  </header>
  <SafetyBanner level="info" title="演示环境" />

  <aside>  <!-- 左轨：会话 / 提示词 / 知识库 -->
    <PanelContainer :panels="leftTabs" v-model:active-id="leftTab">
      <template #sessions><SessionList :sessions="sessions" /></template>
      <template #prompts><PromptLibrary :templates="prompts"
        @select="(t) => store.sendMessage(t.content)" /></template>
      <template #knowledge>
        <KnowledgeSelector :bases="kbs" v-model:selected="kbIds" />
        <FileDropzone :files="uploads" @add="onAdd" />
      </template>
    </PanelContainer>
  </aside>

  <main>  <!-- 中栏：消息流 + 全功能输入 -->
    <MessageBubble v-for="m in store.messages.value" :key="m.id"
      :message="m" show-thinking @feedback="onFeedback" />
    <ApprovalCard v-if="store.interrupt.value" :interrupt="store.interrupt.value"
      @respond="(r) => store.respondToInterrupt(r)" />
    <ChatSuggestions :suggestions="store.suggestions.value"
      @select="(s) => store.sendMessage(s.message)" />

    <!-- 模式与模型选择贴近输入框（行业惯例） -->
    <ModeSelector :mode="store.agentMode.value" size="sm"
      @update:mode="store.setAgentMode" />
    <ModelSelector v-model="model" />
    <ChatInput :generating="running" :commands="slashCommands"
      :mention-provider="mentionProvider" :context-items="store.contextItems.value"
      show-attach-button show-thinking-toggle
      :thinking-on="store.thinkingEnabled.value"
      @update:thinking-on="(v) => (store.thinkingEnabled.value = v)"
      @send="(t) => store.sendMessage(t)"
      @stop="store.stop()" @remove-context="store.removeContext" />
  </main>

  <aside>  <!-- 右轨：任务 / 变更 / 终端 / 产物 / 来源 / 协议 -->
    <PanelContainer :panels="rightTabs" v-model:active-id="rightTab">
      <template #tasks>
        <TaskTracker :tasks="store.tasks.value" />
        <PlanPanel v-if="store.plan.value" :plan="store.plan.value"
          @approve="(s) => store.decidePlan('approved', s)"
          @reject="() => store.decidePlan('rejected')" />
      </template>
      <template #changes><ChangeReviewPanel :changes="store.fileChanges.value"
        @review="store.reviewFileChange" /></template>
      <template #terminal><TerminalPanel :entries="store.terminal.value" /></template>
      <template #artifacts><ArtifactPanel :messages="store.messages.value" /></template>
      <template #sources><SourcePanel :sources="sources" /></template>
      <template #protocol>
        <ProtocolBadge protocol="a2a" /> <TaskStatusBadge state="working" protocol="A2A" />
        <AgentCardView :card="agentCard" status="online" />
      </template>
    </PanelContainer>
  </aside>

  <SettingsDialog v-model:open="settingsOpen" :sections="sections" v-model:values="values" />
  <FeedbackDialog v-model:open="feedbackOpen" @submit="onSubmit" />
</CopilotProvider>`
</script>

<template>
  <section class="oc" :class="{ 'oc--nolabels': !f.compLabels }" aria-label="超级复合的全能助手">
    <!-- 顶栏 -->
    <header class="oc__header oc__part" data-comp="ThemeToggle + UsageMeter">
      <div class="oc__titles">
        <h3 class="oc__title">{{ store.config.botName }}</h3>
        <span class="oc__subtitle">超级复合 · 全组件域组装</span>
      </div>
      <div class="oc__header-right">
        <ThemeToggle v-if="f.themeToggle" v-model:mode="themeMode" size="sm" />
        <UsageMeter
          v-if="f.usageMeter"
          compact
          :prompt-tokens="store.totalUsage.promptTokens"
          :completion-tokens="store.totalUsage.completionTokens"
        />
        <button type="button" class="oc__hbtn" aria-label="打开设置" @click="settingsOpen = true">设置</button>
        <button type="button" class="oc__hbtn" aria-label="清空会话" @click="store.clearChat()">清空</button>
        <button
          v-if="f.leftRail"
          type="button" class="oc__hbtn"
          :aria-pressed="showLeft" aria-label="切换左侧栏"
          @click="showLeft = !showLeft"
        >左栏</button>
        <button
          v-if="f.rightRail"
          type="button" class="oc__hbtn"
          :aria-pressed="showRight" aria-label="切换右侧栏"
          @click="showRight = !showRight"
        >右栏</button>
      </div>
    </header>

    <!-- 安全横幅 -->
    <div v-if="bannerVisible && f.banner" class="oc__part" data-comp="SafetyBanner">
      <SafetyBanner
        level="info"
        title="演示环境"
        detail="本演示在浏览器内模拟运行，工具调用与审批均为演示数据，不会产生真实副作用。"
        policy="演示策略"
        @dismiss="bannerVisible = false"
      />
    </div>

    <!-- 三栏主体 -->
    <div class="oc__body" :data-left="leftVisible" :data-right="rightVisible">
      <!-- 左轨 -->
      <aside v-if="leftVisible" class="oc__rail oc__part" data-comp="PanelContainer + SessionList + PromptLibrary + KnowledgeSelector + FileDropzone">
        <PanelContainer :panels="leftPanels" :active-id="leftTab" @update:active-id="(id) => (leftTab = id)">
          <template #sessions>
            <SessionList
              :sessions="sessions"
              :active-id="activeSession"
              @select="(id) => (activeSession = id)"
              @create="sessions = [{ id: `s_${Date.now()}`, title: '新会话', updatedAt: Date.now() }, ...sessions]"
              @delete="(id) => (sessions = sessions.filter((s) => s.id !== id))"
            />
          </template>
          <template #prompts>
            <PromptLibrary :templates="promptTemplates" @select="(t) => store.sendMessage(t.content)" />
          </template>
          <template #knowledge>
            <div class="oc__kb">
              <KnowledgeSelector
                :bases="knowledgeBases"
                :selected="selectedKbs"
                @update:selected="(ids) => (selectedKbs = ids)"
              />
              <FileDropzone
                :files="uploads"
                accept=".pdf,.docx,.md,image/*"
                :max-size-mb="10"
                @add="onFilesAdd"
                @remove="onFileRemove"
              />
            </div>
          </template>
        </PanelContainer>
      </aside>

      <!-- 中栏 -->
      <div class="oc__center">
        <div
          ref="scrollRef"
          class="oc__messages oc__part"
          data-comp="MessageBubble(ThinkingBlock) ×N + ApprovalCard"
          aria-live="polite"
        >
          <div v-if="welcome && visibleMessages.length === 0" class="oc__welcome">
            <h4 class="oc__welcome-title">{{ welcome.title }}</h4>
            <p class="oc__welcome-sub">{{ welcome.subtitle }}</p>
            <div v-if="welcome.hints?.length" class="oc__hints">
              <button
                v-for="hint in welcome.hints"
                :key="hint"
                type="button"
                class="oc__hint"
                @click="store.sendMessage(hint)"
              >{{ hint }}</button>
            </div>
          </div>

          <MessageBubble
            v-for="(msg, i) in visibleMessages"
            :key="msg.id"
            :message="msg"
            :show-thinking="true"
            :bot-name="store.config.botName"
            :on-retry="msg.error && i === visibleMessages.length - 1 ? () => store.retryLast() : undefined"
            @feedback="(v: 'up' | 'down') => { if (v === 'down') feedbackOpen = true }"
          />

          <ApprovalCard
            v-if="store.interrupt.value"
            :interrupt="store.interrupt.value"
            @respond="(r) => store.respondToInterrupt(r)"
          />
        </div>

        <div v-if="f.suggestions && showSuggestionsNow && store.suggestions.value.length" class="oc__part" data-comp="ChatSuggestions">
          <ChatSuggestions
            :suggestions="store.suggestions.value"
            :loading="store.suggestionsLoading.value"
            @select="(s) => store.sendMessage(s.message)"
          />
        </div>

        <div class="oc__inputzone oc__part" data-comp="ModeSelector + ModelSelector + ChatInput（斜杠命令 / @提及 / 附件 / 思考开关 / toolbar 插槽 / ContextChips）">
          <div v-if="f.modeSelector" class="oc__inputbar">
            <ModeSelector
              :mode="store.agentMode.value"
              size="sm"
              :disabled="isRunning"
              @update:mode="(m) => store.setAgentMode(m)"
            />
          </div>
          <ChatInput
            :generating="isRunning"
            :disabled="store.status.value === 'awaiting_interrupt'"
            :placeholder="store.labels.inputPlaceholder"
            :send-on-enter="store.config.sendOnEnter"
            :commands="f.commands ? slashCommands : undefined"
            :mention-provider="f.mentions ? mentionProvider : undefined"
            :context-items="store.contextItems.value"
            :show-attach-button="f.attachments"
            attach-accept=".pdf,.docx,.md,image/*"
            :show-thinking-toggle="f.thinkingToggle"
            :thinking-on="store.thinkingEnabled.value"
            @update:thinking-on="(v: boolean) => (store.thinkingEnabled.value = v)"
            @attach="onFilesAdd"
            @add-context="(item) => store.attachContext(item)"
            @remove-context="(id) => store.removeContext(id)"
            @send="(t) => store.sendMessage(t)"
            @stop="store.stop()"
          >
            <!-- 模型选择内嵌 composer（VS Code Agent / Cursor 形态，经 toolbar-end 插槽） -->
            <template v-if="f.modelSelector" #toolbar-end>
              <ModelSelector v-model="model" class="oc__model" />
            </template>
          </ChatInput>
        </div>
      </div>

      <!-- 右轨 -->
      <aside
        v-if="rightVisible"
        class="oc__rail oc__rail--right oc__part"
        data-comp="PanelContainer + TaskTracker + PlanPanel + ChangeReviewPanel + TerminalPanel + ArtifactPanel + SourcePanel + 协议组件"
      >
        <PanelContainer :panels="rightPanels" :active-id="rightTab" @update:active-id="(id) => (rightTab = id)">
          <template #tasks>
            <div class="oc__stack">
              <TaskTracker :tasks="tasksView" />
              <PlanPanel
                v-if="planView"
                :plan="planView"
                @approve="(steps) => decidePlanLocal('approved', Array.isArray(steps) ? steps : undefined)"
                @reject="() => decidePlanLocal('rejected')"
              />
            </div>
          </template>
          <template #changes>
            <ChangeReviewPanel :changes="changesView" @review="reviewChange" />
          </template>
          <template #terminal>
            <TerminalPanel :entries="terminalView" />
          </template>
          <template #artifacts>
            <ArtifactPanel :messages="artifactMessages" />
          </template>
          <template #sources>
            <SourcePanel :sources="DEMO_SOURCES" />
          </template>
          <template #protocol>
            <div class="oc__stack oc__protocol">
              <div class="oc__proto-badges">
                <ProtocolBadge protocol="a2a" />
                <ProtocolBadge protocol="mcp" />
                <TaskStatusBadge state="working" protocol="A2A" task-id="task_demo_01" />
              </div>
              <AgentCardView :card="A2A_CARD" status="online" />
            </div>
          </template>
        </PanelContainer>
      </aside>
    </div>

    <!-- 组装代码 -->
    <div v-if="f.assemblyCode" class="oc__codewrap">
      <button type="button" class="oc__codetoggle" :aria-expanded="showCode" @click="showCode = !showCode">
        {{ showCode ? '收起组装代码' : '查看组装代码（全部组件域的超级复合示例）' }}
      </button>
      <pre v-if="showCode" class="oc__code"><code>{{ ASSEMBLY_CODE }}</code></pre>
    </div>

    <!-- 对话框 -->
    <SettingsDialog
      :open="settingsOpen"
      :sections="settingsSections"
      :values="settingsValues"
      show-reset
      @update:open="(v) => (settingsOpen = v)"
      @update:values="(v) => (settingsValues = v)"
    />
    <FeedbackDialog
      v-model:open="feedbackOpen"
      :reasons="['回答不准确', '引用来源错误', '格式混乱', '其他']"
      @submit="() => (feedbackOpen = false)"
    />
  </section>
</template>

<style scoped>
.oc {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--ac-bg, #fff);
  color: var(--ac-fg, #0f172a);
}

/* 组件名标注 */
.oc__part { position: relative; }
.oc--nolabels .oc__part::before { display: none; }
.oc__part::before {
  content: attr(data-comp);
  position: absolute;
  top: -1px;
  right: 8px;
  z-index: 5;
  max-width: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.02em;
  color: var(--ac-primary, #2563eb);
  background: color-mix(in srgb, var(--ac-primary, #2563eb) 8%, var(--ac-bg, #fff));
  border: 1px solid color-mix(in srgb, var(--ac-primary, #2563eb) 30%, transparent);
  border-top: none;
  border-radius: 0 0 6px 6px;
  padding: 1px 8px;
  pointer-events: none;
  opacity: 0.85;
}

.oc__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--ac-border, #e2e8f0);
  flex-shrink: 0;
}
.oc__titles { min-width: 0; }
.oc__title { margin: 0; font-size: 15px; font-weight: 650; }
.oc__subtitle { font-size: 12px; color: var(--ac-muted, #64748b); }
.oc__header-right { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.oc__model { min-width: 150px; }
.oc__hbtn {
  border: 1px solid var(--ac-border, #e2e8f0);
  background: var(--ac-surface, #f8fafc);
  color: var(--ac-muted, #64748b);
  font-size: 12px;
  border-radius: 7px;
  padding: 4px 10px;
  cursor: pointer;
}
.oc__hbtn:hover, .oc__hbtn[aria-pressed='true'] { color: var(--ac-fg, #0f172a); border-color: var(--ac-primary, #2563eb); }

/* 三栏 */
.oc__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  flex: 1;
  min-height: 0;
}
.oc__body[data-left='true'][data-right='true'] { grid-template-columns: 250px minmax(0, 1fr) 330px; }
.oc__body[data-left='true'][data-right='false'] { grid-template-columns: 250px minmax(0, 1fr); }
.oc__body[data-left='false'][data-right='true'] { grid-template-columns: minmax(0, 1fr) 330px; }

.oc__rail {
  min-height: 0;
  border-right: 1px solid var(--ac-border, #e2e8f0);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.oc__rail--right { border-right: none; border-left: 1px solid var(--ac-border, #e2e8f0); }
.oc__rail :deep(.ac-panelc) { height: 100%; }
/* PanelContainer 槽已带默认内边距（--ac-panel-pad），此处不再叠加 */
.oc__kb { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
.oc__stack { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
.oc__protocol { font-size: 13px; }
.oc__proto-badges { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }

.oc__center {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
.oc__messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.oc__welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  min-height: 160px;
  text-align: center;
  padding: 20px 16px;
}
.oc__welcome-title { margin: 0; font-size: 15.5px; font-weight: 650; text-wrap: balance; }
.oc__welcome-sub { margin: 0; font-size: 13px; color: var(--ac-muted, #64748b); text-wrap: pretty; }
.oc__hints { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 10px; }
.oc__hint {
  border: 1px solid var(--ac-border, #e2e8f0);
  border-radius: 999px;
  background: var(--ac-surface, #f8fafc);
  color: var(--ac-fg, #0f172a);
  font-size: 12.5px;
  padding: 6px 14px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.oc__hint:hover { border-color: var(--ac-primary, #2563eb); }

.oc__inputzone { flex-shrink: 0; border-top: 1px solid var(--ac-border, #e2e8f0); }
.oc__inputbar { display: flex; align-items: center; gap: 8px; padding: 8px 16px 0; }

.oc__codewrap { border-top: 1px dashed var(--ac-border, #e2e8f0); flex-shrink: 0; }
.oc__codetoggle {
  width: 100%;
  border: none;
  background: none;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ac-primary, #2563eb);
  cursor: pointer;
  text-align: left;
}
.oc__code {
  margin: 0;
  padding: 12px 16px;
  max-height: 360px;
  overflow: auto;
  font-size: 11.5px;
  line-height: 1.6;
  background: var(--ac-surface, #f8fafc);
  color: var(--ac-fg, #0f172a);
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
}

/* 小屏：单列堆叠 */
@media (max-width: 1100px) {
  .oc__body[data-left='true'][data-right='true'],
  .oc__body[data-left='true'][data-right='false'],
  .oc__body[data-left='false'][data-right='true'] {
    grid-template-columns: minmax(0, 1fr);
  }
  .oc__rail {
    border-right: none;
    border-left: none;
    border-bottom: 1px solid var(--ac-border, #e2e8f0);
    max-height: 260px;
  }
  .oc__rail--right { order: 3; border-bottom: none; border-top: 1px solid var(--ac-border, #e2e8f0); }
  .oc__center { order: 2; min-height: 320px; }
}
</style>
