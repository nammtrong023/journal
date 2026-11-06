import React, { useEffect, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { SlideKey } from '../../domain/trade'
import { TradeRepository } from '../../data/trade-repository'

interface ChartImageInputProps {
  slideKey: SlideKey
  imageId?: string
  tempFile?: File
  fit: 'contain' | 'cover'
  repository?: TradeRepository
  onImageSelected: (file: File) => void
  onImageCleared: () => void
  onFitChanged: (fit: 'contain' | 'cover') => void
}

export function ChartImageInput({
  slideKey,
  imageId,
  tempFile,
  fit,
  repository,
  onImageSelected,
  onImageCleared,
  onFitChanged,
}: ChartImageInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    let url: string | null = null
    let isCancelled = false

    if (tempFile) {
      url = URL.createObjectURL(tempFile)
      setPreviewUrl(url)
    } else if (imageId && repository) {
      repository.getImage(imageId).then((blob) => {
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
  }, [tempFile, imageId, repository])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImageSelected(file)
    }
  }

  const inputId = `chart-input-${slideKey}`

  return (
    <div className="chart-image-input-container">
      {previewUrl ? (
        <div className="image-preview-wrapper">
          <img
            src={previewUrl}
            alt={`${slideKey} chart preview`}
            className={`preview-img fit-${fit}`}
          />
          <div className="image-overlay-controls">
            <button
              type="button"
              className="fit-toggle-btn"
              onClick={() => onFitChanged(fit === 'contain' ? 'cover' : 'contain')}
              title={`Switch to ${fit === 'contain' ? 'Cover' : 'Contain'}`}
            >
              Fit: {fit}
            </button>
            <button
              type="button"
              className="remove-img-btn"
              onClick={onImageCleared}
              aria-label="Remove image"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <label htmlFor={inputId} className="image-dropzone">
          <ImagePlus size={20} />
          <span>Add chart image (optional)</span>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="visually-hidden"
          />
        </label>
      )}
    </div>
  )
}
