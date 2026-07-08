/**
 * @od/agent-copilot-vue — 协议类型定义
 * 与 AgentScope (Java) 后端事件协议对齐（AG-UI 风格）
 */

// ============ 消息 ============

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: number
  /** 流式生成中 */
  streaming?: boolean
  /** 生成失败 */
  error?: string
  /** 关联的工具调用 */
  toolCalls?: ToolCallState[]
  /** 结构化载荷（US-013 输出管理：卡片/表格/图表） */
  payloads?: StructuredPayload[]
  /** 本条消息运行的流水线轨迹 */
  runId?: string
  /** 排队中（消息队列：等待当前运行完成后自动发送） */
  queued?: boolean
  /** 随消息附着的上下文（@提及 / #引用 / 手动附着） */
  context?: ContextItem[]
  /** 分支组 id：同一用户消息的多次编辑重发 / 助手多次重新生成共享一个组 */
  branchGroup?: string
  /** 思考内容（THINKING_* 事件累积，ThinkingBlock 渲染） */
  thinking?: string
  /** 思考进行中 */
  thinkingStreaming?: boolean
  /** 思考耗时（毫秒） */
  thinkingDuration?: number
}

// ============ 输入增强：命令 / 提及 / 引用 / 上下文 ============

/** 斜杠命令定义（config.commands 注册） */
export interface SlashCommand {
  /** 命令名（不含斜杠，如 "summarize"） */
  name: string
  /** 显示描述 */
  description: string
  /** 可选图标（emoji 或单字符） */
  icon?: string
  /** 参数占位提示（如 "<语言>"） */
  hint?: string
  /**
   * 执行模式：
   * - template: 选中后把 template 填入输入框（含 {selection} 等占位符）
   * - action:   立即执行 handler，不发消息
   * - send:     立即以 template 为内容发送消息
   */
  mode?: 'template' | 'action' | 'send'
  template?: string
  handler?: (args: string) => void | Promise<void>
}

/** @提及 / #引用 的候选项 */
export interface MentionItem {
  id: string
  /** 显示名 */
  label: string
  /** 类型（person / agent / entity / doc / dataset…，决定图标与颜色） */
  type?: string
  /** 描述副文本 */
  description?: string
  /** 附加数据（随上下文传给 Agent） */
  data?: unknown
}

/** 附着到消息上的上下文项 */
export interface ContextItem {
  id: string
  /** 来源：mention（@）| reference（#）| manual（API 附着）| file */
  source: 'mention' | 'reference' | 'manual' | 'file'
  label: string
  type?: string
  data?: unknown
}

/** 提及/引用数据源（支持异步搜索） */
export type MentionProvider = (query: string) => MentionItem[] | Promise<MentionItem[]>

/** 消息队列配置 */
export interface QueueConfig {
  /** 运行中允许排队发送，默认 false */
  enabled?: boolean
  /** 最大排队数，默认 5 */
  maxSize?: number
}

// ============ 工具调用 ============

export type ToolCallStatus = 'pending' | 'running' | 'awaiting_approval' | 'succeeded' | 'failed' | 'rejected'

export interface ToolCallState {
  id: string
  name: string
  /** 工具中文显示名 */
  label?: string
  args: Record<string, unknown>
  status: ToolCallStatus
  result?: unknown
  error?: string
  startedAt?: number
  finishedAt?: number
  /** 来源：frontend（前端 Action）| backend（后端工具） */
  origin: 'frontend' | 'backend'
}

// ============ 结构化输出（US-013 / AG-UI 生成式 UI） ============

/**
 * 载荷类型，覆盖四类常见 Agent：
 * - chat:  card / document / citations / plan / comparison
 * - code:  code / diff / file_tree / terminal
 * - data:  table / chart / metrics / sql_result
 * - media: image
 */
export type StructuredPayloadType =
  | 'table' | 'card' | 'comparison' | 'chart' | 'document' | 'plan'
  | 'code' | 'diff' | 'file_tree' | 'terminal'
  | 'metrics' | 'sql_result'
  | 'image'
  | 'audio'
  | 'video'
  | 'citations'
  | 'timeline_events'
  // Agent↔人双向交互
  | 'form'

export interface StructuredPayload {
  type: StructuredPayloadType
  title?: string
  data: unknown
}

// ---- 各载荷 data 形状（前后端契约） ----

export interface TablePayload {
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[]
  rows: Record<string, unknown>[]
  /** 启用客户端排序/筛选/分页 */
  sortable?: boolean
  filterable?: boolean
  pageSize?: number
  exportable?: boolean
}

export interface ChartPayload {
  kind: 'bar' | 'line' | 'pie'
  /** 类目轴标签 */
  labels: string[]
  series: { name: string; values: number[]; color?: string }[]
  unit?: string
  height?: number
}

export interface MetricsPayload {
  items: {
    label: string
    value: string | number
    unit?: string
    /** 环比变化，正数向好 */
    delta?: number
    /** delta 含义反转（如成本下降是好事） */
    invertDelta?: boolean
    hint?: string
  }[]
  columns?: 2 | 3 | 4
}

export interface SqlResultPayload {
  sql: string
  columns: { key: string; label: string }[]
  rows: Record<string, unknown>[]
  rowCount?: number
  elapsedMs?: number
}

export interface CodePayload {
  language: string
  code: string
  filename?: string
  showLineNumbers?: boolean
  highlightLines?: number[]
  caption?: string
}

export interface DiffPayload {
  filename?: string
  language?: string
  /** 统一 diff 行：type 决定着色 */
  lines: { type: 'add' | 'del' | 'ctx' | 'hunk'; text: string; oldNo?: number; newNo?: number }[]
  additions?: number
  deletions?: number
}

export interface FileTreeNode {
  name: string
  type: 'file' | 'dir'
  children?: FileTreeNode[]
  /** 标注：new / modified / deleted */
  badge?: 'new' | 'modified' | 'deleted'
  comment?: string
}

export interface FileTreePayload {
  root: FileTreeNode[]
  defaultExpanded?: boolean
}

export interface TerminalPayload {
  lines: { kind: 'cmd' | 'out' | 'err'; text: string }[]
  cwd?: string
  exitCode?: number
}

/** 事件时间线 */
export interface TimelineEventsPayload {
  events: {
    time: string
    title: string
    description?: string
    /** 状态色：info / success / warning / danger */
    tone?: 'info' | 'success' | 'warning' | 'danger'
    entityId?: string
  }[]
}

export interface ImagePayload {
  src: string
  alt?: string
  prompt?: string
  width?: number
  height?: number
  caption?: string
}

/** 音频载荷（payload type: 'audio'）：语音消息 / TTS 回复 */
export interface AudioPayload {
  src: string
  /** 时长（秒），未知时播放器加载后自取 */
  duration?: number
  /** 语音转写文本（可折叠展示） */
  transcript?: string
  caption?: string
  mimeType?: string
}

/** 视频载荷（payload type: 'video'） */
export interface VideoPayload {
  src: string
  poster?: string
  duration?: number
  caption?: string
  mimeType?: string
  width?: number
  height?: number
}

export interface CitationsPayload {
  items: {
    title: string
    snippet?: string
    url?: string
    source?: string
    /** 相关度 0~1 */
    score?: number
  }[]
}

export interface PlanPayload {
  steps: { title: string; description?: string; status?: 'todo' | 'doing' | 'done' | 'skipped' }[]
}

// ============ 流水线（US-008 ~ US-014） ============

export type PipelineStageId =
  | 'input_understanding'   // US-008
  | 'ontology_reasoning'    // US-009
  | 'readiness_gate'        // US-010
  | 'react_execution'       // US-011
  | 'output_management'     // US-013

export type StageStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'blocked'

export interface PipelineStageState {
  id: PipelineStageId
  label: string
  status: StageStatus
  startedAt?: number
  finishedAt?: number
  /** 阶段产物摘要（供检查器展示） */
  summary?: string
  detail?: Record<string, unknown>
}

/** US-010 就绪门决策 */
export type GateDecision = 'GO' | 'CLARIFY' | 'REJECT' | 'DEGRADE'

export interface GateDecisionState {
  decision: GateDecision
  reasons: string[]
  missing?: string[]
  confidence?: number
}

/** US-011 ReAct 轨迹 */
export type ReActStepType = 'thought' | 'action' | 'observation' | 'final'

export interface ReActStep {
  index: number
  type: ReActStepType
  content: string
  toolCallId?: string
  timestamp: number
}

/** US-012 治理事件 */
export type GovernanceHookPoint =
  | 'pre_pipeline' | 'post_stage' | 'pre_tool' | 'post_tool' | 'pre_output' | 'on_error'

export type GovernanceSeverity = 'info' | 'warn' | 'block'

export interface GovernanceEvent {
  id: string
  hook: GovernanceHookPoint
  severity: GovernanceSeverity
  rule: string
  message: string
  timestamp: number
}

// ============ HITL 中断 ============

export interface InterruptRequest {
  id: string
  runId: string
  /** 中断类型：approval（审批确认）| input（补充信息）| choice（选择） */
  kind: 'approval' | 'input' | 'choice'
  title: string
  description?: string
  /** 待确认的动作摘要 */
  action?: { name: string; label?: string; args: Record<string, unknown> }
  /** choice 类型的候选项 */
  options?: { value: string; label: string; description?: string }[]
  timestamp: number
}

export interface InterruptResponse {
  interruptId: string
  approved?: boolean
  value?: string
  comment?: string
}

// ============ Agent 共享状态（CoAgent） ============

export interface AgentStateSnapshot {
  runId?: string
  stages: PipelineStageState[]
  gate?: GateDecisionState
  reactSteps: ReActStep[]
  governance: GovernanceEvent[]
  /** 任意业务共享状态（useCoAgent 双向同步） */
  shared: Record<string, unknown>
  usage?: TokenUsage
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// ============ 事件协议（SSE，前后端契约） ============

export type AgentEventType =
  | 'RUN_STARTED'
  | 'STAGE_STARTED'
  | 'STAGE_FINISHED'
  | 'TEXT_MESSAGE_START'
  | 'TEXT_DELTA'
  | 'TEXT_MESSAGE_END'
  | 'TOOL_CALL_START'
  | 'TOOL_CALL_ARGS'
  | 'TOOL_CALL_RESULT'
  | 'REACT_STEP'
  | 'AGENT_STATE_DELTA'
  | 'GOVERNANCE_EVENT'
  | 'GATE_DECISION'
  | 'STRUCTURED_PAYLOAD'
  | 'INTERRUPT'
  | 'USAGE'
  | 'RUN_FINISHED'
  | 'RUN_ERROR'
  /** 连接失败自动重连中（data: { attempt, maxRetries, delayMs, reason }） */
  | 'CONNECTION_RETRY'
  // Agentic Coding 域事件
  | 'THINKING_START'
  | 'THINKING_DELTA'
  | 'THINKING_END'
  | 'FILE_CHANGE'
  | 'TASK_UPDATE'
  | 'PLAN_UPDATE'
  | 'TERMINAL_APPEND'
  | 'FORM_REQUEST'

export interface AgentEvent {
  type: AgentEventType
  runId: string
  timestamp: number
  data?: unknown
}

// ============ Agentic Coding 域（模式/变更/任务/计划/终端/表单/思考） ============

/** Agent 运行模式（对齐 Cursor/Claude Code 的权限模型） */
export type AgentMode = 'confirm_edits' | 'auto_edit' | 'plan' | 'full_access'

export interface AgentModeOption {
  id: AgentMode
  label: string
  description: string
  /** 权限提示（如"每次变更前需确认"） */
  permissionHint?: string
  icon?: string
}

/** 文件变更（审查面板数据单元） */
export interface FileChange {
  id: string
  path: string
  kind: 'create' | 'modify' | 'delete' | 'rename'
  /** rename 时的原路径 */
  fromPath?: string
  /** 统一 diff 文本（复用 DiffView 渲染） */
  diff?: string
  /** 新文件完整内容（create 或无 diff 时预览用） */
  content?: string
  language?: string
  additions?: number
  deletions?: number
  /** 审查状态 */
  status: 'pending' | 'accepted' | 'rejected'
}

/** 任务状态（对齐行业标准：Claude Code TodoWrite / Devin 计划面板） */
export type AgentTaskStatus = 'pending' | 'active' | 'done' | 'error' | 'skipped' | 'cancelled'

/** 任务关联产物（完成后可跳转的文件 / 链接 / 预览） */
export interface AgentTaskArtifact {
  /** 产物类型 */
  type: 'file' | 'link' | 'preview'
  /** 显示名 */
  label: string
  /** 文件路径或 URL */
  uri: string
}

/** Agent 任务（TodoList 式追踪） */
export interface AgentTask {
  id: string
  title: string
  status: AgentTaskStatus
  detail?: string
  /** 进行时文案（active 态优先显示，如"正在构建首页…"） */
  activeForm?: string
  /** 子任务（树形层级，支持递归嵌套） */
  subtasks?: AgentTask[]
  /** 开始时间戳 ms */
  startedAt?: number
  /** 耗时 ms（done/error 时展示） */
  durationMs?: number
  /** 失败原因（error 态展示，可配合 retry 操作） */
  errorReason?: string
  /** 是否允许重试（error 态显示重试按钮） */
  retryable?: boolean
  /** 是否允许跳过（pending/error 态显示跳过按钮） */
  skippable?: boolean
  /** 任务产物（完成后可跳转） */
  artifacts?: AgentTaskArtifact[]
}

/** 计划步骤 */
export interface PlanStep {
  id: string
  title: string
  detail?: string
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped'
}

/** 计划规格（Plan 面板数据） */
export interface PlanSpec {
  id: string
  title?: string
  steps: PlanStep[]
  /** 计划状态：draft 待批准 / approved 已批准 / executing / done / rejected */
  status: 'draft' | 'approved' | 'executing' | 'done' | 'rejected'
}

/** 工作区文件（文件面板数据单元） */
export interface WorkspaceFile {
  path: string
  kind: 'file' | 'dir'
  content?: string
  language?: string
  children?: WorkspaceFile[]
}

/** 终端条目 */
export interface TerminalEntry {
  id: string
  kind: 'cmd' | 'out' | 'err' | 'info'
  /** 文本内容，out/err 支持 ANSI SGR 转义序列（颜色/粗体/暗淡），TerminalPanel 自动解析渲染 */
  text: string
  timestamp?: number
  /** 命令退出码（kind='cmd' 完成后回填；非零显示失败标记） */
  exitCode?: number
}

/** Agent 请求用户填写的表单字段 */
export interface FormFieldSpec {
  name: string
  label: string
  type:
    | 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number'
    | 'email' | 'tel' | 'url' | 'time' | 'slider' | 'rating' | 'switch' | 'tags' | 'multiselect'
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  defaultValue?: unknown
  description?: string
  // ---- 校验规则（AgentFormCard 内置执行） ----
  /** number/slider 最小值；date/time 最早值（ISO 字符串） */
  min?: number | string
  /** number/slider 最大值；date/time 最晚值（ISO 字符串） */
  max?: number | string
  /** slider/number 步长 */
  step?: number
  minLength?: number
  maxLength?: number
  /** 正则校验（字符串形式，email/url/tel 有内置格式校验） */
  pattern?: string
  /** 正则不匹配时的提示文案 */
  patternMessage?: string
  /** rating 最大星数（默认 5） */
  maxRating?: number
  /** 数值单位后缀（如 "元" "%" "台"） */
  unit?: string
  /** AI 检查反馈：非空时字段旁以警示样式内联展示（AI 审查回填） */
  aiIssue?: string
}

/** 消息内嵌表单载荷（payload type: 'form'） */
export interface FormPayload {
  formId: string
  title?: string
  description?: string
  fields: FormFieldSpec[]
  submitLabel?: string
  cancelLabel?: string
  /** AI 检查状态：issues = 有问题需修复（配套字段 aiIssue）；passed = 检查通过 */
  aiReview?: 'issues' | 'passed'
  /** AI 检查总结（表单顶部横幅展示） */
  aiSummary?: string
}

/** 工具动作种类（ToolActionCard 特化渲染） */
export type ToolActionKind =
  | 'read_file' | 'write_file' | 'edit_file' | 'delete_file'
  | 'run_command' | 'search' | 'browse' | 'generic'

// ============ Action（前端工具，对齐 useCopilotAction） ============

export interface ActionParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  required?: boolean
  enum?: string[]
}

export interface CopilotActionDef {
  name: string
  /** 中文显示名 */
  label?: string
  description: string
  parameters?: ActionParameter[]
  /** 直接执行 */
  handler?: (args: Record<string, unknown>) => Promise<unknown> | unknown
  /** HITL：渲染并等待用户确认后再执行（renderAndWait 语义） */
  requiresApproval?: boolean
  /** 自定义渲染组件名（generative UI 注册表 key） */
  render?: string
}

// ============ Readable（应用状态注入，对齐 useCopilotReadable） ============

export interface ReadableContext {
  id: string
  description: string
  value: () => unknown
  /** 分类，便于后端选择性注入 */
  categories?: string[]
}

// ============ 建议问题 ============

export interface ChatSuggestion {
  title: string
  message: string
}

export interface SuggestionsConfig {
  instructions?: string
  minSuggestions?: number
  maxSuggestions?: number
  /** 静态建议（不经过 LLM） */
  static?: ChatSuggestion[]
}

// ============ Runtime 接口 ============

export interface RunInput {
  sessionId: string
  runId: string
  messages: ChatMessage[]
  /** 注入的应用上下文 */
  readables: { description: string; value: unknown }[]
  /** 输入增强附着的上下文（@提及/#引用/手动） */
  contextItems?: ContextItem[]
  /** 前端注册的 Actions（供 LLM 调用） */
  actions: CopilotActionDef[]
  /** 附加系统指令 */
  additionalInstructions: string[]
  systemPrompt?: string
  model?: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  /** 运行元数据：Agent 模式 / 深度思考等（协议适配器可透传给后端） */
  metadata?: {
    agentMode?: AgentMode
    thinking?: boolean
    [key: string]: unknown
  }
}

export interface AgentRuntime {
  readonly kind: 'http' | 'browser'
  /** 发起一次运行，返回事件流 */
  run(input: RunInput): AsyncIterable<AgentEvent>
  /** 恢复被 HITL 中断的运行 */
  resume(sessionId: string, runId: string, response: InterruptResponse, signal?: AbortSignal): AsyncIterable<AgentEvent>
  /** 取消运行 */
  cancel(sessionId: string, runId: string): Promise<void>
}

// ============ Provider 配置（全量配置体系） ============

/** Agent 类型预设：切换默认工具展示、建议风格与演示提示词 */
export type AgentType = 'chat' | 'code' | 'design' | 'data' | 'custom'

/** 消息操作开关 */
export interface MessageActionsConfig {
  copy?: boolean
  regenerate?: boolean
  edit?: boolean
  feedback?: boolean
}

/** Markdown 渲染配置 */
export interface MarkdownConfig {
  /** 代码块高亮 */
  codeHighlight?: boolean
  /** 链接打开方式 */
  linkTarget?: '_blank' | '_self'
  /** 允许渲染表格 */
  tables?: boolean
}

/** 欢迎屏配置 */
export interface WelcomeScreenConfig {
  title?: string
  subtitle?: string
  icon?: string
  /** 空态引导提示（点击直接发送） */
  hints?: string[]
}

/** 附件配置 */
export interface AttachmentsConfig {
  enabled?: boolean
  /** 允许的 MIME 前缀，如 image/、text/ */
  accept?: string[]
  /** 单文件大小上限（字节） */
  maxSize?: number
  maxCount?: number
}

/** 流式与重试配置 */
export interface StreamingConfig {
  enabled?: boolean
  /** 打字机速度：字符/帧，0 = 不限速 */
  typewriterSpeed?: number
}

/** 会话持久化配置 */
export interface PersistenceConfig {
  mode: 'none' | 'local' | 'session'
  /** 存储 key 前缀 */
  keyPrefix?: string
  /** 保留最近 N 条消息 */
  historyLimit?: number
}

/** 工具调用展示配置 */
export interface ToolDisplayConfig {
  /** inline 展开 / collapsed 折叠 / hidden 隐藏 */
  mode?: 'inline' | 'collapsed' | 'hidden'
  /** 工具图标映射：工具名 -> emoji 或字符 */
  icons?: Record<string, string>
  /** 显示参数 */
  showArgs?: boolean
  /** 显示结果 */
  showResult?: boolean
  /**
   * 自定义渲染器注册表（AG-UI toolRenderers / CopilotKit useRenderTool 模式）：
   * 工具名 → Vue 组件，命中后完全接管该工具的渲染；'default' 键为兜底。
   * 组件收到 props: { toolCall: ToolCallState }
   */
  renderers?: Record<string, import('vue').Component>
}

/** 审批配置 */
export interface ApprovalConfig {
  /** auto 全自动 / gate 高影响动作确认 / always 全部确认 */
  mode?: 'auto' | 'gate' | 'always'
  /** 超时秒数，超时后自动拒绝；0 = 不超时 */
  timeoutSeconds?: number
  /** 需要审批的工具名列表（gate 模式下与 requiresApproval 合并） */
  gateTools?: string[]
}

/** UI 文案全量覆盖（国际化/白标） */
export interface LabelsConfig {
  inputPlaceholder?: string
  send?: string
  stop?: string
  retry?: string
  clear?: string
  copy?: string
  copied?: string
  regenerate?: string
  thinking?: string
  approve?: string
  reject?: string
  approvalPending?: string
  interruptLocked?: string
  emptyTitle?: string
  emptySubtitle?: string
  errorPrefix?: string
  suggestionsTitle?: string
  attachFile?: string
  feedbackUp?: string
  feedbackDown?: string
}

/** 生命周期回调（业务埋点） */
export interface CopilotCallbacks {
  onMessageSent?: (message: ChatMessage) => void
  onResponseStart?: (runId: string) => void
  onResponseComplete?: (message: ChatMessage, usage?: TokenUsage) => void
  onToolCall?: (toolCall: ToolCallState) => void
  onInterrupt?: (interrupt: InterruptRequest) => void
  onInterruptResolved?: (response: InterruptResponse) => void
  onError?: (error: string) => void
  onUsage?: (usage: TokenUsage) => void
  onFeedback?: (messageId: string, feedback: 'up' | 'down') => void
  onSuggestionClick?: (suggestion: ChatSuggestion) => void
  /** 每次运行结束（成功/失败/中断）回调遥测指标 */
  onTelemetry?: (telemetry: RunTelemetry) => void
}

/** 单次运行遥测指标（onTelemetry 回调载荷） */
export interface RunTelemetry {
  runId: string
  /** 结束方式 */
  outcome: 'finished' | 'error' | 'interrupted' | 'cancelled'
  /** 总时长 ms */
  durationMs: number
  /** 首 token 延迟 ms（TTFT，无文本输出时为 undefined） */
  ttftMs?: number
  /** 事件总数 */
  eventCount: number
  /** 工具调用数 */
  toolCallCount: number
  /** 输出字符数 */
  outputChars: number
  /** token 用量（后端上报时才有） */
  usage?: TokenUsage
  /** 输出速率（字符/秒，基于首 token 后的时间窗口） */
  charsPerSecond?: number
}

export interface CopilotConfig {
  // ---- 运行时与协议 ----
  /** 运行时：browser = 浏览器直连模型/框架（演示）；http = 对接本项目 Java 后端 */
  runtime?: 'browser' | 'http'
  /** 直接注入 AgentRuntime 实例（优先于 runtime/provider 工厂推断），用于自定义协议或脚本化演示 */
  runtimeInstance?: AgentRuntime
  /**
   * 厂商预设名（28 种）：openai / azure-openai / siliconflow / deepseek / moonshot /
   * zhipu / qwen / hunyuan / doubao / baichuan / minimax / yi / stepfun / groq /
   * mistral / xai / together / openrouter / vllm / ollama-v1 / anthropic / gemini /
   * ollama-native / cohere / ag-ui / langgraph / langserve / agentscope / ai-sdk /
   * dify / coze / fastgpt。填 provider 自动推断 apiBase / model / protocol。
   */
  provider?: string
  /**
   * 显式协议（覆盖 provider 推断）：
   * A 类模型协议 openai-compatible / anthropic / gemini / ollama-native / cohere（本地 ReAct 循环）
   * B 类框架协议 ag-ui / langgraph / langserve / agentscope / ai-sdk / dify / coze / fastgpt（远程循环）
   */
  protocol?: string
  /** 协议特有参数：dify 的 user、coze 的 botId、langgraph 的 assistantId、azure 的 apiVersion 等 */
  protocolOptions?: Record<string, unknown>
  /** http 模式后端地址；B 类协议的服务端点 */
  endpoint?: string
  /** browser 模式 LLM API 配置 */
  apiBase?: string
  apiKey?: string
  model?: string
  headers?: Record<string, string>
  /** 请求超时毫秒数 */
  requestTimeout?: number

  // ---- Agent 行为 ----
  /** Agent 类型预设（chat/code/design/data），影响默认工具展示与建议风格 */
  agentType?: AgentType
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  maxRetries?: number
  /** 重试间隔毫秒 */
  retryDelay?: number
  /** ReAct 最大迭代轮数 */
  maxIterations?: number

  // ---- HITL 审批 ----
  /** 快捷字段（等价 approval.mode） */
  approvalMode?: 'auto' | 'gate' | 'always'
  approval?: ApprovalConfig

  // ---- 消息体验 ----
  showTimestamps?: boolean
  showAvatars?: boolean
  messageActions?: MessageActionsConfig | false
  markdown?: MarkdownConfig
  welcomeScreen?: WelcomeScreenConfig
  streaming?: StreamingConfig
  toolDisplay?: ToolDisplayConfig

  // ---- 输入体验 ----
  sendOnEnter?: boolean
  inputMaxLength?: number
  inputRows?: number
  attachments?: AttachmentsConfig
  /** 输入草稿持久化（切换页面不丢失） */
  draftPersistence?: boolean
  autoScroll?: boolean

  // ---- 输入增强：命令 / 提及 / 引用 / 队列 ----
  /** 斜杠命令列表（输入 / 弹出命令面板） */
  commands?: SlashCommand[]
  /** @ 提及数据源（人员/Agent/实体） */
  mentionProvider?: MentionProvider
  /** # 引用数据源（文档/数据集/本体实体） */
  referenceProvider?: MentionProvider
  /** 消息队列：运行中允许排队发送 */
  queue?: QueueConfig

  // ---- Agentic Coding ----
  agentic?: {
    /** 初始模式，默认 confirm_edits */
    mode?: AgentMode
    /** 可用模式（不传则四种全开） */
    availableModes?: AgentMode[]
    /** 模式切换回调 */
    onModeChange?: (mode: AgentMode) => void
    /** 是否显示思考块，默认 true */
    showThinking?: boolean
    /** 思考开关（用户可开启/关闭思考），默认 false 不显示开关 */
    thinkingToggle?: boolean
    /** 表单提交后自动回传给 Agent 审查（AI 检查表单内容），默认 true */
    formReview?: boolean
  }
  /** 变更审查回调（接受/拒绝单个或全部） */
  onFileChangeReview?: (changeId: string | 'all', decision: 'accepted' | 'rejected') => void
  /** 计划批准/驳回回调 */
  onPlanDecision?: (planId: string, decision: 'approved' | 'rejected', steps?: PlanStep[]) => void
  /** 表单提交回调（AgentFormCard） */
  onFormSubmit?: (formId: string, values: Record<string, unknown>) => void
  /** 语音输入回调：返回识别文本填入输入框（不传则不显示语音按钮） */
  onVoiceInput?: () => Promise<string>

  // ---- 会话管理 ----
  persistence?: PersistenceConfig
  /** 每分钟最大发送条数，0 = 不限 */
  rateLimit?: number

  // ---- 外观 ----
  theme?: 'light' | 'dark' | 'auto'
  brandColor?: string
  /** 内置预设主题（default / ocean / violet / amber / rose / mono），brandColor 与 themeTokens 可继续覆盖 */
  themePreset?: import('../theme/theme-tokens').ThemePresetId
  /** 细粒度设计 token 覆盖（亮暗可分别配置），映射为 --ac-* CSS 变量 */
  themeTokens?: import('../theme/theme-tokens').ThemeTokensConfig
  radius?: 'none' | 'sm' | 'md' | 'lg'
  density?: 'compact' | 'comfortable'
  /** 界面语言：'zh'/'zh-CN' 中文（默认）、'en'/'en-US' 英文；registerLocale 可扩展其他语言 */
  locale?: 'zh' | 'en' | 'zh-CN' | 'en-US' | (string & {})
  botName?: string
  botAvatar?: string
  userAvatar?: string
  /** UI 文案全量覆盖 */
  labels?: LabelsConfig

  // ---- 可观测性 ----
  showTokenUsage?: boolean
  debug?: boolean

  // ---- 建议问题 ----
  suggestions?: SuggestionsConfig | false

  // ---- 生命周期回调 ----
  callbacks?: CopilotCallbacks
  /**
   * 中间件管道：message（发送前改写 RunInput）/ event（接收时过滤改写事件）。
   * 内置助手：redactPatterns / dropEventTypes / mapTextDelta（见 middleware.ts）
   */
  middleware?: import('../middleware').MiddlewareConfig
  /** 网络韧性：SSE 断线自动重连（指数退避） */
  network?: NetworkConfig
}

/** SSE 重连配置 */
export interface ReconnectConfig {
  /** 是否启用自动重连，默认 false */
  enabled?: boolean
  /** 最大重试次数，默认 3 */
  retries?: number
  /** 首次重试延迟毫秒（指数退避基数），默认 1000 */
  baseDelayMs?: number
}

export interface NetworkConfig {
  reconnect?: ReconnectConfig
}

/** 四类 Agent 预设的默认配置片段 */
export const AGENT_TYPE_PRESETS: Record<AgentType, Partial<CopilotConfig>> = {
  chat: {
    toolDisplay: { mode: 'collapsed', showArgs: false, showResult: false },
    messageActions: { copy: true, regenerate: true, feedback: true },
  },
  code: {
    toolDisplay: { mode: 'inline', showArgs: true, showResult: true },
    markdown: { codeHighlight: true, tables: true },
    temperature: 0.1,
  },
  design: {
    toolDisplay: { mode: 'collapsed', showArgs: false, showResult: false },
    temperature: 0.7,
  },
  data: {
    toolDisplay: { mode: 'inline', showArgs: true, showResult: false },
    markdown: { tables: true },
    temperature: 0.1,
  },
  custom: {},
}

export const DEFAULT_LABELS: Required<LabelsConfig> = {
  inputPlaceholder: '输入消息…',
  send: '发送',
  stop: '停止',
  retry: '重试',
  clear: '清空会话',
  copy: '复制',
  copied: '已复制',
  regenerate: '重新生成',
  thinking: '思考中…',
  approve: '批准执行',
  reject: '拒绝',
  approvalPending: '待审批',
  interruptLocked: '请先处理上方待确认事项',
  emptyTitle: '有什么可以帮你？',
  emptySubtitle: '输入问题或点击下方建议开始对话',
  errorPrefix: '出错了',
  suggestionsTitle: '试试这样问',
  attachFile: '添加附件',
  feedbackUp: '有帮助',
  feedbackDown: '没帮助',
}

export const DEFAULT_CONFIG = {
  runtime: 'browser',
  apiBase: 'https://api.siliconflow.cn/v1',
  model: 'Qwen/Qwen2.5-72B-Instruct',
  requestTimeout: 90_000,
  agentType: 'custom',
  temperature: 0.3,
  maxTokens: 2048,
  maxRetries: 2,
  retryDelay: 1200,
  maxIterations: 8,
  approvalMode: 'gate',
  showTimestamps: false,
  showAvatars: true,
  messageActions: { copy: true, regenerate: true, edit: false, feedback: true },
  markdown: { codeHighlight: true, linkTarget: '_blank', tables: true },
  streaming: { enabled: true, typewriterSpeed: 0 },
  toolDisplay: { mode: 'inline', showArgs: true, showResult: true },
  sendOnEnter: true,
  inputMaxLength: 4000,
  inputRows: 1,
  attachments: { enabled: false, accept: ['image/', 'text/'], maxSize: 2 * 1024 * 1024, maxCount: 3 },
  draftPersistence: false,
  autoScroll: true,
  persistence: { mode: 'none', keyPrefix: 'agent-copilot', historyLimit: 100 },
  rateLimit: 0,
  // theme 不设默认值：未显式配置时 CopilotProvider 跟随全局 data-ac-theme / 系统偏好
  radius: 'md',
  density: 'comfortable',
  locale: 'zh',
  botName: 'AI 助手',
  showTokenUsage: true,
  debug: false,
} satisfies CopilotConfig

// ============ 工具函数 ============

let idCounter = 0
export function genId(prefix = 'id'): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export const STAGE_LABELS: Record<PipelineStageId, string> = {
  input_understanding: '输入理解 (US-008)',
  ontology_reasoning: '本体推理 (US-009)',
  readiness_gate: '就绪门 (US-010)',
  react_execution: 'ReAct 执行 (US-011)',
  output_management: '输出管理 (US-013)',
}

export function createEmptyAgentState(): AgentStateSnapshot {
  return {
    stages: (Object.keys(STAGE_LABELS) as PipelineStageId[]).map((id) => ({
      id,
      label: STAGE_LABELS[id],
      status: 'pending',
    })),
    reactSteps: [],
    governance: [],
    shared: {},
  }
}
