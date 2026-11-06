import { describe, it, expect } from 'vitest'
import { DEFAULT_EMOTIONS, getEmotionById } from './emotions'

describe('emotions taxonomy', () => {
  it('contains all 12 preset emotions with valid categories', () => {
    expect(DEFAULT_EMOTIONS).toHaveLength(12)
    const calm = getEmotionById('calm')
    expect(calm).toBeDefined()
    expect(calm?.category).toBe('positive')
    expect(calm?.emoji).toBe('😌')

    const revenge = getEmotionById('revenge_trading')
    expect(revenge).toBeDefined()
    expect(revenge?.category).toBe('tilt')
    expect(revenge?.emoji).toBe('🤬')
  })

  it('returns undefined for unknown emotion id', () => {
    expect(getEmotionById('non_existent')).toBeUndefined()
  })
})
