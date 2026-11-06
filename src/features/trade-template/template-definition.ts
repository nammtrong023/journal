import { Slide, SlideKey } from '../../domain/trade'

export interface SlideDefinition {
  key: SlideKey
  title: string
  shortTitle: string
  defaultTimeframe: string
  defaultSubtitle: string
  inputType: 'select' | 'text' | 'number' | 'none'
  options?: string[]
}

export const SLIDE_DEFINITIONS: SlideDefinition[] = [
  {
    key: 'context',
    title: 'Market context',
    shortTitle: 'Context',
    defaultTimeframe: 'Daily',
    defaultSubtitle: 'Higher Timeframe Narrative',
    inputType: 'select',
    options: ['Reversal', 'Continuation'],
  },
  {
    key: 'profile',
    title: 'Market profile',
    shortTitle: 'Profile',
    defaultTimeframe: '4H',
    defaultSubtitle: 'Daily Structure Profile',
    inputType: 'none',
  },
  {
    key: 'keyLevel',
    title: 'Key Level & CiC',
    shortTitle: 'Key & CiC',
    defaultTimeframe: '30m',
    defaultSubtitle: 'Intermediary Liquidity & Change in Character',
    inputType: 'text',
  },
  {
    key: 'entry',
    title: 'Entry technique',
    shortTitle: 'Entry',
    defaultTimeframe: '3m',
    defaultSubtitle: 'Execution Model / Trigger',
    inputType: 'select',
    options: ['CISD', 'I-CISD', 'Fair Value Gap', 'Inversion Fair Value Gap'],
  },
]

export function makeDefaultSlides(): Slide[] {
  return SLIDE_DEFINITIONS.map((def) => ({
    key: def.key,
    value:
      def.key === 'context'
        ? 'Reversal'
        : def.key === 'profile'
        ? ''
        : def.key === 'entry'
        ? 'CISD'
        : 'SMT',
    timeframe: def.defaultTimeframe,
    subtitle: def.defaultSubtitle,
    fit: 'contain',
    skip: false,
  }))
}
