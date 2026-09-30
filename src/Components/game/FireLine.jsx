import { useEffect, useRef } from 'react'

const MAX_PARTICLES = 400

// Réglages par niveau : 0 rien, 1 étincelles, 2 petites flammes, 3 grandes flammes, 4 flammes bleues.
const LEVELS = [
  { sparks: 0, flames: 0, size: 0, rise: 0 },
  { sparks: 14, flames: 0, size: 0, rise: 0 },
  { sparks: 22, flames: 45, size: 9, rise: 55 },
  { sparks: 30, flames: 110, size: 15, rise: 85 },
  { sparks: 40, flames: 140, size: 17, rise: 95 },
]

/**
 * Feu sur toute la largeur de la ligne de frappe, qui grandit avec la série.
 * `level` de 0 à 4 (voir streakTiers.js). Les changements de niveau sont
 * progressifs : le feu monte et s'éteint en douceur.
 */
export default function FireLine({ level }) {
  const canvasRef = useRef(null)
  const levelRef = useRef(level)
  useEffect(() => {
    levelRef.current = level
  }, [level])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let width = 0
    let height = 0
    const resize = () => {
      const box = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = box.width
      height = box.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const particles = []
    const pending = { flame: 0, spark: 0 }
    let intensity = 0 // suit le niveau en douceur (0 à 4)
    let last = performance.now()
    let frame

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const target = levelRef.current
      intensity += (target - intensity) * Math.min(1, dt * (target > intensity ? 3 : 1.5))

      const lower = LEVELS[Math.floor(intensity)]
      const upper = LEVELS[Math.min(4, Math.ceil(intensity))]
      const k = intensity - Math.floor(intensity)
      const mix = (key) => lower[key] + (upper[key] - lower[key]) * k
      const blue = intensity > 3.5
      const widthFactor = width / 800 // plus de particules sur un grand écran

      pending.spark += mix('sparks') * widthFactor * dt
      pending.flame += mix('flames') * widthFactor * dt
      while (pending.flame >= 1 && particles.length < MAX_PARTICLES) {
        pending.flame--
        particles.push({
          kind: 'flame', blue,
          x: Math.random() * width, y: height,
          vx: (Math.random() - 0.5) * 16, vy: -(mix('rise') * (0.7 + Math.random() * 0.6)),
          size: mix('size') * (0.7 + Math.random() * 0.6), life: 0.5 + Math.random() * 0.5, age: 0, seed: Math.random() * 6,
        })
      }
      while (pending.spark >= 1 && particles.length < MAX_PARTICLES) {
        pending.spark--
        particles.push({
          kind: 'spark', blue,
          x: Math.random() * width, y: height,
          vx: (Math.random() - 0.5) * 70, vy: -(90 + Math.random() * 130),
          size: 1.2 + Math.random() * 1.4, life: 0.5 + Math.random() * 0.7, age: 0, seed: 0,
        })
      }
      pending.flame = Math.min(pending.flame, 1)
      pending.spark = Math.min(pending.spark, 1)

      ctx.clearRect(0, 0, width, height)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.age += dt
        if (p.age >= p.life) {
          particles.splice(i, 1)
          continue
        }
        const t = p.age / p.life
        if (p.kind === 'flame') {
          p.x += (p.vx + Math.sin(p.age * 9 + p.seed) * 14) * dt
          p.y += p.vy * dt
          drawFlame(ctx, p, t)
        } else {
          p.vy += 160 * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          drawSpark(ctx, p, t)
        }
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="game-overlay__fire" aria-hidden="true" />
}

// Flammes dessinées en couleurs opaques et translucides : la piste est claire,
// un mélange « lumineux » (additif) serait invisible sur le blanc.
function drawFlame(ctx, p, t) {
  const radius = p.size * (1 - t * 0.55)
  const alpha = Math.pow(1 - t, 1.2) * 0.75
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius)
  if (p.blue) {
    g.addColorStop(0, `rgba(224, 242, 254, ${alpha})`)
    g.addColorStop(0.4, `rgba(56, 189, 248, ${alpha * 0.85})`)
    g.addColorStop(1, 'rgba(37, 99, 235, 0)')
  } else {
    g.addColorStop(0, `rgba(254, 240, 138, ${alpha})`)
    g.addColorStop(0.4, `rgba(249, 115, 22, ${alpha * 0.85})`)
    g.addColorStop(1, 'rgba(220, 38, 38, 0)')
  }
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
  ctx.fill()
}

function drawSpark(ctx, p, t) {
  const alpha = 1 - t
  ctx.fillStyle = p.blue ? `rgba(14, 165, 233, ${alpha})` : `rgba(245, 158, 11, ${alpha})`
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
  ctx.fill()
}
