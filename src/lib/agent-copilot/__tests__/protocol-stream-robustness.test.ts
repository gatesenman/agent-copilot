import { describe, expect, it } from 'vitest'
import { agUiAdapter } from '../protocols/agent/ag-ui'
import type { AgentEvent } from '../types'

async function collect(iter: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const out: AgentEvent[] = []
  for await (const ev of iter) out.push(ev)
  return out
}

function encodeSse(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder()
      for (const chunk of chunks) controller.enqueue(enc.encode(chunk))
      controller.close()
    },
  })
}

describe('AG-UI parseStream robustness', () => {
  it('skips non-JSON frames and comments, then finishes cleanly', async () => {
    const stream = encodeSse([
      'data: not-json\n\n',
      'data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"m","delta":"ok"}\n\n',
      ': comment line\n\n',
      'data: {"type":"RUN_FINISHED"}\n\n',
    ])
    const events = await collect(agUiAdapter.parseStream(stream, 'run_dirty', { endpoint: '' }))
    const text = events
      .filter((e) => e.type === 'TEXT_DELTA')
      .map((e) => String((e.data as { delta?: string })?.delta ?? ''))
      .join('')
    expect(text).toBe('ok')
    expect(events.map((e) => e.type)).toContain('RUN_FINISHED')
  })

  it('ignores empty and malformed event objects without throwing', async () => {
    const stream = encodeSse([
      'data: {}\n\n',
      'data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"m","delta":"x"}\n\n',
      'data: [1,2,3]\n\n',
      'data: {"type":"RUN_FINISHED"}\n\n',
    ])
    const events = await collect(agUiAdapter.parseStream(stream, 'run_empty', { endpoint: '' }))
    const text = events
      .filter((e) => e.type === 'TEXT_DELTA')
      .map((e) => String((e.data as { delta?: string })?.delta ?? ''))
      .join('')
    expect(text).toBe('x')
    expect(events.map((e) => e.type)).toContain('RUN_FINISHED')
  })
})
