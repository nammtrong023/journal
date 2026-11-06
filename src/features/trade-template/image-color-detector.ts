export interface RGB {
  r: number
  g: number
  b: number
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase()
}

export function isColorClose(c1: RGB, c2: RGB, tolerance = 18): boolean {
  return (
    Math.abs(c1.r - c2.r) <= tolerance &&
    Math.abs(c1.g - c2.g) <= tolerance &&
    Math.abs(c1.b - c2.b) <= tolerance
  )
}

/**
 * Samples pixel corners and edge midpoints from a canvas context to find a dominant border color.
 */
export function extractBorderColorFromCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): string | null {
  if (width <= 0 || height <= 0) return null

  const samplePoints = [
    { x: Math.min(2, width - 1), y: Math.min(2, height - 1) }, // Top-Left
    { x: Math.max(0, width - 3), y: Math.min(2, height - 1) }, // Top-Right
    { x: Math.min(2, width - 1), y: Math.max(0, height - 3) }, // Bottom-Left
    { x: Math.max(0, width - 3), y: Math.max(0, height - 3) }, // Bottom-Right
    { x: Math.floor(width / 2), y: Math.min(2, height - 1) }, // Top-Center
    { x: Math.floor(width / 2), y: Math.max(0, height - 3) }, // Bottom-Center
  ]

  const colors: RGB[] = []

  for (const pt of samplePoints) {
    try {
      const imgData = ctx.getImageData(pt.x, pt.y, 1, 1)
      const [r, g, b, a] = imgData.data
      if (a !== undefined && a >= 128) {
        colors.push({ r, g, b })
      }
    } catch {
      // Security or canvas error
    }
  }

  if (colors.length < 3) return null

  // Check if at least 70% of sampled points match the first point within tolerance
  const reference = colors[0]
  const matching = colors.filter((c) => isColorClose(reference, c))

  if (matching.length / colors.length >= 0.7) {
    const avgR = Math.round(matching.reduce((acc, c) => acc + c.r, 0) / matching.length)
    const avgG = Math.round(matching.reduce((acc, c) => acc + c.g, 0) / matching.length)
    const avgB = Math.round(matching.reduce((acc, c) => acc + c.b, 0) / matching.length)
    return rgbToHex(avgR, avgG, avgB)
  }

  return null
}

/**
 * Loads an image from Blob/File/HTMLImageElement and extracts the dominant border/background color.
 */
export async function detectChartBackgroundColor(
  source: Blob | File | HTMLImageElement
): Promise<string | null> {
  if (typeof document === 'undefined') return null

  let img: HTMLImageElement
  let revokeUrl: string | null = null

  try {
    if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
      img = source
    } else if (source && typeof (source as any).naturalWidth === 'number') {
      img = source as HTMLImageElement
    } else {
      img = new Image()
      revokeUrl = URL.createObjectURL(source as Blob)
      img.src = revokeUrl

      await new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) {
          resolve()
        } else {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Failed to load image for color detection'))
        }
      })
    }

    const width = img.naturalWidth || img.width
    const height = img.naturalHeight || img.height
    if (width <= 0 || height <= 0) return null

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null

    ctx.drawImage(img, 0, 0, width, height)
    return extractBorderColorFromCanvas(ctx, width, height)
  } catch {
    return null
  } finally {
    if (revokeUrl) {
      URL.revokeObjectURL(revokeUrl)
    }
  }
}
