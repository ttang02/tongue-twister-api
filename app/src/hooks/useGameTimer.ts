import { useEffect, useRef, useState, useCallback } from 'react'

export function useGameTimer(durationMs: number, onTimeout: () => void) {
  const [remaining, setRemaining] = useState(durationMs)
  const [running, setRunning]     = useState(false)
  const startedAt  = useRef<number>(0)
  const frameRef   = useRef<number>(0)
  const pausedAt   = useRef<number>(0)

  const tick = useCallback(() => {
    const elapsed  = Date.now() - startedAt.current
    const left     = Math.max(0, durationMs - elapsed)
    setRemaining(left)

    if (left === 0) {
      setRunning(false)
      onTimeout()
      return
    }

    // Haptic at 5 seconds remaining
    if (left <= 5000 && left > 4800 && 'vibrate' in navigator) {
      navigator.vibrate(100)
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [durationMs, onTimeout])

  const start = useCallback(() => {
    startedAt.current = Date.now()
    setRunning(true)
    frameRef.current  = requestAnimationFrame(tick)
  }, [tick])

  const pause = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    pausedAt.current = Date.now()
    setRunning(false)
  }, [])

  const resume = useCallback(() => {
    // shift startedAt forward by paused duration
    startedAt.current += Date.now() - pausedAt.current
    setRunning(true)
    frameRef.current = requestAnimationFrame(tick)
  }, [tick])

  const reset = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    setRemaining(durationMs)
    setRunning(false)
  }, [durationMs])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const percent = (remaining / durationMs) * 100

  return { remaining, percent, running, start, pause, resume, reset }
}
