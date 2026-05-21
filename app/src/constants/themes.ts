export type Language = 'fr' | 'en' | 'ko' | 'vi'

export interface LangTheme {
  flag:     string
  label:    string
  native:   string
  sample:   string
  // RGB triplets for CSS custom properties (no #)
  primary:  string   // e.g. "59 130 246"
  dark:     string   // deep bg tint
  mid:      string   // mid bg tint
  hex:      string   // for canvas / JS usage
}

export const LANG_THEME: Record<Language, LangTheme> = {
  fr: {
    flag: '🇫🇷', label: 'Français', native: 'Français',
    sample: 'Un chasseur sachant chasser…',
    primary: '59 130 246',    // blue-500
    dark:    '12 26 58',
    mid:     '30 58 138',
    hex:     '#3b82f6',
  },
  en: {
    flag: '🇺🇸', label: 'English', native: 'English',
    sample: 'She sells seashells…',
    primary: '239 68 68',     // red-500
    dark:    '50 10 10',
    mid:     '127 29 29',
    hex:     '#ef4444',
  },
  ko: {
    flag: '🇰🇷', label: 'Korean', native: '한국어',
    sample: '간장 공장 공장장…',
    primary: '234 179 8',     // yellow-500
    dark:    '45 35 5',
    mid:     '113 87 4',
    hex:     '#eab308',
  },
  vi: {
    flag: '🇻🇳', label: 'Vietnamese', native: 'Tiếng Việt',
    sample: 'Lúa nếp là lúa nếp nàng…',
    primary: '34 197 94',     // green-500
    dark:    '5 40 20',
    mid:     '20 83 45',
    hex:     '#22c55e',
  },
}

export const DEFAULT_THEME: LangTheme = {
  flag: '🎤', label: '', native: '', sample: '',
  primary: '99 102 241',   // indigo-500
  dark:    '15 23 42',
  mid:     '30 27 75',
  hex:     '#6366f1',
}
