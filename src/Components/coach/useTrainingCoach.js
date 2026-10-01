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
const DANCE_WINDOW = 12 // dernières notes qui règlent la qualité de la danse
const DANCE_BONUS_STREAK = 15 // une longue série fait monter la danse d'un cran

// Niveau de danse (0 = danse « nulle », 4 = au top) d'après les dernières notes.
function danceLevel(recent, streak) {
  if (recent.length < 4) return 1 // début du morceau : il se met doucement en route
  const accuracy = recent.filter((r) => r === 'hit').length / recent.length
  const base = accuracy >= 0.9 ? 3 : accuracy >= 0.75 ? 2 : accuracy >= 0.5 ? 1 : 0
  return Math.min(4, base + (streak >= DANCE_BONUS_STREAK ? 1 : 0))
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
 * - musicId      pour comparer au meilleur score dans le bilan
 *
 * Les touches frappées (note réussie, fausse note) sont signalées directement par la
 * page avec react('hit' | 'miss', …), au moment de l'appui.
 *
 * Retourne { finish } : la réaction du bilan (texte en `bubble`), ou null avant la fin.
 */
export function useTrainingCoach({ title, hasSong, status, streak, hitCount, missCount, results, notes = [], bpm, getSongTime, musicId }) {
  const { react, dismiss, setGroove } = useCoach()

  // ---------- Danse ----------
  const period = useMemo(() => beatPeriodOf(notes, bpm), [notes, bpm])
  const dance = useRef({ level: 1, recent: [] })
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
    setGroove(hasSong && status === 'playing' ? { level: dance.current.level, period } : null)
  }, [hasSong, status, period, setGroove])
  useEffect(() => () => setGroove(null), [setGroove])

  // Morceau prêt : Reachy invite à commencer.
  useEffect(() => {
    if (hasSong) react('ready', TRAINING_RULES.ready({ title }))
  }, [hasSong, title, react])

  // Départ, pause, reprise.
  const prevStatus = useRef(status)
  useEffect(() => {
    const prev = prevStatus.current
    prevStatus.current = status
    if (!hasSong || prev === status) return
    if (status === 'playing') react(prev === 'paused' ? 'resume' : 'start', TRAINING_RULES[prev === 'paused' ? 'resume' : 'start']())
    else if (status === 'paused') react('pause', TRAINING_RULES.pause())
  }, [status, hasSong, react])

  // Séries, notes oubliées, passages difficiles et retours en forme.
  const track = useRef({ streak: 0, hits: 0, misses: 0, recent: [], struggling: false })
  useEffect(() => {
    const t = track.current
    // « Recommencer » : les compteurs repartent de zéro, on oublie l'historique.
    if (hitCount < t.hits || missCount < t.misses) {
      track.current = { streak, hits: hitCount, misses: missCount, recent: [], struggling: false }
      dance.current = { level: 1, recent: [] }
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
    const level = danceLevel(d.recent, streak)
    if (level !== d.level) {
      const previous = d.level
      d.level = level
      if (status === 'playing') {
        setGroove({ level, period })
        // Il le dit en dansant : quand ça groove vraiment, ou quand sa danse retombe au plus bas.
        if (level >= 3 && level > previous) react('danceUp', TRAINING_RULES.danceUp())
        else if (level === 0 && previous >= 2) react('danceDown', TRAINING_RULES.danceDown())
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
