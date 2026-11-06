import 'fake-indexeddb/auto'
import { describe, it, expect, vi } from 'vitest'

// Supabase returns SQL NULL for unset columns; the app models them as `undefined`.
const nullRow = {
  id: 'null-row',
  tradeDate: new Date().toISOString().slice(0, 10),
  ticker: 'BTC',
  side: 'Long',
  session: null,
  result: null,
  rMultiple: null,
  emotions: null,
  slides: null,
  templateVersion: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    from: () => {
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = () => q
      q.order = () => q
      q.maybeSingle = () => Promise.resolve({ data: nullRow, error: null })
      q.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) =>
        Promise.resolve({ data: [nullRow], error: null }).then(ok, bad)
      return q
    },
  }),
}))

import { TradeRepository } from './trade-repository'

describe('remote rows with SQL NULL columns', () => {
  it('are normalised to undefined on every read path', async () => {
    const repo = new TradeRepository('null-rows')
    await repo.syncFromRemote()

    for (const trade of [
      (await repo.listAll())[0],
      (await repo.listByDate(nullRow.tradeDate))[0],
      await repo.get('null-row'),
    ]) {
      expect(trade).toBeDefined()
      expect(trade!.result).toBeUndefined()
      expect(trade!.rMultiple).toBeUndefined()
      expect(trade!.emotions).toBeUndefined()
      expect(trade!.slides).toEqual([])
      expect(trade!.session).toBe('')
    }
  })
})
