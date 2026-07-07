/**
 * 核心上下文 — CopilotProvider 创建，全部组件/composables 通过 inject 消费。
 * 对齐 CopilotKit 的 <CopilotKit> Provider + 内部 store。
 */
import { computed, inject, provide, reactive, ref, shallowRef, type InjectionKey, type Ref } from 'vue'
import type {
  AgentEvent, AgentMode, AgentRuntime, AgentStateSnapshot, AgentTask, ChatMessage, ChatSuggestion,
  ContextItem, CopilotActionDef, CopilotConfig, FileChange, FormPayload, GovernanceEvent,
  InterruptRequest, InterruptResponse, LabelsConfig, PipelineStageId, PlanSpec, PlanStep,
  ReadableContext, ReActStep, StructuredPayload, TerminalEntry, TokenUsage,
} from '../types'
import { AGENT_TYPE_PRESETS, createEmptyAgentState, DEFAULT_CONFIG, DEFAULT_LABELS, genId, STAGE_LABELS } from '../types'
import { createRuntime } from '../protocols'

export type ChatStatus = 'idle' | 'running' | 'awaiting_interrupt' | 'error'

export interface CopilotStore {
  config: CopilotConfig
  /** 合并默认值后的 UI 文案 */
  labels: Required<LabelsConfig>
  runtime: AgentRuntime

  // 会话
  sessionId: Ref<string>
  messages: Ref<ChatMessage[]>
  status: Ref<ChatStatus>
  currentRunId: Ref<string | null>
  lastError: Ref<string | null>

  // Agent 状态（流水线、ReAct、治理、共享状态）
  agentState: AgentStateSnapshot
  interrupt: Ref<InterruptRequest | null>
  totalUsage: TokenUsage

  // 注册表
  readables: Map<string, ReadableContext>
  actions: Map<string, CopilotActionDef>
  additionalInstructions: Map<string, string>
  suggestions: Ref<ChatSuggestion[]>
  suggestionsLoading: Ref<boolean>

  // 操作
  sendMessage: (content: string) => Promise<void>
  stop: () => void
  retryLast: () => Promise<void>
  editAndResend: (messageId: string, newContent: string) => Promise<void>
  clearChat: () => void
  respondToInterrupt: (response: Omit<InterruptResponse, 'interruptId'>) => Promise<void>
  refreshSuggestions: () => Promise<void>
  /** 消息反馈（点赞/点踩），触发 onFeedback 回调 */
  sendFeedback: (messageId: string, feedback: 'up' | 'down') => void
  /** 消息反馈状态记录 */
  feedbacks: Ref<Record<string, 'up' | 'down'>>

  // 输入增强：上下文附着 + 消息队列
  /** 当前附着的上下文项（@提及 / #引用 / 手动） */
  contextItems: Ref<ContextItem[]>
  attachContext: (item: ContextItem) => void
  removeContext: (id: string) => void
  /** 排队中的消息（运行中继续发送时进入队列） */
  queuedMessages: Ref<{ id: string; content: string; context?: ContextItem[] }[]>
  cancelQueued: (id: string) => void

  // 消息分支（编辑重发/重新生成的历史版本）
  /** 分支组：key 为锚点消息 id */
  branches: Ref<Record<string, { anchorIndex: number; versions: ChatMessage[][]; active: number }>>
  /** 切换到指定分支版本 */
  switchBranch: (anchorId: string, target: number) => void

  // Agentic Coding
  /** 当前运行模式 */
  agentMode: Ref<AgentMode>
  setAgentMode: (mode: AgentMode) => void
  /** 深度思考开关（随 RunInput.metadata.thinking 传给后端） */
  thinkingEnabled: Ref<boolean>
  /** 文件变更（审查面板数据） */
  fileChanges: Ref<FileChange[]>
  reviewFileChange: (changeId: string | 'all', decision: 'accepted' | 'rejected') => void
  /** 任务追踪 */
  tasks: Ref<AgentTask[]>
  /** 当前计划 */
  plan: Ref<PlanSpec | null>
  decidePlan: (decision: 'approved' | 'rejected', steps?: PlanStep[]) => void
  /** 终端输出流 */
  terminal: Ref<TerminalEntry[]>
  /** 提交 Agent 请求的表单 */
  submitForm: (formId: string, values: Record<string, unknown>) => void
  /** 注入结构化载荷为一条助手消息（演示/调试通道） */
  injectPayload: (payload: StructuredPayload, content?: string) => void
  /** 清空 Agentic 状态（变更/任务/计划/终端） */
  clearAgenticState: () => void
}

/**
 * 注入键使用 Symbol.for（全局注册表）：
 * Vite HMR 重新求值本模块时 Symbol('x') 会生成新引用，导致已挂载的
 * CopilotProvider（旧 key）与热更新后的子组件（新 key）不匹配而 inject 失败。
 * Symbol.for 保证跨模块实例返回同一 Symbol，彻底规避该问题。
 */
export const COPILOT_KEY: InjectionKey<CopilotStore> = Symbol.for('agent-copilot:store')

export function createCopilotStore(userConfig: CopilotConfig): CopilotStore {
  // 合并顺序：默认值 < agentType 预设 < 用户配置
  const preset = AGENT_TYPE_PRESETS[userConfig.agentType ?? 'custom'] ?? {}
  const config: CopilotConfig = { ...DEFAULT_CONFIG, ...preset, ...userConfig }
  const labels: Required<LabelsConfig> = { ...DEFAULT_LABELS, ...config.labels }
  const callbacks = config.callbacks ?? {}

  // 协议工厂：runtimeInstance 直接注入优先，其次根据 provider / protocol / runtime 推断（32 种接入方式）
  const runtime: AgentRuntime = config.runtimeInstance ?? createRuntime(config)

  // ---- 会话持久化 ----
  const persistence = config.persistence ?? { mode: 'none' as const }
  const storageKey = `${persistence.keyPrefix ?? 'agent-copilot'}:session`
  const storage: Storage | null =
    typeof window === 'undefined' ? null
      : persistence.mode === 'local' ? window.localStorage
      : persistence.mode === 'session' ? window.sessionStorage
      : null

  function loadPersisted(): { sessionId: string; messages: ChatMessage[] } | null {
    if (!storage) return null
    try {
      const raw = storage.getItem(storageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.messages)) return parsed
    } catch { /* 忽略损坏数据 */ }
    return null
  }

  const persisted = loadPersisted()
  const sessionId = ref(persisted?.sessionId ?? genId('session'))
  const messages = ref<ChatMessage[]>(persisted?.messages ?? [])
  const status = ref<ChatStatus>('idle')
  const currentRunId = ref<string | null>(null)
  const lastError = ref<string | null>(null)
  const interrupt = ref<InterruptRequest | null>(null)
  const feedbacks = ref<Record<string, 'up' | 'down'>>({})

  // ---- 输入增强：上下文附着 + 消息队列 ----
  const contextItems = ref<ContextItem[]>([])
  const queuedMessages = ref<{ id: string; content: string; context?: ContextItem[] }[]>([])

  function attachContext(item: ContextItem) {
    if (contextItems.value.some((c) => c.id === item.id)) return
    contextItems.value = [...contextItems.value, item]
  }

  function removeContext(id: string) {
    contextItems.value = contextItems.value.filter((c) => c.id !== id)
  }

  function cancelQueued(id: string) {
    queuedMessages.value = queuedMessages.value.filter((q) => q.id !== id)
  }

  // ---- Agentic Coding 状态 ----
  const agentMode = ref<AgentMode>(config.agentic?.mode ?? 'confirm_edits')
  /** 用户开启的深度思考（随 RunInput.metadata 传给后端） */
  const thinkingEnabled = ref(false)
  const fileChanges = ref<FileChange[]>([])
  const tasks = ref<AgentTask[]>([])
  const plan = ref<PlanSpec | null>(null)
  const terminal = ref<TerminalEntry[]>([])

  function setAgentMode(mode: AgentMode) {
    agentMode.value = mode
    config.agentic?.onModeChange?.(mode)
  }

  function reviewFileChange(changeId: string | 'all', decision: 'accepted' | 'rejected') {
    if (changeId === 'all') {
      fileChanges.value = fileChanges.value.map((c) =>
        c.status === 'pending' ? { ...c, status: decision } : c,
      )
    } else {
      fileChanges.value = fileChanges.value.map((c) =>
        c.id === changeId ? { ...c, status: decision } : c,
      )
    }
    config.onFileChangeReview?.(changeId, decision)
  }

  function decidePlan(decision: 'approved' | 'rejected', steps?: PlanStep[]) {
    if (!plan.value) return
    if (steps) plan.value = { ...plan.value, steps }
    plan.value = { ...plan.value, status: decision }
    config.onPlanDecision?.(plan.value.id, decision, plan.value.steps)
  }

  function submitForm(formId: string, values: Record<string, unknown>) {
    config.onFormSubmit?.(formId, values)
    // 回传给 Agent 审查：把表单值作为结构化消息发回运行循环（AI 检查表单内容）
    if (config.agentic?.formReview !== false) {
      const lines = Object.entries(values)
        .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join('、') : String(v)}`)
        .join('\n')
      void sendMessage(`[表单提交 ${formId}]\n${lines}\n\n请检查以上表单内容是否合理、完整、无冲突。若有问题请指出需要修改的字段，若无问题请确认通过。`)
    }
  }

  /** 注入结构化载荷为一条助手消息（演示/调试通道：如演练场的 AI 表单演示） */
  function injectPayload(payload: StructuredPayload, content = '') {
    messages.value.push({
      id: genId('m'),
      role: 'assistant',
      content,
      createdAt: Date.now(),
      payloads: [payload],
    })
    persist()
  }

  function clearAgenticState() {
    fileChanges.value = []
    tasks.value = []
    plan.value = null
    terminal.value = []
  }

  function persist() {
    if (!storage) return
    try {
      const limit = persistence.historyLimit ?? 100
      storage.setItem(storageKey, JSON.stringify({
        sessionId: sessionId.value,
        messages: messages.value.slice(-limit).map((m) => ({ ...m, streaming: false })),
      }))
    } catch { /* 存储满等异常忽略 */ }
  }

  // ---- 速率限制 ----
  const sentTimestamps: number[] = []
  function checkRateLimit(): boolean {
    if (!config.rateLimit || config.rateLimit <= 0) return true
    const now = Date.now()
    while (sentTimestamps.length && now - sentTimestamps[0] > 60_000) sentTimestamps.shift()
    return sentTimestamps.length < config.rateLimit
  }

  const agentState = reactive<AgentStateSnapshot>(createEmptyAgentState())
  const totalUsage = reactive<TokenUsage>({ promptTokens: 0, completionTokens: 0, totalTokens: 0 })

  const readables = new Map<string, ReadableContext>()
  const actions = new Map<string, CopilotActionDef>()
  const additionalInstructions = new Map<string, string>()
  const suggestions = ref<ChatSuggestion[]>([])
  const suggestionsLoading = ref(false)

  let abortController: AbortController | null = null

  function resetAgentState() {
    const empty = createEmptyAgentState()
    agentState.runId = undefined
    agentState.stages = empty.stages
    agentState.gate = undefined
    agentState.reactSteps = []
    agentState.governance = []
  }

  function log(...args: unknown[]) {
    if (config.debug) console.log('[agent-copilot]', ...args)
  }

  // ============ 事件消费 ============

  async function consumeEvents(stream: AsyncIterable<AgentEvent>) {
    for await (const event of stream) {
      log('event', event.type, event.data)
      handleEvent(event)
      if (event.type === 'RUN_FINISHED' || event.type === 'RUN_ERROR') return event.type
      if (event.type === 'INTERRUPT') return 'INTERRUPT'
    }
    return 'RUN_FINISHED'
  }

  function currentAssistantMessage(): ChatMessage | undefined {
    const last = messages.value[messages.value.length - 1]
    return last?.role === 'assistant' && last.streaming ? last : undefined
  }

  function ensureAssistantMessage(runId: string): ChatMessage {
    let msg = currentAssistantMessage()
    if (!msg) {
      msg = {
        id: genId('m'), role: 'assistant', content: '', createdAt: Date.now(),
        streaming: true, toolCalls: [], payloads: [], runId,
      }
      messages.value = [...messages.value, msg]
    }
    return msg
  }

  function patchMessages() {
    // 触发 ref 更新（消息对象为浅层可变）
    messages.value = [...messages.value]
  }

  function handleEvent(event: AgentEvent) {
    const data = event.data as any
    switch (event.type) {
      case 'RUN_STARTED': {
        agentState.runId = event.runId
        break
      }
      case 'STAGE_STARTED': {
        const stage = agentState.stages.find((s) => s.id === (data.stage as PipelineStageId))
        if (stage) { stage.status = 'running'; stage.startedAt = event.timestamp }
        break
      }
      case 'STAGE_FINISHED': {
        const stage = agentState.stages.find((s) => s.id === (data.stage as PipelineStageId))
        if (stage) {
          stage.status = data.status ?? 'succeeded'
          stage.finishedAt = event.timestamp
          stage.summary = data.summary
          stage.detail = data.detail
        }
        break
      }
      case 'GATE_DECISION': {
        agentState.gate = data
        break
      }
      case 'TEXT_MESSAGE_START': {
        ensureAssistantMessage(event.runId)
        break
      }
      case 'TEXT_DELTA': {
        const msg = ensureAssistantMessage(event.runId)
        msg.content += data.delta
        patchMessages()
        break
      }
      case 'TEXT_MESSAGE_END': {
        // 保持 streaming 直到 RUN_FINISHED（可能还有后续轮次）
        break
      }
      case 'TOOL_CALL_START': {
        const msg = ensureAssistantMessage(event.runId)
        msg.toolCalls = msg.toolCalls ?? []
        msg.toolCalls.push({
          id: data.toolCallId, name: data.name, label: data.label,
          args: {}, status: 'running', origin: data.origin ?? 'backend',
          startedAt: event.timestamp,
        })
        patchMessages()
        break
      }
      case 'TOOL_CALL_ARGS': {
        const msg = currentAssistantMessage()
        const tc = msg?.toolCalls?.find((t) => t.id === data.toolCallId)
        if (tc) { tc.args = data.args; patchMessages() }
        break
      }
      case 'TOOL_CALL_RESULT': {
        const msg = currentAssistantMessage()
        const tc = msg?.toolCalls?.find((t) => t.id === data.toolCallId)
        if (tc) {
          tc.status = data.status
          tc.result = data.result
          tc.error = data.error
          tc.finishedAt = event.timestamp
          patchMessages()
          callbacks.onToolCall?.(tc)
        }
        break
      }
      case 'REACT_STEP': {
        agentState.reactSteps.push({
          index: agentState.reactSteps.length,
          type: data.type as ReActStep['type'],
          content: data.content,
          toolCallId: data.toolCallId,
          timestamp: event.timestamp,
        })
        break
      }
      case 'GOVERNANCE_EVENT': {
        agentState.governance.push(data as GovernanceEvent)
        break
      }
      case 'AGENT_STATE_DELTA': {
        Object.assign(agentState.shared, data ?? {})
        break
      }
      case 'STRUCTURED_PAYLOAD': {
        const msg = ensureAssistantMessage(event.runId)
        msg.payloads = msg.payloads ?? []
        msg.payloads.push(data)
        patchMessages()
        break
      }
      case 'INTERRUPT': {
        interrupt.value = data as InterruptRequest
        status.value = 'awaiting_interrupt'
        callbacks.onInterrupt?.(data as InterruptRequest)
        break
      }
      case 'USAGE': {
        agentState.usage = data
        totalUsage.promptTokens += data.promptTokens ?? 0
        totalUsage.completionTokens += data.completionTokens ?? 0
        totalUsage.totalTokens += data.totalTokens ?? 0
        callbacks.onUsage?.(data)
        break
      }
      case 'RUN_FINISHED': {
        finalizeRun()
        break
      }
      case 'RUN_ERROR': {
        // 无论是否已有流式助手消息，错误都必须以气泡形式可见
        // （后端可能在 RUN_STARTED 后立即报错，此时尚无助手消息）
        const msg = ensureAssistantMessage(event.runId)
        msg.streaming = false
        msg.error = data?.message ?? '运行出错'
        if (!msg.content) msg.content = `⚠ ${msg.error}`
        patchMessages()
        lastError.value = data?.message ?? '运行出错'
        status.value = 'error'
        break
      }
      // ---- Agentic Coding 域事件 ----
      case 'THINKING_START': {
        const msg = ensureAssistantMessage(event.runId)
        msg.thinking = msg.thinking ?? ''
        msg.thinkingStreaming = true
        ;(msg as any).__thinkStart = event.timestamp
        patchMessages()
        break
      }
      case 'THINKING_DELTA': {
        const msg = ensureAssistantMessage(event.runId)
        msg.thinking = (msg.thinking ?? '') + (data?.delta ?? '')
        patchMessages()
        break
      }
      case 'THINKING_END': {
        const msg = currentAssistantMessage()
        if (msg) {
          msg.thinkingStreaming = false
          const start = (msg as any).__thinkStart
          if (start) msg.thinkingDuration = event.timestamp - start
          patchMessages()
        }
        break
      }
      case 'FILE_CHANGE': {
        const change = data as FileChange
        const idx = fileChanges.value.findIndex((c) => c.id === change.id)
        if (idx >= 0) {
          fileChanges.value = fileChanges.value.map((c, i) => (i === idx ? { ...c, ...change } : c))
        } else {
          fileChanges.value = [...fileChanges.value, { ...change, status: change.status ?? 'pending' }]
        }
        break
      }
      case 'TASK_UPDATE': {
        // data: { tasks: AgentTask[] }（全量替换）或 { task: AgentTask }（单个 upsert）
        if (Array.isArray(data?.tasks)) {
          tasks.value = data.tasks
        } else if (data?.task) {
          const t = data.task as AgentTask
          const idx = tasks.value.findIndex((x) => x.id === t.id)
          tasks.value = idx >= 0
            ? tasks.value.map((x, i) => (i === idx ? { ...x, ...t } : x))
            : [...tasks.value, t]
        }
        break
      }
      case 'PLAN_UPDATE': {
        plan.value = data as PlanSpec
        break
      }
      case 'TERMINAL_APPEND': {
        // data: { entries: TerminalEntry[] } 或单条 TerminalEntry
        const entries = Array.isArray(data?.entries) ? data.entries : [data]
        terminal.value = [...terminal.value, ...entries]
        break
      }
      case 'FORM_REQUEST': {
        const msg = ensureAssistantMessage(event.runId)
        msg.payloads = msg.payloads ?? []
        msg.payloads.push({ type: 'form', data: data as FormPayload })
        patchMessages()
        break
      }
    }
  }

  function finalizeRun() {
    const msg = currentAssistantMessage()
    if (msg) {
      msg.streaming = false
      patchMessages()
      callbacks.onResponseComplete?.(msg, agentState.usage)
    }
    status.value = 'idle'
    currentRunId.value = null
    persist()
    drainQueue()
  }

  /** 运行结束后自动发送队列中的下一条消息 */
  function drainQueue() {
    const next = queuedMessages.value[0]
    if (!next || status.value !== 'idle') return
    queuedMessages.value = queuedMessages.value.slice(1)
    if (next.context) contextItems.value = next.context
    // 微任务延迟，避免在事件消费循环内同步重入
    Promise.resolve().then(() => sendMessage(next.content))
  }

  // ============ 收集运行输入 ============

  function collectRunInput(runId: string): Parameters<AgentRuntime['run']>[0] {
    abortController = new AbortController()
    // 最后一条用户消息附着的上下文随运行传递
    const lastUser = [...messages.value].reverse().find((m) => m.role === 'user')
    return {
      sessionId: sessionId.value,
      runId,
      messages: messages.value,
      contextItems: lastUser?.context,
      readables: [...readables.values()].map((r) => ({ description: r.description, value: r.value() })),
      actions: [...actions.values()],
      additionalInstructions: [...additionalInstructions.values()],
      systemPrompt: config.systemPrompt,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      signal: abortController.signal,
      metadata: { agentMode: agentMode.value, thinking: thinkingEnabled.value },
    }
  }

  // ============ 公开操作 ============

  async function sendMessage(content: string) {
    if (!content.trim()) return
    // 消息队列：运行中允许排队
    if (status.value === 'running' || status.value === 'awaiting_interrupt') {
      const q = config.queue
      if (q?.enabled) {
        if (queuedMessages.value.length >= (q.maxSize ?? 5)) {
          lastError.value = `排队消息已达上限（${q.maxSize ?? 5} 条）`
          return
        }
        queuedMessages.value = [...queuedMessages.value, {
          id: genId('q'), content: content.trim(),
          context: contextItems.value.length ? [...contextItems.value] : undefined,
        }]
        contextItems.value = []
        return
      }
      return
    }
    if (!checkRateLimit()) {
      lastError.value = `发送过于频繁（限 ${config.rateLimit} 条/分钟），请稍后再试`
      return
    }
    lastError.value = null
    resetAgentState()

    const attachedContext = contextItems.value.length ? [...contextItems.value] : undefined
    contextItems.value = []
    const userMsg: ChatMessage = {
      id: genId('m'), role: 'user', content: content.trim(), createdAt: Date.now(),
      context: attachedContext,
    }
    messages.value = [...messages.value, userMsg]
    sentTimestamps.push(Date.now())
    callbacks.onMessageSent?.(userMsg)
    persist()

    const runId = genId('run')
    currentRunId.value = runId
    status.value = 'running'
    callbacks.onResponseStart?.(runId)

    try {
      const outcome = await consumeEvents(runtime.run(collectRunInput(runId)))
      if (outcome === 'INTERRUPT') {
        // 挂起等待 respondToInterrupt
        currentRunId.value = runId
      }
    } catch (err: any) {
      handleRunError(err)
    }
  }

  function handleRunError(err: any) {
    if (err?.name === 'AbortError') { finalizeRun(); return }
    const message = err?.message ?? String(err)
    const msg = currentAssistantMessage()
    if (msg) {
      msg.streaming = false
      msg.error = message
      if (!msg.content) msg.content = `⚠ ${message}`
      patchMessages()
    } else {
      messages.value = [...messages.value, {
        id: genId('m'), role: 'assistant', content: `⚠ ${message}`,
        createdAt: Date.now(), error: message,
      }]
    }
    lastError.value = message
    status.value = 'error'
    currentRunId.value = null
    callbacks.onError?.(message)
  }

  async function respondToInterrupt(response: Omit<InterruptResponse, 'interruptId'>) {
    const itr = interrupt.value
    const runId = currentRunId.value
    if (!itr || !runId) return
    interrupt.value = null
    status.value = 'running'
    callbacks.onInterruptResolved?.({ interruptId: itr.id, ...response })

    try {
      abortController = new AbortController()
      const outcome = await consumeEvents(
        runtime.resume(sessionId.value, runId, { interruptId: itr.id, ...response }, abortController.signal),
      )
      if (outcome === 'INTERRUPT') currentRunId.value = runId
    } catch (err: any) {
      handleRunError(err)
    }
  }

  function stop() {
    // 用户主动停止：同时清空排队消息，避免意外续发
    queuedMessages.value = []
    abortController?.abort()
    if (currentRunId.value) {
      runtime.cancel(sessionId.value, currentRunId.value).catch(() => {})
    }
    finalizeRun()
  }

  // ---- 消息分支：编辑重发 / 重新生成时保留旧版本，可来回切换 ----
  const branches = ref<Record<string, { anchorIndex: number; versions: ChatMessage[][]; active: number }>>({})

  /** 把从 anchorIdx 开始的当前尾部存为分支版本，并开新的活跃分支槽位 */
  function forkBranch(anchorId: string, anchorIdx: number) {
    const group = branches.value[anchorId] ?? { anchorIndex: anchorIdx, versions: [], active: -1 }
    if (group.active >= 0 && group.active < group.versions.length) {
      // 已有活跃槽位：当前尾部写回该槽位
      group.versions[group.active] = messages.value.slice(group.anchorIndex)
    } else {
      group.versions.push(messages.value.slice(anchorIdx))
    }
    group.versions.push([]) // 新分支槽位（切换时写回实际内容）
    group.active = group.versions.length - 1
    branches.value = { ...branches.value, [anchorId]: group }
  }

  function switchBranch(anchorId: string, target: number) {
    const group = branches.value[anchorId]
    if (!group || status.value === 'running' || status.value === 'awaiting_interrupt') return
    if (target < 0 || target >= group.versions.length || target === group.active) return
    group.versions[group.active] = messages.value.slice(group.anchorIndex)
    group.active = target
    messages.value = [...messages.value.slice(0, group.anchorIndex), ...group.versions[target]]
    branches.value = { ...branches.value, [anchorId]: group }
    persist()
  }

  async function retryLast() {
    // 保留旧回答为分支，重发最后一条用户消息
    const lastUserIdx = [...messages.value].map((m) => m.role).lastIndexOf('user')
    if (lastUserIdx === -1) return
    const lastUser = messages.value[lastUserIdx]
    forkBranch(lastUser.id, lastUserIdx)
    messages.value = messages.value.slice(0, lastUserIdx)
    if (lastUser.context) contextItems.value = [...lastUser.context]
    await sendMessage(lastUser.content)
  }

  async function editAndResend(messageId: string, newContent: string) {
    const idx = messages.value.findIndex((m) => m.id === messageId)
    if (idx === -1) return
    forkBranch(messageId, idx)
    messages.value = messages.value.slice(0, idx)
    await sendMessage(newContent)
  }

  function clearChat() {
    stop()
    contextItems.value = []
    queuedMessages.value = []
    clearAgenticState()
    messages.value = []
    resetAgentState()
    interrupt.value = null
    lastError.value = null
    sessionId.value = genId('session')
    feedbacks.value = {}
    totalUsage.promptTokens = 0
    totalUsage.completionTokens = 0
    totalUsage.totalTokens = 0
    if (storage) { try { storage.removeItem(storageKey) } catch { /* noop */ } }
  }

  function sendFeedback(messageId: string, feedback: 'up' | 'down') {
    feedbacks.value = { ...feedbacks.value, [messageId]: feedback }
    callbacks.onFeedback?.(messageId, feedback)
  }

  // ============ 建议问题 ============

  async function refreshSuggestions() {
    const cfg = config.suggestions
    if (cfg === false) return
    if (cfg?.static && cfg.static.length > 0 && !cfg.instructions) {
      suggestions.value = cfg.static
      return
    }
    if (config.runtime !== 'browser' || !config.apiKey) {
      suggestions.value = cfg?.static ?? []
      return
    }
    suggestionsLoading.value = true
    try {
      const { LlmClient } = await import('../runtime/llm-client')
      const client = new LlmClient({ apiBase: config.apiBase!, apiKey: config.apiKey!, model: config.model! })
      const contextSummary = [...readables.values()]
        .map((r) => `${r.description}: ${JSON.stringify(r.value()).slice(0, 500)}`)
        .join('\n')
      const historySummary = messages.value.slice(-4).map((m) => `${m.role}: ${m.content.slice(0, 150)}`).join('\n')
      const raw = await client.chatOnce({
        messages: [
          {
            role: 'system',
            content:
              `根据以下应用上下文与对话历史，为用户生成 ${cfg?.maxSuggestions ?? 3} 条下一步可以问 AI 助手的问题建议。` +
              `${cfg?.instructions ? `要求：${cfg.instructions}` : ''}` +
              '输出 JSON：{"suggestions":[{"title":"短标题(≤10字)","message":"完整问题"}]}。只输出 JSON。',
          },
          { role: 'user', content: `应用上下文:\n${contextSummary}\n\n对话历史:\n${historySummary || '（新对话）'}` },
        ],
        jsonMode: true,
        maxTokens: 500,
      })
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.suggestions)) {
        suggestions.value = parsed.suggestions
          .filter((s: any) => s?.title && s?.message)
          .slice(0, cfg?.maxSuggestions ?? 3)
      }
    } catch (err) {
      log('suggestions error', err)
      suggestions.value = cfg?.static ?? []
    } finally {
      suggestionsLoading.value = false
    }
  }

  return {
    config, labels, runtime,
    sessionId, messages, status, currentRunId, lastError,
    agentState, interrupt, totalUsage,
    readables, actions, additionalInstructions, suggestions, suggestionsLoading,
    sendMessage, stop, retryLast, editAndResend, clearChat,
    respondToInterrupt, refreshSuggestions,
    sendFeedback, feedbacks,
    contextItems, attachContext, removeContext,
    queuedMessages, cancelQueued,
    branches, switchBranch,
    agentMode, setAgentMode, thinkingEnabled,
    fileChanges, reviewFileChange,
    tasks, plan, decidePlan,
    terminal, submitForm, injectPayload, clearAgenticState,
  }
}

export function provideCopilot(config: CopilotConfig): CopilotStore {
  const store = createCopilotStore(config)
  provide(COPILOT_KEY, store)
  return store
}

/** 获取 Copilot 上下文（所有 composables 的基础） */
export function useCopilot(): CopilotStore {
  const store = inject(COPILOT_KEY)
  if (!store) {
    throw new Error('[agent-copilot] useCopilot 必须在 <CopilotProvider> 内部使用')
  }
  return store
}
