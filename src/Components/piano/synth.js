import { SUSTAIN_PEDAL, createGMSynth } from './gmSynth.js'
import { midiToFreq } from './notes.js'

// Piano joué par le joueur. Il utilise le vrai piano à queue de la banque de sons
// General MIDI (gmSynth) dès qu'elle est chargée ; en attendant (quelques secondes
// la première fois), un petit synthé de piano prend le relais.
const PIANO_CHANNEL = 0
// Réécoute d'un enregistrement (jeu libre) : son propre canal, pour que sa pédale
// et ses notes ne se mélangent pas avec ce que le joueur joue en même temps.
export const PLAYBACK_CHANNEL = 1
const PIANO_PROGRAM = 0 // General MIDI : piano à queue acoustique
const PIANO_VELOCITY = 100

// Piano de secours en Web Audio : quelques partiels, attaque rapide,
// décroissance plus longue dans les graves, étouffoir au relâchement.
const PARTIALS = [
  // [multiple de la fondamentale, forme d'onde, amplitude, désaccord en cents]
  [1, 'triangle', 0.6, 0],
  [1, 'sine', 0.35, 3],
  [2, 'sine', 0.22, -2],
  [3, 'sine', 0.08, 1],
  [4, 'sine', 0.04, 0],
]

class PianoSynth {
  ctx = null
  master = null // sortie commune (piano + accompagnement)
  pianoBus = null // voie du piano seul
  gm = null // vrai piano (banque de sons), une fois chargé
  volume = 0.7 // volume du piano joué par le joueur, de 0 à 1
  // État de chaque canal (le joueur, la réécoute) :
  // pédale, notes enfoncées, et voix du piano de secours (midi -> { out, oscs })
  parts = new Map()

  part(channel) {
    if (!this.parts.has(channel)) this.parts.set(channel, { sustain: false, held: new Set(), voices: new Map() })
    return this.parts.get(channel)
  }

  get sustain() {
    return this.part(PIANO_CHANNEL).sustain
  }

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
      const comp = this.ctx.createDynamicsCompressor()
      // Compresseur de sortie doux : il évite la saturation sans écraser le piano
      // (l'accompagnement a son propre limiteur dans backingSynth).
      comp.threshold.value = -6
      comp.ratio.value = 3
      this.master = this.ctx.createGain()
      this.master.connect(comp).connect(this.ctx.destination)
      this.pianoBus = this.ctx.createGain()
      this.pianoBus.gain.value = this.volume
      this.pianoBus.connect(this.master)
      createGMSynth(this.ctx)
        .then((synth) => {
          synth.connect(this.pianoBus)
          synth.programChange(PIANO_CHANNEL, PIANO_PROGRAM)
          synth.programChange(PLAYBACK_CHANNEL, PIANO_PROGRAM)
          this.gm = synth
        })
        .catch((err) => console.warn('Piano : banque de sons indisponible', err))
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  // Volume du piano seul (l'accompagnement a son propre réglage dans backingSynth).
  setVolume(v) {
    this.volume = v
    if (this.pianoBus) this.pianoBus.gain.value = v
  }

  setSustain(on, channel = PIANO_CHANNEL) {
    const part = this.part(channel)
    part.sustain = on
    this.gm?.controllerChange(channel, SUSTAIN_PEDAL, on ? 127 : 0)
    if (!on) {
      for (const midi of [...part.voices.keys()]) if (!part.held.has(midi)) this.stop(midi, 0.15, channel)
    }
  }

  noteOn(midi, channel = PIANO_CHANNEL) {
    this.ensureContext()
    const part = this.part(channel)
    part.held.add(midi)
    // Le navigateur démarre le son de façon asynchrone : tant qu'il n'est pas prêt,
    // on attend au lieu de jouer dans le vide (sinon les premières notes sont perdues).
    if (this.ctx.state !== 'running') {
      this.ctx.resume().then(() => {
        this.play(midi, channel)
        // touche déjà relâchée pendant le démarrage : on joue quand même une note courte
        if (!part.held.has(midi)) this.release(midi, channel)
      })
      return
    }
    this.play(midi, channel)
  }

  play(midi, channel) {
    if (this.gm) this.gm.noteOn(channel, midi, PIANO_VELOCITY)
    else this.startVoice(midi, channel)
  }

  // Relâchement d'une touche. Avec le vrai piano, la pédale forte est gérée par le
  // synthétiseur lui-même ; avec le piano de secours, on la gère ici.
  release(midi, channel) {
    this.gm?.noteOff(channel, midi)
    if (!this.part(channel).sustain) this.stop(midi, undefined, channel)
  }

  startVoice(midi, channel) {
    this.stop(midi, 0.02, channel)
    const { ctx } = this
    const t = ctx.currentTime
    const f = midiToFreq(midi)
    const decay = Math.max(1.2, 6 - (midi - 36) * 0.07)
    // Graves : l'oreille (et les petits haut-parleurs) les entendent moins bien.
    // On remonte leur volume sous le Do du milieu (jusqu'à +60 % deux octaves plus bas)
    // et on garde leurs harmoniques, qui permettent d'entendre la note même sans basses.
    const lowness = Math.min(1, Math.max(0, (60 - midi) / 24)) // 0 au Do4 et au-dessus, 1 au Do2
    const level = 1 + 0.6 * lowness

    const out = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 0.6
    filter.frequency.setValueAtTime(Math.min(Math.max(f * 8, 2500), 16000), t)
    filter.frequency.exponentialRampToValueAtTime(Math.min(Math.max(f * 2.5, 1200), 16000), t + decay * 0.5)
    out.gain.setValueAtTime(0, t)
    out.gain.linearRampToValueAtTime(0.5 * level, t + 0.004)
    out.gain.exponentialRampToValueAtTime(0.18 * level, t + 0.35)
    out.gain.exponentialRampToValueAtTime(0.0006, t + decay)
    filter.connect(out).connect(this.pianoBus)

    const oscs = PARTIALS.map(([mult, type, amp, detune]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = f * mult
      osc.detune.value = detune
      // harmoniques renforcées dans les graves (x2 au Do2)
      gain.gain.value = mult > 1 ? amp * (1 + lowness) : amp
      osc.connect(gain).connect(filter)
      osc.start(t)
      osc.stop(t + decay + 0.1)
      return osc
    })
    this.part(channel).voices.set(midi, { out, oscs })
  }

  noteOff(midi, channel = PIANO_CHANNEL) {
    this.part(channel).held.delete(midi)
    this.release(midi, channel)
  }

  stop(midi, timeConstant = 0.09, channel = PIANO_CHANNEL) {
    const { voices } = this.part(channel)
    const voice = voices.get(midi)
    if (!voice) return
    const t = this.ctx.currentTime
    voice.out.gain.cancelScheduledValues(t)
    voice.out.gain.setValueAtTime(voice.out.gain.value, t)
    voice.out.gain.setTargetAtTime(0, t, timeConstant)
    for (const osc of voice.oscs) {
      try {
        osc.stop(t + timeConstant * 8)
      } catch {
        // déjà arrêté
      }
    }
    voices.delete(midi)
  }
}

// Une seule instance audio pour toute l'application.
export const pianoSynth = new PianoSynth()
