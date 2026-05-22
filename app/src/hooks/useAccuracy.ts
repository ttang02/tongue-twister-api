// Jaro-Winkler distance — word-by-word accuracy computation

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
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9가-힣]/g, '')
}

export function computeAccuracy(
  spoken: string,
  target: string
): { accuracy: number; wordScores: number[] } {
  const spokenWords = spoken.split(/\s+/).map(normalizeWord).filter(Boolean)
  const targetWords = target.split(/\s+/).map(normalizeWord).filter(Boolean)
  const maxLen      = Math.max(spokenWords.length, targetWords.length)

  if (maxLen === 0) return { accuracy: 0, wordScores: [] }

  const wordScores: number[] = []
  let total = 0

  for (let i = 0; i < maxLen; i++) {
    const sw = spokenWords[i] ?? ''
    const tw = targetWords[i] ?? ''
    const s  = jaroWinkler(sw, tw)
    wordScores.push(s)
    total += s
  }

  return { accuracy: total / maxLen, wordScores }
}
