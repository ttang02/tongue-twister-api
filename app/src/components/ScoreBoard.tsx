import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Trophy } from 'lucide-react'
import type { Language, Difficulty } from '@/store/gameStore'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface PlayerRow {
  player_name:  string
  total_score:  number
  count_easy:   number
  count_medium: number
  count_hard:   number
}

async function fetchPlayers(lang: Language): Promise<PlayerRow[]> {
  const params = new URLSearchParams({ lang, limit: '20' })
  const res  = await fetch(`${API_URL}/scores/players?${params}`)
  const json = await res.json() as { data: PlayerRow[] }
  return json.data
}

const MEDALS = ['🥇', '🥈', '🥉']

const DIFF_BADGE: Record<'easy' | 'medium' | 'hard', { label: string; color: string }> = {
  easy:   { label: 'F', color: '#4ade80' },
  medium: { label: 'M', color: '#fbbf24' },
  hard:   { label: 'D', color: '#f87171' },
}

interface Props {
  language:    Language
  difficulty?: Difficulty
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="skeleton w-6 h-4" />
      <div className="skeleton flex-1 h-4" />
      <div className="skeleton w-24 h-4" />
      <div className="skeleton w-12 h-4" />
    </div>
  )
}

function DiffCount({ count, diff }: { count: number; diff: 'easy' | 'medium' | 'hard' }) {
  if (count === 0) return null
  const b = DIFF_BADGE[diff]
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold tabular-nums"
      style={{ background: `${b.color}20`, color: b.color }}
      title={`${diff}: ${count} phrase${count > 1 ? 's' : ''}`}
    >
      {b.label}{count}
    </span>
  )
}

export function ScoreBoard({ language, difficulty }: Props) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['players', language],
    queryFn:  () => fetchPlayers(language),
    staleTime: 30_000,
  })

  // Client-side filter by difficulty when selected
  const rows = difficulty
    ? data?.filter(r => {
        if (difficulty === 'easy')   return r.count_easy   > 0
        if (difficulty === 'medium') return r.count_medium > 0
        return r.count_hard > 0
      })
    : data

  if (isLoading) {
    return (
      <div className="divide-y divide-white/5">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
        <Trophy size={36} strokeWidth={1.5} />
        <p className="text-sm">{t('leaderboard.no_scores')}</p>
      </div>
    )
  }

  const topScore = rows[0]?.total_score ?? 1

  return (
    <div className="divide-y divide-white/5">
      {rows.map((row, i) => {
        const barWidth = Math.round((row.total_score / topScore) * 100)

        return (
          <motion.div
            key={row.player_name}
            className="relative flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition-colors"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            {/* Score bar */}
            <div
              className="absolute inset-y-0 left-0 opacity-10 rounded-r-full transition-all duration-700"
              style={{ width: `${barWidth}%`, background: 'rgb(var(--p))' }}
            />

            {/* Rank */}
            <span className="relative text-base w-7 text-center shrink-0 select-none">
              {i < 3 ? MEDALS[i] : <span className="text-slate-500 text-sm">{i + 1}</span>}
            </span>

            {/* Player name */}
            <span className="relative flex-1 font-semibold truncate text-sm text-slate-300">
              {row.player_name}
            </span>

            {/* Difficulty counts */}
            <div className="relative hidden sm:flex items-center gap-1 shrink-0">
              <DiffCount count={row.count_easy}   diff="easy"   />
              <DiffCount count={row.count_medium} diff="medium" />
              <DiffCount count={row.count_hard}   diff="hard"   />
            </div>

            {/* Total score */}
            <span
              className="relative font-black text-base tabular-nums shrink-0"
              style={{ color: 'rgb(var(--p))' }}
            >
              {row.total_score}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
