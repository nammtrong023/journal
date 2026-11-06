export type EmotionCategory = 'positive' | 'neutral' | 'tilt'

export interface EmotionTag {
  id: string
  label: string
  emoji: string
  category: EmotionCategory
}

export const DEFAULT_EMOTIONS: EmotionTag[] = [
  { id: 'calm', label: 'Calm', emoji: '😌', category: 'positive' },
  { id: 'focused', label: 'Focused', emoji: '🎯', category: 'positive' },
  { id: 'disciplined', label: 'Disciplined', emoji: '💪', category: 'positive' },
  { id: 'confident', label: 'Confident', emoji: '🚀', category: 'positive' },
  { id: 'tired', label: 'Tired', emoji: '😴', category: 'neutral' },
  { id: 'uncertain', label: 'Uncertain', emoji: '🤔', category: 'neutral' },
  { id: 'anxious', label: 'Anxious', emoji: '😰', category: 'tilt' },
  { id: 'fearful', label: 'Fearful', emoji: '😨', category: 'tilt' },
  { id: 'greedy', label: 'Greedy', emoji: '🤑', category: 'tilt' },
  { id: 'frustrated', label: 'Frustrated', emoji: '🥱', category: 'tilt' },
  { id: 'impulsive', label: 'Impulsive', emoji: '🎲', category: 'tilt' },
  { id: 'revenge_trading', label: 'Revenge Trading', emoji: '🤬', category: 'tilt' },
]

export function getEmotionById(id: string): EmotionTag | undefined {
  return DEFAULT_EMOTIONS.find((e) => e.id === id)
}
