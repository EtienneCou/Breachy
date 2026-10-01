import { createGMSynth } from '../piano/gmSynth.js'
import { pianoSynth } from '../piano/synth.js'

// Synthétiseur du Studio : un synthé General MIDI à lui, branché sur la sortie
// commune. Chaque piste a son canal MIDI (instrument, kit de batterie, volume).

const VOLUME_CC = 7 // contrôleur MIDI du volume d'un canal
const DRUM_CHANNEL = 9 // canal 10 : batterie par défaut en General MIDI, on ne l'utilise pas

// Canaux attribués aux pistes, dans l'ordre (le canal 10 est évité).
export const STUDIO_CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12]

class StudioSynth {
  gm = null
  bus = null
  loading = null
  channels = new Map() // canal -> { program, drums, volume } déjà envoyés au synthé

  /** Charge le synthé (à appeler depuis une action du joueur). Promesse résolue quand il est prêt. */
  ensure() {
    pianoSynth.ensureContext()
    if (!this.loading) {
      const { ctx } = pianoSynth
      this.bus = ctx.createGain()
      this.bus.gain.value = 0.9
      this.bus.connect(pianoSynth.master)
      this.loading = createGMSynth(ctx).then((synth) => {
        synth.connect(this.bus)
        synth.midiChannels[DRUM_CHANNEL]?.setDrums(false)
        this.gm = synth
        return synth
      })
    }
    return this.loading
  }

  get ready() {
    return this.gm !== null
  }

  get currentTime() {
    return pianoSynth.ctx?.currentTime ?? 0
  }

  /** Règle le canal d'une piste : instrument (ou kit de batterie) et volume (0 à 1). */
  setup(channel, { program, drums, volume }) {
    if (!this.gm) return
    const prev = this.channels.get(channel) ?? {}
    if (prev.drums !== drums) this.gm.midiChannels[channel]?.setDrums(drums)
    if (prev.program !== program || prev.drums !== drums) this.gm.programChange(channel, program)
    if (prev.volume !== volume) this.gm.controllerChange(channel, VOLUME_CC, Math.round(volume * 127))
    this.channels.set(channel, { program, drums, volume })
  }

  /** Joue une note, tout de suite ou à l'instant audio `when`. */
  noteOn(channel, note, velocity = 100, when) {
    this.gm?.noteOn(channel, note, velocity, when != null ? { time: when } : undefined)
  }

  noteOff(channel, note, when) {
    this.gm?.noteOff(channel, note, when != null ? { time: when } : undefined)
  }

  /** Coupe tout ce qui sonne ou est programmé. */
  stopAll() {
    this.gm?.stopAll(true)
  }
}

// Une seule instance pour toute l'application.
export const studioSynth = new StudioSynth()
