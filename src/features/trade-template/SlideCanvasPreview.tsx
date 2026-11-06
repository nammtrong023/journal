import { useEffect, useRef, useState } from 'react'
import { Slide, SlideKey } from '../../domain/trade'
import { TradeRepository } from '../../data/trade-repository'
import { drawSlideToCanvas, SlideDrawConfig } from './canvas-drawer'
import { Eye, MousePointerClick } from 'lucide-react'

interface SlideCanvasPreviewProps {
  trade: SlideDrawConfig
  slides: Slide[]
  activeSlideIndex: number
  pendingImages: Map<SlideKey, File>
  repository?: TradeRepository
  onSelectSlide?: (index: number) => void
}

export function SlideCanvasPreview({
  trade,
  slides,
  activeSlideIndex,
  pendingImages,
  repository,
}: SlideCanvasPreviewProps) {
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [imagesCache, setImagesCache] = useState<Map<SlideKey, HTMLImageElement>>(new Map())

  // Load and cache slide images
  useEffect(() => {
    let isCancelled = false
    const urlsToRevoke: string[] = []

    const loadImages = async () => {
      const nextMap = new Map<SlideKey, HTMLImageElement>()

      for (const slide of slides) {
        const file = pendingImages.get(slide.key)
        if (file) {
          const url = URL.createObjectURL(file)
          urlsToRevoke.push(url)
          const img = new Image()
          img.src = url
          await new Promise<void>((resolve) => {
            img.onload = () => {
              if (!isCancelled) nextMap.set(slide.key, img)
              resolve()
            }
            img.onerror = () => resolve()
          })
        } else if (slide.imageId && repository) {
          try {
            const blob = await repository.getImage(slide.imageId)
            if (blob && !isCancelled) {
              const url = URL.createObjectURL(blob)
              urlsToRevoke.push(url)
              const img = new Image()
              img.src = url
              await new Promise<void>((resolve) => {
                img.onload = () => {
                  if (!isCancelled) nextMap.set(slide.key, img)
                  resolve()
                }
                img.onerror = () => resolve()
              })
            }
          } catch {
            // ignore
          }
        }
      }

      if (!isCancelled) {
        setImagesCache(nextMap)
      }
    }

    loadImages()

    return () => {
      isCancelled = true
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [slides, pendingImages, repository])

  // Draw main canvas
  useEffect(() => {
    const mainCanvas = mainCanvasRef.current
    if (mainCanvas) {
      const activeSlide = slides[activeSlideIndex] || slides[0]
      if (activeSlide) {
        const img = imagesCache.get(activeSlide.key) || null
        drawSlideToCanvas(
          mainCanvas,
          activeSlide,
          trade,
          activeSlideIndex,
          slides.length,
          img
        )
      }
    }
  }, [slides, trade, activeSlideIndex, imagesCache])

  return (
    <div className="recap-preview-column h-full flex flex-col select-none">
      <div className="recap-canvas-card flex-1 h-full bg-bg-panel border border-border rounded-lg p-4 sm:p-5 flex flex-col gap-3.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-strong flex items-center gap-1.5">
            <Eye size={14} className="text-accent-blue" />
            <span>Live Recap Card (4:5)</span>
          </span>
          <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-bg-muted border border-border">
            1080 × 1350
          </span>
        </div>

        {/* Main Canvas Frame */}
        <div className="relative rounded-lg overflow-hidden bg-[#0d0e14] border border-border/80 shadow-md flex items-center justify-center">
          <canvas
            ref={mainCanvasRef}
            width={1080}
            height={1350}
            className="recap-main-canvas w-full h-auto block rounded-lg"
            data-testid="recap-main-canvas"
          />
        </div>

        <div className="recap-drop-note mt-auto flex items-center gap-1.5 text-[11px] text-text-muted/80 leading-tight pt-3 border-t border-border/40">
          <MousePointerClick size={12} className="shrink-0 text-accent-blue" />
          <span>Drop or paste a screenshot anywhere on the page to assign it to the open slide.</span>
        </div>
      </div>
    </div>
  )
}
