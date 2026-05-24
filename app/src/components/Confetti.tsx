import { useEffect, useRef } from 'react'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  life: number
  shape: 'rect' | 'circle' | 'triangle'
}

interface Props {
  active: boolean
  primaryColor: string   // hex like "#3b82f6"
}

const COLORS = (primary: string) => [primary, '#ffffff', '#fbbf24', '#f472b6', primary, '#a78bfa']

export function Confetti({ active, primaryColor }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const particles  = useRef<Particle[]>([])
  const rafRef     = useRef<number>(0)

  // hooks must come before any conditional return
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!active || prefersReduced) return
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const palette = COLORS(primaryColor)
    particles.current = Array.from({ length: 120 }, () => ({
      x:             canvas.width * Math.random(),
      y:             -10,
      vx:            (Math.random() - 0.5) * 6,
      vy:            Math.random() * 4 + 3,
      color:         palette[Math.floor(Math.random() * palette.length)]!,
      size:          Math.random() * 8 + 4,
      rotation:      Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      life:          1,
      shape: (['rect', 'rect', 'circle', 'triangle'] as const)[Math.floor(Math.random() * 4)]!,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false

      for (const p of particles.current) {
        p.x  += p.vx
        p.y  += p.vy
        p.vy += 0.12           // gravity
        p.rotation += p.rotationSpeed
        p.life -= 0.008

        if (p.y < canvas.height + 20) alive = true

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === 'triangle') {
          ctx.beginPath()
          ctx.moveTo(0, -p.size / 2)
          ctx.lineTo(p.size / 2, p.size / 2)
          ctx.lineTo(-p.size / 2, p.size / 2)
          ctx.closePath()
          ctx.fill()
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        }
        ctx.restore()
      }

      if (alive) rafRef.current = requestAnimationFrame(draw)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, primaryColor, prefersReduced])

  if (prefersReduced || !active) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 50 }}
      aria-hidden
    />
  )
}
