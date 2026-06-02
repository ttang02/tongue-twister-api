import { useEffect, useRef, useState, useCallback } from 'react'

export function useGameTimer(durationMs: number, onTimeout: () => void) {
  const [remaining, setRemaining] = useState(durationMs)
  const [running, setRunning] = useState(false)
  const startedAt  = useRef<number>(0)
  const intervalRef = useRef<number>(0)
  const pausedAt   = useRef<number>(0)
  const lastSecRef = useRef<number>(-1)
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout // always latest

  const tick = useCallback(() => {
    const elapsed = Date.now() - startedAt.current
    const left = Math.max(0, durationMs - elapsed)

    if (left === 0) {
      setRemaining(0)
      setRunning(false)
      onTimeoutRef.current()
      clearInterval(intervalRef.current)
      return
    }

    // Only re-render when displayed second actually changes
    const sec = Math.ceil(left / 1000)
    if (sec !== lastSecRef.current) {
      lastSecRef.current = sec
      setRemaining(left)

      // Haptic at 5 seconds remaining
      if (sec === 5 && 'vibrate' in navigator) {
        navigator.vibrate(100)
      }
    }
  }, [durationMs])

  const start = useCallback(() => {
    startedAt.current = Date.now()
    lastSecRef.current = -1
    setRunning(true)
    intervalRef.current = window.setInterval(tick, 250)
  }, [tick])

  const pause = useCallback(() => {
    clearInterval(intervalRef.current)
    pausedAt.current = Date.now()
    setRunning(false)
  }, [])

  const resume = useCallback(() => {
    startedAt.current += Date.now() - pausedAt.current
    lastSecRef.current = -1
    setRunning(true)
    intervalRef.current = window.setInterval(tick, 250)
  }, [tick])

  const reset = useCallback(() => {
    clearInterval(intervalRef.current)
    lastSecRef.current = -1
    setRemaining(durationMs)
    setRunning(false)
  }, [durationMs])

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  const percent = (remaining / durationMs) * 100

  return { remaining, percent, running, start, pause, resume, reset }
}
