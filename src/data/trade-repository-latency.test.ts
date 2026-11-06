import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const REMOTE_DELAY = 600
let remoteRows: Record<string, unknown>[] = []

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    from: () => {
      const q: Record<string, unknown> = {}
      const resolve = () =>
        new Promise((r) => setTimeout(() => r({ data: remoteRows, error: null }), REMOTE_DELAY))
      q.select = () => q
      q.eq = () => q
      q.order = () => q
      q.upsert = () => Promise.resolve({ error: null })
      q.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => resolve().then(ok, bad)
      return q
    },
  }),
}))

import { TradeRepository } from './trade-repository'

const today = new Date().toISOString().slice(0, 10)
const mk = (id: string) => ({
  id, tradeDate: today, ticker: 'NQ', side: 'Long', session: '', slides: [], emotions: [],
  templateVersion: 1, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('read latency with slow Supabase', () => {
  beforeEach(() => { remoteRows = [] })
  // let in-flight background refreshes from the previous test settle
  afterEach(() => new Promise((r) => setTimeout(r, REMOTE_DELAY + 100)))

  it('listAll returns local data without waiting for the network', async () => {
    const repo = new TradeRepository('lat-all')
    await repo.create({ tradeDate: today, ticker: 'ES', slides: [] })
    const t0 = performance.now()
    const rows = await repo.listAll()
    const ms = performance.now() - t0
    expect(rows).toHaveLength(1)
    expect(ms).toBeLessThan(REMOTE_DELAY / 2)
  })

  it('listByDate returns local data without waiting for the network', async () => {
    const repo = new TradeRepository('lat-day')
    await repo.create({ tradeDate: today, ticker: 'ES', slides: [] })
    const t0 = performance.now()
    await repo.listByDate(today)
    expect(performance.now() - t0).toBeLessThan(REMOTE_DELAY / 2)
  })

  it('background refresh merges remote rows and emits trades-changed once', async () => {
    const repo = new TradeRepository('lat-merge')
    remoteRows = [mk('remote-1')]
    const changed = vi.fn()
    window.addEventListener('trades-changed', changed)
    expect(await repo.listAll()).toHaveLength(0) // local-first
    await vi.waitFor(() => expect(changed).toHaveBeenCalledTimes(1), { timeout: 2000 })
    expect(await repo.listAll()).toHaveLength(1)
    await new Promise((r) => setTimeout(r, REMOTE_DELAY + 200))
    expect(changed).toHaveBeenCalledTimes(1) // no refresh loop when nothing changed
    window.removeEventListener('trades-changed', changed)
  })
})
