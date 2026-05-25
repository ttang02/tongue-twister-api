import { describe, it, expect } from 'vitest'
import {
  jaroWinkler,
  normalizeWord,
  expandCompounds,
  computeAccuracy,
  WORD_CORRECT,
  WORD_APPROX,
} from './useAccuracy'

// ─── jaroWinkler ────────────────────────────────────────────────────────────

describe('jaroWinkler', () => {
  it('returns 1 for identical strings', () => {
    expect(jaroWinkler('chat', 'chat')).toBe(1)
  })

  it('returns 0 for empty strings against non-empty', () => {
    expect(jaroWinkler('', 'hello')).toBe(0)
    expect(jaroWinkler('hello', '')).toBe(0)
  })

  it('returns 1 for two empty strings (identical)', () => {
    expect(jaroWinkler('', '')).toBe(1)
  })

  it('returns 0 for completely different short strings', () => {
    expect(jaroWinkler('abc', 'xyz')).toBe(0)
  })

  it('classic martha/marhta transposition ≈ 0.961', () => {
    expect(jaroWinkler('martha', 'marhta')).toBeCloseTo(0.961, 2)
  })

  it('is symmetric', () => {
    const a = jaroWinkler('bonjour', 'bonsoir')
    const b = jaroWinkler('bonsoir', 'bonjour')
    expect(a).toBeCloseTo(b, 10)
  })

  it('scores a single-character typo higher than WORD_APPROX', () => {
    expect(jaroWinkler('chat', 'chats')).toBeGreaterThan(WORD_APPROX)
  })

  it('scores a two-character prefix match above 0.5', () => {
    expect(jaroWinkler('ab', 'abcde')).toBeGreaterThan(0.5)
  })

  it('gives a high score for minor typo (one letter off)', () => {
    expect(jaroWinkler('virelangue', 'virelangues')).toBeGreaterThan(WORD_CORRECT)
  })
})

// ─── normalizeWord ───────────────────────────────────────────────────────────

describe('normalizeWord', () => {
  it('lowercases', () => {
    expect(normalizeWord('BONJOUR')).toBe('bonjour')
  })

  it('strips French accents', () => {
    expect(normalizeWord('éàüî')).toBe('eaui')
  })

  it('strips punctuation', () => {
    expect(normalizeWord("l'heure")).toBe('lheure')
  })

  it('strips non-alphanumeric (except Korean)', () => {
    expect(normalizeWord('hello!')).toBe('hello')
  })

  it('preserves Korean syllables', () => {
    const result = normalizeWord('안녕하세요')
    expect(result).toBe('안녕하세요')
  })

  it('preserves digits', () => {
    expect(normalizeWord('123abc')).toBe('123abc')
  })

  it('returns empty string for punctuation-only input', () => {
    expect(normalizeWord('!@#')).toBe('')
  })
})

// ─── expandCompounds ─────────────────────────────────────────────────────────

describe('expandCompounds', () => {
  it('expands hyphens to spaces', () => {
    expect(expandCompounds('as-tu')).toBe('as tu')
  })

  it('expands straight apostrophe (U+0027) between letters', () => {
    expect(expandCompounds("l'heure")).toBe('l heure')
  })

  it('does not expand curly right-quote U+2019 (only straight apostrophe handled)', () => {
    const curly = "l’heure"
    expect(expandCompounds(curly)).toBe(curly)
  })

  it('does not split apostrophe at word boundary', () => {
    // apostrophe at end of word or start — no letter on both sides → no split
    const result = expandCompounds("c'est")
    expect(result).toBe('c est')
  })

  it('handles multiple hyphens', () => {
    expect(expandCompounds('arc-en-ciel')).toBe('arc en ciel')
  })

  it('returns plain text unchanged', () => {
    expect(expandCompounds('bonjour monde')).toBe('bonjour monde')
  })
})

// ─── computeAccuracy ─────────────────────────────────────────────────────────

describe('computeAccuracy', () => {
  it('returns 1.0 for perfect match', () => {
    const { accuracy } = computeAccuracy('le chat noir', 'le chat noir')
    expect(accuracy).toBeCloseTo(1, 5)
  })

  it('returns 1.0 regardless of case', () => {
    const { accuracy } = computeAccuracy('Le Chat Noir', 'le chat noir')
    expect(accuracy).toBeCloseTo(1, 5)
  })

  it('returns 1.0 when accents differ', () => {
    const { accuracy } = computeAccuracy('la lecon', 'la leçon')
    expect(accuracy).toBeCloseTo(1, 5)
  })

  it('returns 0 for empty spoken string', () => {
    const { accuracy } = computeAccuracy('', 'le chat noir')
    expect(accuracy).toBe(0)
  })

  it('returns 0 for empty target string', () => {
    const { accuracy } = computeAccuracy('hello', '')
    expect(accuracy).toBe(0)
  })

  it('strips filler words from spoken transcript', () => {
    const withFiller    = computeAccuracy('euh le chat euh noir', 'le chat noir')
    const withoutFiller = computeAccuracy('le chat noir', 'le chat noir')
    expect(withFiller.accuracy).toBeCloseTo(withoutFiller.accuracy, 3)
  })

  it('returns high accuracy for a one-word typo', () => {
    const { accuracy } = computeAccuracy('le chats noir', 'le chat noir')
    expect(accuracy).toBeGreaterThan(0.9)
  })

  it('returns low accuracy for a completely wrong transcript', () => {
    const { accuracy } = computeAccuracy('xyz abc def', 'le chat noir')
    expect(accuracy).toBeLessThan(0.3)
  })

  it('wordScores length matches number of target words', () => {
    const { wordScores } = computeAccuracy('le chat est noir', 'le grand chat noir')
    expect(wordScores).toHaveLength(4)
  })

  it('each wordScore is between 0 and 1', () => {
    const { wordScores } = computeAccuracy('bonjour le monde', 'bonjour le monde')
    for (const s of wordScores) {
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(1)
    }
  })

  it('handles compound word expansion in target', () => {
    // "as-tu" expands to "as tu" — 2 words, spoken matches both
    const { accuracy } = computeAccuracy('as tu', 'as-tu')
    expect(accuracy).toBeGreaterThan(0.95)
  })

  it('partial transcript scores proportionally', () => {
    // Only 2 of 4 words spoken
    const full    = computeAccuracy('un deux trois quatre', 'un deux trois quatre')
    const partial = computeAccuracy('un deux', 'un deux trois quatre')
    expect(partial.accuracy).toBeLessThan(full.accuracy)
    expect(partial.accuracy).toBeGreaterThan(0.4)
  })

  it('extra spoken words do not lower accuracy', () => {
    // Extra word should be skipped, not penalise
    const exact = computeAccuracy('le chat', 'le chat')
    const extra = computeAccuracy('le chat vole', 'le chat')
    expect(extra.accuracy).toBeCloseTo(exact.accuracy, 3)
  })
})
