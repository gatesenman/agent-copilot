/**
 * 会话导出/导入 — 序列化与恢复往返单测
 */
import { describe, expect, it } from 'vitest'
import { importSessionJson, sessionToJson, sessionToMarkdown } from '../utils/session-export'
import type { ChatMessage } from '../types'

const MESSAGES: ChatMessage[] = [
  { id: 'm1', role: 'user', content: '查询上月销售额', createdAt: 1700000000000 },
  {
    id: 'm2', role: 'assistant', content: '已查询完成', createdAt: 1700000001000,
    toolCalls: [{ id: 't1', name: 'query_sales', status: 'succeeded', label: '查询销售' } as any],
    payloads: [{ id: 'p1', type: 'table', title: '销售表', data: { columns: [{ key: 'v', label: '值' }], rows: [{ v: 100 }] } } as any],
  },
]

describe('sessionToMarkdown', () => {
  it('包含标题/角色/内容/工具/表格', () => {
    const md = sessionToMarkdown(MESSAGES, { title: '测试会话' })
    expect(md).toContain('# 测试会话')
    expect(md).toContain('## 用户')
    expect(md).toContain('查询上月销售额')
    expect(md).toContain('`query_sales`')
    expect(md).toContain('| 值 |')
  })
})

describe('JSON 导出导入往返', () => {
  it('导出后可完整恢复', () => {
    const json = sessionToJson(MESSAGES, { title: '往返测试' })
    const result = importSessionJson(json)
    expect(result.ok).toBe(true)
    expect(result.title).toBe('往返测试')
    expect(result.messages).toHaveLength(2)
    expect(result.messages[1].toolCalls?.[0].name).toBe('query_sales')
  })

  it('瞬态字段（streaming/queued）被清除', () => {
    const dirty = [{ ...MESSAGES[0], streaming: true, queued: true }]
    const result = importSessionJson(sessionToJson(dirty))
    expect(result.messages[0].streaming).toBeUndefined()
    expect(result.messages[0].queued).toBeUndefined()
  })
})

describe('importSessionJson 容错', () => {
  it('非 JSON 文本报错', () => {
    const r = importSessionJson('not json')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('JSON')
  })

  it('缺 messages 数组报错', () => {
    const r = importSessionJson('{"title":"x"}')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('messages')
  })

  it('坏条目跳过并提示，好条目保留', () => {
    const mixed = JSON.stringify({ messages: [MESSAGES[0], { id: 1, bad: true }] })
    const r = importSessionJson(mixed)
    expect(r.ok).toBe(true)
    expect(r.messages).toHaveLength(1)
    expect(r.error).toContain('跳过 1 条')
  })

  it('全部坏条目时 ok=false', () => {
    const allBad = JSON.stringify({ messages: [{ bad: 1 }, { bad: 2 }] })
    const r = importSessionJson(allBad)
    expect(r.ok).toBe(false)
  })
})
