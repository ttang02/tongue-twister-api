import { motion } from 'motion/react'
import { LANG_THEME, type Language } from '@/constants/themes'

interface Props {
  onSelect: (lang: Language) => void
}

const LANGS = Object.entries(LANG_THEME) as [Language, typeof LANG_THEME[Language]][]

export function LanguagePicker({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 w-full max-w-lg mx-auto">
      {LANGS.map(([code, theme], i) => (
        <motion.button
          key={code}
          onClick={() => onSelect(code)}
          className="flex flex-col items-center gap-3 p-5 rounded-2xl glass text-left cursor-pointer
                     focus-visible:outline-none focus-visible:ring-2 hover:bg-white/8 transition-colors duration-200"
          style={{
            borderColor: `rgb(${theme.primary} / 0.35)`,
            '--tw-ring-color': `rgb(${theme.primary} / 0.6)`,
          } as React.CSSProperties}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 24 }}
          whileHover={{ scale: 1.04, borderColor: `rgb(${theme.primary})` }}
          whileTap={{ scale: 0.97 }}
          aria-label={`Jouer en ${theme.label}`}
        >
          {/* Glow dot */}
          <div className="flex items-center gap-2 self-start">
            <span className="text-3xl">{theme.flag}</span>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: `rgb(${theme.primary})` }}
            />
          </div>
          <div>
            <p className="font-extrabold text-white text-lg leading-tight">{theme.native}</p>
            <p className="text-slate-400 text-xs mt-1 line-clamp-2">{theme.sample}</p>
          </div>
        </motion.button>
      ))}
    </div>
  )
}
