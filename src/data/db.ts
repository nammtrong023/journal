import Dexie, { type Table } from 'dexie'
import type { Trade, SlideKey } from '../domain/trade'

export interface SlideImageRecord {
  id: string
  tradeId: string
  slideKey: SlideKey
  blob: Blob
  createdAt: string
}

export class JournalDatabase extends Dexie {
  trades!: Table<Trade, string>
  slideImages!: Table<SlideImageRecord, string>

  constructor(dbName = 'local-trading-journal') {
    super(dbName)
    this.version(1).stores({
      trades: 'id, tradeDate, createdAt',
      slideImages: 'id, tradeId, [tradeId+slideKey]',
    })
  }
}
