/**
 * AG-UI 组件元信息标准化清单（机器可读）
 *
 * 目标：让 AI 编码助手能真正“并列、可解析”地使用全部组件。
 * 人读速查（component-api.ts）里存在合并写法（'CopilotSidebar / CopilotPopup'、
 * 'title / subtitle'），对 AI 不友好。本模块做三件事：
 *   1. 规范化：拆分合并的组件名与 props 名，每个组件一条独立记录
 *   2. 增广：为每个组件补充机器字段 —— 精确导入路径 / 分类 / 角色 /
 *      消费的 AG-UI 事件 / 渲染的载荷类型 / 组合建议 / 弃用标记
 *   3. 自校验：validateAguiManifest() 检出缺失增广、未知组件名，防止腐化
 *
 * 产物 buildAguiManifest() 可序列化为 agui-manifest.json（AI 文档页可下载）。
 */
import { COMPONENT_API_GROUPS } from '../gallery/component-api'
import type { AgentEventType, StructuredPayloadType } from '../../lib/agent-copilot/types'

// ---------------------------------------------------------------------------
// 标准化元信息 Schema
// ---------------------------------------------------------------------------

export type AguiCategory =
  | 'provider' | 'chat' | 'input' | 'textarea' | 'generative-ui'
  | 'agentic' | 'general' | 'protocol' | 'workspace'

/** 组件在 Agentic UI 中的角色，供 AI 选型 */
export type AguiRole =
  | 'container'   // 布局/供给容器
  | 'display'     // 纯展示（事件流/载荷渲染）
  | 'input'       // 用户输入
  | 'control'     // 控制/切换
  | 'interaction' // 双向交互（审批/表单/澄清）

export interface AguiPropMeta {
  name: string
  type: string
  required: boolean
  default?: string
  description: string
}

export interface AguiEmitMeta { name: string; payload: string; description: string }
export interface AguiSlotMeta { name: string; description: string }

export interface AguiComponentMeta {
  /** 精确组件名 = .vue 文件名 = 库导出名 */
  name: string
  /** 库内源码路径（相对 src/lib/agent-copilot/） */
  path: string
  category: AguiCategory
  role: AguiRole
  description: string
  /** 使用时机 */
  when: string
  /** 消费（自动渲染）的 AG-UI 协议事件 */
  consumesEvents?: AgentEventType[]
  /** 经 PayloadCard 分发时对应的 STRUCTURED_PAYLOAD type */
  payloadTypes?: StructuredPayloadType[]
  props: AguiPropMeta[]
  emits?: AguiEmitMeta[]
  slots?: AguiSlotMeta[]
  /** 常见组合搭档（精确组件名） */
  composesWith?: string[]
  /** 弃用说明（存在即弃用） */
  deprecated?: string
}

export interface AguiManifest {
  name: string
  version: string
  description: string
  /** 全部 AG-UI 协议事件类型 */
  protocolEvents: AgentEventType[]
  /** 全部结构化载荷类型 */
  payloadTypes: StructuredPayloadType[]
  components: AguiComponentMeta[]
}

// ---------------------------------------------------------------------------
// 增广表：组件名 -> 机器字段（路径与 find components -name "*.vue" 保持一致）
// ---------------------------------------------------------------------------

type Augment = Pick<AguiComponentMeta,
  'path' | 'category' | 'role' | 'consumesEvents' | 'payloadTypes' | 'composesWith' | 'deprecated'>

const TOOL_EVENTS: AgentEventType[] = ['TOOL_CALL_START', 'TOOL_CALL_ARGS', 'TOOL_CALL_RESULT']
const TEXT_EVENTS: AgentEventType[] = ['TEXT_MESSAGE_START', 'TEXT_DELTA', 'TEXT_MESSAGE_END']
const THINKING_EVENTS: AgentEventType[] = ['THINKING_START', 'THINKING_DELTA', 'THINKING_END']

const AUGMENTS: Record<string, Augment> = {
  // ---- provider / chat ----
  CopilotProvider: { path: 'components/CopilotProvider.vue', category: 'provider', role: 'container', composesWith: ['CopilotChat', 'AgentWorkspace'] },
  CopilotChat: {
    path: 'components/chat/CopilotChat.vue', category: 'chat', role: 'container',
    consumesEvents: [...TEXT_EVENTS, ...TOOL_EVENTS, ...THINKING_EVENTS, 'STRUCTURED_PAYLOAD', 'INTERRUPT', 'RUN_STARTED', 'RUN_FINISHED', 'RUN_ERROR'],
    composesWith: ['CopilotProvider', 'ChatSuggestions'],
  },
  CopilotSidebar: { path: 'components/chat/CopilotSidebar.vue', category: 'chat', role: 'container', composesWith: ['CopilotProvider'] },
  CopilotPopup: { path: 'components/chat/CopilotPopup.vue', category: 'chat', role: 'container', composesWith: ['CopilotProvider'] },
  MessageBubble: {
    path: 'components/chat/MessageBubble.vue', category: 'chat', role: 'display',
    consumesEvents: [...TEXT_EVENTS, ...TOOL_EVENTS, 'STRUCTURED_PAYLOAD'],
    composesWith: ['MarkdownText', 'ToolActionCard', 'PayloadCard'],
  },
  MarkdownText: { path: 'components/chat/MarkdownText.vue', category: 'chat', role: 'display' },
  ChatInput: { path: 'components/chat/ChatInput.vue', category: 'chat', role: 'input', composesWith: ['ModeSelector', 'ContextChips', 'CommandPalette'] },
  ChatSuggestions: { path: 'components/chat/ChatSuggestions.vue', category: 'chat', role: 'control' },
  // ---- input / textarea ----
  CommandPalette: { path: 'components/input/CommandPalette.vue', category: 'input', role: 'input' },
  ContextChips: { path: 'components/input/ContextChips.vue', category: 'input', role: 'input' },
  CopilotTextarea: { path: 'components/textarea/CopilotTextarea.vue', category: 'textarea', role: 'input' },
  // ---- generative-ui（载荷卡经 PayloadCard 分发） ----
  PayloadCard: {
    path: 'components/generative-ui/PayloadCard.vue', category: 'generative-ui', role: 'display',
    consumesEvents: ['STRUCTURED_PAYLOAD'],
    payloadTypes: ['table', 'comparison', 'sql_result', 'chart', 'metrics', 'code', 'diff', 'file_tree', 'terminal', 'image', 'citations', 'plan', 'timeline_events', 'form'],
  },
  DataTableCard: { path: 'components/generative-ui/DataTableCard.vue', category: 'generative-ui', role: 'display', payloadTypes: ['table', 'comparison'] },
  SqlResultCard: { path: 'components/generative-ui/SqlResultCard.vue', category: 'generative-ui', role: 'display', payloadTypes: ['sql_result'] },
  ChartCard: { path: 'components/generative-ui/ChartCard.vue', category: 'generative-ui', role: 'display', payloadTypes: ['chart'] },
  MetricsCard: { path: 'components/generative-ui/MetricsCard.vue', category: 'generative-ui', role: 'display', payloadTypes: ['metrics'] },
  CodeBlockCard: { path: 'components/generative-ui/CodeBlockCard.vue', category: 'generative-ui', role: 'display', payloadTypes: ['code'] },
  DiffCard: { path: 'components/generative-ui/DiffCard.vue', category: 'generative-ui', role: 'display', payloadTypes: ['diff'] },
  FileTreeCard: { path: 'components/generative-ui/FileTreeCard.vue', category: 'generative-ui', role: 'display', payloadTypes: ['file_tree'] },
  TerminalCard: { path: 'components/generative-ui/TerminalCard.vue', category: 'generative-ui', role: 'display', payloadTypes: ['terminal'] },
  ImageCard: { path: 'components/generative-ui/ImageCard.vue', category: 'generative-ui', role: 'display', payloadTypes: ['image'] },
  CitationsCard: { path: 'components/generative-ui/CitationsCard.vue', category: 'generative-ui', role: 'display', payloadTypes: ['citations'] },
  PlanCard: { path: 'components/generative-ui/PlanCard.vue', category: 'generative-ui', role: 'display', payloadTypes: ['plan'] },
  TimelineCard: { path: 'components/generative-ui/TimelineCard.vue', category: 'generative-ui', role: 'display', payloadTypes: ['timeline_events'] },
  FormCard: { path: 'components/generative-ui/FormCard.vue', category: 'generative-ui', role: 'interaction', payloadTypes: ['form'] },
  ApprovalCard: { path: 'components/generative-ui/ApprovalCard.vue', category: 'generative-ui', role: 'interaction', consumesEvents: ['INTERRUPT'] },
  // ---- agentic ----
  ToolActionCard: { path: 'components/agentic/ToolActionCard.vue', category: 'agentic', role: 'display', consumesEvents: TOOL_EVENTS },
  ThinkingBlock: { path: 'components/agentic/ThinkingBlock.vue', category: 'agentic', role: 'display', consumesEvents: THINKING_EVENTS },
  AgentStepList: { path: 'components/agentic/AgentStepList.vue', category: 'agentic', role: 'display', consumesEvents: ['REACT_STEP'] },
  TaskTracker: { path: 'components/agentic/TaskTracker.vue', category: 'agentic', role: 'display', consumesEvents: ['TASK_UPDATE'] },
  // PlanPanel 双形态：传 plan 为结构化步骤，传 content 为 Markdown 长文审查（原 PlanReviewCard 已并入）
  PlanPanel: { path: 'components/agentic/PlanPanel.vue', category: 'agentic', role: 'interaction', consumesEvents: ['PLAN_UPDATE'] },
  ChangeReviewPanel: { path: 'components/agentic/ChangeReviewPanel.vue', category: 'agentic', role: 'interaction', consumesEvents: ['FILE_CHANGE'] },
  AgentFormCard: { path: 'components/agentic/AgentFormCard.vue', category: 'agentic', role: 'interaction', consumesEvents: ['FORM_REQUEST'] },
  ClarifyCard: { path: 'components/agentic/ClarifyCard.vue', category: 'agentic', role: 'interaction', consumesEvents: ['INTERRUPT'] },
  CheckpointCard: { path: 'components/agentic/CheckpointCard.vue', category: 'agentic', role: 'interaction' },
  ModeSelector: { path: 'components/agentic/ModeSelector.vue', category: 'agentic', role: 'control', composesWith: ['ChatInput'] },
  WorkSummary: { path: 'components/agentic/WorkSummary.vue', category: 'agentic', role: 'display' },
  // ---- general ----
  CompareView: { path: 'components/general/CompareView.vue', category: 'general', role: 'display' },
  FeedbackDialog: { path: 'components/general/FeedbackDialog.vue', category: 'general', role: 'interaction' },
  FileDropzone: { path: 'components/general/FileDropzone.vue', category: 'general', role: 'input', composesWith: ['ChatInput'] },
  KnowledgeSelector: { path: 'components/general/KnowledgeSelector.vue', category: 'general', role: 'control' },
  ModelSelector: { path: 'components/general/ModelSelector.vue', category: 'general', role: 'control', composesWith: ['ChatInput', 'ModeSelector'] },
  PromptLibrary: { path: 'components/general/PromptLibrary.vue', category: 'general', role: 'control' },
  SafetyBanner: { path: 'components/general/SafetyBanner.vue', category: 'general', role: 'display' },
  SessionList: { path: 'components/general/SessionList.vue', category: 'general', role: 'control', composesWith: ['PanelContainer'] },
  SettingsDialog: { path: 'components/general/SettingsDialog.vue', category: 'general', role: 'interaction' },
  SourcePanel: { path: 'components/general/SourcePanel.vue', category: 'general', role: 'display', composesWith: ['PanelContainer', 'CitationsCard'] },
  ThemeToggle: { path: 'components/general/ThemeToggle.vue', category: 'general', role: 'control' },
  UsageMeter: { path: 'components/general/UsageMeter.vue', category: 'general', role: 'display', consumesEvents: ['USAGE'] },
  // ---- protocol ----
  AgentCardView: { path: 'components/protocol/AgentCardView.vue', category: 'protocol', role: 'display' },
  McpServerPanel: { path: 'components/protocol/McpServerPanel.vue', category: 'protocol', role: 'display' },
  ProtocolBadge: { path: 'components/protocol/ProtocolBadge.vue', category: 'protocol', role: 'display' },
  TaskStatusBadge: { path: 'components/protocol/TaskStatusBadge.vue', category: 'protocol', role: 'display' },
  // ---- workspace ----
  AgentWorkspace: { path: 'components/workspace/AgentWorkspace.vue', category: 'workspace', role: 'container', composesWith: ['CopilotChat', 'PanelContainer', 'TerminalPanel', 'FilePanel'] },
  PanelContainer: { path: 'components/workspace/PanelContainer.vue', category: 'workspace', role: 'container', composesWith: ['TaskTracker', 'SourcePanel', 'SessionList', 'UsageMeter'] },
  ArtifactPanel: { path: 'components/workspace/ArtifactPanel.vue', category: 'workspace', role: 'display' },
  BrowserPanel: { path: 'components/workspace/BrowserPanel.vue', category: 'workspace', role: 'display' },
  FilePanel: { path: 'components/workspace/FilePanel.vue', category: 'workspace', role: 'display', consumesEvents: ['FILE_CHANGE'] },
  TerminalPanel: { path: 'components/workspace/TerminalPanel.vue', category: 'workspace', role: 'display', consumesEvents: ['TERMINAL_APPEND'] },
}

// ---------------------------------------------------------------------------
// 规范化转换：component-api.ts（人读） -> AguiComponentMeta[]（机器读）
// ---------------------------------------------------------------------------

const IDENT_RE = /^[a-zA-Z][\w-]*$/

/** 'CopilotSidebar / CopilotPopup' -> ['CopilotSidebar','CopilotPopup']；剔除 '（...）' 注解 */
function splitComponentName(raw: string): string[] {
  const base = raw.split('（')[0].trim()
  const parts = base.split('/').map((s) => s.trim()).filter(Boolean)
  if (parts.length > 1 && parts.every((p) => IDENT_RE.test(p))) return parts
  return [base]
}

/** 'title / subtitle' 合并 prop 名拆分为独立条目 */
function splitProps(props: { name: string; type: string; default?: string; desc: string }[]): AguiPropMeta[] {
  const out: AguiPropMeta[] = []
  for (const p of props) {
    const parts = p.name.split('/').map((s) => s.trim()).filter(Boolean)
    const names = parts.length > 1 && parts.every((x) => IDENT_RE.test(x)) ? parts : [p.name.trim()]
    for (const n of names) {
      out.push({
        name: n,
        type: p.type === '—' ? 'unknown' : p.type,
        required: p.default === undefined && !p.type.includes('| undefined') && !p.type.endsWith('?'),
        default: p.default,
        description: p.desc,
      })
    }
  }
  return out
}

/** 构建标准化清单（增广表缺失的条目会被 validate 检出） */
export function buildAguiManifest(): AguiManifest {
  const components: AguiComponentMeta[] = []
  const seen = new Set<string>()

  for (const group of COMPONENT_API_GROUPS) {
    for (const comp of group.components) {
      for (const name of splitComponentName(comp.name)) {
        if (seen.has(name)) continue
        seen.add(name)
        const aug = AUGMENTS[name]
        components.push({
          name,
          path: aug?.path ?? `UNKNOWN(${name})`,
          category: aug?.category ?? 'general',
          role: aug?.role ?? 'display',
          description: comp.brief,
          when: comp.when,
          consumesEvents: aug?.consumesEvents,
          payloadTypes: aug?.payloadTypes,
          props: splitProps(comp.props),
          emits: comp.events?.map((e) => ({ name: e.name, payload: e.payload, description: e.desc })),
          slots: comp.slots?.map((s) => ({ name: s.name, description: s.desc })),
          composesWith: aug?.composesWith,
          deprecated: aug?.deprecated,
        })
      }
    }
  }

  const protocolEvents: AgentEventType[] = [
    'RUN_STARTED', 'STAGE_STARTED', 'STAGE_FINISHED',
    'TEXT_MESSAGE_START', 'TEXT_DELTA', 'TEXT_MESSAGE_END',
    'TOOL_CALL_START', 'TOOL_CALL_ARGS', 'TOOL_CALL_RESULT',
    'REACT_STEP', 'AGENT_STATE_DELTA', 'GOVERNANCE_EVENT', 'GATE_DECISION',
    'STRUCTURED_PAYLOAD', 'INTERRUPT', 'USAGE', 'RUN_FINISHED', 'RUN_ERROR',
    'THINKING_START', 'THINKING_DELTA', 'THINKING_END',
    'FILE_CHANGE', 'TASK_UPDATE', 'PLAN_UPDATE', 'TERMINAL_APPEND', 'FORM_REQUEST',
  ]

  const payloadTypes: StructuredPayloadType[] = [
    'table', 'card', 'comparison', 'chart', 'document', 'plan',
    'code', 'diff', 'file_tree', 'terminal', 'metrics', 'sql_result',
    'image', 'citations',
    'timeline_events', 'form',
  ]

  return {
    name: 'agent-copilot',
    version: '0.7.0',
    description: 'Vue 3 企业级 Agentic UI 组件库 —— AG-UI 事件流驱动，机器可读组件元信息清单',
    protocolEvents,
    payloadTypes,
    components,
  }
}

/** 自校验：返回问题列表（空数组 = 通过） */
export function validateAguiManifest(manifest = buildAguiManifest()): string[] {
  const issues: string[] = []
  const names = new Set(manifest.components.map((c) => c.name))

  for (const c of manifest.components) {
    if (c.path.startsWith('UNKNOWN')) issues.push(`缺少增广条目: ${c.name}`)
    if (!IDENT_RE.test(c.name)) issues.push(`组件名未规范化: ${c.name}`)
    for (const p of c.props) {
      if (p.name.includes('/')) issues.push(`${c.name}.props 存在未拆分的合并名: ${p.name}`)
    }
    for (const w of c.composesWith ?? []) {
      if (!(w in AUGMENTS)) issues.push(`${c.name}.composesWith 引用未知组件: ${w}`)
    }
  }
  // 增广表里存在但清单缺失的组件（api 速查漏登记）
  for (const name of Object.keys(AUGMENTS)) {
    if (!names.has(name)) issues.push(`增广表存在但 API 速查未登记: ${name}`)
  }
  return issues
}
