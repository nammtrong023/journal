import React, { useRef } from 'react'
import { Pipette } from 'lucide-react'

export interface ColorPreset {
  hex: string
  label: string
  borderClass: string
}

export const CHART_COLOR_PRESETS: ColorPreset[] = [
  { hex: '#ffffff', label: 'Light (White)', borderClass: 'border-slate-300' },
  { hex: '#f8f9fa', label: 'Warm Off-White', borderClass: 'border-slate-300' },
  { hex: '#131722', label: 'TV Dark', borderClass: 'border-slate-600' },
  { hex: '#12131a', label: 'Slate Navy (Default)', borderClass: 'border-slate-700' },
]

export interface ChartColorPaletteProps {
  selectedColor?: string
  onChange: (color: string) => void
  label?: string
  compact?: boolean
  className?: string
}

export function ChartColorPalette({
  selectedColor = '#12131a',
  onChange,
  label,
  compact = false,
  className = '',
}: ChartColorPaletteProps) {
  const colorInputRef = useRef<HTMLInputElement | null>(null)
  const normalizedCurrent = selectedColor.toLowerCase()

  const isPresetSelected = CHART_COLOR_PRESETS.some(
    (p) => p.hex.toLowerCase() === normalizedCurrent
  )

  const handleCustomPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.toLowerCase())
  }

  const handleEyeDropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper()
        const result = await eyeDropper.open()
        if (result?.sRGBHex) {
          onChange(result.sRGBHex.toLowerCase())
        }
      } catch {
        // User cancelled eyedropper
      }
    } else {
      colorInputRef.current?.click()
    }
  }

  return (
    <div
      className={`chart-color-palette flex items-center gap-2 ${className}`}
      role="group"
      aria-label={label || 'Chart background color'}
    >
      {label && (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted select-none">
          {label}
        </span>
      )}

      <div className="flex items-center gap-1.5 p-1 bg-bg-muted/80 rounded-lg border border-border/70 shadow-xs">
        {CHART_COLOR_PRESETS.map((preset) => {
          const isSelected = preset.hex.toLowerCase() === normalizedCurrent
          return (
            <button
              key={preset.hex}
              type="button"
              title={preset.label}
              aria-label={`Select ${preset.label}`}
              aria-pressed={isSelected}
              onClick={() => onChange(preset.hex)}
              className={`color-swatch-btn relative rounded-full transition-all cursor-pointer flex items-center justify-center ${
                compact ? 'w-4 h-4' : 'w-5 h-5'
              } ${preset.borderClass} border ${
                isSelected
                  ? 'ring-2 ring-accent-blue scale-110 shadow-sm'
                  : 'hover:scale-105 opacity-85 hover:opacity-100'
              }`}
              style={{ backgroundColor: preset.hex }}
            >
              {isSelected && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    preset.hex === '#ffffff' || preset.hex === '#f8f9fa'
                      ? 'bg-black'
                      : 'bg-white'
                  }`}
                />
              )}
            </button>
          )
        })}

        {/* Custom / Eyedropper Button */}
        <div className="relative flex items-center ml-0.5 pl-1 border-l border-border/50">
          <button
            type="button"
            title="Custom / Eyedropper color"
            aria-label="Custom or sample color"
            onClick={handleEyeDropper}
            className={`color-picker-btn rounded-full border transition-all cursor-pointer flex items-center justify-center ${
              compact ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-[10px]'
            } ${
              !isPresetSelected
                ? 'ring-2 ring-accent-blue border-accent-blue scale-110 text-accent-blue shadow-sm'
                : 'border-border text-text-muted hover:text-text-strong hover:border-accent-blue/50'
            }`}
            style={!isPresetSelected ? { backgroundColor: normalizedCurrent } : undefined}
          >
            <Pipette
              size={compact ? 10 : 12}
              className={
                !isPresetSelected && (normalizedCurrent === '#ffffff' || normalizedCurrent === '#f8f9fa')
                  ? 'text-black'
                  : !isPresetSelected
                  ? 'text-white'
                  : 'currentColor'
              }
            />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={normalizedCurrent.startsWith('#') ? normalizedCurrent : '#12131a'}
            onChange={handleCustomPickerChange}
            className="sr-only opacity-0 absolute pointer-events-none w-0 h-0"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}
