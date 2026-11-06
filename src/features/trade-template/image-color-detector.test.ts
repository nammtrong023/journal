import { describe, it, expect, vi } from 'vitest'
import {
  rgbToHex,
  isColorClose,
  extractBorderColorFromCanvas,
  detectChartBackgroundColor,
} from './image-color-detector'

describe('image-color-detector', () => {
  it('converts RGB to hex string accurately', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
    expect(rgbToHex(19, 23, 34)).toBe('#131722')
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
  })

  it('checks if two colors are close within tolerance', () => {
    expect(isColorClose({ r: 255, g: 255, b: 255 }, { r: 250, g: 250, b: 250 }, 10)).toBe(true)
    expect(isColorClose({ r: 255, g: 255, b: 255 }, { r: 200, g: 200, b: 200 }, 10)).toBe(false)
  })

  it('extracts white border color from canvas when corners match', () => {
    const mockCtx = {
      getImageData: vi.fn(() => ({
        data: [255, 255, 255, 255],
      })),
    } as unknown as CanvasRenderingContext2D

    const color = extractBorderColorFromCanvas(mockCtx, 100, 100)
    expect(color).toBe('#ffffff')
  })

  it('extracts dark TradingView border color from canvas', () => {
    const mockCtx = {
      getImageData: vi.fn(() => ({
        data: [19, 23, 34, 255],
      })),
    } as unknown as CanvasRenderingContext2D

    const color = extractBorderColorFromCanvas(mockCtx, 100, 100)
    expect(color).toBe('#131722')
  })

  it('returns null if canvas dimensions are zero or invalid', () => {
    const mockCtx = {} as CanvasRenderingContext2D
    expect(extractBorderColorFromCanvas(mockCtx, 0, 0)).toBeNull()
  })

  it('returns null if pixels are transparent or mismatched', () => {
    let call = 0
    const mockCtx = {
      getImageData: vi.fn(() => {
        call++
        // Alternating completely different colors
        return { data: [call * 40, 255 - call * 30, call * 20, 255] }
      }),
    } as unknown as CanvasRenderingContext2D

    const color = extractBorderColorFromCanvas(mockCtx, 100, 100)
    expect(color).toBeNull()
  })

  it('detectChartBackgroundColor handles HTMLImageElement with mock canvas', async () => {
    const img = document.createElement('img')
    Object.defineProperty(img, 'naturalWidth', { value: 200 })
    Object.defineProperty(img, 'naturalHeight', { value: 150 })
    Object.defineProperty(img, 'complete', { value: true })

    const result = await detectChartBackgroundColor(img)
    expect(typeof result === 'string' || result === null).toBe(true)
  })
})
