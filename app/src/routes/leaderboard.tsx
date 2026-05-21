import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { ScoreBoard } from '@/components/ScoreBoard'
import { useGameStore } from '@/store/gameStore'
import type { Language, Difficulty } from '@/store/gameStore'

export const Route = createFileRoute('/leaderboard')({ component: LeaderboardPage })

const LANGS: { code: Language; flag: string; label: string }[] = [
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'en', flag: '🇺🇸', label: 'EN' },
  { code: 'ko', flag: '🇰🇷', label: 'KO' },
  { code: 'vi', flag: '🇻🇳', label: 'VI' },
]

const DIFFICULTIES: { value: Difficulty | undefined; label: string }[] = [
  { value: undefined,  label: 'Tous' },
  { value: 'easy',    label: '🟢' },
  { value: 'medium',  label: '🟡' },
  { value: 'hard',    label: '🔴' },
]

function LeaderboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language: storeLanguage, difficulty: storeDifficulty, reset } = useGameStore()

  const lang = storeLanguage ?? 'fr'
  const diff = storeDifficulty

  const handleReset = () => {
    reset()
    navigate({ to: '/' })
  }

  return (
    <motion.div
      className="flex flex-col gap-6 w-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-white">{t('leaderboard.title')}</h1>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <RefreshCw size={14} />
          {t('game.play_again')}
        </button>
      </div>

      {/* Language tabs */}
      <div className="flex gap-2 flex-wrap">
        {LANGS.map((l) => (
          <Link
            key={l.code}
            to="/leaderboard"
            onClick={() => useGameStore.setState({ language: l.code })}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${lang === l.code
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'}
            `}
          >
            {l.flag} {l.label}
          </Link>
        ))}
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.value ?? 'all'}
            onClick={() => useGameStore.setState({ difficulty: d.value })}
            className={`
              px-3 py-1.5 rounded-lg text-sm transition-colors
              ${diff === d.value
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-slate-800 text-slate-400 hover:text-white'}
            `}
          >
            {d.label}
          </button>
        ))}
      </div>

      <ScoreBoard language={lang} difficulty={diff} />
    </motion.div>
  )
}
