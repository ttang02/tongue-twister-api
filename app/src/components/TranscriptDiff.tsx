interface Props {
  targetWords: string[]
  spokenWords: string[]
  wordScores:  number[]
}

function wordColor(score: number): string {
  if (score >= 0.9) return 'text-green-400'
  if (score >= 0.7) return 'text-orange-400'
  return 'text-red-400'
}

export function TranscriptDiff({ targetWords, spokenWords, wordScores }: Props) {
  const maxLen = Math.max(targetWords.length, wordScores.length)

  return (
    <div className="space-y-3 text-center" aria-live="polite">
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
        {Array.from({ length: maxLen }).map((_, i) => (
          <span
            key={i}
            className={`text-base font-medium ${wordColor(wordScores[i] ?? 0)}`}
            title={spokenWords[i] ? `Prononcé : "${spokenWords[i]}"` : 'Mot manquant'}
          >
            {targetWords[i] ?? '—'}
          </span>
        ))}
      </div>
      {spokenWords.length > 0 && (
        <p className="text-slate-400 text-sm italic">
          Entendu : « {spokenWords.join(' ')} »
        </p>
      )}
    </div>
  )
}
