import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Edit2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Trade } from '../../domain/trade'
import { TradeRepository } from '../../data/trade-repository'
import { getEmotionById } from '../../domain/emotions'
import { SlideCard, STEP_LABELS } from './SlideCard'

interface TradeRecapRowProps {
  trade: Trade
  repository?: TradeRepository
}

export function TradeRecapRow({ trade, repository }: TradeRecapRowProps) {
  const visibleSlides = trade.slides.filter((s) => !s.skip && s.key !== 'execution')
  const isPositive = trade.result !== undefined && trade.result >= 0
  const isNegative = trade.result !== undefined && trade.result < 0

  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null)
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (zoomedIndex === null) {
      setZoomedImageUrl(null)
      return
    }

    const currentSlide = visibleSlides[zoomedIndex]
    if (!currentSlide || !currentSlide.imageId || !repository) {
      setZoomedImageUrl(null)
      return
    }

    let isCancelled = false
    let url: string | null = null

    repository.getImage(currentSlide.imageId).then((blob) => {
      if (!isCancelled && blob) {
        url = URL.createObjectURL(blob)
        setZoomedImageUrl(url)
      }
    })

    return () => {
      isCancelled = true
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [zoomedIndex, visibleSlides, repository])

  useEffect(() => {
    if (zoomedIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomedIndex(null)
      } else if (e.key === 'ArrowLeft') {
        setZoomedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))
      } else if (e.key === 'ArrowRight') {
        setZoomedIndex((prev) => (prev !== null && prev < visibleSlides.length - 1 ? prev + 1 : prev))
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [zoomedIndex, visibleSlides.length])

  const currentSlide = zoomedIndex !== null ? visibleSlides[zoomedIndex] : null
  const currentStepName = currentSlide ? STEP_LABELS[currentSlide.key] || currentSlide.key.toUpperCase() : ''

  return (
    <div
      className="trade-recap-row bg-bg-panel border border-border rounded-lg p-4 sm:p-5 flex flex-col gap-3.5 shadow-sm hover:border-text-muted/40 transition-colors"
      data-testid="trade-recap-row"
    >
      {/* Trade Recap Header */}
      <div className="recap-row-header flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-border/70 select-none">
        <div className="recap-header-left flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <span className="recap-ticker text-base sm:text-lg font-bold text-text-strong font-mono tracking-tight">
            {trade.ticker}
          </span>

          {trade.side && (
            <span
              className={`side-badge text-[11px] font-bold px-2 py-0.5 rounded tracking-wide uppercase border ${
                trade.side.toLowerCase() === 'long'
                  ? 'bg-accent-green/10 text-accent-green border-accent-green/25'
                  : 'bg-accent-red/10 text-accent-red border-accent-red/25'
              }`}
            >
              {trade.side}
            </span>
          )}

          {trade.session && (
            <span className="session-badge text-[11px] font-medium px-2 py-0.5 rounded bg-bg-muted text-text-muted border border-border/80">
              {trade.session}
            </span>
          )}

          {trade.emotions && trade.emotions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {trade.emotions.map((id) => {
                const e = getEmotionById(id)
                if (!e) return null
                return (
                  <span
                    key={id}
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      e.category === 'tilt'
                        ? 'bg-accent-red/10 border-accent-red/30 text-accent-red'
                        : 'bg-white/5 border-white/10 text-text-muted'
                    }`}
                  >
                    {e.emoji} {e.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        <div className="recap-header-right flex items-center gap-3 sm:gap-4 tabular-nums">
          {trade.result !== undefined && (
            <span
              className={`recap-result text-base sm:text-lg font-bold ${
                isPositive
                  ? 'text-accent-green'
                  : isNegative
                  ? 'text-accent-red'
                  : 'text-text-strong'
              }`}
            >
              {trade.result >= 0 ? `+$${trade.result.toFixed(2)}` : `-$${Math.abs(trade.result).toFixed(2)}`}
            </span>
          )}

          {trade.rMultiple !== undefined && (
            <span
              className={`recap-r text-base sm:text-lg font-bold font-mono ${
                trade.rMultiple > 0
                  ? 'text-accent-green'
                  : trade.rMultiple < 0
                  ? 'text-accent-red'
                  : 'text-text-muted'
              }`}
            >
              {trade.rMultiple > 0 ? `+${trade.rMultiple}R` : `${trade.rMultiple}R`}
            </span>
          )}

          <Link
            to={`/trades/${trade.id}`}
            className="btn-edit-recap inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded text-text-muted hover:text-text-strong hover:bg-white/[0.06] border border-border transition-colors"
            title="Edit trade"
          >
            <Edit2 size={13} />
            <span>Edit</span>
          </Link>
        </div>
      </div>

      {/* Slide Cards Strip: 4 slides aligned across the card */}
      <div className="recap-slides-strip grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full pt-1">
        {visibleSlides.map((slide, idx) => (
          <SlideCard
            key={slide.key}
            slide={slide}
            repository={repository}
            onZoom={() => setZoomedIndex(idx)}
          />
        ))}
      </div>

      {/* Lightbox Zoom Layer for Original Uploaded Image */}
      {zoomedIndex !== null && currentSlide && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-150 select-none"
          onClick={() => setZoomedIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Original image zoom preview"
        >
          {/* Top-Right Close Button matching mockup */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setZoomedIndex(null)
            }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/30 hover:border-white/60 text-white flex items-center justify-center transition-colors cursor-pointer z-50 shadow-lg"
            aria-label="Close zoom preview"
          >
            <X size={18} />
          </button>

          {/* Top Info Pill */}
          <div
            className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 border border-white/20 text-xs font-mono text-white/90 shadow-xl backdrop-blur-md z-40"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-accent-blue font-bold">{trade.ticker}</span>
            <span className="text-white/40">|</span>
            <span className="text-text-strong font-semibold">{currentSlide.timeframe || currentStepName}</span>
            {visibleSlides.length > 1 && (
              <>
                <span className="text-white/40">·</span>
                <span className="text-text-muted text-[11px]">{zoomedIndex + 1} / {visibleSlides.length}</span>
              </>
            )}
          </div>

          {/* Left Arrow if prev slide exists */}
          {zoomedIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setZoomedIndex(zoomedIndex - 1)
              }}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 hover:border-white/40 text-white flex items-center justify-center transition-colors cursor-pointer z-50 shadow-lg"
              aria-label="Previous slide"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Right Arrow if next slide exists */}
          {zoomedIndex < visibleSlides.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setZoomedIndex(zoomedIndex + 1)
              }}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 hover:border-white/40 text-white flex items-center justify-center transition-colors cursor-pointer z-50 shadow-lg"
              aria-label="Next slide"
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Center Original Uploaded Image */}
          <div
            className="relative max-h-[85vh] max-w-[90vw] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {zoomedImageUrl ? (
              <img
                src={zoomedImageUrl}
                alt={`${currentSlide.key} original`}
                className="max-h-[85vh] max-w-[90vw] w-auto h-auto object-contain rounded-xl shadow-2xl"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-text-muted p-12 bg-bg-panel/90 rounded-xl border border-border">
                <span className="text-sm font-medium">Loading original chart...</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
