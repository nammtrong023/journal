import { format, isValid, parseISO } from 'date-fns'
import { JournalDatabase } from './db'
import {
  Trade,
  NewTrade,
  EditableTrade,
  TEMPLATE_VERSION,
  SlideKey,
} from '../domain/trade'

export class TradeDateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TradeDateError'
  }
}

export function validateTradeDate(tradeDate: string): void {
  if (!tradeDate || typeof tradeDate !== 'string') {
    throw new TradeDateError('Trade date is required')
  }

  const parsed = parseISO(tradeDate)
  if (!isValid(parsed) || !/^\d{4}-\d{2}-\d{2}$/.test(tradeDate)) {
    throw new TradeDateError(`Invalid trade date format: ${tradeDate}`)
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  if (tradeDate > todayStr) {
    throw new TradeDateError(`Trade date cannot be in the future: ${tradeDate} > ${todayStr}`)
  }
}

export class TradeRepository {
  private db: JournalDatabase

  constructor(dbName = 'local-trading-journal') {
    this.db = new JournalDatabase(dbName)
  }

  async create(input: NewTrade): Promise<Trade> {
    validateTradeDate(input.tradeDate)

    const now = new Date().toISOString()
    const trade: Trade = {
      id: input.id || crypto.randomUUID(),
      tradeDate: input.tradeDate,
      templateVersion: TEMPLATE_VERSION,
      ticker: input.ticker || '',
      side: input.side || '',
      session: input.session || '',
      volatilityDriver: input.volatilityDriver || '',
      result: input.result,
      rMultiple: input.rMultiple,
      emotions: input.emotions,
      slides: input.slides || [],
      createdAt: now,
      updatedAt: now,
    }

    await this.db.trades.add(trade)
    return trade
  }

  async update(id: string, input: EditableTrade): Promise<Trade> {
    validateTradeDate(input.tradeDate)

    const existing = await this.db.trades.get(id)
    if (!existing) {
      throw new Error(`Trade with id ${id} not found`)
    }

    const updated: Trade = {
      ...existing,
      ...input,
      id,
      templateVersion: TEMPLATE_VERSION,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }

    await this.db.trades.put(updated)
    return updated
  }

  async get(id: string): Promise<Trade | undefined> {
    return this.db.trades.get(id)
  }

  async listByDate(date: string): Promise<Trade[]> {
    return this.db.trades
      .where('tradeDate')
      .equals(date)
      .sortBy('createdAt')
  }

  async listAll(): Promise<Trade[]> {
    return this.db.trades.toArray()
  }

  async delete(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.trades, this.db.slideImages, async () => {
      await this.db.trades.delete(id)
      await this.db.slideImages.where('tradeId').equals(id).delete()
    })
  }

  async putImage(tradeId: string, slideKey: SlideKey, blob: Blob): Promise<string> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    await this.db.slideImages.add({
      id,
      tradeId,
      slideKey,
      blob,
      createdAt: now,
    })
    return id
  }

  async getImage(id: string): Promise<Blob | undefined> {
    const record = await this.db.slideImages.get(id)
    return record?.blob
  }

  async countImages(): Promise<number> {
    return this.db.slideImages.count()
  }

  async close(): Promise<void> {
    this.db.close()
  }
}

export const defaultRepository = new TradeRepository()
