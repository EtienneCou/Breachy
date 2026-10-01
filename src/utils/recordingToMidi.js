import { Midi } from '@tonejs/midi'
import { signatureOf } from '../Components/metronome/click.js'

const SUSTAIN_CC = 64 // contrôleur MIDI de la pédale forte

/**
 * Convertit un enregistrement du jeu libre (événements de useSessionRecorder)
 * en fichier MIDI : une piste de piano, la pédale comprise. Le silence avant la
 * première note est retiré, pour que le morceau commence tout de suite.
 *
 * Avec `tempo` ({ bpm, signature }, prise calée sur le métronome), le tempo et la
 * mesure sont écrits dans le fichier, et le silence est retiré par mesures entières :
 * les temps du métronome restent alignés sur le début du fichier.
 * Retourne un Blob « audio/midi », prêt à ranger dans Services/MidiDatabase.
 */
export function recordingToMidi(events, title = 'Enregistrement', tempo = null) {
  const firstNote = events.find((e) => e.type === 'on')
  let shift = firstNote ? firstNote.time : 0
  if (tempo) {
    const sig = signatureOf(tempo.signature)
    const measure = (sig.beats * 60) / tempo.bpm
    shift = Math.floor(shift / measure + 1e-6) * measure
  }
  const at = (time) => Math.max(0, time - shift)

  const midi = new Midi()
  midi.header.name = title
  if (tempo) {
    // avant d'ajouter les notes : leurs temps en secondes sont convertis selon ce tempo
    midi.header.setTempo(tempo.bpm)
    const [beats, unit] = tempo.signature.split('/').map(Number)
    midi.header.timeSignatures.push({ ticks: 0, timeSignature: [beats, unit] })
    midi.header.update()
  }
  const track = midi.addTrack()
  track.name = 'Piano'
  track.channel = 0
  track.instrument.number = 0 // General MIDI : piano à queue

  const open = new Map() // midi -> moment où la touche a été enfoncée
  for (const e of events) {
    if (e.type === 'on') {
      open.set(e.midi, e.time)
    } else if (e.type === 'off' && open.has(e.midi)) {
      const start = open.get(e.midi)
      open.delete(e.midi)
      track.addNote({ midi: e.midi, time: at(start), duration: Math.max(0.05, e.time - start), velocity: 0.8 })
    } else if (e.type === 'sustain') {
      track.addCC({ number: SUSTAIN_CC, value: e.on ? 1 : 0, time: at(e.time) })
    }
  }

  return new Blob([midi.toArray()], { type: 'audio/midi' })
}
