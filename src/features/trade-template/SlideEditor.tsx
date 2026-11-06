import React, { useEffect, useRef, useState } from 'react'
import { Slide } from '../../domain/trade'
import { SlideDefinition } from './template-definition'
import { TradeRepository } from '../../data/trade-repository'
import { UploadCloud, CheckCircle2 } from 'lucide-react'
import { ChartColorPalette } from './ChartColorPalette'
import { detectChartBackgroundColor } from './image-color-detector'

interface SlideEditorProps {
  definition: SlideDefinition
  slide: Slide
  slideIndex: number
  totalSlides: number
  isActive: boolean
  tempFile?: File
  repository?: TradeRepository
  onChange: (updated: Slide) => void
  onImageFileSelected: (file: File) => void
  onImageCleared: () => void
}

export function SlideEditor({
  definition,
  slide,
  slideIndex,
  totalSlides,
  isActive,
  tempFile,
  repository,
  onChange,
  onImageFileSelected,
  onImageCleared,
}: SlideEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Manage preview object URL
  useEffect(() => {
    let url: string | null = null
    let isCancelled = false

    if (tempFile) {
      url = URL.createObjectURL(tempFile)
      setPreviewUrl(url)
    } else if (slide.imageId && repository) {
      repository.getImage(slide.imageId).then((blob) => {
        if (!isCancelled && blob) {
          url = URL.createObjectURL(blob)
          setPreviewUrl(url)
        }
      })
    } else {
      setPreviewUrl(null)
    }

    return () => {
      isCancelled = true
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [tempFile, slide.imageId, repository])

  // Support paste when active
  useEffect(() => {
    if (!isActive) return

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile()
          if (file) {
            handleImageFile(file)
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [isActive, slide, onChange, onImageFileSelected])

  const handleImageFile = async (file: File) => {
    onImageFileSelected(file)
    // Run zero-friction edge color auto-picker
    try {
      const detectedColor = await detectChartBackgroundColor(file)
      if (detectedColor) {
        onChange({
          ...slide,
          backgroundColor: detectedColor,
        })
      }
    } catch {
      // Ignore detection failure
    }
  }

  const handleBackgroundColorChange = (color: string) => {
    onChange({
      ...slide,
      backgroundColor: color,
    })
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange({
      ...slide,
      value: e.target.value,
    })
  }

  const handleTimeframeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...slide,
      timeframe: e.target.value,
    })
  }

  const handleSubtitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...slide,
      subtitle: e.target.value,
    })
  }

  const handleFitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...slide,
      fit: e.target.value as 'contain' | 'cover',
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const inputId = `chart-file-input-${definition.key}`

  return (
    <div
      className={`slide-editor-card flex-1 h-full flex flex-col ${slide.skip ? 'skipped' : ''}`}
      style={{ display: isActive ? 'flex' : 'none' }}
      data-testid="slide-editor"
    >
      <fieldset className="lathyrus-fieldset flex-1 h-full bg-bg-panel border border-border rounded-lg p-5 flex flex-col gap-3.5 shadow-sm">
        <legend className="lathyrus-legend text-xs font-bold uppercase tracking-wider text-accent-blue px-1">
          Slide {slideIndex + 1} of {totalSlides}
        </legend>

        {/* Screenshot Drop Area */}
        <div
          className={`lathyrus-dropzone border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all select-none ${
            isDragOver
              ? 'drag-over border-accent-blue bg-accent-blue/10 scale-[1.01]'
              : previewUrl
              ? 'has-image border-border/80 bg-bg-muted hover:border-accent-blue/50'
              : 'border-border/80 bg-bg-muted/70 hover:border-accent-blue/50 hover:bg-bg-muted'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {previewUrl ? (
            <div className="dropzone-preview-box flex flex-col items-center gap-2">
              <div
                className="h-[120px] w-full max-w-[280px] rounded overflow-hidden p-1 flex items-center justify-center transition-colors border border-border/50"
                style={{ backgroundColor: slide.backgroundColor || '#12131a' }}
              >
                <img
                  src={previewUrl}
                  alt={`${definition.title} screenshot`}
                  className={`dropzone-thumb max-h-full max-w-full rounded object-contain ${
                    slide.fit === 'cover' ? 'fit-cover' : 'fit-contain'
                  }`}
                />
              </div>
              <span className="dropzone-change-text text-[11px] font-semibold text-accent-blue hover:underline">
                Click or drop to replace
              </span>
            </div>
          ) : (
            <div className="dropzone-empty-text flex flex-col items-center justify-center py-5 text-text-muted gap-2">
              <UploadCloud size={24} className="text-text-muted/60" />
              <span className="text-xs font-medium">Click, drop or paste the screenshot</span>
              <span className="text-[10px] text-text-muted/60">Supports PNG, JPG, WebP</span>
            </div>
          )}
        </div>

        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="visually-hidden hidden"
          aria-label={`Upload screenshot for ${definition.title}`}
        />

        <div className="dropzone-res-hint text-[11px] text-text-muted/80 flex items-center justify-between font-mono">
          <div className="flex items-center gap-1.5">
            {previewUrl ? (
              <>
                <CheckCircle2 size={13} className="text-accent-green" />
                <span>Screenshot loaded.</span>
              </>
            ) : (
              <span>No screenshot yet.</span>
            )}
          </div>
          <ChartColorPalette
            selectedColor={slide.backgroundColor || '#12131a'}
            onChange={handleBackgroundColorChange}
            compact
          />
        </div>

        {/* Fit & Remove Row */}
        <div className="lathyrus-form-row flex gap-3">
          <div className="field-col flex-1 flex flex-col gap-1.5 min-w-0">
            <label htmlFor={`fit-${definition.key}`} className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Fit
            </label>
            <select
              id={`fit-${definition.key}`}
              value={slide.fit || 'contain'}
              onChange={handleFitChange}
              className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-medium focus:border-accent-blue focus:outline-none transition-colors"
            >
              <option value="contain">Contain</option>
              <option value="cover">Fill and crop</option>
            </select>
          </div>
          <div className="field-col remove-btn-col flex-1 flex flex-col justify-end gap-1.5 min-w-0">
            <button
              type="button"
              className="btn-lathyrus-ghost w-full py-2 px-3 text-xs font-medium rounded-md bg-bg-muted border border-border text-text-muted hover:text-text-strong hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={onImageCleared}
              disabled={!previewUrl}
            >
              Remove
            </button>
          </div>
        </div>

        {/* Slide name & Chart timeframe */}
        <div className="lathyrus-form-row flex gap-3">
          <div className="field-col flex-1 flex flex-col gap-1.5 min-w-0">
            <label htmlFor={`name-${definition.key}`} className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Slide name
            </label>
            <input
              id={`name-${definition.key}`}
              type="text"
              defaultValue={definition.title}
              readOnly
              className="w-full bg-bg-muted/60 border border-border/80 rounded-md px-3 py-2 text-xs text-text-muted font-medium cursor-not-allowed"
            />
          </div>
          <div className="field-col flex-1 flex flex-col gap-1.5 min-w-0">
            <label htmlFor={`tf-${definition.key}`} className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Chart timeframe
            </label>
            <input
              id={`tf-${definition.key}`}
              type="text"
              value={slide.timeframe}
              onChange={handleTimeframeChange}
              placeholder={definition.defaultTimeframe}
              className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-mono focus:border-accent-blue focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Value Field */}
        {definition.inputType !== 'none' && (
          <div className="field-group flex flex-col gap-1.5">
            <label htmlFor={`val-${definition.key}`} className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              {definition.title}
            </label>
            {definition.inputType === 'select' ? (
              <select
                id={`val-${definition.key}`}
                value={typeof slide.value === 'string' ? slide.value : ''}
                onChange={handleValueChange}
                className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-medium focus:border-accent-blue focus:outline-none transition-colors"
              >
                <option value="">Select...</option>
                {definition.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : definition.inputType === 'number' ? (
              <input
                id={`val-${definition.key}`}
                type="number"
                step="any"
                value={typeof slide.value === 'string' || typeof slide.value === 'number' ? slide.value : ''}
                onChange={handleValueChange}
                placeholder="e.g. 2 or 2.5"
                className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-mono focus:border-accent-blue focus:outline-none transition-colors"
              >
              </input>
            ) : (
              <input
                id={`val-${definition.key}`}
                type="text"
                value={typeof slide.value === 'string' ? slide.value : ''}
                onChange={handleValueChange}
                placeholder="e.g. SMT, PD Array, 4H FVG"
                className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong focus:border-accent-blue focus:outline-none transition-colors"
              />
            )}
          </div>
        )}

        {/* Second Line (Subtitle) */}
        <div className="field-group flex flex-col gap-1.5">
          <label htmlFor={`sub-${definition.key}`} className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Second line
          </label>
          <input
            id={`sub-${definition.key}`}
            type="text"
            value={slide.subtitle}
            onChange={handleSubtitleChange}
            placeholder="optional, small grey text"
            className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong focus:border-accent-blue focus:outline-none transition-colors"
          />
        </div>
      </fieldset>
    </div>
  )
}
