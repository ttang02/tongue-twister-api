import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import type { Difficulty } from '@/store/gameStore'

const OPTIONS: { value: Difficulty; emoji: string; hint_key: string; desc: string }[] = [
  { value: 'easy',   emoji: '🟢', hint_key: 'difficulty.easy_hint',   desc: 'Pour se réchauffer' },
  { value: 'medium', emoji: '🟡', hint_key: 'difficulty.medium_hint', desc: 'Le vrai défi' },
  { value: 'hard',   emoji: '🔴', hint_key: 'difficulty.hard_hint',   desc: 'Pour les experts' },
]

interface Props {
  onSelect: (diff: Difficulty) => void
}

export function DifficultyPicker({ onSelect }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
      {OPTIONS.map(({ value, emoji, hint_key, desc }, i) => (
        <motion.button
          key={value}
          onClick={() => onSelect(value)}
          className="glass flex items-center justify-between px-5 py-4 rounded-2xl
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 text-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, type: 'spring', stiffness: 280, damping: 22 }}
          whileHover={{ scale: 1.03, borderColor: 'rgb(var(--p) / 0.5)' }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="flex items-center gap-4">
            <span className="text-2xl">{emoji}</span>
            <div>
              <p className="font-bold text-white text-base">{t(`difficulty.${value}`)}</p>
              <p className="text-slate-400 text-xs">{desc}</p>
            </div>
          </div>
          <span
            className="text-sm font-mono font-bold px-3 py-1 rounded-lg"
            style={{ background: 'rgb(var(--p) / 0.15)', color: 'rgb(var(--p))' }}
          >
            {t(hint_key)}
          </span>
        </motion.button>
      ))}
    </div>
  )
}
