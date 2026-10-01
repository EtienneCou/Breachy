import { Midi } from '@tonejs/midi'
import { instrumentById, variantOf } from '../Components/studio/instruments.js'

const DRUM_CHANNEL = 9 // canal 10 : batterie en General MIDI
const VOLUME_CC = 7

/**
 * Piste que le joueur joue à l'entraînement : la première piste piano qui a des notes.
 * Retourne son numéro dans le Studio (1, 2…) ou null s'il n'y en a pas.
 */
export function practiceTrackNumber(tracks) {
  const index = tracks.findIndex((t) => t.instrument === 'piano' && t.notes.length > 0)
  return index === -1 ? null : index + 1
}

/**
 * Convertit les pistes du Studio en fichier MIDI : une piste MIDI par piste du Studio
 * qui a des notes, avec son instrument (ou son kit de batterie), le tempo et la mesure.
 * Les notes du Studio sont en battements, converties en secondes selon `bpm`.
 *
 * Retourne { file (Blob « audio/midi »), practiceTrack } : practiceTrack décrit la
 * partie à jouer à l'entraînement ({ track: index de la piste MIDI, label }) ou vaut
 * null quand il n'y a pas de piste piano.
 */
export function studioToMidi({ tracks, loopBeats, bpm, signature, title }) {
  const midi = new Midi()
  midi.header.name = title
  // avant d'ajouter les notes : leurs temps en secondes sont convertis selon ce tempo
  midi.header.setTempo(bpm)
  const [beats, unit] = signature.split('/').map(Number)
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [beats, unit] })
  midi.header.update()

  const beatSec = 60 / bpm
  const playNumber = practiceTrackNumber(tracks)
  let practiceTrack = null

  tracks.forEach((t, i) => {
    const notes = t.notes.filter((n) => n.start < loopBeats)
    if (!notes.length) return
    const instrument = instrumentById(t.instrument)
    const track = midi.addTrack()
    track.name = `Piste ${i + 1} · ${instrument.label}`
    track.channel = instrument.drums ? DRUM_CHANNEL : t.channel
    track.instrument.number = variantOf(instrument, t.variant).program
    track.addCC({ number: VOLUME_CC, value: t.volume, time: 0 }) // volume de la piste
    for (const n of notes) {
      const duration = Math.min(n.duration, loopBeats - n.start)
      track.addNote({ midi: n.note, time: n.start * beatSec, duration: Math.max(0.05, duration * beatSec), velocity: 0.8 })
    }
    if (i + 1 === playNumber) practiceTrack = { track: midi.tracks.length - 1, label: track.name }
  })

  return { file: new Blob([midi.toArray()], { type: 'audio/midi' }), practiceTrack }
}
