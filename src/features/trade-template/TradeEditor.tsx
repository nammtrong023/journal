import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Slide, SlideKey } from '../../domain/trade'
import { TradeRepository, defaultRepository, TradeDateError } from '../../data/trade-repository'
import { SLIDE_DEFINITIONS, makeDefaultSlides } from './template-definition'
import { SlideEditor } from './SlideEditor'
import { SlideCanvasPreview } from './SlideCanvasPreview'
import { EmotionSelector } from './EmotionSelector'
import { Trash2, AlertCircle, ArrowLeft } from 'lucide-react'

export const TICKER_GROUPS = [
  {
    group: 'Indices',
    options: [
      { value: 'NQ', label: 'NQ' },
      { value: 'ES', label: 'ES' },
      { value: 'YM', label: 'YM' },
      { value: 'RTY', label: 'RTY' },
    ],
  },
  {
    group: 'Metals',
    options: [
      { value: 'GC', label: 'GC' },
      { value: 'SI', label: 'SI' },
    ],
  },
  {
    group: 'Energy',
    options: [
      { value: 'CL', label: 'CL' },
    ],
  },
]

export const ALL_TICKER_VALUES = TICKER_GROUPS.flatMap((g) => g.options.map((o) => o.value))

interface TradeEditorProps {
  tradeId?: string
  repository?: TradeRepository
}

export function TradeEditor({ tradeId: propTradeId, repository = defaultRepository }: TradeEditorProps) {
  const navigate = useNavigate()
  const params = useParams<{ tradeId?: string }>()
  const [searchParams] = useSearchParams()

  const activeTradeId = propTradeId || params.tradeId
  const isEditing = Boolean(activeTradeId)

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const initialDate = searchParams.get('date') || todayStr

  const [tradeDate, setTradeDate] = useState<string>(initialDate)
  const [ticker, setTicker] = useState<string>('')
  const [side, setSide] = useState<'Long' | 'Short' | ''>('Long')
  const [session, setSession] = useState<string>('New York AM')
  const [result, setResult] = useState<string>('')
  const [rMultiple, setRMultiple] = useState<string>('')
  const [emotions, setEmotions] = useState<string[]>([])

  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0)
  const [slides, setSlides] = useState<Slide[]>(makeDefaultSlides())
  const [pendingImages, setPendingImages] = useState<Map<SlideKey, File>>(new Map())

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)

  useEffect(() => {
    if (activeTradeId) {
      repository.get(activeTradeId).then((trade) => {
        if (trade) {
          setTradeDate(trade.tradeDate)
          setTicker(trade.ticker)
          setSide(trade.side)
          setSession(trade.session || '')
          setResult(trade.result !== undefined ? String(trade.result) : '')
          setRMultiple(trade.rMultiple !== undefined ? String(trade.rMultiple) : '')
          if (trade.emotions) {
            setEmotions(trade.emotions)
          }

          if (trade.slides && trade.slides.length > 0) {
            setSlides(trade.slides.filter((s) => s.key !== 'execution'))
          }
        }
      })
    }
  }, [activeTradeId, repository])

  const handleSlideChange = (updatedSlide: Slide) => {
    setSlides((prev) =>
      prev.map((s) => (s.key === updatedSlide.key ? updatedSlide : s))
    )
  }

  const handleRMultipleChange = (val: string) => {
    setRMultiple(val)
  }

  const handleImageSelected = (key: SlideKey, file: File) => {
    setPendingImages((prev) => new Map(prev).set(key, file))
  }

  const handleImageCleared = (key: SlideKey) => {
    setPendingImages((prev) => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
    setSlides((prev) =>
      prev.map((s) => (s.key === key ? { ...s, imageId: undefined } : s))
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const tradeId = activeTradeId || crypto.randomUUID()
      const updatedSlides = [...slides]

      // Upload any pending images
      for (const [key, file] of pendingImages.entries()) {
        try {
          const imageId = await repository.putImage(tradeId, key, file)
          const idx = updatedSlides.findIndex((s) => s.key === key)
          if (idx !== -1) {
            updatedSlides[idx] = { ...updatedSlides[idx], imageId }
          }
        } catch {
          setError('Failed to save chart image. Please try again.')
          setIsSubmitting(false)
          return
        }
      }

      const numResult = result.trim() === '' ? undefined : Number(result)
      const numRMultiple = rMultiple.trim() === '' ? undefined : Number(rMultiple)

      if (isEditing && activeTradeId) {
        await repository.update(activeTradeId, {
          tradeDate,
          ticker: ticker.toUpperCase(),
          side,
          session,
          result: numResult,
          rMultiple: numRMultiple,
          emotions,
          slides: updatedSlides,
        })
      } else {
        await repository.create({
          id: tradeId,
          tradeDate,
          ticker: ticker.toUpperCase(),
          side,
          session,
          result: numResult,
          rMultiple: numRMultiple,
          emotions,
          slides: updatedSlides,
        })
      }

      navigate('/calendar')
    } catch (err: any) {
      if (err instanceof TradeDateError || err.name === 'TradeDateError') {
        setError(err.message)
      } else {
        setError(err.message || 'An error occurred while saving trade')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!activeTradeId) return
    try {
      await repository.delete(activeTradeId)
      navigate('/calendar')
    } catch (err: any) {
      setError(err.message || 'Failed to delete trade')
    }
  }

  return (
    <div className="trade-editor-page flex-1 flex flex-col p-4 lg:p-6 lg:px-8 space-y-5 max-w-[1440px] mx-auto w-full">
      <form onSubmit={handleSave} className="flex-1 flex flex-col space-y-5">
        {/* Top Header */}
      <div className="editor-header flex items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div className="editor-brand-header flex items-center gap-3">
          <Link
            to="/calendar"
            className="flex items-center justify-center w-8 h-8 rounded-md bg-bg-panel border border-border text-text-muted hover:text-text-strong hover:bg-white/[0.04] transition-colors shrink-0"
            title="Back to Calendar"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-baseline gap-2.5">
            <h1 className="editor-title text-xl font-bold text-text-strong tracking-tight m-0">
              {isEditing ? 'Edit Trade' : 'New Trade'}
            </h1>
            <span className="editor-subtitle text-xs text-text-muted hidden sm:inline">
              • 4-Slide Chart Recap Builder
            </span>
          </div>
        </div>

        <div className="editor-actions flex items-center gap-2.5">
          {isEditing && (
            <button
              type="button"
              className="btn-danger-outline inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-accent-red bg-accent-red/10 border border-accent-red/25 hover:bg-accent-red/20 active:scale-[0.98] transition-all cursor-pointer select-none"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={14} />
              <span>Delete trade</span>
            </button>
          )}
          <button
            type="button"
            className="btn-secondary px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-bg-panel text-text-muted hover:text-text-strong hover:bg-white/[0.04] transition-all cursor-pointer select-none"
            onClick={() => navigate('/calendar')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary inline-flex items-center justify-center px-5 py-2 text-xs font-bold rounded-lg bg-accent-blue text-white hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed select-none min-w-[110px]"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save trade'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="alert-error flex items-center gap-3 p-3.5 rounded-lg bg-accent-red/15 border border-accent-red/30 text-accent-red text-xs font-medium"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="trade-editor-grid">
          {/* COLUMN 1: Trade Form */}
          <div className="col-trade flex flex-col h-full">
            <fieldset className="lathyrus-fieldset flex-1 h-full bg-bg-panel border border-border rounded-lg p-5 flex flex-col gap-3.5 shadow-sm">
              <legend className="lathyrus-legend text-xs font-bold uppercase tracking-wider text-accent-blue px-1">
                Trade
              </legend>

              <div className="field-group flex flex-col gap-1.5">
                <label htmlFor="tradeDate" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Trade date
                </label>
                <input
                  id="tradeDate"
                  name="tradeDate"
                  type="date"
                  max={todayStr}
                  value={tradeDate}
                  onChange={(e) => setTradeDate(e.target.value)}
                  required
                  className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-mono focus:border-accent-blue focus:outline-none transition-colors"
                />
              </div>

              <div className="lathyrus-form-row flex gap-3">
                <div className="field-col flex-1 flex flex-col gap-1.5 min-w-0">
                  <label htmlFor="ticker" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Ticker
                  </label>
                  <select
                    id="ticker"
                    name="ticker"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    required
                    className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-mono uppercase focus:border-accent-blue focus:outline-none transition-colors"
                  >
                    {!ticker && <option value="">Select Ticker...</option>}
                    {TICKER_GROUPS.map((grp) => (
                      <optgroup key={grp.group} label={grp.group}>
                        {grp.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {ticker && !ALL_TICKER_VALUES.includes(ticker) && (
                      <option value={ticker}>{ticker}</option>
                    )}
                  </select>
                </div>
                <div className="field-col flex-1 flex flex-col gap-1.5 min-w-0">
                  <label htmlFor="side" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Position
                  </label>
                  <select
                    id="side"
                    name="side"
                    value={side}
                    onChange={(e) => setSide(e.target.value as 'Long' | 'Short' | '')}
                    className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-medium focus:border-accent-blue focus:outline-none transition-colors"
                  >
                    <option value="Long">Long</option>
                    <option value="Short">Short</option>
                    <option value="">Hidden</option>
                  </select>
                </div>
              </div>

              <div className="field-group flex flex-col gap-1.5">
                <label htmlFor="session" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Session
                </label>
                <select
                  id="session"
                  name="session"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-medium focus:border-accent-blue focus:outline-none transition-colors"
                >
                  <option value="Asia">Asia</option>
                  <option value="London">London</option>
                  <option value="New York AM">New York AM</option>
                  <option value="New York PM">New York PM</option>
                </select>
              </div>

              <div className="field-group flex flex-col gap-1.5">
                <label htmlFor="rMultiple" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  R Multiple
                </label>
                <input
                  id="rMultiple"
                  name="rMultiple"
                  type="number"
                  step="any"
                  placeholder="e.g. 2.5 or -1"
                  value={rMultiple}
                  onChange={(e) => handleRMultipleChange(e.target.value)}
                  className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-mono focus:border-accent-blue focus:outline-none transition-colors"
                />
              </div>

              <EmotionSelector selectedIds={emotions} onChange={setEmotions} />
            </fieldset>
          </div>

          {/* COLUMN 2: Slide Editor Tabs + Active Slide */}
          <div className="col-slide flex flex-col h-full">
            <div className="lathyrus-tabs grid grid-cols-4 gap-1.5 mb-3 select-none" role="tablist" aria-label="Slide tabs">
              {SLIDE_DEFINITIONS.map((def, idx) => {
                const slide = slides.find((s) => s.key === def.key)
                const hasImage = Boolean(pendingImages.has(def.key) || slide?.imageId)
                const isCurrent = idx === activeSlideIndex
                const isSkipped = Boolean(slide?.skip)
                return (
                  <button
                    key={def.key}
                    type="button"
                    role="tab"
                    aria-selected={isCurrent}
                    className={`lathyrus-tab-btn flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      isCurrent
                        ? 'active bg-accent-blue/15 border-accent-blue/50 text-accent-blue shadow-xs'
                        : 'bg-bg-panel border-border text-text-muted hover:text-text-strong hover:bg-white/[0.03]'
                    } ${isSkipped ? 'skipped opacity-40' : ''} ${hasImage ? 'has-image' : ''}`}
                    onClick={() => setActiveSlideIndex(idx)}
                  >
                    <div className="flex items-center gap-1">
                      <b className={`font-mono text-xs ${isCurrent ? 'text-accent-blue' : hasImage ? 'text-accent-green' : 'text-text-muted'}`}>
                        {String(idx + 1).padStart(2, '0')}
                      </b>
                      {hasImage && <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />}
                    </div>
                    <span className="text-[10px] font-medium tracking-tight truncate w-full mt-0.5">
                      {def.shortTitle}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="slide-editors-stack flex-1 flex flex-col min-h-0">
              {SLIDE_DEFINITIONS.map((def, idx) => {
                const slide = slides.find((s) => s.key === def.key) || {
                  key: def.key,
                  value: '',
                  timeframe: def.defaultTimeframe,
                  subtitle: def.defaultSubtitle,
                  fit: 'contain',
                  skip: false,
                }
                return (
                  <SlideEditor
                    key={def.key}
                    definition={def}
                    slide={slide}
                    slideIndex={idx}
                    totalSlides={SLIDE_DEFINITIONS.length}
                    isActive={idx === activeSlideIndex}
                    tempFile={pendingImages.get(def.key)}
                    repository={repository}
                    onChange={handleSlideChange}
                    onImageFileSelected={(file) => handleImageSelected(def.key, file)}
                    onImageCleared={() => handleImageCleared(def.key)}
                  />
                )
              })}
            </div>
          </div>

          {/* COLUMN 3: Live Canvas Preview */}
          <div className="col-preview flex flex-col h-full">
            <SlideCanvasPreview
              trade={{
                ticker,
                side,
                session,
                result: result.trim() === '' ? undefined : Number(result),
                rMultiple: rMultiple.trim() === '' ? undefined : Number(rMultiple),
              }}
              slides={slides}
              activeSlideIndex={activeSlideIndex}
              pendingImages={pendingImages}
              repository={repository}
            />
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="modal-box bg-bg-panel border border-border rounded-xl p-6 max-w-[420px] w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red shrink-0">
                <Trash2 size={20} />
              </div>
              <h3 id="modal-title" className="text-base font-bold text-text-strong m-0">
                Delete Trade
              </h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed m-0">
              Are you sure you want to delete this trade and all its chart images? This action cannot be undone.
            </p>
            <div className="modal-actions flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
              <button
                type="button"
                className="btn-secondary px-3.5 py-1.5 text-xs font-semibold rounded-md bg-bg-muted border border-border text-text-muted hover:text-text-strong hover:bg-white/[0.04] transition-colors cursor-pointer"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger px-3.5 py-1.5 text-xs font-semibold rounded-md bg-accent-red text-white hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                onClick={handleDelete}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
