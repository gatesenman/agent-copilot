/**
 * SSE 断线自动重连 — 指数退避策略。
 *
 * 安全边界：只在"任何内容事件产出之前"重试（建立连接阶段）。
 * 流中途断开不自动重放 —— 已消费的增量无法安全去重，交由上层 retry 语义处理。
 */
import type { ReconnectConfig } from '../types'

export interface ResolvedReconnect {
  enabled: boolean
  retries: number
  baseDelayMs: number
}

export function resolveReconnect(config?: ReconnectConfig): ResolvedReconnect {
  return {
    enabled: config?.enabled ?? false,
    retries: Math.max(0, config?.retries ?? 3),
    baseDelayMs: Math.max(100, config?.baseDelayMs ?? 1000),
  }
}

/** 第 attempt 次重试（1-based）的退避延迟：base * 2^(attempt-1)，上限 30s */
export function backoffDelay(attempt: number, baseDelayMs: number): number {
  return Math.min(baseDelayMs * 2 ** (attempt - 1), 30_000)
}

/** HTTP 状态码是否可重试（服务端瞬时故障/限流） */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504 || status === 500
}

/** 网络层错误是否可重试（fetch TypeError = DNS/连接失败；Abort 不重试） */
export function isRetryableError(err: unknown): boolean {
  if ((err as { name?: string })?.name === 'AbortError') return false
  return err instanceof TypeError
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
