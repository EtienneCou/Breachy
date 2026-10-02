import { useEffect, useMemo, useRef } from 'react'
import { useCoach } from './CoachProvider.jsx'
import { TRAINING_RULES, finishReaction } from './coachRules.js'
import { beatPeriodOf } from './danceEngine.js'
import { useRobotDance } from './useRobotDance.js'
import { computeGameStats } from '../../utils/gameStats.js'
import { getBestScore } from '../../utils/bestScores.js'

const MILESTONES = [10, 25, 50, 100, 200] // séries fêtées par Reachy
const BIG_STREAK = 8 // une série cassée à partir de là fait réagir Reachy
const WINDOW = 8 // dernières notes regardées pour repérer un passage difficile
const STRUGGLE_MISSES = 5 // ratées dans la fenêtre = passage difficile
const COMEBACK_HITS = 5 // réussies d'affilée après un passage difficile = ça repart
const DANCE_WINDOW = 16 // dernières notes qui règlent la qualité de la danse (réussite moyenne)
// Réussite (sur les dernières notes) pour monter aux danses 1, 2 et 3.
const DANCE_THRESHOLDS = [0.5, 0.75, 0.9]
// Pour redescendre, il faut passer nettement sous le palier : une fausse note isolée ne
// fait pas tomber la danse (sinon elle changerait à chaque note).
const DANCE_MARGIN = 0.15
const DANCE_HOLD_BEATS = 16 // un niveau atteint tient au moins 4 mesures

/**
 * Prochain niveau de danse (0 calme … 3 rock star) : un cran à la fois, d'après la réussite
 * des dernières notes, avec une marge pour redescendre.
 */
function nextDanceLevel(recent, level) {
  if (recent.length < 5) return level // début du morceau : il se met doucement en route
  const accuracy = recent.filter((r) => r === 'hit').length / recent.length
  if (level < DANCE_THRESHOLDS.length && accuracy >= DANCE_THRESHOLDS[level]) return level + 1
  if (level > 0 && accuracy < DANCE_THRESHOLDS[level - 1] - DANCE_MARGIN) return level - 1
  return level
}

/**
 * Reachy coache une partie d'entraînement : il suit l'horloge (départ, pause,
 * reprise), les notes réussies et ratées, les séries, les passages difficiles,
 * et fait le bilan à la fin. Pendant le morceau, il danse en rythme : sa danse est
 * « nulle » quand ça ne va pas, et de mieux en mieux quand le joueur enchaîne.
 *
 * - notes        notes de la mélodie (pour trouver le tempo de la danse)
 * - bpm          tempo connu du morceau (enregistrements calés), sinon estimé
 * - getSongTime  temps actuel du morceau (horloge du jeu)
 * - time         temps du morceau à l'affichage (négatif pendant le décompte « 3, 2, 1 »)
 * - musicId      pour comparer au meilleur score dans le bilan
 *
 * Les touches frappées (note réussie, fausse note) sont signalées directement par la
 * page avec react('hit' | 'miss', …), au moment de l'appui.
 *
 * Retourne { finish } : la réaction du bilan (texte en `bubble`), ou null avant la fin.
 */
export function useTrainingCoach({ title, hasSong, status, time = 0, streak, hitCount, missCount, results, notes = [], bpm, getSongTime, musicId }) {
  const { react, dismiss, setGroove } = useCoach()

  // ---------- Danse ----------
  const period = useMemo(() => beatPeriodOf(notes, bpm), [notes, bpm])
  const dance = useRef({ level: 0, recent: [], changedAt: 0 })
  const beatSource = useRef({ playing: false, getSongTime })
  useEffect(() => {
    beatSource.current = { playing: hasSong && status === 'playing', getSongTime }
  })
  const beatRef = useRef(() => null) // temps du morceau pour la danse, null hors lecture
  useEffect(() => {
    beatRef.current = () => {
      const { playing, getSongTime: songTime } = beatSource.current
      return playing && songTime ? { time: songTime(), period } : null
    }
  }, [period])
  useRobotDance({ beatRef, danceRef: dance })

  // L'avatar danse aussi, au même niveau, pendant que le morceau joue.
  useEffect(() => {
    setGroove(hasSong && status === 'playing' ? { level: dance.current.level, period, change: null } : null)
  }, [hasSong, status, period, setGroove])
  useEffect(() => () => setGroove(null), [setGroove])

  // Morceau prêt : Reachy invite à commencer.
  useEffect(() => {
    if (hasSong) react('ready', TRAINING_RULES.ready({ title }))
  }, [hasSong, title, react])

  // Décompte « 3, 2, 1 » (temps négatif du morceau), puis « C'est parti ! » au premier temps.
  // countdown : 3, 2, 1 pendant le décompte, 0 une fois le morceau lancé, null hors lecture.
  const countdown = hasSong && status === 'playing' ? (time < 0 ? Math.min(3, Math.ceil(-time)) : 0) : null
  const prevCount = useRef(null)
  useEffect(() => {
    const prev = prevCount.current
    prevCount.current = countdown
    if (countdown === prev || countdown == null) return
    if (countdown > 0) react(`count${countdown}`, TRAINING_RULES.count({ n: countdown }))
    else if (prev > 0) react('go', TRAINING_RULES.go())
  }, [countdown, react])

  // Départ (sans décompte), pause, reprise.
  const prevStatus = useRef(status)
  useEffect(() => {
    const prev = prevStatus.current
    prevStatus.current = status
    if (!hasSong || prev === status) return
    if (status === 'playing' && prev === 'paused') react('resume', TRAINING_RULES.resume())
    else if (status === 'playing' && time >= 0) react('start', TRAINING_RULES.start())
    else if (status === 'paused') react('pause', TRAINING_RULES.pause())
    // `time` est lu au changement d'état seulement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, hasSong, react])

  // Séries, notes oubliées, passages difficiles et retours en forme.
  const track = useRef({ streak: 0, hits: 0, misses: 0, recent: [], struggling: false })
  useEffect(() => {
    const t = track.current
    // « Recommencer » : les compteurs repartent de zéro, on oublie l'historique.
    if (hitCount < t.hits || missCount < t.misses) {
      track.current = { streak, hits: hitCount, misses: missCount, recent: [], struggling: false }
      dance.current = { level: 0, recent: [], changedAt: 0 }
      return
    }
    const d = dance.current
    for (let i = t.hits; i < hitCount; i++) {
      t.recent.push('hit')
      d.recent.push('hit')
    }
    for (let i = t.misses; i < missCount; i++) {
      t.recent.push('miss')
      d.recent.push('miss')
    }
    t.recent = t.recent.slice(-WINDOW)
    d.recent = d.recent.slice(-DANCE_WINDOW)
    const level = nextDanceLevel(d.recent, d.level)
    const now = performance.now()
    if (level !== d.level && now - d.changedAt >= DANCE_HOLD_BEATS * period * 1000) {
      const up = level > d.level
      d.level = level
      d.changedAt = now
      if (status === 'playing') {
        setGroove({ level, period, change: up ? 'up' : 'down' })
        // Il le dit de temps en temps (le geste du robot et la jauge suffisent sinon) :
        // à chaque montée, et quand il retombe au plus calme.
        if (up) react('danceUp', TRAINING_RULES.danceUp({ level }))
        else if (level === 0) react('danceDown', TRAINING_RULES.danceDown())
      }
    }
    const newMisses = missCount - t.misses

    if (MILESTONES.includes(streak) && streak !== t.streak) react('milestone', TRAINING_RULES.milestone({ streak }))
    else if (streak === 0 && t.streak >= BIG_STREAK) react('streakLost', TRAINING_RULES.streakLost({ streak: t.streak }))
    else if (newMisses > 0) react('miss', TRAINING_RULES.miss())

    const misses = t.recent.filter((r) => r === 'miss').length
    if (!t.struggling && misses >= STRUGGLE_MISSES) {
      t.struggling = true
      react('struggle', TRAINING_RULES.struggle())
    } else if (t.struggling && streak >= COMEBACK_HITS) {
      t.struggling = false
      react('comeback', TRAINING_RULES.comeback())
    }
    Object.assign(t, { streak, hits: hitCount, misses: missCount })
  }, [streak, hitCount, missCount, react, status, period, setGroove])

  // Bilan : une vraie phrase, dite à voix haute, avec un geste du robot selon le résultat.
  // Le meilleur score est lu avant d'être mis à jour par la page : on peut fêter un record.
  const finish = useMemo(
    () =>
      results
        ? finishReaction(computeGameStats(results), { speed: results.speed, title: results.song?.title, previousBest: getBestScore(musicId) })
        : null,
    [results, musicId],
  )
  useEffect(() => {
    if (finish) react('finish', finish)
  }, [finish, react])

  // En quittant la page, Reachy se tait.
  useEffect(() => () => dismiss(), [dismiss])

  return { finish }
}
