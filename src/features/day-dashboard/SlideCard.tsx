import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LineChart, X } from 'lucide-react'
import { Slide } from '../../domain/trade'
import { TradeRepository } from '../../data/trade-repository'
import { TimeframeBadge } from './TimeframeBadge'

export interface SlideCardProps {
  slide: Slide
  repository?: TradeRepository
  onZoom?: () => void
}

export const STEP_LABELS: Record<string, string> = {
  context: '01 CONTEXT',
  profile: '02 PROFILE',
  keyLevel: '03 KEY & CIC',
  entry: '04 ENTRY',
}

export function SlideCard({ slide, repository, onZoom }: SlideCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)

  useEffect(() => {
    let url: string | null = null
    let isCancelled = false

    if (slide.imageId && repository) {
      repository.getImage(slide.imageId).then((blob) => {
        if (!isCancelled && blob) {
          url = URL.createObjectURL(blob)
          setImageUrl(url)
        }
      })
    } else {
      setImageUrl(null)
    }

    return () => {
      isCancelled = true
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [slide.imageId, repository])

  useEffect(() => {
    if (!isZoomed) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomed(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isZoomed])

  const stepName = STEP_LABELS[slide.key] || slide.key.toUpperCase()

  const handleBodyClick = () => {
    if (!imageUrl) return
    if (onZoom) {
      onZoom()
    } else {
      setIsZoomed(true)
    }
  }

  return (
    <div className="recap-slide-card w-full bg-bg-muted border border-border rounded-lg flex flex-col overflow-hidden hover:border-accent-blue/40 transition-colors shadow-sm select-none">
      {/* Top Header */}
      <div className="slide-card-top px-3 py-2 bg-black/30 flex items-center justify-between border-b border-border/70 text-[11px]">
        <span className="slide-card-step font-bold text-accent-blue tracking-wider font-mono">
          {stepName}
        </span>
        {slide.timeframe && (
          <TimeframeBadge timeframe={slide.timeframe} />
        )}
      </div>

      {/* Body / Chart Image */}
      <div
        className={`slide-card-body h-[240px] sm:h-[280px] xl:h-[320px] relative flex items-center justify-center overflow-hidden group ${
          imageUrl ? 'cursor-zoom-in' : ''
        }`}
        style={{ backgroundColor: slide.backgroundColor || '#12131a' }}
        onClick={handleBodyClick}
        title={imageUrl ? 'Click to zoom in original chart' : undefined}
      >
        {imageUrl ? (
          <div className="slide-card-image-wrap w-full h-full p-1.5 flex items-center justify-center">
            <img
              src={imageUrl}
              alt={`${slide.key} chart`}
              className={`slide-card-img w-full h-full rounded transition-transform duration-200 group-hover:scale-[1.02] ${
                slide.fit === 'cover' ? 'object-cover' : 'object-contain'
              }`}
            />
          </div>
        ) : (
          <div className="slide-card-placeholder flex flex-col items-center justify-center text-text-muted/40 gap-2">
            <LineChart size={28} className="stroke-[1.5]" />
            <span className="text-[11px] font-medium tracking-wide">No Chart Attached</span>
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="slide-card-bottom p-3 flex flex-col gap-1 border-t border-border/50 bg-bg-panel/40 flex-1 justify-between">
        <div
          className="slide-card-value text-xs font-semibold text-text-strong truncate"
          title={Array.isArray(slide.value) ? slide.value.join(', ') : slide.value || undefined}
        >
          {Array.isArray(slide.value)
            ? slide.value.join(', ')
            : slide.value && String(slide.value).trim() !== ''
            ? String(slide.value)
            : '—'}
        </div>
        {slide.subtitle && (
          <div
            className="slide-card-subtitle text-[11px] text-text-muted truncate"
            title={slide.subtitle}
          >
            {slide.subtitle}
          </div>
        )}
      </div>

      {/* Standalone zoom fallback if onZoom is not passed */}
      {isZoomed && imageUrl && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-150 select-none"
          onClick={() => setIsZoomed(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image zoom preview"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsZoomed(false)
            }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/30 hover:border-white/60 text-white flex items-center justify-center transition-colors cursor-pointer z-50 shadow-lg"
            aria-label="Close zoom preview"
          >
            <X size={18} />
          </button>
          <div
            className="relative max-h-[88vh] max-w-[92vw] flex items-center justify-center p-2 rounded-2xl"
            style={{ backgroundColor: slide.backgroundColor ? slide.backgroundColor : 'transparent' }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageUrl}
              alt={`${slide.key} chart original`}
              className="max-h-[88vh] max-w-[92vw] w-auto h-auto object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
