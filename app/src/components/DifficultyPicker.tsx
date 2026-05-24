import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Zap, Flame, Skull } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { Difficulty } from '@/store/gameStore'
import type { Language } from '@/store/gameStore'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const OPTIONS: {
  value: Difficulty
  icon: ReactNode
  iconBg: string
  iconColor: string
  hint_key: string
  desc: string
}[] = [
  {
    value: 'easy',
    icon: <Zap size={20} strokeWidth={2.5} />,
    iconBg: 'rgba(74,222,128,0.15)',
    iconColor: '#4ade80',
    hint_key: 'difficulty.easy_hint',
    desc: 'Pour se réchauffer',
  },
  {
    value: 'medium',
    icon: <Flame size={20} strokeWidth={2.5} />,
    iconBg: 'rgba(251,191,36,0.15)',
    iconColor: '#fbbf24',
    hint_key: 'difficulty.medium_hint',
    desc: 'Le vrai défi',
  },
  {
    value: 'hard',
    icon: <Skull size={20} strokeWidth={2.5} />,
    iconBg: 'rgba(248,113,113,0.15)',
    iconColor: '#f87171',
    hint_key: 'difficulty.hard_hint',
    desc: 'Pour les experts',
  },
]

interface Props {
  onSelect: (diff: Difficulty) => void
  language: Language | null
}

export function DifficultyPicker({ onSelect, language }: Props) {
  const { t } = useTranslation()

  const { data: counts } = useQuery({
    queryKey: ['phrase-counts', language],
    queryFn: async () => {
      if (!language) return {} as Record<string, number>
      const results = await Promise.all(
        (['easy', 'medium', 'hard'] as const).map(diff =>
          fetch(`${API_URL}/phrases?lang=${language}&difficulty=${diff}&limit=1`)
            .then(r => r.json() as Promise<{ total: number }>)
            .then(j => [diff, j.total] as const)
        )
      )
      return Object.fromEntries(results) as Record<string, number>
    },
    enabled: !!language,
    staleTime: 60 * 60_000,
  })

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
      {OPTIONS.map(({ value, icon, iconBg, iconColor, hint_key, desc }, i) => (
        <motion.button
          key={value}
          onClick={() => onSelect(value)}
          className="glass flex items-center justify-between px-5 py-4 rounded-2xl cursor-pointer
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 text-left
                     hover:bg-white/8 transition-colors duration-200"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, type: 'spring', stiffness: 280, damping: 22 }}
          whileHover={{ y: -3, boxShadow: `0 8px 28px rgba(255,255,255,0.06)` }}
          whileTap={{ scale: 0.97, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: iconBg, color: iconColor }}
            >
              {icon}
            </div>
            <div>
              <p className="font-bold text-white text-base">{t(`difficulty.${value}`)}</p>
              <p className="text-slate-400 text-xs">{desc}</p>
              {counts?.[value] !== undefined && counts[value] > 0 && (
                <p className="text-slate-500 text-xs tabular-nums">{counts[value]} phrases</p>
              )}
            </div>
          </div>
          <span
            className="text-sm font-mono font-bold px-3 py-1 rounded-lg shrink-0"
            style={{ background: 'rgb(var(--p) / 0.15)', color: 'rgb(var(--p))' }}
          >
            {t(hint_key)}
          </span>
        </motion.button>
      ))}
    </div>
  )
}
