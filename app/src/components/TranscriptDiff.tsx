import { WORD_CORRECT, WORD_APPROX } from '@/hooks/useAccuracy'

interface Props {
  targetWords: string[]
  spokenWords: string[]
  wordScores:  number[]
}

interface WordMeta {
  color:   string
  bg:      string
  icon:    string
  label:   string
}

function wordMeta(score: number): WordMeta {
  if (score >= WORD_CORRECT) return { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', icon: '✓', label: 'Correct' }
  if (score >= WORD_APPROX)  return { color: '#fb923c', bg: 'rgba(251,146,60,0.12)', icon: '~', label: 'Approximatif' }
  return                            { color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: '✗', label: 'Incorrect' }
}

export function TranscriptDiff({ targetWords, spokenWords, wordScores }: Props) {
  const maxLen = Math.max(targetWords.length, wordScores.length)

  return (
    <div className="space-y-4 text-center w-full" aria-live="polite">
      {/* Word chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: maxLen }).map((_, i) => {
          const score = wordScores[i] ?? 0
          const meta  = wordMeta(score)
          const spoken = spokenWords[i]

          return (
            <div
              key={i}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold"
              style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}30` }}
              title={spoken ? `Entendu : "${spoken}"` : 'Mot manquant'}
              aria-label={`${targetWords[i] ?? '—'} — ${meta.label}`}
            >
              <span className="text-xs opacity-70">{meta.icon}</span>
              <span>{targetWords[i] ?? '—'}</span>
            </div>
          )
        })}
      </div>

      {/* What was heard */}
      {spokenWords.length > 0 && (
        <p className="text-slate-500 text-xs">
          Entendu : <span className="italic text-slate-400">« {spokenWords.join(' ')} »</span>
        </p>
      )}
    </div>
  )
}
