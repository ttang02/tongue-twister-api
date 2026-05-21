import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { LanguagePicker } from '@/components/LanguagePicker'
import { DifficultyPicker } from '@/components/DifficultyPicker'
import { useGameStore } from '@/store/gameStore'
import type { Language, Difficulty } from '@/store/gameStore'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { phase, selectLanguage, selectDifficulty } = useGameStore()

  const handleLanguage = (lang: Language) => {
    selectLanguage(lang)
  }

  const handleDifficulty = (diff: Difficulty) => {
    selectDifficulty(diff)
    navigate({ to: '/game' })
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-8 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          {t('home.title')}
        </h1>
        <p className="text-slate-400">{t('home.subtitle')}</p>
      </div>

      {phase === 'language_select' || phase === 'difficulty_select' ? (
        phase === 'language_select' ? (
          <>
            <p className="text-slate-300 font-medium">{t('home.choose_language')}</p>
            <LanguagePicker onSelect={handleLanguage} />
          </>
        ) : (
          <>
            <p className="text-slate-300 font-medium">{t('difficulty.title')}</p>
            <DifficultyPicker onSelect={handleDifficulty} />
          </>
        )
      ) : null}
    </motion.div>
  )
}
