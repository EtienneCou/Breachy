import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  KEY_LABELS, PianoStage, asciiName, createScrollerLayout, keymapForWindow, noteToMidi, usePiano, windowTop,
} from '../Components/piano'
import { TransportBar } from '../Components/transport'
import { NoteScroller, getSongDuration } from '../Components/Notes_scroller'
import { musicCatalog } from '../data/musicData'
import { useMusic } from '../hooks/useMusic.js'
import { useSongClock } from '../hooks/useSongClock.js'
import { useBackingTrack } from '../hooks/useBackingTrack.js'
import { getParts, pickDefaultPart, splitSong } from '../utils/songParts.js'
import { planKeyWindows, windowAt } from '../utils/keyWindow.js'
import './PianoPage.css'

// Morceau chargé quand l'adresse n'en indique pas : il a un accompagnement,
// pour pouvoir tester toutes les fonctionnalités (à retirer quand l'accueil sera relié).
const TEST_MUSIC_ID = 'take-on-me'

const HIT_WINDOW = 0.2 // secondes de morceau, avant ou après le bon moment, pour réussir une note
const FLASH = 0.25 // durée de l'éclair vert (réussi) ou rouge (raté) sur la touche

/**
 * Page du piano : les notes de la mélodie tombent sur le clavier, le joueur les
 * joue au piano, et les autres instruments du morceau jouent l'accompagnement.
 * À gauche : la piste des notes (Notes_scroller) et le clavier, sur toute la hauteur.
 * À droite : le morceau en cours, le retour à l'accueil et la barre de commande.
 *
 * Le morceau est choisi sur la page d'accueil, qui ouvre cette page avec son id
 * (celui de musicCatalog, data/musicData.js) : navigate(`/pianoPage?morceau=${id}`).
 * Sans morceau dans l'adresse, un morceau de test est chargé (pas de jeu libre ici).
 */
export default function PianoPage() {
  const [searchParams] = useSearchParams()
  const musicId = searchParams.get('morceau') ?? TEST_MUSIC_ID
  const unknownMusic = musicId !== null && !musicCatalog.some((m) => m.id === musicId)
  const { music, notes, status } = useMusic(musicId)

  // Pour l'instant, le joueur joue toujours la mélodie, au piano.
  const melodyPart = useMemo(() => pickDefaultPart(getParts(notes)), [notes])
  const { melody, backing } = useMemo(() => splitSong(notes, melodyPart?.id ?? null), [notes, melodyPart])

  const difficult = useMemo(() => isDifficult(melody), [melody])

  const songInfo = (
    <SongInfo
      title={music?.label}
      melodyLabel={melodyPart?.label}
      difficult={difficult}
      status={unknownMusic ? 'unknown' : status}
    />
  )

  // key : horloge, clavier et piste repartent de zéro à chaque changement de morceau
  return <PianoSession key={`${musicId}:${status}`} notes={melody} backing={backing} sidebar={songInfo} />
}

function PianoSession({ notes, backing, sidebar }) {
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

  // Le dessin du clavier ne bouge pas : les notes qui tombent sont placées selon leur
  // touche (slot), dans une fenêtre de référence, et portent la lettre de la touche.
  const slotKeys = useMemo(() => slotKeyLabels(firstBase), [firstBase])
  const noteLayout = useMemo(() => createScrollerLayout(firstBase, windowTop(firstBase)), [firstBase])
  const scrollerNotes = useMemo(
    () =>
      plan.notes.map((n) => ({
        id: n.id,
        start: n.start,
        duration: n.duration,
        note: asciiName(firstBase + n.slot),
        label: slotKeys[n.slot],
      })),
    [plan, firstBase, slotKeys],
  )

  // Réussites : id de note -> moment du morceau où elle a été jouée.
  // Après « Recommencer », le temps repart en arrière : les réussites situées
  // plus tard que le temps actuel ne comptent plus, sans rien réinitialiser.
  const [hits, setHits] = useState({})
  // Éclairs sur les touches : midi -> { kind: 'hit' | 'miss', until: moment de fin }
  const [flashes, setFlashes] = useState({})

  const clock = useSongClock(duration, { leadIn: hasSong ? 2 : 0 })
  useBackingTrack(backing, clock)
  const windowBase = hasSong ? windowAt(plan.segments, clock.time) : undefined

  const piano = usePiano({
    windowBase,
    onNoteOn: (midi, { time }) => {
      if (!hasSong || clock.status !== 'playing') return
      const songTime = clock.toSongTime(time)
      // On compare la touche frappée (sa position dans la fenêtre), pas la hauteur :
      // le jugement reste juste même si le clavier vient de changer d'octave.
      const slot = midi - windowBase
      let note = null
      for (const n of plan.notes) {
        if (n.start - HIT_WINDOW > songTime) break
        if (n.slot !== slot || Math.abs(n.start - songTime) > HIT_WINDOW) continue
        if (hits[n.id] !== undefined && hits[n.id] <= songTime) continue // déjà réussie
        if (!note || Math.abs(n.start - songTime) < Math.abs(note.start - songTime)) note = n
      }
      if (note) setHits((h) => ({ ...h, [note.id]: songTime }))
      setFlashes((f) => ({ ...f, [midi]: { kind: note ? 'hit' : 'miss', until: songTime + FLASH } }))
    },
  })

  // État de chaque note déjà arrivée : réussie (verte) ou ratée (rouge).
  const noteStates = useMemo(() => {
    const states = {}
    for (const n of plan.notes) {
      if (n.start - HIT_WINDOW > clock.time) break // notes triées par début
      const hitAt = hits[n.id]
      if (hitAt !== undefined && hitAt <= clock.time) states[n.id] = 'hit'
      else if (n.start + HIT_WINDOW < clock.time) states[n.id] = 'missed'
    }
    return states
  }, [plan, hits, clock.time])

  // Touches : bleu quand leur note arrive, éclair vert ou rouge juste après un appui.
  const hints = useMemo(() => {
    const result = {}
    if (windowBase == null) return result
    for (const n of plan.notes) {
      if (n.start > clock.time) break
      if (clock.time <= n.start + n.duration) result[windowBase + n.slot] = 'target'
    }
    for (const [midi, flash] of Object.entries(flashes)) {
      if (clock.time >= flash.until - FLASH && clock.time <= flash.until) result[midi] = flash.kind
    }
    return result
  }, [plan, flashes, clock.time, windowBase])

  const counts = Object.values(noteStates).reduce(
    (c, state) => ({ ...c, [state]: c[state] + 1 }),
    { hit: 0, missed: 0 },
  )

  return (
    <main className="piano-page">
      <PianoStage className="piano-page__stage" piano={piano} hints={hints}>
        {hasSong && (
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
        )}
      </PianoStage>

      <aside className="piano-page__side">
        {sidebar}
        {hasSong && (
          <p className="piano-page__score" aria-live="polite">
            <span className="piano-page__score-hit">✓ {counts.hit} réussie{counts.hit > 1 ? 's' : ''}</span>
            <span className="piano-page__score-miss">✗ {counts.missed} ratée{counts.missed > 1 ? 's' : ''}</span>
          </p>
        )}
        <TransportBar className="piano-page__transport" clock={clock} piano={piano} accompaniment={backing.length > 0} />
      </aside>
    </main>
  )
}

// Lettre du clavier d'ordinateur pour chaque position (slot) de la fenêtre.
function slotKeyLabels(base) {
  const labels = {}
  for (const [code, midi] of Object.entries(keymapForWindow(base).bindings)) labels[midi - base] = KEY_LABELS[code]
  return labels
}

function SongInfo({ title, melodyLabel, difficult, status }) {
  const navigate = useNavigate()
  return (
    <section className="piano-page__card" aria-label="Morceau">
      <button type="button" className="piano-page__back" onClick={() => navigate('/')}>
        ← Retour à l'accueil
      </button>

      <div className="piano-page__song">
        <span className="piano-page__field-label">Morceau</span>
        <strong className="piano-page__song-title">{title ?? 'Morceau inconnu'}</strong>
      </div>

      {status === 'ready' && difficult && (
        <p className="piano-page__badge">Morceau difficile : beaucoup de notes rapides</p>
      )}
      {status === 'ready' && melodyLabel && (
        <p className="piano-page__status">Tu joues la mélodie ({melodyLabel}) au piano, les autres instruments t'accompagnent.</p>
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
