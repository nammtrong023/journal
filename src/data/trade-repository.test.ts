import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { TradeRepository, TradeDateError } from './trade-repository'
import { format, subDays } from 'date-fns'

describe('TradeRepository', () => {
  it('rejects a future trade date', async () => {
    const repo = new TradeRepository('future-date-test')
    await expect(
      repo.create({ tradeDate: '2999-01-01', ticker: 'MNQ', slides: [] })
    ).rejects.toBeInstanceOf(TradeDateError)
  })

  it('moves a trade when its tradeDate changes', async () => {
    const repo = new TradeRepository('move-test')
    const pastDate = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    const today = format(new Date(), 'yyyy-MM-dd')
    const trade = await repo.create({ tradeDate: pastDate, ticker: 'NQ', slides: [] })
    await repo.update(trade.id, { ...trade, tradeDate: today })
    expect(await repo.listByDate(pastDate)).toHaveLength(0)
    expect(await repo.listByDate(today)).toHaveLength(1)
  })

  it('creates, reads, and deletes trades and associated images', async () => {
    const repo = new TradeRepository('crud-test')
    const today = format(new Date(), 'yyyy-MM-dd')
    const trade = await repo.create({
      tradeDate: today,
      ticker: 'ES',
      side: 'Long',
      session: 'NY AM',
      result: 500,
      rMultiple: 2.5,
      slides: [],
    })

    expect(trade.id).toBeDefined()
    expect(trade.templateVersion).toBe(1)

    const blob = new Blob(['sample-image'], { type: 'image/png' })
    const imageId = await repo.putImage(trade.id, 'context', blob)
    expect(imageId).toBeDefined()

    const retrievedBlob = await repo.getImage(imageId)
    expect(retrievedBlob).toBeDefined()
    expect(await repo.countImages()).toBe(1)

    const fetched = await repo.get(trade.id)
    expect(fetched?.ticker).toBe('ES')

    await repo.delete(trade.id)
    expect(await repo.get(trade.id)).toBeUndefined()
    expect(await repo.getImage(imageId)).toBeUndefined()
    expect(await repo.countImages()).toBe(0)
  })
})
