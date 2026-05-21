import { motion } from 'motion/react'

interface Props {
  percent:   number
  remaining: number
}

export function GameTimer({ percent, remaining }: Props) {
  const color =
    percent > 50 ? 'bg-green-500' :
    percent > 20 ? 'bg-orange-400' :
                   'bg-red-500'

  const secs = Math.ceil(remaining / 1000)

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-end">
        <span
          className="text-sm font-mono font-bold tabular-nums text-slate-300"
          role="timer"
          aria-label={`${secs} secondes restantes`}
        >
          {secs}s
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-700 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percent}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </div>
  )
}
