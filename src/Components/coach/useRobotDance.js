import { useEffect } from 'react'
import { useCoach } from './CoachProvider.jsx'
import { advancePhase, blendParams, dancePose, levelParams, liveImpulses, scalePose, ROBOT_INTENSITY } from './danceEngine.js'

const LOOP_MS = 20 // 50 Hz : la fréquence conseillée par la doc pour un mouvement continu
const NEUTRAL = { head: { roll: 0, pitch: 0, yaw: 0 }, antennas: [0, 0], body: 0 }
const GLIDE = 0.7 // secondes pour revenir doucement au neutre (début, après une émotion)
const RAMP = 1.5 // secondes de montée progressive de la danse

/**
 * Fait danser le vrai Reachy pendant l'entraînement, selon les règles de la doc :
 * une seule boucle envoie les positions (50 Hz), en continu, avec des courbes douces.
 * - beatRef    ref d'une fonction qui renvoie { time, period } quand le morceau joue
 *              (temps du morceau), null sinon : au repos, Reachy respire simplement
 * - danceRef   ref de { level } : niveau de danse 0-3, lu à chaque instant
 *              (les changements de niveau sont progressifs)
 * Les petits gestes du coach (hochement, antennes…) s'ajoutent à la danse. Pendant une
 * émotion ou une danse enregistrée, la boucle se met en retrait, puis reprend en douceur.
 */
export function useRobotDance({ beatRef, danceRef }) {
  const { client, robotStatus, settings, registerDance, robotBusyUntil, setDancing } = useCoach()

  useEffect(() => {
    if (robotStatus !== 'connected' || !settings.robot) return
    const stream = client.openTargetStream()
    const t0 = performance.now()
    const clock = () => (performance.now() - t0) / 1000
    let params = levelParams(null)
    let rhythm = null // cadence de la danse { phase, songTime }, toujours continue
    let impulses = []
    let envelope = 0
    let last = performance.now()
    let resumeAt = 0
    let waiting = false
    let dancing = false // il suit un rythme : le coach met alors son regard en pause

    // Retour doux au neutre (goto avec interpolation du robot), puis la danse repart de zéro.
    const glideToNeutral = () => {
      client.goto({ ...NEUTRAL, duration: GLIDE }).catch(() => {})
      resumeAt = performance.now() + GLIDE * 1000 + 100
      envelope = 0
    }
    glideToNeutral()

    const unregister = registerDance({
      impulse: (name) => impulses.push({ name, start: clock() }),
    })

    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      // Une émotion joue : le robot lui appartient, on n'envoie rien.
      if (now < robotBusyUntil()) {
        waiting = true
        return
      }
      if (waiting) {
        waiting = false
        glideToNeutral()
        return
      }
      if (now < resumeAt) return
      const t = clock()
      const beat = beatRef.current()
      if (Boolean(beat) !== dancing) {
        dancing = Boolean(beat)
        setDancing(dancing)
      }
      envelope = Math.min(1, envelope + dt / RAMP)
      params = blendParams(params, levelParams(beat ? danceRef.current.level : null), dt)
      rhythm = advancePhase(rhythm, beat, params, dt)
      impulses = liveImpulses(impulses, t)
      stream.send(scalePose(dancePose(t, { phase: rhythm?.phase ?? 0, p: params, envelope, impulses }), ROBOT_INTENSITY))
    }
    const id = setInterval(tick, LOOP_MS)

    return () => {
      clearInterval(id)
      setDancing(false)
      unregister()
      stream.close()
      client.goto({ ...NEUTRAL, duration: 0.8 }).catch(() => {})
    }
  }, [robotStatus, settings.robot, client, registerDance, robotBusyUntil, setDancing, beatRef, danceRef])
}
