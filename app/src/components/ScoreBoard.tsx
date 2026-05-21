import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Trophy } from 'lucide-react'
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

const MEDALS = ['🥇', '🥈', '🥉']

interface Props {
  language:   Language
  difficulty?: Difficulty
  highlight?: number
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="skeleton w-6 h-4" />
      <div className="skeleton flex-1 h-4" />
      <div className="skeleton w-12 h-4" />
    </div>
  )
}

export function ScoreBoard({ language, difficulty, highlight }: Props) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['scores', language, difficulty],
    queryFn:  () => fetchScores(language, difficulty),
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="divide-y divide-white/5">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
        <Trophy size={36} strokeWidth={1.5} />
        <p className="text-sm">{t('leaderboard.no_scores')}</p>
      </div>
    )
  }

  const topScore = data[0]?.score ?? 1

  return (
    <div className="divide-y divide-white/5">
      {data.map((row, i) => {
        const isHighlighted = row.id === highlight
        const barWidth = Math.round((row.score / topScore) * 100)

        return (
          <motion.div
            key={row.id}
            className={`relative flex items-center gap-3 px-4 py-3 transition-colors ${isHighlighted ? 'bg-white/8' : 'hover:bg-white/4'}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            {/* Subtle score bar */}
            <div
              className="absolute inset-y-0 left-0 opacity-10 rounded-r-full transition-all duration-700"
              style={{ width: `${barWidth}%`, background: 'rgb(var(--p))' }}
            />

            {/* Rank */}
            <span className="relative text-base w-7 text-center shrink-0 select-none">
              {i < 3 ? MEDALS[i] : <span className="text-slate-500 text-sm">{i + 1}</span>}
            </span>

            {/* Player name */}
            <span className={`relative flex-1 font-semibold truncate text-sm ${isHighlighted ? 'text-white' : 'text-slate-300'}`}>
              {row.player_name}
              {isHighlighted && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-md font-bold"
                      style={{ background: 'rgb(var(--p)/0.25)', color: 'rgb(var(--p))' }}>
                  toi
                </span>
              )}
            </span>

            {/* Stats */}
            <div className="relative flex items-center gap-3 text-right shrink-0">
              <span className="hidden sm:block text-slate-500 text-xs tabular-nums">
                {Math.round(row.accuracy * 100)}%
              </span>
              <span className="hidden sm:block text-slate-500 text-xs tabular-nums">
                {(row.elapsed_ms / 1000).toFixed(1)}s
              </span>
              <span
                className="font-black text-base tabular-nums"
                style={{ color: 'rgb(var(--p))' }}
              >
                {row.score}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
