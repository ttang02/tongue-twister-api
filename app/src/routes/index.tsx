import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Mic } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { LanguagePicker } from '@/components/LanguagePicker'
import { DifficultyPicker } from '@/components/DifficultyPicker'
import { useGameStore } from '@/store/gameStore'
import type { Language, Difficulty } from '@/store/gameStore'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const { phase, selectLanguage, selectDifficulty } = useGameStore()

  const { data: phraseCount } = useQuery({
    queryKey: ['phrase-count'],
    queryFn: async () => {
      const res  = await fetch(`${API_URL}/phrases?limit=1`)
      const json = await res.json() as { total: number }
      return json.total
    },
    staleTime: 60 * 60_000,
  })

  const handleLanguage = (lang: Language) => selectLanguage(lang)

  const handleDifficulty = (diff: Difficulty) => {
    selectDifficulty(diff)
    navigate({ to: '/game' })
  }

  const showLang = phase === 'language_select'
  const showDiff = phase === 'difficulty_select'

  return (
    <div className="flex flex-col items-center gap-8 w-full slide-up">

      {/* Hero */}
      <div className="text-center space-y-3">
        <motion.div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full neon-pulse select-none"
          style={{ background: 'rgb(var(--p) / 0.15)', color: 'rgb(var(--p))' }}
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ delay: 0.9, duration: 0.7, ease: 'easeInOut' }}
          aria-hidden
        >
          <Mic size={36} strokeWidth={2} />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient glow-text font-display">
          {t('home.title')}
        </h1>
        <p className="text-slate-400 text-base md:text-lg max-w-sm mx-auto leading-relaxed">
          {t('home.subtitle')}
        </p>
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
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 max-w-[4rem]" style={{ background: 'rgb(var(--p)/0.25)' }} />
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                {t('home.choose_language')}
              </p>
              <span className="h-px flex-1 max-w-[4rem]" style={{ background: 'rgb(var(--p)/0.25)' }} />
            </div>
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
              ← {t('home.choose_language')}
            </button>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 max-w-[4rem]" style={{ background: 'rgb(var(--p)/0.25)' }} />
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                {t('difficulty.title')}
              </p>
              <span className="h-px flex-1 max-w-[4rem]" style={{ background: 'rgb(var(--p)/0.25)' }} />
            </div>
            <DifficultyPicker onSelect={handleDifficulty} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer hint */}
      <p className="text-slate-600 text-xs text-center">
        {phraseCount ?? 84} virelangues · 4 langues · tous devices
      </p>
    </div>
  )
}
