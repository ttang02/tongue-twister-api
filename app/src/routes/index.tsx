import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Mic } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { LanguagePicker } from '@/components/LanguagePicker'
import { DifficultyPicker } from '@/components/DifficultyPicker'
import { useGameStore } from '@/store/gameStore'
import { useCountUp } from '@/hooks/useCountUp'
import { useShallow } from 'zustand/react/shallow'
import type { Language, Difficulty } from '@/store/gameStore'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const phase    = useGameStore((s) => s.phase)
  const language = useGameStore((s) => s.language)
  const { selectLanguage, selectDifficulty } = useGameStore(useShallow((s) => ({
    selectLanguage:   s.selectLanguage,
    selectDifficulty: s.selectDifficulty,
  })))

  const { data: phraseCount } = useQuery({
    queryKey: ['phrase-count'],
    queryFn: async () => {
      const res  = await fetch(`${API_URL}/phrases?limit=1`)
      const json = await res.json() as { total: number }
      return json.total
    },
    staleTime: 60 * 60_000,
  })
  const animatedCount = useCountUp(phraseCount ?? 0, 1000)

  const handleLanguage = (lang: Language) => selectLanguage(lang)

  const handleDifficulty = (diff: Difficulty) => {
    selectDifficulty(diff)
    navigate({ to: '/game' })
  }

  const showLang = phase === 'language_select'
  const showDiff = phase === 'difficulty_select'
  const stepNumber = showDiff ? 2 : 1
  const stepLabel  = showDiff ? t('home.step_difficulty') : t('home.step_language')

  return (
    <div className="flex flex-col items-center gap-8 w-full slide-up">

      {/* Hero */}
      <div className="text-center space-y-3">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full neon-pulse select-none"
          style={{ background: 'rgb(var(--p) / 0.15)', color: 'rgb(var(--p))' }}
          aria-hidden
        >
          <Mic size={36} strokeWidth={2} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight glow-text font-display"
            style={{ color: 'rgb(var(--p))' }}>
          {t('home.title')}
        </h1>
        <p className="text-slate-400 text-base md:text-lg max-w-sm mx-auto leading-relaxed">
          {t('home.subtitle')}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgb(var(--p) / 0.1)', color: 'rgb(var(--p) / 0.7)', border: '1px solid rgb(var(--p) / 0.2)' }}
        >
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] font-black"
            style={{ background: 'rgb(var(--p))' }}
            aria-hidden
          >
            {stepNumber}
          </span>
          {stepLabel}
        </div>
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        {showLang && (
          <motion.div
            key="lang"
            className="w-full flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <LanguagePicker onSelect={handleLanguage} />
          </motion.div>
        )}

        {showDiff && (
          <motion.div
            key="diff"
            className="w-full flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={() => useGameStore.setState({ phase: 'language_select' })}
              className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              &larr; {t('home.choose_language')}
            </button>
            <DifficultyPicker onSelect={handleDifficulty} language={language} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer hint */}
      <div className="flex items-center gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="tabular-nums font-semibold text-slate-500">
            {phraseCount ? animatedCount : '—'}
          </span>
          virelangues
        </span>
        <span className="w-px h-3 bg-white/10" />
        <span>4 langues</span>
        <span className="w-px h-3 bg-white/10" />
        <span>tous devices</span>
      </div>
    </div>
  )
}
