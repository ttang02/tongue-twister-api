import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
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
  fr: 0.85,
  en: 0.88,
  ko: 0.80,
  vi: 0.75,
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

export const useGameStore = create<GameState & GameActions>()(
  immer((set) => ({
    ...initialState,

    selectLanguage: (lang) => set((s) => {
      s.language = lang
      s.phase    = 'difficulty_select'
      i18n.changeLanguage(lang)
    }),

    selectDifficulty: (diff) => set((s) => {
      s.difficulty = diff
      s.phase      = 'phrase_display'
    }),

    setPhrase: (phrase) => set((s) => {
      s.phrase = phrase
    }),

    startRecording: () => set((s) => {
      s.phase      = 'recording'
      s.elapsedMs  = 0
      s.transcript = ''
      s.accuracy   = 0
      s.wordScores = []
    }),

    stopRecording: () => set((s) => {
      s.phase = 'processing'
    }),

    setResult: (transcript, accuracy, wordScores, elapsedMs) => set((s) => {
      const threshold = ACCURACY_THRESHOLD[s.language ?? 'en']
      s.transcript = transcript
      s.accuracy   = accuracy
      s.wordScores = wordScores
      s.elapsedMs  = elapsedMs
      s.phase      = accuracy >= threshold ? 'success' : 'failure'
      if (accuracy >= threshold && s.phrase) {
        const remaining_s = Math.max(0, s.phrase.timer_s - elapsedMs / 1000)
        s.score = Math.round(accuracy * 1000) + Math.floor(remaining_s) * 10
      }
    }),

    timeout: () => set((s) => { s.phase = 'timeout' }),

    retry: () => set((s) => {
      s.phase      = 'phrase_display'
      s.transcript = ''
      s.accuracy   = 0
      s.wordScores = []
      s.elapsedMs  = 0
      s.score      = null
    }),

    setPlayerName: (name) => set((s) => { s.playerName = name }),

    goToLeaderboard: () => set((s) => { s.phase = 'leaderboard' }),

    reset: () => set(() => ({ ...initialState })),
  }))
)
