import { create } from 'zustand'
import i18n from '@/i18n'

export type Language   = 'fr' | 'en' | 'ko' | 'vi'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type GamePhase  =
  | 'language_select'
  | 'difficulty_select'
  | 'phrase_display'
  | 'recording'
  | 'processing'
  | 'success'
  | 'failure'
  | 'timeout'
  | 'leaderboard'

export interface Phrase {
  id: number
  language: Language
  country: string
  text: string
  difficulty: Difficulty
  timer_s: number
}

export const TIMER_MS: Record<Difficulty, number> = {
  easy:   30_000,
  medium: 20_000,
  hard:   10_000,
}

export const ACCURACY_THRESHOLD: Record<Language, number> = {
  fr: 0.72,
  en: 0.75,
  ko: 0.68,
  vi: 0.65,
}

interface GameState {
  phase:      GamePhase
  language:   Language | null
  difficulty: Difficulty | null
  phrase:     Phrase | null
  transcript: string
  accuracy:   number
  wordScores: number[]
  elapsedMs:  number
  score:      number | null
  playerName: string
}

interface GameActions {
  selectLanguage:   (lang: Language) => void
  selectDifficulty: (diff: Difficulty) => void
  setPhrase:        (phrase: Phrase) => void
  startRecording:   () => void
  stopRecording:    () => void
  setResult:        (transcript: string, accuracy: number, wordScores: number[], elapsedMs: number) => void
  timeout:          () => void
  retry:            () => void
  setPlayerName:    (name: string) => void
  goToLeaderboard:  () => void
  reset:            () => void
}

const initialState: GameState = {
  phase:      'language_select',
  language:   null,
  difficulty: null,
  phrase:     null,
  transcript: '',
  accuracy:   0,
  wordScores: [],
  elapsedMs:  0,
  score:      null,
  playerName: '',
}

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  ...initialState,

  selectLanguage: (lang) => {
    i18n.changeLanguage(lang)
    set({ language: lang, phase: 'difficulty_select' })
  },

  selectDifficulty: (diff) => set({ difficulty: diff, phase: 'phrase_display' }),

  setPhrase: (phrase) => set({ phrase }),

  startRecording: () => set({
    phase: 'recording', elapsedMs: 0, transcript: '', accuracy: 0, wordScores: [],
  }),

  stopRecording: () => set({ phase: 'processing' }),

  setResult: (transcript, accuracy, wordScores, elapsedMs) => {
    const { language, phrase } = get()
    const threshold = ACCURACY_THRESHOLD[language ?? 'en']
    const success   = accuracy >= threshold
    const score     = success && phrase
      ? Math.round(accuracy * 1000) + Math.floor(Math.max(0, phrase.timer_s - elapsedMs / 1000)) * 10
      : null
    set({ transcript, accuracy, wordScores, elapsedMs, phase: success ? 'success' : 'failure', score })
  },

  timeout: () => set({ phase: 'timeout' }),

  retry: () => set({ phase: 'phrase_display', transcript: '', accuracy: 0, wordScores: [], elapsedMs: 0, score: null }),

  setPlayerName: (playerName) => set({ playerName }),

  goToLeaderboard: () => set({ phase: 'leaderboard' }),

  reset: () => set({ ...initialState }),
}))
