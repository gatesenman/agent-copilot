/**
 * 配置分层合并与校验 — 标准集成传参方案的核心。
 *
 * 分层模型（优先级从低到高）：
 *   1. DEFAULT_CONFIG        组件库内置默认
 *   2. agentType 预设         chat/code/design/data 场景预设
 *   3. 插件全局默认           app.use(createCopilot({...}))
 *   4. config prop           实例级覆盖（深合并）
 *   5. store.updateConfig()  运行时程序化微调
 */
import type { CopilotConfig } from '../types'

/** 判断是否为可递归合并的普通对象（数组/函数/类实例/null 均整体替换） */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}

/**
 * 深合并两层配置对象：
 * - 普通对象按键递归合并（approval/markdown/streaming/attachments 等嵌套段不再被整体覆盖）
 * - 数组、函数、类实例（runtimeInstance）、`false`（显式关闭段如 messageActions: false）整体替换
 * - `undefined` 视为"未提供"，不覆盖低层值
 */
function deepMergeTwo<T extends Record<string, unknown>>(base: T, override: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...base }
  for (const key of Object.keys(override)) {
    const next = override[key]
    if (next === undefined) continue
    const prev = out[key]
    out[key] = isPlainObject(prev) && isPlainObject(next) ? deepMergeTwo(prev, next) : next
  }
  return out as T
}

/**
 * 按优先级从低到高合并任意层配置。
 * 用法：mergeCopilotConfig(DEFAULT_CONFIG, preset, globalDefaults, props.config)
 */
export function mergeCopilotConfig(...layers: (Partial<CopilotConfig> | undefined | null)[]): CopilotConfig {
  let result: Record<string, unknown> = {}
  for (const layer of layers) {
    if (!layer) continue
    result = deepMergeTwo(result, layer as Record<string, unknown>)
  }
  return result as CopilotConfig
}

/** 已知 runtime 值 */
const KNOWN_RUNTIMES = new Set(['browser', 'http'])

/** B 类（Agent 后端）协议：必须提供 endpoint */
const AGENT_PROTOCOLS = new Set([
  'ag-ui', 'langgraph', 'langserve', 'agentscope', 'ai-sdk',
  'dify', 'coze', 'fastgpt', 'a2a', 'acp', 'openai-assistants',
])

/**
 * dev-only 配置校验：返回告警文案数组（不阻断运行）。
 * 生产构建下调用方跳过（见 validateAndWarn）。
 */
export function validateCopilotConfig(config: CopilotConfig): string[] {
  const warnings: string[] = []

  if (config.runtime && !KNOWN_RUNTIMES.has(config.runtime)) {
    warnings.push(`未知 runtime "${config.runtime}"，应为 'browser' 或 'http'`)
  }
  if (config.runtime === 'http' && !config.endpoint && !config.apiBase) {
    warnings.push(`runtime: 'http' 需要提供 endpoint（Java 后端地址）`)
  }
  if (config.protocol && AGENT_PROTOCOLS.has(config.protocol) && !config.endpoint && !config.apiBase) {
    warnings.push(`协议 "${config.protocol}" 需要提供 endpoint（Agent 后端地址）`)
  }
  if (config.runtime === 'browser' && config.apiKey && typeof window !== 'undefined') {
    warnings.push(
      `browser 模式下 apiKey 暴露于前端，仅适合本地演示/内网工具；生产请改用 runtime: 'http' 由后端持有密钥`,
    )
  }
  if (config.approvalMode && config.approval?.mode && config.approvalMode !== config.approval.mode) {
    warnings.push(
      `approvalMode ("${config.approvalMode}") 与 approval.mode ("${config.approval.mode}") 冲突，将以 approval.mode 为准`,
    )
  }
  if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
    warnings.push(`temperature 应在 0-2 之间，当前为 ${config.temperature}`)
  }
  if (config.runtimeInstance && (config.provider || config.protocol)) {
    warnings.push(`runtimeInstance 已注入，provider/protocol 将被忽略`)
  }
  return warnings
}

/** dev 环境下校验并输出 console.warn；生产为 no-op */
export function validateAndWarn(config: CopilotConfig): void {
  if (!import.meta.env?.DEV) return
  for (const w of validateCopilotConfig(config)) {
    console.warn(`[agent-copilot] 配置告警: ${w}`)
  }
}

/**
 * 响应式生效键：变更后即时生效，无需重建 runtime。
 * 其余键（runtime/provider/protocol/endpoint/apiBase/apiKey/runtimeInstance/persistence）
 * 为结构键 —— 变更触发 runtime 重建，对新会话生效。
 */
export const REACTIVE_CONFIG_KEYS = new Set<keyof CopilotConfig>([
  'model', 'temperature', 'maxTokens', 'systemPrompt', 'maxIterations',
  'theme', 'brandColor', 'themePreset', 'themeTokens', 'radius', 'density',
  'locale', 'labels', 'botName', 'botAvatar', 'userAvatar',
  'showTimestamps', 'showAvatars', 'showTokenUsage', 'debug',
  'sendOnEnter', 'inputMaxLength', 'inputRows', 'autoScroll', 'draftPersistence',
  'suggestions', 'rateLimit', 'markdown', 'streaming', 'toolDisplay',
  'messageActions', 'welcomeScreen', 'attachments', 'queue',
])

/** 结构键：变更需要重建 runtime（对新会话生效） */
export const STRUCTURAL_CONFIG_KEYS = new Set<keyof CopilotConfig>([
  'runtime', 'runtimeInstance', 'provider', 'protocol', 'protocolOptions',
  'endpoint', 'apiBase', 'apiKey', 'headers', 'requestTimeout', 'persistence', 'agentType',
])

/** 拆分 patch：{ reactive: 即时生效部分, structural: 需重建 runtime 部分 } */
export function splitConfigPatch(patch: Partial<CopilotConfig>): {
  reactive: Partial<CopilotConfig>
  structural: Partial<CopilotConfig>
} {
  const reactive: Record<string, unknown> = {}
  const structural: Record<string, unknown> = {}
  for (const key of Object.keys(patch) as (keyof CopilotConfig)[]) {
    if (patch[key] === undefined) continue
    if (STRUCTURAL_CONFIG_KEYS.has(key)) structural[key as string] = patch[key]
    else reactive[key as string] = patch[key]
  }
  return { reactive, structural }
}
