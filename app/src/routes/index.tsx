import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { LanguagePicker } from '@/components/LanguagePicker'
import { DifficultyPicker } from '@/components/DifficultyPicker'
import { useGameStore } from '@/store/gameStore'
import type { Language, Difficulty } from '@/store/gameStore'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const { phase, language, selectLanguage, selectDifficulty } = useGameStore()

  const handleLanguage = (lang: Language) => selectLanguage(lang)

  const handleDifficulty = (diff: Difficulty) => {
    selectDifficulty(diff)
    navigate({ to: '/game' })
  }

  const showLang = phase === 'language_select'
  const showDiff = phase === 'difficulty_select'

  return (
    <div className="flex flex-col items-center gap-8 w-full slide-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          className="text-6xl mb-2"
          animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          🎤
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
          {t('home.title')}
        </h1>
        <p className="text-slate-400 text-lg">{t('home.subtitle')}</p>
      </div>

      {showLang && (
        <motion.div
          className="w-full flex flex-col items-center gap-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-slate-300 font-semibold text-sm uppercase tracking-widest">
            {t('home.choose_language')}
          </p>
          <LanguagePicker onSelect={handleLanguage} />
        </motion.div>
      )}

      {showDiff && (
        <motion.div
          className="w-full flex flex-col items-center gap-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => useGameStore.setState({ phase: 'language_select' })}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            ← Changer de langue
          </button>
          <p className="text-slate-300 font-semibold text-sm uppercase tracking-widest">
            {t('difficulty.title')}
          </p>
          <DifficultyPicker onSelect={handleDifficulty} />
        </motion.div>
      )}
    </div>
  )
}
