import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import { ScoreBoard } from '@/components/ScoreBoard'
import { useGameStore } from '@/store/gameStore'
import { LANG_THEME } from '@/constants/themes'
import type { Language, Difficulty } from '@/store/gameStore'

export const Route = createFileRoute('/leaderboard')({ component: LeaderboardPage })

const DIFFICULTIES: { value: Difficulty | undefined; label: string; dot?: string }[] = [
  { value: undefined, label: 'Tous' },
  { value: 'easy',   label: 'Facile',   dot: '#4ade80' },
  { value: 'medium', label: 'Moyen',    dot: '#fbbf24' },
  { value: 'hard',   label: 'Difficile', dot: '#f87171' },
]

function LeaderboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language: storeLang, difficulty: storeDiff, reset } = useGameStore()

  const lang = storeLang ?? 'fr'
  const diff = storeDiff

  const handleReset = () => { reset(); navigate({ to: '/' }) }

  return (
    <motion.div
      className="flex flex-col gap-6 w-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-white font-display">{t('leaderboard.title')}</h1>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <RotateCcw size={14} />
          <span className="hidden sm:inline">{t('game.play_again')}</span>
        </button>
      </div>

      {/* Language tabs */}
      <div className="flex gap-2 flex-wrap">
        {(Object.entries(LANG_THEME) as [Language, typeof LANG_THEME[Language]][]).map(([code, theme]) => {
          const active = lang === code
          return (
            <button
              key={code}
              onClick={() => useGameStore.setState({ language: code, difficulty: undefined })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                         transition-colors duration-200 cursor-pointer"
              style={{
                background: active ? `rgb(${theme.primary})` : 'rgba(255,255,255,0.07)',
                color:      active ? '#fff' : '#94a3b8',
              }}
            >
              {theme.flag} {code.toUpperCase()}
            </button>
          )
        })}
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-2 flex-wrap">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.value ?? 'all'}
            onClick={() => useGameStore.setState({ difficulty: d.value })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                       transition-colors duration-200 cursor-pointer"
            style={{
              background: diff === d.value ? 'rgb(var(--p) / 0.2)' : 'rgba(255,255,255,0.05)',
              color:      diff === d.value ? 'rgb(var(--p))' : '#94a3b8',
              fontWeight: diff === d.value ? '600' : '400',
            }}
          >
            {d.dot && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: d.dot }}
              />
            )}
            {d.label}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <ScoreBoard language={lang} difficulty={diff} />
      </div>
    </motion.div>
  )
}
