import { createGMSynth } from './gmSynth.js'
import { createInstrumentPlayer } from './instruments.js'
import { noteToMidi } from './notes.js'
import { pianoSynth } from './synth.js'

// Synthé d'accompagnement : joue les autres instruments du morceau pendant que
// le joueur joue la mélodie. Chaque piste est jouée par son vrai instrument, pris
// dans la banque de sons General MIDI (gmSynth). Pendant le chargement de la banque
// (quelques secondes la première fois), des instruments de secours (instruments.js)
// prennent le relais pour ne jamais laisser de silence.

// Le curseur suit l'oreille (petits volumes réglables finement).
const volumeCurve = (v) => v * v * 1.2

class BackingSynth {
  volume = 0.5 // position du curseur Accompagnement, de 0 à 1
  ducking = 1 // baisse passagère (Reachy qui parle), 1 = aucune
  bus = null // volume de l'accompagnement
  gm = null // synthétiseur aux vrais instruments, une fois chargé
  fallback = null // instruments de secours pendant le chargement
  programs = new Map() // canal MIDI -> instrument sélectionné

  // À appeler depuis une action du joueur (clic sur Jouer) : le navigateur l'exige pour le son.
  ensure() {
    pianoSynth.ensureContext()
    const { ctx } = pianoSynth
    if (!this.bus) {
      this.bus = ctx.createGain()
      this.bus.gain.value = volumeCurve(this.volume) * this.ducking
      this.bus.connect(pianoSynth.master)
      this.fallback = createInstrumentPlayer(ctx, this.bus)
      createGMSynth(ctx)
        .then((synth) => {
          synth.connect(this.bus)
          this.gm = synth
        })
        .catch((err) => console.warn('Accompagnement : banque de sons indisponible', err))
    }
    return ctx
  }

  setVolume(v) {
    this.volume = v
    if (this.bus) this.bus.gain.value = volumeCurve(v) * this.ducking
  }

  /**
   * Baisse l'accompagnement le temps que Reachy parle (factor < 1), ou le remet (1).
   * Le changement est progressif, et le réglage du curseur n'est pas modifié.
   */
  duck(factor) {
    this.ducking = factor
    if (!this.bus) return
    const { ctx } = pianoSynth
    this.bus.gain.setTargetAtTime(volumeCurve(this.volume) * factor, ctx.currentTime, 0.12)
  }

  get currentTime() {
    return pianoSynth.ctx?.currentTime ?? 0
  }

  /**
   * Programme une note de l'accompagnement à l'instant audio `when`, pour `duration` secondes.
   * note = { note: 'C#4', channel, program, velocity } (voir data/musicData.js)
   */
  play(note, when, duration) {
    this.ensure()
    if (!this.gm) return this.fallback.play(note, when, duration)

    let midi
    try {
      midi = noteToMidi(note.note)
    } catch {
      return
    }
    const channel = note.channel ?? 0
    // instrument de la piste ; sur le canal de la batterie, le numéro choisit le kit
    // (0 : kit standard, 25 : boîte à rythme TR-808 du Studio…)
    const program = note.program ?? 0
    if (this.programs.get(channel) !== program) {
      this.gm.programChange(channel, program, { time: when })
      this.programs.set(channel, program)
    }
    const velocity = Math.round(Math.min(1, Math.max(0.05, note.velocity ?? 0.7)) * 127)
    this.gm.noteOn(channel, midi, velocity, { time: when })
    this.gm.noteOff(channel, midi, { time: when + Math.max(0.05, duration) })
  }

  /** Coupe tout ce qui sonne ou est programmé (pause, recommencer, changement de vitesse). */
  stopAll() {
    this.fallback?.stopAll()
    this.gm?.stopAll(true)
  }
}

// Une seule instance pour toute l'application.
export const backingSynth = new BackingSynth()
