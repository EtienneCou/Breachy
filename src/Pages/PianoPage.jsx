import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  KEY_LABELS, PianoStage, asciiName, createScrollerLayout, keymapForWindow, noteToMidi, pianoSynth, usePiano, windowTop,
} from '../Components/piano'
import { TransportBar } from '../Components/transport'
import { NoteScroller, getSongDuration } from '../Components/Notes_scroller'
import GameOverlay from '../Components/game/GameOverlay.jsx'
import { NOTE_POINTS, heatLevel, multiplierFor } from '../Components/game/streakTiers.js'
import { ResultsModal } from '../Components/results'
import { CoachPanel, TRAINING_RULES, useCoach } from '../Components/coach'
import { useTrainingCoach } from '../Components/coach/useTrainingCoach.js'
import { useMusic } from '../hooks/useMusic.js'
import { SPEEDS, useSongClock } from '../hooks/useSongClock.js'
import { useBackingTrack } from '../hooks/useBackingTrack.js'
import { useSongMetronome } from '../hooks/useSongMetronome.js'
import { practicePart, splitSong } from '../utils/songParts.js'
import { planKeyWindows, windowAt } from '../utils/keyWindow.js'
import { TIMING, computeGameStats } from '../utils/gameStats.js'
import { saveResult } from '../utils/bestScores.js'
import songsCatalog from '../resources/catalog'
import './PianoPage.css'

// Morceau chargé quand l'adresse n'en indique pas : il a un accompagnement,
// pour pouvoir tester toutes les fonctionnalités (à retirer quand l'accueil sera relié).
const TEST_MUSIC_ID = 'take-on-me'

const LEAD_IN = 3 // décompte « 3, 2, 1 » avant le début du morceau, en secondes
const HIT_WINDOW = 0.2 // secondes de morceau, avant ou après le bon moment, pour réussir une note
const FLASH = 0.25 // durée de l'éclair vert (réussi) ou rouge (raté) sur la touche
const SPARK_TIME = 0.45 // durée des étincelles après une note réussie
const WORD_TIME = 0.6 // durée du mot « Parfait ! » / « Bien ! »
const MILESTONES = [10, 25, 50, 100, 200] // séries fêtées à l'écran

// Une couleur par touche blanche, de gauche à droite (les noires prennent une
// teinte plus foncée de la blanche à leur gauche).
const KEY_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7']

/**
 * Page du piano : les notes de la mélodie tombent sur le clavier, le joueur les
 * joue au piano, et les autres instruments du morceau jouent l'accompagnement.
 * À gauche : la piste des notes (Notes_scroller) et le clavier, sur toute la hauteur.
 * À droite : le morceau en cours, le retour à l'accueil et la barre de commande.
 *
 * Le morceau est choisi sur la page d'accueil (bouton « S'entraîner »), qui ouvre
 * cette page avec son id : navigate(`/piano?morceau=${id}`). Voir hooks/useMusic.js
 * pour les morceaux reconnus (catalogue de l'accueil, fichiers ajoutés par l'utilisateur).
 * Sans morceau dans l'adresse, un morceau de test est chargé (pas de jeu libre ici).
 */
export default function PianoPage() {
  const [searchParams] = useSearchParams()
  const musicId = searchParams.get('morceau') ?? TEST_MUSIC_ID
  const { music, notes, status } = useMusic(musicId)
  const songImage = songsCatalog.find((song) => song.id === musicId)?.image

  // Le joueur joue la mélodie au piano, ou, pour un morceau du Studio, sa première piste piano.
  const practiceTrack = music?.practiceTrack
  const melodyPart = useMemo(() => practicePart(musicId, notes, practiceTrack), [musicId, notes, practiceTrack])
  const { melody, backing } = useMemo(
    () => splitSong(notes, melodyPart.ids, { leadIn: LEAD_IN }),
    [notes, melodyPart],
  )

  const difficult = useMemo(() => isDifficult(melody), [melody])

  // Enregistrement calé sur le métronome : son fichier commence sur un premier temps.
  // splitSong a pu décaler les notes : la grille du métronome suit ce décalage.
  const gridOffset = useMemo(() => {
    const original = melody.length ? notes.find((n) => n.id === melody[0].id) : null
    return original ? melody[0].start - original.start : 0
  }, [notes, melody])

  // Morceau à une seule partie (ex. Mario, Pirates) : il n'y a pas d'autres instruments,
  // alors l'accompagnement joue la mélodie en guide, doucement, au son d'un clavier.
  const guided = backing.length === 0 && melody.length > 0
  const accompaniment = useMemo(
    () => (guided ? melody.map((n) => ({ ...n, id: `guide-${n.id}`, instrument: 'piano', channel: 0 })) : backing),
    [guided, melody, backing],
  )

  const songInfo = (
    <SongInfo
      title={music?.label}
      image={songImage}
      melodyLabel={melodyPart?.label}
      fromStudio={Boolean(melodyPart.fromStudio)}
      noPianoPart={!melodyPart.playable}
      difficult={difficult}
      guided={guided}
      status={status}
    />
  )

  // key : horloge, clavier et piste repartent de zéro à chaque changement de morceau
  return (
    <PianoSession
      key={`${musicId}:${status}`}
      musicId={musicId}
      title={music?.label ?? ''}
      notes={melody}
      backing={accompaniment}
      sidebar={songInfo}
      tempo={music?.tempo ?? null}
      gridOffset={gridOffset}
    />
  )
}

function PianoSession({ musicId, title, notes, backing, sidebar, tempo, gridOffset }) {
  const navigate = useNavigate()
  // Métronome : seulement pour les morceaux qui ont un tempo, et coupé tant que le joueur ne l'active pas.
  const [metronomeOn, setMetronomeOn] = useState(false)

  // Démarre le moteur audio dès la première interaction avec la page, pour que
  // les premières touches jouées sonnent tout de suite.
  useEffect(() => {
    const warmUp = () => pianoSynth.ensureContext()
    window.addEventListener('pointerdown', warmUp, { once: true })
    window.addEventListener('keydown', warmUp, { once: true })
    return () => {
      window.removeEventListener('pointerdown', warmUp)
      window.removeEventListener('keydown', warmUp)
    }
  }, [])
  const hasSong = notes.length > 0
  // le morceau dure jusqu'à la dernière note, mélodie ou accompagnement
  const duration = useMemo(
    () => (hasSong ? Math.max(getSongDuration(notes), getSongDuration(backing)) : undefined),
    [notes, backing, hasSong],
  )

  // Clavier de 10 touches blanches qui change d'octave quand la mélodie le demande.
  // Chaque note reçoit son `slot` : la position de la touche à frapper dans la fenêtre.
  const plan = useMemo(() => planKeyWindows(notes.map((n) => ({ ...n, midi: safeMidi(n.note) }))), [notes])
  const firstBase = plan.segments[0]?.base ?? 60
  const noteById = useMemo(() => new Map(plan.notes.map((n) => [n.id, n])), [plan])

  // Le dessin du clavier ne bouge pas : les notes qui tombent sont placées selon leur
  // touche (slot), dans une fenêtre de référence, avec la lettre et la couleur de la touche.
  const slots = useMemo(() => slotInfo(firstBase), [firstBase])
  const noteLayout = useMemo(() => createScrollerLayout(firstBase, windowTop(firstBase)), [firstBase])
  const scrollerNotes = useMemo(
    () =>
      plan.notes.map((n) => ({
        id: n.id,
        start: n.start,
        duration: n.duration,
        note: asciiName(firstBase + n.slot),
        label: slots[n.slot]?.label,
        color: slots[n.slot]?.color,
      })),
    [plan, firstBase, slots],
  )

  // Réussites et fausses notes : id de note -> moment du morceau où elle a été jouée.
  // Après « Recommencer », le temps repart en arrière : ce qui est situé plus tard
  // que le temps actuel ne compte plus, sans rien réinitialiser.
  const [hits, setHits] = useState({})
  const [wrongs, setWrongs] = useState({})
  // Éclairs sur les touches : midi -> { kind: 'hit' | 'miss', until: moment de fin }
  const [flashes, setFlashes] = useState({})

  const clock = useSongClock(duration, { leadIn: hasSong ? LEAD_IN : 0 })
  useBackingTrack(backing, clock)
  useSongMetronome(tempo, clock, { enabled: metronomeOn, offset: gridOffset })
  const windowBase = hasSong ? windowAt(plan.segments, clock.time) : undefined
  const done = (record, id, time) => record[id] !== undefined && record[id] <= time

  const { react } = useCoach()

  const piano = usePiano({
    windowBase,
    onNoteOn: (midi, { time }) => {
      if (!hasSong || clock.status !== 'playing') return
      const songTime = clock.toSongTime(time)
      // On compare la touche frappée (sa position dans la fenêtre), pas la hauteur :
      // le jugement reste juste même si le clavier vient de changer d'octave.
      const slot = midi - windowBase
      let note = null
      let nearest = null // note la plus proche, pour compter une fausse note
      for (const n of plan.notes) {
        if (n.start - HIT_WINDOW > songTime) break
        if (Math.abs(n.start - songTime) > HIT_WINDOW || done(hits, n.id, songTime)) continue
        const closer = (current) => !current || Math.abs(n.start - songTime) < Math.abs(current.start - songTime)
        if (n.slot === slot && closer(note)) note = n
        if (closer(nearest)) nearest = n
      }
      if (note) setHits((h) => ({ ...h, [note.id]: songTime }))
      else if (nearest && !done(wrongs, nearest.id, songTime)) setWrongs((w) => ({ ...w, [nearest.id]: songTime }))
      // Reachy réagit tout de suite à la touche frappée.
      if (note) react('hit', TRAINING_RULES.hit({ precision: precision((songTime - note.start) * 1000) }))
      else react('miss', TRAINING_RULES.miss())
      setFlashes((f) => ({ ...f, [midi]: { kind: note ? 'hit' : 'miss', until: songTime + FLASH } }))
    },
  })

  // État de chaque note déjà arrivée : réussie (verte), fausse note ou oubliée (rouge).
  const noteStates = useMemo(() => {
    const states = {}
    for (const n of plan.notes) {
      if (n.start - HIT_WINDOW > clock.time) break // notes triées par début
      if (done(hits, n.id, clock.time)) states[n.id] = 'hit'
      else if (n.start + HIT_WINDOW < clock.time) states[n.id] = done(wrongs, n.id, clock.time) ? 'wrong' : 'missed'
    }
    return states
  }, [plan, hits, wrongs, clock.time])

  // Touches et colonnes : bleu quand leur note arrive, éclair vert ou rouge après un appui.
  const hints = useMemo(() => {
    const result = {}
    if (windowBase == null) return result
    for (const n of plan.notes) {
      if (n.start - 0.35 > clock.time) break // la colonne s'éclaire juste avant l'arrivée
      if (clock.time <= n.start + n.duration) result[windowBase + n.slot] = 'target'
    }
    for (const [midi, flash] of Object.entries(flashes)) {
      if (clock.time >= flash.until - FLASH && clock.time <= flash.until) result[midi] = flash.kind
    }
    return result
  }, [plan, flashes, clock.time, windowBase])

  // Série en cours (notes réussies d'affilée, dans l'ordre du morceau) et score :
  // chaque note réussie rapporte des points selon sa précision, multipliés par la série.
  const { streak, bestStreak, score, hitCount, missCount, reached } = useMemo(() => {
    let run = 0
    let best = 0
    let points = 0
    let hitTotal = 0
    let missTotal = 0
    let arrived = 0
    for (const n of plan.notes) {
      if (n.start <= clock.time) arrived++
      const state = noteStates[n.id]
      if (state === 'hit') {
        run++
        best = Math.max(best, run)
        hitTotal++
        points += NOTE_POINTS[precision((hits[n.id] - n.start) * 1000)] * multiplierFor(run)
      } else if (state) {
        run = 0
        missTotal++
      }
    }
    return { streak: run, bestStreak: best, score: points, hitCount: hitTotal, missCount: missTotal, reached: arrived }
  }, [plan, noteStates, hits, clock.time])
  const heat = heatLevel(streak)

  // Étincelles sur chaque note réussie à l'instant, sur sa touche. Le mot
  // (« Parfait ! », « Bien ! »…) n'accompagne que la dernière réussite : sur les
  // passages rapides, les mots ne s'empilent pas et ne restent pas sur d'autres touches.
  const bursts = useMemo(() => {
    const recent = Object.entries(hits)
      .map(([id, hitAt]) => ({ n: noteById.get(id), hitAt, age: clock.time - hitAt }))
      .filter(({ n, age }) => n && age >= 0 && age <= Math.max(SPARK_TIME, WORD_TIME))
      .sort((a, b) => a.hitAt - b.hitAt)
    return recent.map(({ n, hitAt, age }, i) => {
      const offsetMs = (hitAt - n.start) * 1000
      const tone = precision(offsetMs)
      const isLatest = i === recent.length - 1
      return {
        id: `${n.id}-${hitAt}`,
        x: noteLayout(asciiName(firstBase + n.slot))?.x ?? 0.5,
        tone,
        sparks: age <= SPARK_TIME,
        text: isLatest && age <= WORD_TIME
          ? tone === 'perfect' ? 'Parfait !' : tone === 'good' ? 'Bien !' : offsetMs < 0 ? 'Trop tôt' : 'Trop tard'
          : null,
      }
    })
  }, [hits, clock.time, noteById, noteLayout, firstBase])

  // Fin du morceau : résultats pour le popup de statistiques.
  const finished = clock.status === 'finished'
  const results = useMemo(() => {
    if (!finished) return null
    return {
      song: { title },
      score,
      bestStreak,
      playedAt: new Date().toISOString(),
      speed: clock.speed,
      duration: duration ?? 0,
      notes: plan.notes.map((n) => {
        const expected = asciiName(n.playMidi)
        const hitAt = hits[n.id]
        if (hitAt !== undefined) return { time: n.start, expected, played: expected, offsetMs: Math.round((hitAt - n.start) * 1000) }
        if (wrongs[n.id] !== undefined) return { time: n.start, expected, played: '?', offsetMs: null }
        return { time: n.start, expected, played: null, offsetMs: null }
      }),
    }
  }, [finished, title, score, bestStreak, clock.speed, duration, plan, hits, wrongs])

  // Meilleur résultat du morceau, affiché sur sa carte à l'accueil.
  useEffect(() => {
    if (!results) return
    const { successPercent, stars } = computeGameStats(results)
    saveResult(musicId, { successPercent, stars, score: results.score })
  }, [results, musicId])

  // Reachy, le coach : départ, pauses, séries, passages difficiles et bilan.
  const { finish } = useTrainingCoach({
    title,
    hasSong,
    status: clock.status,
    time: clock.time,
    streak,
    hitCount,
    missCount,
    results,
    notes,
    bpm: tempo?.bpm,
    getSongTime: () => clock.toSongTime(performance.now()),
    musicId,
  })

  // Vitesse juste en dessous de l'actuelle, proposée à la fin si le morceau était trop dur.
  const slowerSpeed = [...SPEEDS].reverse().find((s) => s < clock.speed) ?? null

  const progress = hasSong && duration ? Math.min(1, Math.max(0, clock.time / duration)) : 0

  return (
    <main className="piano-page">
      <div className="piano-page__play">
        {hasSong && (
          <div className="piano-page__progress" role="progressbar" aria-label="Avancée du morceau" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>
        )}
        <PianoStage className={`piano-page__stage is-heat-${heat}`} piano={piano} hints={hints}>
          {hasSong && (
            <>
              <NoteScroller
                className="piano-page__scroller"
                notes={scrollerNotes}
                currentTime={clock.time}
                playing={clock.status === 'playing'}
                noteLayout={noteLayout}
                noteStates={noteStates}
                hitLinePosition={1}
                lookahead={3}
                showLabels
              />
              <GameOverlay
                time={clock.time}
                playing={clock.status === 'playing'}
                streak={streak}
                milestone={MILESTONES.includes(streak) ? streak : null}
                bursts={bursts}
                pulseKey={reached}
                heat={heat}
                multiplier={multiplierFor(streak)}
              />
            </>
          )}
        </PianoStage>
      </div>

      <aside className="piano-page__side">
        {sidebar}
        <CoachPanel className="piano-page__coach" talkToggle idleText={hasSong ? null : 'Choisis un morceau sur l\'accueil, je t\'accompagne.'} />
        {hasSong && (
          <div className="piano-page__points" aria-live="polite">
            <p className="piano-page__points-line">
              <span className="piano-page__points-value">{score.toLocaleString('fr-FR')}</span> points
            </p>
            <p className="piano-page__score">
              <span className="piano-page__score-hit">{hitCount} réussie{hitCount > 1 ? 's' : ''}</span>
              <span className="piano-page__score-miss">{missCount} ratée{missCount > 1 ? 's' : ''}</span>
            </p>
          </div>
        )}
        {tempo && (
          <button
            type="button"
            className={`piano-page__metronome${metronomeOn ? ' is-on' : ''}`}
            onClick={(e) => {
              setMetronomeOn((on) => !on)
              e.currentTarget.blur() // Entrée reste le raccourci Jouer / Pause
            }}
            aria-pressed={metronomeOn}
          >
            <span className="piano-page__metronome-label">Métronome</span>
            <span className="piano-page__metronome-state">
              {metronomeOn ? 'Activé' : 'Coupé'} · {tempo.bpm} BPM, {tempo.signature}
            </span>
          </button>
        )}
        <TransportBar className="piano-page__transport" clock={clock} piano={piano} accompaniment />
      </aside>

      {results && (
        <ResultsModal
          results={results}
          coach={<CoachPanel title="Le bilan de Reachy" idleText={finish?.bubble} />}
          onRestart={clock.restart}
          onQuit={() => navigate('/')}
          slowerSpeed={slowerSpeed}
          onRestartSlower={() => {
            clock.setSpeed(slowerSpeed)
            clock.restart()
          }}
        />
      )}
    </main>
  )
}

// Précision d'une note réussie, selon son écart au bon moment (en millisecondes).
function precision(offsetMs) {
  const gap = Math.abs(offsetMs)
  return gap <= TIMING.perfectMs ? 'perfect' : gap <= TIMING.goodMs ? 'good' : 'late'
}

// Lettre du clavier d'ordinateur et couleur de chaque position (slot) de la fenêtre.
function slotInfo(base) {
  const info = {}
  const keys = Object.entries(keymapForWindow(base).bindings).sort((a, b) => a[1] - b[1])
  let whiteIndex = -1
  for (const [code, midi] of keys) {
    const black = !isWhite(midi)
    if (!black) whiteIndex++
    const color = KEY_COLORS[Math.max(0, whiteIndex)]
    info[midi - base] = {
      label: KEY_LABELS[code],
      color: black ? `color-mix(in srgb, ${color} 70%, #0b1026)` : color,
    }
  }
  return info
}

const isWhite = (midi) => ![1, 3, 6, 8, 10].includes(midi % 12)

function SongInfo({ title, image, melodyLabel, fromStudio, noPianoPart, difficult, guided, status }) {
  const navigate = useNavigate()
  return (
    <section className="piano-page__card" aria-label="Morceau">
      <button type="button" className="piano-page__back" onClick={() => navigate('/')}>
        Retour
      </button>

      <div className="piano-page__song">
        <strong className="piano-page__song-title">{title ?? 'Morceau inconnu'}</strong>
        {image && <img className="piano-page__song-image" src={image} alt="" />}
      </div>

      {status === 'ready' && difficult && (
        <p className="piano-page__badge">Morceau difficile : beaucoup de notes rapides</p>
      )}
      {/* Morceau du Studio : la piste jouée est bien mise en avant */}
      {status === 'ready' && fromStudio && (
        <p className="piano-page__part">
          🎯 Tu joues <strong>{melodyLabel}</strong>
          <span>La première piste piano de ton Studio. Les autres pistes t'accompagnent.</span>
        </p>
      )}
      {status === 'ready' && noPianoPart && (
        <p className="piano-page__status piano-page__status--error">
          Ce morceau du Studio n'a pas de piste piano : il n'y a rien à jouer. Ajoute une piste piano dans le Studio pour t'entraîner dessus.
        </p>
      )}
      {status === 'ready' && melodyLabel && !fromStudio && (
        <p className="piano-page__status">Tu joues la mélodie ({melodyLabel}) au piano, les autres instruments t'accompagnent.</p>
      )}
      {status === 'ready' && guided && !fromStudio && (
        <p className="piano-page__status">Ce morceau n'a qu'une partie : tu entends la mélodie en guide. Baisse « Accompagnement » pour jouer seul.</p>
      )}
      {status === 'loading' && <p className="piano-page__status">Chargement…</p>}
      {status === 'error' && <p className="piano-page__status piano-page__status--error">Impossible de charger ce morceau.</p>}
      {status === 'unknown' && (
        <p className="piano-page__status piano-page__status--error">Ce morceau n'existe pas. Reviens à l'accueil pour en choisir un.</p>
      )}
    </section>
  )
}

// Difficile : beaucoup de notes très rapprochées, ou trop de notes par seconde.
function isDifficult(melody) {
  if (melody.length < 2) return false
  let close = 0
  for (let i = 1; i < melody.length; i++) if (melody[i].start - melody[i - 1].start < 0.2) close++
  const seconds = melody.at(-1).start - melody[0].start || 1
  return close / melody.length > 0.4 || melody.length / seconds > 2.5
}

function safeMidi(name) {
  try {
    return noteToMidi(name)
  } catch {
    return null
  }
}
