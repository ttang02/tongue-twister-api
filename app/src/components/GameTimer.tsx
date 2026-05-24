import { motion } from 'motion/react'

interface Props {
  percent:   number
  remaining: number
}

export function GameTimer({ percent, remaining }: Props) {
  const secs = Math.ceil(remaining / 1000)

  const barColor =
    percent > 50 ? 'rgb(var(--p))'   :
    percent > 20 ? '#f97316'         :
                   '#ef4444'

  const textColor =
    percent > 50 ? 'rgb(var(--p))' :
    percent > 20 ? '#f97316'       :
                   '#ef4444'

  // scaleX avoids animating layout property (width) — only composited transform
  const scaleX = percent / 100

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-widest">Temps</span>
        <motion.span
          className="text-2xl font-black tabular-nums font-mono"
          style={{
            color: textColor,
            transition: 'color 400ms ease',
          }}
          animate={secs <= 5 ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={secs <= 5 ? { repeat: Infinity, duration: 0.5 } : {}}
          role="timer"
          aria-label={`${secs} secondes restantes`}
        >
          {secs}s
        </motion.span>
      </div>

      {/* Track */}
      <div
        className="relative h-4 w-full rounded-full overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.08)',
          boxShadow: percent <= 20 ? `0 0 12px ${barColor}55` : 'none',
          transition: 'box-shadow 400ms ease',
        }}
      >
        {/* Glow layer — scaleX from left origin, no layout recalc */}
        <motion.div
          className="absolute inset-y-0 left-0 right-0 rounded-full blur-sm opacity-60"
          style={{
            backgroundColor: barColor,
            transformOrigin: 'left',
            transition: 'background-color 400ms ease',
          }}
          animate={{ scaleX }}
          transition={{ duration: 0.12, ease: 'linear' }}
        />
        {/* Solid bar */}
        <motion.div
          className="absolute inset-y-0 left-0 right-0 rounded-full"
          style={{
            backgroundColor: barColor,
            transformOrigin: 'left',
            transition: 'background-color 400ms ease',
          }}
          animate={{ scaleX }}
          transition={{ duration: 0.12, ease: 'linear' }}
        />
      </div>
    </div>
  )
}
