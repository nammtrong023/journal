import { DEFAULT_EMOTIONS, EmotionTag } from '../../domain/emotions'

interface EmotionSelectorProps {
  selectedIds?: string[]
  onChange: (ids: string[]) => void
  emotions?: EmotionTag[]
}

export function EmotionSelector({
  selectedIds = [],
  onChange,
  emotions = DEFAULT_EMOTIONS,
}: EmotionSelectorProps) {
  const toggleEmotion = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className="emotion-selector mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          HOW WERE YOU FEELING?
        </label>
        <span className="text-[11px] text-text-muted/70">
          (select all that apply)
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {emotions.map((item) => {
          const isSelected = selectedIds.includes(item.id)
          const isTilt = item.category === 'tilt'

          let selectedClasses = 'bg-accent-blue/15 text-text-strong border-accent-blue/40 shadow-xs font-semibold'
          if (isTilt) {
            selectedClasses = 'bg-accent-red/15 text-accent-red border-accent-red/40 shadow-xs font-semibold'
          } else {
            selectedClasses = 'bg-accent-green/15 text-accent-green border-accent-green/40 shadow-xs font-semibold'
          }

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggleEmotion(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer border ${
                isSelected
                  ? selectedClasses
                  : 'bg-bg-muted/80 text-text-muted border-border hover:bg-bg-panel hover:text-text-strong hover:border-text-muted/40'
              }`}
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
