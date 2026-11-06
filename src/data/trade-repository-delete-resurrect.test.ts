import 'fake-indexeddb/auto'
import { describe, it, expect, vi } from 'vitest'

const tradeId = 'test-trade-delete-resurrect'
const today = new Date().toISOString().slice(0, 10)
const row = {
  id: tradeId,
  tradeDate: today,
  ticker: 'NQ',
  side: 'Long',
  session: 'NY',
  slides: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

let remoteData = [row]

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    from: () => {
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = () => q
      q.order = () => q
      q.upsert = () => Promise.resolve({ error: null })
      q.delete = () => {
        return {
          eq: () => {
            remoteData = []
            return Promise.resolve({ error: null })
          }
        }
      }
      q.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) =>
        Promise.resolve({ data: remoteData, error: null }).then(ok, bad)
      return q
    },
  }),
}))

import { TradeRepository } from './trade-repository'

describe('delete trade race condition', () => {
  it('does not resurrect a deleted trade when background refresh runs', async () => {
    const repo = new TradeRepository('test-delete-race')
    
    // Seed local DB with the trade
    await repo.create({ id: tradeId, tradeDate: today, ticker: 'NQ', slides: [] })
    expect(await repo.get(tradeId)).toBeDefined()

    // User deletes trade
    await repo.delete(tradeId)
    expect(await repo.get(tradeId)).toBeUndefined()

    // Simulate in-flight refresh resolving with old remote snapshot containing the trade
    remoteData = [row] // remote returned stale trade
    await repo.refreshFromRemote(true)

    // The deleted trade MUST NOT be resurrected!
    const afterRefresh = await repo.get(tradeId)
    expect(afterRefresh).toBeUndefined()
  })
})
