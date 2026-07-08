/**
 * 中间件管道 — 请求改写与事件过滤的标准扩展点。
 *
 * 两类中间件（均可异步）：
 * - MessageMiddleware: 发送前改写 RunInput（注入上下文、PII 脱敏、重写 system prompt）
 * - EventMiddleware:   接收时改写/过滤 AgentEvent（返回 null 丢弃该事件）
 *
 * 接入位置（useCopilot）：
 *   RunInput → [message 中间件链] → runtime.run() → [event 中间件链] → handleEvent()
 */
import type { AgentEvent, RunInput } from './types'

/** 发送前改写 RunInput；返回新对象或原对象 */
export type MessageMiddleware = (input: RunInput) => RunInput | Promise<RunInput>

/** 接收时改写事件；返回 null 表示丢弃该事件 */
export type EventMiddleware = (event: AgentEvent) => AgentEvent | null | Promise<AgentEvent | null>

export interface MiddlewareConfig {
  /** 发送前顺序执行 */
  message?: MessageMiddleware[]
  /** 每个事件顺序执行；任一返回 null 即丢弃 */
  event?: EventMiddleware[]
}

/** 顺序应用 message 中间件链 */
export async function applyMessageMiddleware(
  input: RunInput,
  chain: MessageMiddleware[] | undefined,
): Promise<RunInput> {
  if (!chain?.length) return input
  let current = input
  for (const mw of chain) current = await mw(current)
  return current
}

/**
 * 包装事件流：逐事件通过 event 中间件链。
 * 生命周期事件（RUN_STARTED/RUN_FINISHED/RUN_ERROR/INTERRUPT）不可丢弃 ——
 * 中间件返回 null 时保留原事件，避免破坏运行状态机。
 */
const UNDROPPABLE = new Set(['RUN_STARTED', 'RUN_FINISHED', 'RUN_ERROR', 'INTERRUPT'])

export async function* applyEventMiddleware(
  stream: AsyncIterable<AgentEvent>,
  chain: EventMiddleware[] | undefined,
): AsyncIterable<AgentEvent> {
  if (!chain?.length) {
    yield* stream
    return
  }
  for await (const event of stream) {
    let current: AgentEvent | null = event
    for (const mw of chain) {
      const next: AgentEvent | null = await mw(current)
      if (next === null) {
        current = UNDROPPABLE.has(event.type) ? event : null
        break
      }
      current = next
    }
    if (current !== null) yield current
  }
}

// ============ 内置中间件 ============

/**
 * PII 脱敏：对用户消息内容按正则批量替换。
 * 用法：middleware: { message: [redactPatterns([/\d{11}/g, /\d{17}[\dX]/g])] }
 */
export function redactPatterns(patterns: RegExp[], replacement = '***'): MessageMiddleware {
  return (input) => ({
    ...input,
    messages: input.messages.map((m) =>
      m.role === 'user'
        ? { ...m, content: patterns.reduce((text, re) => text.replace(re, replacement), m.content) }
        : m,
    ),
  })
}

/**
 * 事件类型过滤：丢弃指定类型的事件（生命周期事件除外）。
 * 用法：middleware: { event: [dropEventTypes(['REACT_STEP'])] }
 */
export function dropEventTypes(types: string[]): EventMiddleware {
  const set = new Set(types)
  return (event) => (set.has(event.type) ? null : event)
}

/**
 * 文本增量改写：对 TEXT_DELTA 的 delta 做映射（如敏感词替换）。
 * 用法：middleware: { event: [mapTextDelta((t) => t.replaceAll('内部代号', '****'))] }
 */
export function mapTextDelta(fn: (text: string) => string): EventMiddleware {
  return (event) => {
    if (event.type !== 'TEXT_DELTA') return event
    const data = event.data as { delta?: string }
    if (typeof data?.delta !== 'string') return event
    return { ...event, data: { ...data, delta: fn(data.delta) } }
  }
}
