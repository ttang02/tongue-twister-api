// Word-level accuracy: Jaro-Winkler + DP sequence alignment

export const WORD_CORRECT = 0.88
export const WORD_APPROX  = 0.65

// Filler words stripped before alignment (safe subset unlikely to appear in tongue twisters)
const FILLER_WORDS = new Set([
  'uh', 'uhh', 'um', 'umm', 'hmm', 'hm', 'er', 'erm', 'huh',
  'euh', 'euhm',
])

export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1
  const len1 = s1.length, len2 = s2.length
  if (!len1 || !len2) return 0
  const matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0)
  const s1m = new Array<boolean>(len1).fill(false)
  const s2m = new Array<boolean>(len2).fill(false)
  let matches = 0, transpositions = 0

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist)
    const end   = Math.min(i + matchDist + 1, len2)
    for (let j = start; j < end; j++) {
      if (s2m[j] || s1[i] !== s2[j]) continue
      s1m[i] = s2m[j] = true; matches++; break
    }
  }
  if (!matches) return 0

  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!s1m[i]) continue
    while (!s2m[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }
  const j = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
  let prefix = 0
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (s1[i] === s2[i]) prefix++; else break
  }
  return j + prefix * 0.1 * (1 - j)
}

export function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip Latin combining diacritics
    .normalize('NFC')                // recompose — Korean jamo → syllables (가-힣 range)
    .replace(/[^a-z0-9가-힣]/g, '')
}

// DP sequence alignment: maps each target word to its best-matching spoken word (in order).
// Spoken words that don't map to any target word (fillers, extras) are skipped without penalty.
// Missing target words receive score 0.
function alignWords(targetWords: string[], spokenWords: string[]): number[] {
  const T = targetWords.length
  const S = spokenWords.length

  if (T === 0) return []
  if (S === 0) return new Array(T).fill(0)

  // Precompute similarity matrix
  const sim: number[][] = Array.from({ length: T }, (_, ti) =>
    Array.from({ length: S }, (_, si) => jaroWinkler(targetWords[ti]!, spokenWords[si]!))
  )

  // dp[t][s] = max cumulative score aligning target[0..t-1] to a subsequence of spoken[0..s-1]
  const dp: number[][] = Array.from({ length: T + 1 }, () => new Array(S + 1).fill(0))

  for (let t = 1; t <= T; t++) {
    for (let s = 1; s <= S; s++) {
      const match      = dp[t - 1]![s - 1]! + sim[t - 1]![s - 1]! // match target[t-1] ↔ spoken[s-1]
      const skipSpoken = dp[t]![s - 1]!                              // skip spoken[s-1] (extra word)
      const skipTarget = dp[t - 1]![s]!                              // miss target[t-1] (score = 0)
      dp[t]![s] = Math.max(match, skipSpoken, skipTarget)
    }
  }

  // Traceback — prioritise match > skipSpoken > skipTarget on ties
  const wordScores = new Array<number>(T).fill(0)
  let t = T, s = S

  while (t > 0) {
    if (s === 0) { t--; continue }
    const cur           = dp[t]![s]!
    const matchVal      = dp[t - 1]![s - 1]! + sim[t - 1]![s - 1]!
    const skipSpokenVal = dp[t]![s - 1]!

    if (Math.abs(cur - matchVal) < 1e-9) {
      wordScores[t - 1] = sim[t - 1]![s - 1]!
      t--; s--
    } else if (Math.abs(cur - skipSpokenVal) < 1e-9) {
      s--
    } else {
      t-- // target word missed
    }
  }

  return wordScores
}

export function computeAccuracy(
  spoken: string,
  target: string
): { accuracy: number; wordScores: number[] } {
  const rawSpoken   = spoken.split(/\s+/).map(normalizeWord).filter(Boolean)
  const targetWords = target.split(/\s+/).map(normalizeWord).filter(Boolean)
  const spokenWords = rawSpoken.filter(w => !FILLER_WORDS.has(w))

  if (targetWords.length === 0) return { accuracy: 0, wordScores: [] }
  if (spokenWords.length === 0) return { accuracy: 0, wordScores: new Array(targetWords.length).fill(0) }

  const wordScores = alignWords(targetWords, spokenWords)
  const accuracy   = wordScores.reduce((a, b) => a + b, 0) / targetWords.length

  return { accuracy, wordScores }
}
