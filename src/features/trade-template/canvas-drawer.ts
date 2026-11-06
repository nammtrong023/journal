import { Slide, SlideKey } from '../../domain/trade'

export interface SlideDrawConfig {
  ticker: string
  side: 'Long' | 'Short' | ''
  session: string
  result?: number
  rMultiple?: number
  handle?: string
  footerTag?: string
  theme?: 'lathyrusLight' | 'lathyrus'
}

interface Palette {
  bg: string
  fg: string
  accent: string
  grey: string
  dim: string
  hair: string
  track: string
  win: string
  loss: string
  light: boolean
}

function getPalette(theme = 'lathyrusLight'): Palette {
  if (theme === 'lathyrus') {
    return {
      bg: '#150D26',
      fg: '#F7F4FF',
      accent: '#A78BFA',
      grey: '#ABA2C9',
      dim: '#7F77A3',
      hair: '#2D2150',
      track: '#2A1D4B',
      win: '#52ca96',
      loss: '#FF7A92',
      light: false,
    }
  }

  // default lathyrusLight
  return {
    bg: '#FAF8FF',
    fg: '#1B1035',
    accent: '#6D4AFF',
    grey: '#6E6A80',
    dim: '#9892AC',
    hair: '#E4E0F4',
    track: '#EAE6FA',
    win: '#1F7A52',
    loss: '#C2394B',
    light: true,
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  if (typeof (ctx as any).roundRect === 'function') {
    ;(ctx as any).roundRect(x, y, w, h, r)
  } else {
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
  }
}

function brackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  off: number,
  len: number,
  lw: number,
  color: string
) {
  const x0 = x - off,
    y0 = y - off,
    x1 = x + w + off,
    y1 = y + h + off
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.lineCap = 'square'
  ctx.lineJoin = 'miter'
  ctx.beginPath()
  ctx.moveTo(x0, y0 + len)
  ctx.lineTo(x0, y0)
  ctx.lineTo(x0 + len, y0)
  ctx.moveTo(x1 - len, y0)
  ctx.lineTo(x1, y0)
  ctx.lineTo(x1, y0 + len)
  ctx.moveTo(x1, y1 - len)
  ctx.lineTo(x1, y1)
  ctx.lineTo(x1 - len, y1)
  ctx.moveTo(x0 + len, y1)
  ctx.lineTo(x0, y1)
  ctx.lineTo(x0, y1 - len)
  ctx.stroke()
  ctx.restore()
}

function fitBox(img: HTMLImageElement, box: { x: number; y: number; w: number; h: number }, mode: 'contain' | 'cover') {
  const ir = img.width / img.height,
    br = box.w / box.h
  let dw: number, dh: number
  if (mode === 'cover') {
    if (ir > br) {
      dh = box.h
      dw = dh * ir
    } else {
      dw = box.w
      dh = dw / ir
    }
  } else {
    if (ir > br) {
      dw = box.w
      dh = dw / ir
    } else {
      dh = box.h
      dw = dh * ir
    }
  }
  return { dw, dh, dx: box.x + (box.w - dw) / 2, dy: box.y + (box.h - dh) / 2 }
}

export function drawSlideToCanvas(
  canvas: HTMLCanvasElement,
  slide: Slide,
  trade: SlideDrawConfig,
  slideIndex: number,
  totalSlides: number,
  imgElement: HTMLImageElement | null
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height
  const s = Math.sqrt(W * H) / Math.sqrt(1080 * 1350)
  const P = getPalette(trade.theme || 'lathyrusLight')
  const M = 64 * s

  ctx.imageSmoothingEnabled = true
  if ('imageSmoothingQuality' in ctx) {
    ;(ctx as any).imageSmoothingQuality = 'high'
  }

  // Background
  ctx.fillStyle = P.bg
  ctx.fillRect(0, 0, W, H)

  // Soft purple glow in top right
  const g = ctx.createRadialGradient(W * 0.9, -H * 0.05, 0, W * 0.9, -H * 0.05, W * 0.95)
  g.addColorStop(0, 'rgba(109, 74, 255, 0.12)')
  g.addColorStop(1, 'rgba(109, 74, 255, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // Header
  const hy = M + 26 * s
  ctx.fillStyle = P.fg
  ctx.font = `700 ${Math.round(28 * s)}px "Figtree", "Helvetica Neue", Arial, sans-serif`
  ctx.textAlign = 'left'
  const tickerText = (trade.ticker || 'MNQ').toUpperCase()
  ctx.fillText(tickerText, M, hy)
  const tickerWidth = ctx.measureText(tickerText).width

  // Timeframe pill
  const tf = (slide.timeframe || 'Daily').toUpperCase()
  ctx.font = `600 ${Math.round(15 * s)}px "Figtree", "Helvetica Neue", Arial, sans-serif`
  const tfWidth = ctx.measureText(tf).width
  const pillW = tfWidth + 24 * s
  const pillH = 34 * s
  const pillX = M + tickerWidth + 18 * s
  const pillY = hy - 25 * s
  ctx.strokeStyle = P.hair
  ctx.lineWidth = 1.5 * s
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2)
  ctx.stroke()
  ctx.fillStyle = P.grey
  ctx.textAlign = 'center'
  ctx.fillText(tf, pillX + pillW / 2, hy - 3 * s)

  // Right header (Position / Session)
  const metaParts: string[] = []
  if (trade.side) metaParts.push(trade.side)
  if (trade.session) metaParts.push(trade.session)
  const metaStr = metaParts.join('   /   ')
  if (metaStr) {
    ctx.textAlign = 'right'
    ctx.font = `500 ${Math.round(18 * s)}px "Figtree", "Helvetica Neue", Arial, sans-serif`
    ctx.fillStyle = P.grey
    ctx.fillText(metaStr, W - M, hy - 3 * s)
  }

  // Progress bar
  const progY = hy + 30 * s
  const progH = 4 * s
  const n = totalSlides > 0 ? totalSlides : 4
  const gap = 10 * s
  const segW = (W - 2 * M - gap * (n - 1)) / n
  for (let i = 0; i < n; i++) {
    const x = M + i * (segW + gap)
    if (i === slideIndex) {
      ctx.fillStyle = P.accent
    } else if (i < slideIndex) {
      ctx.fillStyle = P.grey
    } else {
      ctx.fillStyle = P.track
    }
    roundRect(ctx, x, progY, segW, progH, progH / 2)
    ctx.fill()
  }

  // Layout positions for bottom caption & text
  const footBase = H - M
  const isExecution = slide.key === 'execution'
  const ts = (isExecution ? 96 : 56) * s
  const ss = 22 * s
  const es = 17 * s

  let y = footBase - 65 * s
  let subBase = 0
  let titleBase = 0

  const subText = slide.subtitle || ''
  if (subText) {
    subBase = y
    y = subBase - ss - 16 * s
  }

  const valText = Array.isArray(slide.value) ? slide.value.join(' + ') : String(slide.value || '')
  if (valText) {
    titleBase = y
    y = titleBase - ts * 0.72 - 24 * s
  }

  const eyeBase = y
  const capTop = eyeBase - es
  const boxTop = progY + progH + 36 * s
  const boxH = Math.max(60 * s, capTop - 30 * s - boxTop)
  const box = { x: M, y: boxTop, w: W - 2 * M, h: boxH }

  // Chart image or dashed container
  const r = 20 * s
  let cx0 = box.x
  let cy0 = box.y
  let cw0 = box.w
  let ch0 = box.h

  if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
    const f = fitBox(imgElement, box, slide.fit || 'contain')
    const cover = slide.fit === 'cover'
    cx0 = cover ? box.x : f.dx
    cy0 = cover ? box.y : f.dy
    cw0 = cover ? box.w : f.dw
    ch0 = cover ? box.h : f.dh

    if (slide.backgroundColor) {
      ctx.save()
      ctx.fillStyle = slide.backgroundColor
      roundRect(ctx, box.x, box.y, box.w, box.h, r)
      ctx.fill()
      ctx.restore()
      cx0 = box.x
      cy0 = box.y
      cw0 = box.w
      ch0 = box.h
    }

    ctx.save()
    roundRect(ctx, cx0, cy0, cw0, ch0, r)
    ctx.clip()
    ctx.drawImage(imgElement, f.dx, f.dy, f.dw, f.dh)
    ctx.restore()
  } else {
    ctx.save()
    ctx.strokeStyle = P.hair
    ctx.lineWidth = 1.5 * s
    ctx.setLineDash([8 * s, 8 * s])
    roundRect(ctx, box.x, box.y, box.w, box.h, 18 * s)
    ctx.stroke()
    ctx.restore()

    ctx.textAlign = 'center'
    ctx.fillStyle = P.dim
    ctx.font = `500 ${Math.round(22 * s)}px "Figtree", "Helvetica Neue", Arial, sans-serif`
    ctx.fillText(getSlideTitle(slide.key), box.x + box.w / 2, box.y + box.h / 2 + 8 * s)
  }

  // Corner brackets
  brackets(ctx, cx0, cy0, cw0, ch0, 12 * s, 24 * s, 2 * s, P.accent)

  // Caption row: marker + name + step count
  const mk = 5 * s
  const my = eyeBase - es * 0.35
  ctx.fillStyle = P.accent
  ctx.beginPath()
  ctx.moveTo(M + mk, my - mk)
  ctx.lineTo(M + 2 * mk, my)
  ctx.lineTo(M + mk, my + mk)
  ctx.lineTo(M, my)
  ctx.closePath()
  ctx.fill()

  ctx.textAlign = 'left'
  ctx.fillStyle = P.grey
  ctx.font = `500 ${Math.round(es)}px "Figtree", "Helvetica Neue", Arial, sans-serif`
  ctx.fillText(getSlideTitle(slide.key), M + 2 * mk + 14 * s, eyeBase)

  // Step counter: 01 / 05
  ctx.textAlign = 'right'
  ctx.fillStyle = P.dim
  ctx.font = `500 ${Math.round(es)}px "Figtree", "Helvetica Neue", Arial, sans-serif`
  const totalStr = `/ ${String(n).padStart(2, '0')}`
  ctx.fillText(totalStr, W - M, eyeBase)
  const twTotal = ctx.measureText(totalStr).width
  ctx.fillStyle = P.fg
  ctx.font = `700 ${Math.round(es)}px "Figtree", "Helvetica Neue", Arial, sans-serif`
  ctx.fillText(String(slideIndex + 1).padStart(2, '0'), W - M - twTotal - 8 * s, eyeBase)

  // Slide Value (Heading)
  if (valText && titleBase > 0) {
    let textColor = P.fg
    let displayVal = valText
    if (isExecution) {
      const num = parseFloat(valText)
      if (!isNaN(num)) {
        displayVal = `${num >= 0 ? '+' : ''}${num}R`
        textColor = num >= 0 ? P.win : P.loss
      }
    }
    ctx.textAlign = 'left'
    ctx.fillStyle = textColor
    ctx.font = `700 ${Math.round(ts)}px "Figtree", "Helvetica Neue", Arial, sans-serif`
    ctx.fillText(displayVal, M, titleBase)
  }

  // Subtitle
  if (subText && subBase > 0) {
    ctx.textAlign = 'left'
    ctx.fillStyle = P.grey
    ctx.font = `400 ${Math.round(ss)}px "Figtree", "Helvetica Neue", Arial, sans-serif`
    ctx.fillText(subText, M, subBase)
  }

  // Footer: Handle + Tag
  let fx = M

  if (trade.handle) {
    const handleText = trade.handle.startsWith('@') ? trade.handle : `@${trade.handle}`
    ctx.textAlign = 'left'
    ctx.fillStyle = P.grey
    ctx.font = `500 ${Math.round(18 * s)}px "Figtree", "Helvetica Neue", Arial, sans-serif`
    ctx.fillText(handleText, fx, footBase)
  }

  if (trade.footerTag) {
    ctx.textAlign = 'right'
    ctx.fillStyle = P.dim
    ctx.font = `600 ${Math.round(18 * s)}px "Figtree", "Helvetica Neue", Arial, sans-serif`
    ctx.fillText(trade.footerTag, W - M, footBase)
  }
}

function getSlideTitle(key: SlideKey): string {
  switch (key) {
    case 'context':
      return 'Market context'
    case 'profile':
      return 'Market profile'
    case 'keyLevel':
      return 'Key Level & CiC'
    case 'entry':
      return 'Entry technique'
    case 'execution':
      return 'Execution'
    default:
      return key
  }
}
