import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = vi.fn()
  }

  if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Array(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => []),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      quadraticCurveTo: vi.fn(),
      roundRect: vi.fn(),
      clip: vi.fn(),
      setLineDash: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      measureText: vi.fn(() => ({ width: 40 })),
    })) as any
  }
}
