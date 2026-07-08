/**
 * ProtocolAgentRuntime — B 类 Agent 框架协议通用运行时
 *
 * 服务端自带完整 Agent 循环（LangGraph / Dify / Coze 等），本运行时负责：
 * - 通过注入的 AgentStreamAdapter 构造请求、解析事件流
 * - 统一错误处理、取消（AbortSignal + 远端 cancel 端点）
 * - 保证事件流以 RUN_STARTED 开始、RUN_FINISHED/RUN_ERROR 结束
 *   （适配器可以只产出内容事件，边界事件由本运行时兜底）
 */
import type { AgentEvent, AgentRuntime, InterruptResponse, ReconnectConfig, RunInput } from '../types'
import type { AgentAdapterOptions, AgentStreamAdapter } from '../protocols/types'
import { backoffDelay, isRetryableError, isRetryableStatus, resolveReconnect, sleep } from './reconnect'

export class ProtocolAgentRuntime implements AgentRuntime {
  readonly kind = 'http' as const
  private aborts = new Map<string, AbortController>()

  constructor(
    private adapter: AgentStreamAdapter,
    private options: AgentAdapterOptions & { reconnect?: ReconnectConfig },
  ) {}

  async *run(input: RunInput): AsyncIterable<AgentEvent> {
    const spec = this.adapter.buildRunRequest(input, this.options)
    yield* this.execute(spec.url, spec, input.runId, input.sessionId, input.signal)
  }

  async *resume(
    sessionId: string,
    runId: string,
    response: InterruptResponse,
    signal?: AbortSignal,
  ): AsyncIterable<AgentEvent> {
    if (!this.adapter.buildResumeRequest) {
      yield this.boundary('RUN_ERROR', runId, { message: `协议 ${this.adapter.id} 不支持 HITL 恢复` })
      return
    }
    const spec = this.adapter.buildResumeRequest(sessionId, runId, response, this.options)
    yield* this.execute(spec.url, spec, runId, sessionId, signal)
  }

  async cancel(sessionId: string, runId: string): Promise<void> {
    this.aborts.get(runId)?.abort()
    this.aborts.delete(runId)
    const spec = this.adapter.buildCancelRequest?.(sessionId, runId, this.options)
    if (spec) {
      await fetch(spec.url, {
        method: spec.method ?? 'POST',
        headers: spec.headers,
        body: spec.body != null ? JSON.stringify(spec.body) : undefined,
      }).catch(() => {})
    }
  }

  private async *execute(
    url: string,
    spec: { method?: string; headers: Record<string, string>; body?: unknown },
    runId: string,
    sessionId: string,
    signal?: AbortSignal,
  ): AsyncIterable<AgentEvent> {
    const controller = new AbortController()
    this.aborts.set(runId, controller)
    const onOuterAbort = () => controller.abort()
    signal?.addEventListener('abort', onOuterAbort)

    let sawStart = false
    let sawEnd = false
    const reconnect = resolveReconnect(this.options.reconnect)

    try {
      // ============ 连接建立（含指数退避自动重连） ============
      // 安全边界：仅在内容事件产出前重试。可重试条件：网络错误 / 5xx / 429。
      let res: Response | undefined
      for (let attempt = 0; ; attempt++) {
        let failReason: string | undefined
        try {
          res = await fetch(url, {
            method: spec.method ?? 'POST',
            headers: spec.headers,
            body: spec.body != null ? JSON.stringify(spec.body) : undefined,
            signal: controller.signal,
          })
          if (res.ok) break
          const text = await res.text().catch(() => '')
          failReason = `${this.adapter.id} 请求失败 (${res.status}): ${text.slice(0, 300)}`
          if (!reconnect.enabled || attempt >= reconnect.retries || !isRetryableStatus(res.status)) {
            yield this.boundary('RUN_STARTED', runId, { sessionId })
            yield this.boundary('RUN_ERROR', runId, { message: failReason })
            return
          }
        } catch (err) {
          if (!reconnect.enabled || attempt >= reconnect.retries || !isRetryableError(err)) throw err
          failReason = (err as Error)?.message ?? String(err)
        }
        // 进入重试：广播 CONNECTION_RETRY 事件（UI 可提示"重连中"）
        const delayMs = backoffDelay(attempt + 1, reconnect.baseDelayMs)
        yield this.boundary('CONNECTION_RETRY', runId, {
          attempt: attempt + 1, maxRetries: reconnect.retries, delayMs, reason: failReason,
        })
        await sleep(delayMs, controller.signal)
      }

      if (!res?.body) {
        yield this.boundary('RUN_STARTED', runId, { sessionId })
        yield this.boundary('RUN_ERROR', runId, { message: '响应无内容流' })
        return
      }

      for await (const event of this.adapter.parseStream(res.body, runId, this.options)) {
        if (event.type === 'RUN_STARTED') {
          if (sawStart) continue // 去重
          sawStart = true
        } else if (!sawStart) {
          // 适配器未产出 RUN_STARTED，兜底补齐
          sawStart = true
          yield this.boundary('RUN_STARTED', runId, { sessionId })
        }
        if (event.type === 'RUN_FINISHED' || event.type === 'RUN_ERROR') {
          sawEnd = true
        }
        yield event
      }

      if (!sawStart) yield this.boundary('RUN_STARTED', runId, { sessionId })
      if (!sawEnd) yield this.boundary('RUN_FINISHED', runId, {})
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        if (!sawStart) yield this.boundary('RUN_STARTED', runId, { sessionId })
        yield this.boundary('RUN_FINISHED', runId, { cancelled: true })
        return
      }
      if (!sawStart) yield this.boundary('RUN_STARTED', runId, { sessionId })
      yield this.boundary('RUN_ERROR', runId, { message: err?.message ?? String(err) })
    } finally {
      signal?.removeEventListener('abort', onOuterAbort)
      this.aborts.delete(runId)
    }
  }

  private boundary(type: AgentEvent['type'], runId: string, data: unknown): AgentEvent {
    return { type, runId, timestamp: Date.now(), data } as AgentEvent
  }
}
