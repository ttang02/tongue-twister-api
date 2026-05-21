import { useTranslation } from 'react-i18next'
import type { Difficulty } from '@/store/gameStore'

const OPTIONS: { value: Difficulty; emoji: string; hint_key: string }[] = [
  { value: 'easy',   emoji: '🟢', hint_key: 'difficulty.easy_hint' },
  { value: 'medium', emoji: '🟡', hint_key: 'difficulty.medium_hint' },
  { value: 'hard',   emoji: '🔴', hint_key: 'difficulty.hard_hint' },
]

interface Props {
  onSelect: (diff: Difficulty) => void
}

export function DifficultyPicker({ onSelect }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
      {OPTIONS.map(({ value, emoji, hint_key }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className="
            flex items-center justify-between px-6 py-4 rounded-2xl
            bg-slate-800 border border-slate-700
            hover:border-indigo-500 hover:bg-slate-700
            active:scale-95 transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
          "
        >
          <span className="flex items-center gap-3 text-lg font-bold text-white">
            <span>{emoji}</span>
            {t(`difficulty.${value}`)}
          </span>
          <span className="text-slate-400 text-sm">{t(hint_key)}</span>
        </button>
      ))}
    </div>
  )
}
