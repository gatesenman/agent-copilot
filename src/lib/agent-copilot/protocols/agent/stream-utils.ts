/**
 * 流解析共享工具 — SSE / NDJSON 帧切分 + AgentEvent 构造辅助
 */
import type { AgentEvent } from '../../types'

/** SSE 帧：event 类型 + data 字符串 */
export interface SseFrame {
  event?: string
  data: string
}

/** 把字节流解析为 SSE 帧序列（以空行分隔事件，支持多行 data） */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncIterable<SseFrame> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split(/\n\n|\r\n\r\n/)
      buffer = blocks.pop() ?? ''
      for (const block of blocks) {
        let event: string | undefined
        const dataLines: string[] = []
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
        }
        if (dataLines.length > 0) yield { event, data: dataLines.join('\n') }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/** 把字节流解析为 NDJSON 行（每行一个 JSON 字符串，调用方自行 parse） */
export async function* parseNdjson(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) yield trimmed
      }
    }
    if (buffer.trim()) yield buffer.trim()
  } finally {
    reader.releaseLock()
  }
}

export function safeJson<T = any>(s: string): T | null {
  try { return JSON.parse(s) } catch { return null }
}

/** AgentEvent 构造快捷方式 */
export function ev(type: AgentEvent['type'], runId: string, data: unknown): AgentEvent {
  return { type, runId, timestamp: Date.now(), data } as AgentEvent
}

/**
 * 文本消息事件辅助器：自动维护 TEXT_MESSAGE_START / TEXT_DELTA / TEXT_MESSAGE_END 生命周期。
 * B 类协议大多只有「文本增量」概念，用它保证事件序列合法。
 */
export class TextMessageEmitter {
  private messageId: string | null = null
  private counter = 0

  constructor(private runId: string) {}

  /** 产出文本增量（首次自动带 START 事件） */
  delta(text: string): AgentEvent[] {
    const events: AgentEvent[] = []
    if (!this.messageId) {
      this.messageId = `msg_${Date.now()}_${this.counter++}`
      events.push(ev('TEXT_MESSAGE_START', this.runId, { messageId: this.messageId }))
    }
    events.push(ev('TEXT_DELTA', this.runId, { messageId: this.messageId, delta: text }))
    return events
  }

  /** 结束当前消息（未开始则无事件） */
  end(): AgentEvent[] {
    if (!this.messageId) return []
    const events = [ev('TEXT_MESSAGE_END', this.runId, { messageId: this.messageId })]
    this.messageId = null
    return events
  }

  get active(): boolean {
    return this.messageId !== null
  }
}

/**
 * 工具调用聚合器：远端协议的参数常以增量到达，
 * 本类累积参数字符串，flush 时产出一次性 TOOL_CALL_ARGS（完整 args 对象）。
 * 事件契约：TOOL_CALL_START { toolCallId, name } → TOOL_CALL_ARGS { toolCallId, args } →
 * TOOL_CALL_RESULT { toolCallId, name, result, status }
 */
export class ToolCallAggregator {
  private calls = new Map<string, { name: string; argsBuffer: string; argsEmitted: boolean }>()

  constructor(private runId: string) {}

  start(toolCallId: string, name: string): AgentEvent {
    this.calls.set(toolCallId, { name, argsBuffer: '', argsEmitted: false })
    return ev('TOOL_CALL_START', this.runId, { toolCallId, name, origin: 'backend' })
  }

  appendArgs(toolCallId: string, delta: string): void {
    const call = this.calls.get(toolCallId)
    if (call) call.argsBuffer += delta
  }

  /** 参数累积完成，产出 TOOL_CALL_ARGS（幂等：重复调用不重复发） */
  flushArgs(toolCallId: string): AgentEvent[] {
    const call = this.calls.get(toolCallId)
    if (!call || call.argsEmitted) return []
    call.argsEmitted = true
    return [ev('TOOL_CALL_ARGS', this.runId, {
      toolCallId,
      args: safeJson(call.argsBuffer || '{}') ?? {},
    })]
  }

  /** 工具结果（自动先 flush 参数） */
  result(toolCallId: string, result: unknown, status: 'succeeded' | 'failed' = 'succeeded'): AgentEvent[] {
    const call = this.calls.get(toolCallId)
    const events = this.flushArgs(toolCallId)
    events.push(ev('TOOL_CALL_RESULT', this.runId, {
      toolCallId,
      name: call?.name ?? '',
      result,
      status,
    }))
    return events
  }

  name(toolCallId: string): string {
    return this.calls.get(toolCallId)?.name ?? ''
  }
}
