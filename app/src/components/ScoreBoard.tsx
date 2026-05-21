import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { Language, Difficulty } from '@/store/gameStore'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface ScoreRow {
  id:          number
  player_name: string
  score:       number
  accuracy:    number
  elapsed_ms:  number
  phrase_text: string
}

async function fetchScores(lang: Language, difficulty?: Difficulty): Promise<ScoreRow[]> {
  const params = new URLSearchParams({ lang, limit: '10' })
  if (difficulty) params.set('difficulty', difficulty)
  const res = await fetch(`${API_URL}/scores?${params}`)
  const json = await res.json() as { data: ScoreRow[] }
  return json.data
}

interface Props {
  language:   Language
  difficulty?: Difficulty
  highlight?: number   // score id to highlight
}

export function ScoreBoard({ language, difficulty, highlight }: Props) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['scores', language, difficulty],
    queryFn:  () => fetchScores(language, difficulty),
    staleTime: 30_000,
  })

  if (isLoading) {
    return <div className="text-slate-400 text-center py-8 animate-pulse">Chargement…</div>
  }

  if (!data || data.length === 0) {
    return <p className="text-slate-400 text-center py-8">{t('leaderboard.no_scores')}</p>
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 border-b border-slate-700">
            <th className="py-2 px-3 text-left">#</th>
            <th className="py-2 px-3 text-left">{t('leaderboard.player')}</th>
            <th className="py-2 px-3 text-right">{t('leaderboard.score')}</th>
            <th className="py-2 px-3 text-right hidden sm:table-cell">{t('leaderboard.accuracy')}</th>
            <th className="py-2 px-3 text-right hidden sm:table-cell">{t('leaderboard.time')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id}
              className={`
                border-b border-slate-800 transition-colors
                ${row.id === highlight ? 'bg-indigo-900/40 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'}
              `}
            >
              <td className="py-2 px-3 text-slate-500">{i + 1}</td>
              <td className="py-2 px-3 font-medium truncate max-w-[120px]">{row.player_name}</td>
              <td className="py-2 px-3 text-right font-mono text-indigo-400">{row.score}</td>
              <td className="py-2 px-3 text-right hidden sm:table-cell">
                {Math.round(row.accuracy * 100)}%
              </td>
              <td className="py-2 px-3 text-right hidden sm:table-cell">
                {(row.elapsed_ms / 1000).toFixed(1)}s
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
