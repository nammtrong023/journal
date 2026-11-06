export const TEMPLATE_VERSION = 1 as const

export type SlideKey = 'context' | 'profile' | 'keyLevel' | 'entry' | 'execution'

export interface Slide {
  key: SlideKey
  value: string | string[]
  timeframe: string
  subtitle: string
  imageId?: string
  fit: 'contain' | 'cover'
  backgroundColor?: string
  skip: boolean
}

export interface Trade {
  id: string
  tradeDate: string // local YYYY-MM-DD
  templateVersion: typeof TEMPLATE_VERSION
  ticker: string
  side: 'Long' | 'Short' | ''
  session: string
  result?: number
  rMultiple?: number
  emotions?: string[]
  slides: Slide[]
  createdAt: string
  updatedAt: string
}

export type NewTrade = {
  id?: string
  tradeDate: string
  templateVersion?: typeof TEMPLATE_VERSION
  ticker: string
  side?: 'Long' | 'Short' | ''
  session?: string
  result?: number
  rMultiple?: number
  emotions?: string[]
  slides: Slide[]
}

export type EditableTrade = Partial<Omit<Trade, 'id' | 'templateVersion' | 'createdAt'>> & {
  tradeDate: string
}
