import { motion } from 'motion/react'

interface Props {
  onDone: () => void
}

export function Onboarding({ onDone }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
    >
      <motion.div
        className="glass w-full max-w-lg rounded-3xl p-6 flex flex-col gap-5 shadow-2xl"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Comic image */}
        <img
          src="/how-to-play.png"
          alt="Comment jouer — 1. Choisis ta langue, 2. Lis le virelangue, 3. Parle dans le micro, 4. Obtiens ton score !"
          className="w-full rounded-2xl"
          loading="eager"
        />

        {/* CTA */}
        <button
          onClick={onDone}
          className="btn-primary w-full py-3.5 rounded-xl text-base font-bold"
        >
          C'est parti ! 🎤
        </button>
      </motion.div>
    </div>
  )
}
