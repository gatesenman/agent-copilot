import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { replayAgUiFixture } from '../protocols/agent/fixture-player'

const fixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../protocols/fixtures/ag-ui-session.sse'),
  'utf8',
)

describe('offline AG-UI fixture player', () => {
  it('replays a recorded session and surfaces text plus a card event', async () => {
    const events = await replayAgUiFixture(fixture, 'fixture-1')
    const types = events.map((e) => e.type)
    expect(types).toContain('RUN_FINISHED')
    const text = events
      .filter((e) => e.type === 'TEXT_DELTA')
      .map((e) => String((e.data as { delta?: string })?.delta ?? ''))
      .join('')
    expect(text).toContain('offline fixture')
    expect(JSON.stringify(events)).toMatch(/Briefing card|card|CUSTOM|STRUCTURED_PAYLOAD/)
  })
})
