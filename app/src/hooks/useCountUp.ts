import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) return
    const start     = performance.now()
    const startVal  = 0

    const tick = (now: number) => {
      const elapsed  = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(startVal + (target - startVal) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}
