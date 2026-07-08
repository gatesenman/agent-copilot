/**
 * 中间件管道单测：message 链顺序、event 过滤/改写、生命周期事件保护、内置助手。
 */
import { describe, expect, it } from 'vitest'
import type { AgentEvent, RunInput } from '../types'
import {
  applyEventMiddleware, applyMessageMiddleware,
  dropEventTypes, mapTextDelta, redactPatterns,
} from '../middleware'

const input: RunInput = {
  sessionId: 's1', runId: 'r1',
  messages: [
    { id: 'm1', role: 'user', content: '我的手机号是 13812345678', createdAt: 1 },
    { id: 'm2', role: 'assistant', content: '13812345678 已记录', createdAt: 2 },
  ],
  readables: [], actions: [], additionalInstructions: [],
}

function ev(type: AgentEvent['type'], data?: unknown): AgentEvent {
  return { type, runId: 'r1', timestamp: 1, data }
}

async function* gen(events: AgentEvent[]) {
  for (const e of events) yield e
}

async function collect(stream: AsyncIterable<AgentEvent>) {
  const out: AgentEvent[] = []
  for await (const e of stream) out.push(e)
  return out
}

describe('applyMessageMiddleware', () => {
  it('链按序执行且支持异步', async () => {
    const result = await applyMessageMiddleware(input, [
      (i) => ({ ...i, systemPrompt: 'A' }),
      async (i) => ({ ...i, systemPrompt: `${i.systemPrompt}B` }),
    ])
    expect(result.systemPrompt).toBe('AB')
  })

  it('空链原样返回', async () => {
    expect(await applyMessageMiddleware(input, undefined)).toBe(input)
    expect(await applyMessageMiddleware(input, [])).toBe(input)
  })

  it('redactPatterns 只脱敏用户消息', async () => {
    const result = await applyMessageMiddleware(input, [redactPatterns([/1\d{10}/g])])
    expect(result.messages[0].content).toBe('我的手机号是 ***')
    expect(result.messages[1].content).toBe('13812345678 已记录')
  })
})

describe('applyEventMiddleware', () => {
  it('dropEventTypes 丢弃指定类型', async () => {
    const events = await collect(applyEventMiddleware(
      gen([ev('RUN_STARTED'), ev('REACT_STEP'), ev('TEXT_DELTA', { delta: 'x' }), ev('RUN_FINISHED')]),
      [dropEventTypes(['REACT_STEP'])],
    ))
    expect(events.map((e) => e.type)).toEqual(['RUN_STARTED', 'TEXT_DELTA', 'RUN_FINISHED'])
  })

  it('生命周期事件不可被丢弃', async () => {
    const events = await collect(applyEventMiddleware(
      gen([ev('RUN_STARTED'), ev('RUN_FINISHED')]),
      [() => null],
    ))
    expect(events.map((e) => e.type)).toEqual(['RUN_STARTED', 'RUN_FINISHED'])
  })

  it('mapTextDelta 改写文本增量', async () => {
    const events = await collect(applyEventMiddleware(
      gen([ev('TEXT_DELTA', { delta: '内部代号猎鹰' })]),
      [mapTextDelta((t) => t.replaceAll('猎鹰', '**'))],
    ))
    expect((events[0].data as { delta: string }).delta).toBe('内部代号**')
  })

  it('多个中间件按序流水执行', async () => {
    const events = await collect(applyEventMiddleware(
      gen([ev('TEXT_DELTA', { delta: 'abc' })]),
      [
        mapTextDelta((t) => t.toUpperCase()),
        mapTextDelta((t) => `${t}!`),
      ],
    ))
    expect((events[0].data as { delta: string }).delta).toBe('ABC!')
  })
})
