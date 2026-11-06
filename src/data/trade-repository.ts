import { format, isValid, parseISO } from 'date-fns'
import { JournalDatabase } from './db'
import {
  Trade,
  NewTrade,
  EditableTrade,
  TEMPLATE_VERSION,
  SlideKey,
} from '../domain/trade'
import { getSupabaseClient } from './supabase'

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

function cleanTradeForSupabase(trade: Trade) {
  return {
    id: trade.id,
    tradeDate: trade.tradeDate,
    ticker: trade.ticker,
    side: trade.side,
    session: trade.session,
    result: trade.result,
    rMultiple: trade.rMultiple,
    emotions: trade.emotions || [],
    slides: trade.slides || [],
    templateVersion: trade.templateVersion,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
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
      result: input.result,
      rMultiple: input.rMultiple,
      emotions: input.emotions,
      slides: input.slides || [],
      createdAt: now,
      updatedAt: now,
    }

    await this.db.trades.add(trade)

    // Sync to Supabase if configured
    const supabase = getSupabaseClient()
    if (supabase) {
      try {
        const { error } = await supabase.from('trades').upsert(cleanTradeForSupabase(trade))
        if (error) {
          console.error('Supabase trade create error:', error)
        }
      } catch (err) {
        console.error('Supabase trade create exception:', err)
      }
    }

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

    // Sync to Supabase if configured
    const supabase = getSupabaseClient()
    if (supabase) {
      try {
        const { error } = await supabase.from('trades').upsert(cleanTradeForSupabase(updated))
        if (error) {
          console.error('Supabase trade update error:', error)
        }
      } catch (err) {
        console.error('Supabase trade update exception:', err)
      }
    }

    return updated
  }

  async get(id: string): Promise<Trade | undefined> {
    const local = await this.db.trades.get(id)
    if (local) {
      return local
    }

    const supabase = getSupabaseClient()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (!error && data) {
          const trade = data as Trade
          await this.db.trades.put(trade).catch(() => {})
          return trade
        }
      } catch (err) {
        console.warn('Supabase trade get failed:', err)
      }
    }

    return undefined
  }

  async listByDate(date: string): Promise<Trade[]> {
    const supabase = getSupabaseClient()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('tradeDate', date)
          .order('createdAt', { ascending: true })

        if (!error && data && Array.isArray(data)) {
          for (const item of data) {
            await this.db.trades.put(item as Trade).catch(() => {})
          }
        }
      } catch (err) {
        console.warn('Supabase listByDate fetch failed:', err)
      }
    }

    return this.db.trades
      .where('tradeDate')
      .equals(date)
      .sortBy('createdAt')
  }

  async listAll(): Promise<Trade[]> {
    const supabase = getSupabaseClient()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .order('createdAt', { ascending: true })

        if (!error && data && Array.isArray(data)) {
          for (const item of data) {
            await this.db.trades.put(item as Trade).catch(() => {})
          }
        }
      } catch (err) {
        console.warn('Supabase listAll fetch failed:', err)
      }
    }

    return this.db.trades.toArray()
  }

  async delete(id: string): Promise<void> {
    const existing = await this.db.trades.get(id)
    const imageIds = existing?.slides?.map((s) => s.imageId).filter(Boolean) as string[] | undefined

    await this.db.transaction('rw', this.db.trades, this.db.slideImages, async () => {
      await this.db.trades.delete(id)
      await this.db.slideImages.where('tradeId').equals(id).delete()
    })

    // Remove from Supabase if configured
    const supabase = getSupabaseClient()
    if (supabase) {
      void supabase.from('trades').delete().eq('id', id)
      if (imageIds && imageIds.length > 0) {
        const filePaths = imageIds.map((imgId) => `${imgId}.png`)
        void supabase.storage.from('trade-images').remove(filePaths)
      }
    }
  }

  async putImage(tradeId: string, slideKey: SlideKey, blob: Blob): Promise<string> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    // 1. Always save in IndexedDB
    await this.db.slideImages.add({
      id,
      tradeId,
      slideKey,
      blob,
      createdAt: now,
    })

    // 2. Upload to Supabase Storage if configured
    const supabase = getSupabaseClient()
    if (supabase) {
      const filePath = `${id}.png`
      try {
        const { error } = await supabase.storage
          .from('trade-images')
          .upload(filePath, blob, {
            contentType: blob.type || 'image/png',
            upsert: true,
          })
        if (error) {
          console.error('Supabase image upload error:', error)
        }
      } catch (err) {
        console.error('Supabase image upload exception:', err)
      }
    }

    return id
  }

  async getImage(id: string): Promise<Blob | undefined> {
    // 1. Try local IndexedDB
    const record = await this.db.slideImages.get(id)
    if (record?.blob) {
      return record.blob
    }

    // 2. Fallback to Supabase Storage
    const supabase = getSupabaseClient()
    if (supabase) {
      try {
        const { data, error } = await supabase.storage.from('trade-images').download(`${id}.png`)
        if (data && !error) {
          // Cache to IndexedDB so subsequent reads are instant
          await this.db.slideImages
            .put({
              id,
              tradeId: '',
              slideKey: 'entry',
              blob: data,
              createdAt: new Date().toISOString(),
            })
            .catch(() => {})
          return data
        }
      } catch (err) {
        console.warn('Supabase image fetch failed:', err)
      }
    }

    return undefined
  }

  async countImages(): Promise<number> {
    return this.db.slideImages.count()
  }

  /**
   * Pulls all remote trades from Supabase and syncs into local IndexedDB.
   */
  async syncFromRemote(): Promise<{ pulledTrades: number }> {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase is not configured')
    }

    const { data, error } = await supabase.from('trades').select('*')
    if (error) {
      throw error
    }

    if (data && Array.isArray(data)) {
      for (const item of data) {
        await this.db.trades.put(item as Trade).catch(() => {})
      }
      return { pulledTrades: data.length }
    }

    return { pulledTrades: 0 }
  }

  /**
   * Pushes all local trades and images to Supabase.
   */
  async syncAllToRemote(): Promise<{ tradesSynced: number; imagesSynced: number }> {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase is not configured')
    }

    // Sync trades
    const localTrades = await this.db.trades.toArray()
    let tradesSynced = 0
    if (localTrades.length > 0) {
      const cleaned = localTrades.map(cleanTradeForSupabase)
      const { error } = await supabase.from('trades').upsert(cleaned)
      if (error) {
        console.error('Supabase sync trades error:', error)
        throw error
      }
      tradesSynced = localTrades.length
    }

    // Sync images
    const localImages = await this.db.slideImages.toArray()
    let imagesSynced = 0
    for (const img of localImages) {
      const { error } = await supabase.storage
        .from('trade-images')
        .upload(`${img.id}.png`, img.blob, {
          contentType: img.blob.type || 'image/png',
          upsert: true,
        })
      if (!error) {
        imagesSynced++
      } else {
        console.warn(`Failed to upload image ${img.id}:`, error)
      }
    }

    return { tradesSynced, imagesSynced }
  }

  async close(): Promise<void> {
    this.db.close()
  }
}

export const defaultRepository = new TradeRepository()
