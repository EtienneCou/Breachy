import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { FLAME_TIERS, tierFor } from './flameTiers.js'
import './FlameGauge.css'

const TRACK_H = 30 // hauteur de la jauge, en px (doit correspondre au CSS)
const INSET = 4 // marge intérieure entre le cadre et le remplissage
const MAX_PARTICLES = 500

/**
 * Jauge de réussite ludique : elle se remplit jusqu'à `percent`, avec des
 * étincelles, puis des flammes de plus en plus grandes, et des flammes bleues à 100 %.
 */
export default function FlameGauge({ percent, duration = 1800 }) {
  const reducedMotion = usePrefersReducedMotion()
  const [animated, setAnimated] = useState(0)
  const shownRef = useRef(0) // valeur courante, lue par la boucle d'animation des particules
  const canvasRef = useRef(null)
  const shown = reducedMotion ? percent : animated
  const tier = tierFor(Math.floor(shown))

  // Remplissage progressif de 0 jusqu'au score.
  useEffect(() => {
    if (reducedMotion) {
      shownRef.current = percent
      return
    }
    let frame
    const start = performance.now()
    const tick = (now) => {
      // le premier horodatage de requestAnimationFrame peut précéder `start` : on borne entre 0 et 1
      const k = Math.min(1, Math.max(0, (now - start) / duration))
      const value = percent * (1 - Math.pow(1 - k, 3))
      shownRef.current = value
      setAnimated(value)
      if (k < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [percent, duration, reducedMotion])

  // Étincelles et flammes.
  useEffect(() => {
    if (reducedMotion) return
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
    let last = performance.now()
    let frame

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const pct = shownRef.current
      const blue = pct >= 100
      const heat = Math.max(0, Math.min(1, (pct - 50) / 50)) // 0 à 50 %, 1 à 100 %
      const top = height - TRACK_H + INSET
      const x0 = INSET
      const x1 = INSET + (width - INSET * 2) * (pct / 100)

      // Combien de particules naissent cette image-ci.
      const sparkRate = pct < 1 ? 0 : 5 + pct * 0.35 + (blue ? 20 : 0)
      const flameRate = pct < 50 ? 0 : 25 + heat * 110
      pending.spark += sparkRate * dt
      pending.flame += flameRate * dt

      while (pending.flame >= 1 && particles.length < MAX_PARTICLES) {
        pending.flame--
        const size = (7 + heat * 15) * rand(0.7, 1.2)
        particles.push({
          kind: 'flame', blue,
          x: rand(x0, x1), y: top + 6,
          vx: rand(-10, 10), vy: -rand(40, 70 + heat * 90),
          size, life: rand(0.45, 0.7 + heat * 0.5), age: 0, seed: Math.random() * 6,
        })
      }
      while (pending.spark >= 1 && particles.length < MAX_PARTICLES) {
        pending.spark--
        // les étincelles jaillissent surtout du bout de la jauge
        const x = Math.random() < 0.6 ? x1 - rand(0, 14) : rand(x0, x1)
        particles.push({
          kind: 'spark', blue,
          x: Math.max(x0, x), y: top + 4,
          vx: rand(-45, 45), vy: -rand(70, 170 + heat * 90),
          size: rand(1, 2.2), life: rand(0.5, 1.1), age: 0, seed: 0,
        })
      }
      pending.flame = Math.min(pending.flame, 1)
      pending.spark = Math.min(pending.spark, 1)

      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.age += dt
        if (p.age >= p.life) {
          particles.splice(i, 1)
          continue
        }
        const k = p.age / p.life
        if (p.kind === 'flame') {
          p.x += (p.vx + Math.sin(p.age * 9 + p.seed) * 18) * dt
          p.y += p.vy * dt
          drawFlame(ctx, p, k)
        } else {
          p.vy += 180 * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          drawSpark(ctx, p, k)
        }
      }
      ctx.globalCompositeOperation = 'source-over'
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [reducedMotion])

  const shownPercent = Math.floor(shown)

  return (
    <div
      className="flame-gauge"
      data-tier={tier.id}
      role="meter"
      aria-label="Réussite du morceau"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent} %, ${tierFor(percent).label}`}
    >
      <div className="flame-gauge__head">
        <span className="flame-gauge__value">
          {shownPercent}
          <span className="flame-gauge__unit">%</span>
        </span>
        <span className="flame-gauge__tier">{tier.label}</span>
      </div>

      <div className="flame-gauge__stage">
        <div className="flame-gauge__track">
          <div className="flame-gauge__fill" style={{ width: `${shown}%` }} />
        </div>
        <canvas ref={canvasRef} className="flame-gauge__canvas" aria-hidden="true" />
      </div>

      <div className="flame-gauge__ticks" aria-hidden="true">
        {FLAME_TIERS.filter((t) => t.min > 0).map((t) => (
          <span
            key={t.id}
            className={`flame-gauge__tick${shown >= t.min ? ' is-reached' : ''}${t.id === 'blue' ? ' is-blue' : ''}`}
            style={{ left: `calc(${INSET}px + (100% - ${INSET * 2}px) * ${t.min / 100})` }}
          >
            {t.min} %
          </span>
        ))}
      </div>
    </div>
  )
}

function drawFlame(ctx, p, k) {
  const radius = p.size * (1 - k * 0.55)
  const alpha = Math.pow(1 - k, 1.3) * 0.85
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius)
  if (p.blue) {
    g.addColorStop(0, `rgba(235, 250, 255, ${alpha})`)
    g.addColorStop(0.35, `rgba(96, 190, 255, ${alpha * 0.8})`)
    g.addColorStop(1, 'rgba(37, 99, 235, 0)')
  } else {
    g.addColorStop(0, `rgba(255, 244, 190, ${alpha})`)
    g.addColorStop(0.35, `rgba(255, 150, 40, ${alpha * 0.8})`)
    g.addColorStop(1, 'rgba(220, 45, 20, 0)')
  }
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
  ctx.fill()
}

function drawSpark(ctx, p, k) {
  const alpha = 1 - k
  ctx.fillStyle = p.blue ? `rgba(190, 235, 255, ${alpha})` : `rgba(255, 215, 120, ${alpha})`
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = p.blue ? `rgba(80, 170, 255, ${alpha * 0.25})` : `rgba(255, 140, 40, ${alpha * 0.25})`
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
  ctx.fill()
}

const rand = (min, max) => min + Math.random() * (max - min)

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)')
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}
