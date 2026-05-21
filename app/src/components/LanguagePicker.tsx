import type { Language } from '@/store/gameStore'

interface LangOption {
  code:    Language
  flag:    string
  label:   string
  native:  string
  sample:  string
}

const OPTIONS: LangOption[] = [
  { code: 'fr', flag: '🇫🇷', label: 'Français',    native: 'Français',    sample: 'Un chasseur sachant chasser…' },
  { code: 'en', flag: '🇺🇸', label: 'English',      native: 'English',     sample: 'She sells seashells…' },
  { code: 'ko', flag: '🇰🇷', label: 'Korean',       native: '한국어',       sample: '간장 공장 공장장…' },
  { code: 'vi', flag: '🇻🇳', label: 'Vietnamese',   native: 'Tiếng Việt',  sample: 'Lúa nếp là lúa nếp nàng…' },
]

interface Props {
  onSelect: (lang: Language) => void
}

export function LanguagePicker({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 w-full max-w-lg mx-auto">
      {OPTIONS.map((opt) => (
        <button
          key={opt.code}
          onClick={() => onSelect(opt.code)}
          className="
            flex flex-col items-center gap-2 p-5 rounded-2xl
            bg-slate-800 border border-slate-700
            hover:border-indigo-500 hover:bg-slate-700
            active:scale-95 transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
          "
          aria-label={`Jouer en ${opt.label}`}
        >
          <span className="text-4xl" role="img" aria-hidden>{opt.flag}</span>
          <span className="font-bold text-white text-lg">{opt.native}</span>
          <span className="text-slate-400 text-xs text-center line-clamp-2">{opt.sample}</span>
        </button>
      ))}
    </div>
  )
}
