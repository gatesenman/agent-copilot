/**
 * SSE 断线自动重连 — 退避策略与可重试判定单测
 */
import { describe, expect, it } from 'vitest'
import { backoffDelay, isRetryableError, isRetryableStatus, resolveReconnect } from '../runtime/reconnect'

describe('resolveReconnect', () => {
  it('默认关闭，给出安全默认值', () => {
    const r = resolveReconnect(undefined)
    expect(r.enabled).toBe(false)
    expect(r.retries).toBe(3)
    expect(r.baseDelayMs).toBe(1000)
  })

  it('负数 retries 与过小 baseDelay 被钳制', () => {
    const r = resolveReconnect({ enabled: true, retries: -5, baseDelayMs: 1 })
    expect(r.retries).toBe(0)
    expect(r.baseDelayMs).toBe(100)
  })
})

describe('backoffDelay 指数退避', () => {
  it('base * 2^(attempt-1)', () => {
    expect(backoffDelay(1, 1000)).toBe(1000)
    expect(backoffDelay(2, 1000)).toBe(2000)
    expect(backoffDelay(3, 1000)).toBe(4000)
    expect(backoffDelay(4, 1000)).toBe(8000)
  })

  it('上限 30s', () => {
    expect(backoffDelay(10, 1000)).toBe(30_000)
  })
})

describe('可重试判定', () => {
  it('5xx 与 429 可重试', () => {
    for (const s of [429, 500, 502, 503, 504]) expect(isRetryableStatus(s)).toBe(true)
  })

  it('4xx（除 429）不可重试', () => {
    for (const s of [400, 401, 403, 404, 422]) expect(isRetryableStatus(s)).toBe(false)
  })

  it('网络 TypeError 可重试，AbortError 不可', () => {
    expect(isRetryableError(new TypeError('fetch failed'))).toBe(true)
    expect(isRetryableError(new DOMException('Aborted', 'AbortError'))).toBe(false)
    expect(isRetryableError(new Error('other'))).toBe(false)
  })
})
