import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock i18n before importing the store (store calls i18n.changeLanguage on selectLanguage)
vi.mock('@/i18n', () => ({ default: { changeLanguage: vi.fn() } }))

import { useGameStore, ACCURACY_THRESHOLD, DIFF_MULTIPLIER, TIMER_MS } from './gameStore'

const samplePhrase = {
  id:         1,
  language:   'fr' as const,
  country:    'FR',
  text:       'Les chaussettes de l\'archiduchesse',
  difficulty: 'medium' as const,
  timer_s:    20,
}

beforeEach(() => {
  useGameStore.getState().reset()
})

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts at language_select', () => {
    expect(useGameStore.getState().phase).toBe('language_select')
  })

  it('has null language and difficulty', () => {
    const { language, difficulty } = useGameStore.getState()
    expect(language).toBeNull()
    expect(difficulty).toBeNull()
  })

  it('has zeroed session counters', () => {
    const { sessionScore, sessionCount, sessionStreak } = useGameStore.getState()
    expect(sessionScore).toBe(0)
    expect(sessionCount).toBe(0)
    expect(sessionStreak).toBe(0)
  })
})

// ─── State machine transitions ────────────────────────────────────────────────

describe('selectLanguage', () => {
  it('transitions to difficulty_select', () => {
    useGameStore.getState().selectLanguage('fr')
    expect(useGameStore.getState().phase).toBe('difficulty_select')
  })

  it('sets the language', () => {
    useGameStore.getState().selectLanguage('ko')
    expect(useGameStore.getState().language).toBe('ko')
  })
})

describe('selectDifficulty', () => {
  it('transitions to phrase_display', () => {
    useGameStore.getState().selectLanguage('en')
    useGameStore.getState().selectDifficulty('hard')
    expect(useGameStore.getState().phase).toBe('phrase_display')
  })

  it('sets the difficulty', () => {
    useGameStore.getState().selectDifficulty('medium')
    expect(useGameStore.getState().difficulty).toBe('medium')
  })
})

describe('startRecording / stopRecording', () => {
  it('startRecording transitions to recording', () => {
    useGameStore.getState().startRecording()
    expect(useGameStore.getState().phase).toBe('recording')
  })

  it('startRecording resets transcript and accuracy', () => {
    useGameStore.setState({ transcript: 'old', accuracy: 0.9 })
    useGameStore.getState().startRecording()
    expect(useGameStore.getState().transcript).toBe('')
    expect(useGameStore.getState().accuracy).toBe(0)
  })

  it('stopRecording transitions to processing', () => {
    useGameStore.getState().startRecording()
    useGameStore.getState().stopRecording()
    expect(useGameStore.getState().phase).toBe('processing')
  })
})

describe('setResult — success', () => {
  beforeEach(() => {
    useGameStore.getState().selectLanguage('fr')
    useGameStore.getState().selectDifficulty('medium')
    useGameStore.getState().setPhrase(samplePhrase)
  })

  it('transitions to success when accuracy ≥ threshold', () => {
    useGameStore.getState().setResult('les chaussettes', 0.95, [0.95], 5000)
    expect(useGameStore.getState().phase).toBe('success')
  })

  it('calculates score using formula', () => {
    // elapsed 5s → remaining 15s, accuracy 0.95
    // score = round((round(0.95*1000) + floor(15)*10) * 1.5)
    // = round((950 + 150) * 1.5) = round(1650) = 1650
    useGameStore.getState().setResult('les chaussettes', 0.95, [0.95], 5000)
    expect(useGameStore.getState().score).toBe(1650)
  })

  it('increments sessionScore, sessionCount, sessionStreak', () => {
    useGameStore.getState().setResult('les chaussettes', 0.95, [0.95], 5000)
    const { sessionScore, sessionCount, sessionStreak } = useGameStore.getState()
    expect(sessionCount).toBe(1)
    expect(sessionStreak).toBe(1)
    expect(sessionScore).toBeGreaterThan(0)
  })

  it('accumulates sessionScore across rounds', () => {
    useGameStore.getState().setResult('les chaussettes', 0.95, [0.95], 5000)
    const first = useGameStore.getState().sessionScore
    useGameStore.getState().retry()
    useGameStore.getState().setResult('les chaussettes', 0.95, [0.95], 5000)
    expect(useGameStore.getState().sessionScore).toBe(first * 2)
  })
})

describe('setResult — failure', () => {
  beforeEach(() => {
    useGameStore.getState().selectLanguage('fr')
    useGameStore.getState().selectDifficulty('easy')
    useGameStore.getState().setPhrase({ ...samplePhrase, difficulty: 'easy' })
  })

  it('transitions to failure when accuracy < threshold', () => {
    useGameStore.getState().setResult('wrong words', 0.3, [0.3], 5000)
    expect(useGameStore.getState().phase).toBe('failure')
  })

  it('sets score to null on failure', () => {
    useGameStore.getState().setResult('wrong words', 0.3, [0.3], 5000)
    expect(useGameStore.getState().score).toBeNull()
  })

  it('resets streak to 0 on failure', () => {
    useGameStore.setState({ sessionStreak: 3 })
    useGameStore.getState().setResult('wrong words', 0.3, [0.3], 5000)
    expect(useGameStore.getState().sessionStreak).toBe(0)
  })

  it('does not change sessionScore or sessionCount on failure', () => {
    useGameStore.setState({ sessionScore: 500, sessionCount: 2 })
    useGameStore.getState().setResult('wrong words', 0.3, [0.3], 5000)
    expect(useGameStore.getState().sessionScore).toBe(500)
    expect(useGameStore.getState().sessionCount).toBe(2)
  })
})

describe('timeout', () => {
  it('transitions to timeout', () => {
    useGameStore.getState().timeout()
    expect(useGameStore.getState().phase).toBe('timeout')
  })
})

describe('retry', () => {
  it('returns to phrase_display', () => {
    useGameStore.getState().setResult('wrong', 0.1, [0.1], 5000)
    useGameStore.getState().retry()
    expect(useGameStore.getState().phase).toBe('phrase_display')
  })

  it('clears transcript and accuracy', () => {
    useGameStore.setState({ transcript: 'hello', accuracy: 0.8 })
    useGameStore.getState().retry()
    expect(useGameStore.getState().transcript).toBe('')
    expect(useGameStore.getState().accuracy).toBe(0)
  })

  it('does NOT reset streak on retry', () => {
    useGameStore.setState({ sessionStreak: 3 })
    useGameStore.getState().retry()
    expect(useGameStore.getState().sessionStreak).toBe(3)
  })
})

describe('reset', () => {
  it('restores initial state', () => {
    useGameStore.getState().selectLanguage('vi')
    useGameStore.getState().selectDifficulty('hard')
    useGameStore.setState({ sessionScore: 1000, sessionStreak: 5 })
    useGameStore.getState().reset()
    const s = useGameStore.getState()
    expect(s.phase).toBe('language_select')
    expect(s.language).toBeNull()
    expect(s.difficulty).toBeNull()
    expect(s.sessionScore).toBe(0)
    expect(s.sessionStreak).toBe(0)
  })
})

// ─── Constants sanity checks ──────────────────────────────────────────────────

describe('constants', () => {
  it('ACCURACY_THRESHOLD has an entry for every language', () => {
    for (const lang of ['fr', 'en', 'ko', 'vi'] as const) {
      expect(ACCURACY_THRESHOLD[lang]).toBeGreaterThan(0)
      expect(ACCURACY_THRESHOLD[lang]).toBeLessThan(1)
    }
  })

  it('DIFF_MULTIPLIER increases with difficulty', () => {
    expect(DIFF_MULTIPLIER.easy).toBeLessThan(DIFF_MULTIPLIER.medium)
    expect(DIFF_MULTIPLIER.medium).toBeLessThan(DIFF_MULTIPLIER.hard)
  })

  it('TIMER_MS decreases with difficulty', () => {
    expect(TIMER_MS.easy).toBeGreaterThan(TIMER_MS.medium)
    expect(TIMER_MS.medium).toBeGreaterThan(TIMER_MS.hard)
  })
})
