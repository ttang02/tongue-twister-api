import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface Props {
  onDone: () => void
}

const SLIDES = [
  {
    emoji: '🌍',
    title: 'Choisis ta langue',
    body:  'Français, English, 한국어 ou Tiếng Việt — chaque langue a ses propres virelangues.',
    hint:  'Des phrases conçues pour être difficiles à prononcer !',
  },
  {
    emoji: '🎤',
    title: 'Parle dans le micro',
    body:  'Appuie sur le bouton, prononce la phrase le plus vite possible, puis relâche pour valider.',
    hint:  'L\'application reconnaît ta voix et vérifie la prononciation.',
  },
  {
    emoji: '⚡',
    title: 'Vitesse + Précision = Score',
    body:  'Plus tu es rapide et précis, plus ton score est élevé. Si le temps est écoulé ou la prononciation incorrecte, c\'est raté !',
    hint:  'Sois le premier du classement dans ta langue.',
  },
]

export function Onboarding({ onDone }: Props) {
  const [slide, setSlide] = useState(0)
  const isLast = slide === SLIDES.length - 1
  const current = SLIDES[slide]!

  const next = () => {
    if (isLast) onDone()
    else setSlide((s) => s + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <motion.div
        className="glass w-full max-w-sm rounded-3xl p-8 flex flex-col gap-6 shadow-2xl"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width:           i === slide ? '2rem' : '0.5rem',
                backgroundColor: i === slide ? 'rgb(var(--p))' : 'rgba(255,255,255,0.2)',
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            className="text-center space-y-3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <div className="text-6xl">{current.emoji}</div>
            <h2 className="text-2xl font-extrabold text-white">{current.title}</h2>
            <p className="text-slate-300 leading-relaxed">{current.body}</p>
            <p className="text-sm rounded-xl px-4 py-2 text-slate-400"
               style={{ background: 'rgb(var(--p) / 0.12)' }}>
              💡 {current.hint}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onDone}
            className="flex-1 py-3 rounded-xl text-slate-400 text-sm hover:text-white transition-colors"
          >
            Passer
          </button>
          <button
            onClick={next}
            className="flex-2 btn-primary py-3 px-6 rounded-xl text-base"
            style={{ flex: 2 }}
          >
            {isLast ? 'C\'est parti ! 🎤' : 'Suivant →'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
