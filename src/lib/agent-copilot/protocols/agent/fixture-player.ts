import { agUiAdapter } from './ag-ui'
import type { AgentEvent } from '../../types'

/** Replay a recorded AG-UI SSE session without a live backend. */
export async function replayAgUiFixture(text: string, runId = 'fixture'): Promise<AgentEvent[]> {
  const bytes = new TextEncoder().encode(text.endsWith('\n\n') ? text : `${text}\n\n`)
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
  const events: AgentEvent[] = []
  for await (const ev of agUiAdapter.parseStream(stream, runId, { endpoint: '' })) {
    events.push(ev)
  }
  return events
}
