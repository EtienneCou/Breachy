import { midiToFreq, noteToMidi } from './notes.js'
import { pianoSynth } from './synth.js'

// Synthé d'accompagnement : joue les autres instruments du morceau pendant que
// le joueur joue la mélodie. Il partage le contexte audio et le volume du piano.

const DRUM_CHANNEL = 9

// Timbre par famille d'instruments (d'après le nom General MIDI de la piste).
const TIMBRES = {
  bass: { type: 'triangle', attack: 0.005, release: 0.08, gain: 0.22, cutoff: 6, pluck: false },
  pluck: { type: 'triangle', attack: 0.003, release: 0.15, gain: 0.12, cutoff: 5, pluck: true },
  keys: { type: 'triangle', attack: 0.004, release: 0.2, gain: 0.1, cutoff: 6, pluck: true },
  pad: { type: 'sawtooth', attack: 0.12, release: 0.35, gain: 0.035, cutoff: 3, pluck: false },
  brass: { type: 'sawtooth', attack: 0.03, release: 0.12, gain: 0.05, cutoff: 4, pluck: false },
  lead: { type: 'square', attack: 0.01, release: 0.1, gain: 0.045, cutoff: 5, pluck: false },
}

function familyOf(instrument = '') {
  const name = instrument.toLowerCase()
  if (name.includes('bass')) return 'bass'
  if (/guitar|harp|pluck|pizzicato|banjo|sitar/.test(name)) return 'pluck'
  if (/piano|harpsichord|clav|organ|celesta|glock|vibra|marimba|xylo|bell/.test(name)) return 'keys'
  if (/string|ensemble|pad|choir|voice|aahs|oohs|synthstring/.test(name)) return 'pad'
  if (/brass|horn|trumpet|trombone|tuba|sax|oboe|bassoon|clarinet|flute|piccolo|whistle/.test(name)) return 'brass'
  return 'lead'
}

class BackingSynth {
  volume = 0.25 // volume de l'accompagnement, de 0 à 1 (plus bas que le piano par défaut)
  bus = null
  noise = null
  voices = new Set()

  // À appeler depuis une action du joueur (clic sur Jouer) : le navigateur l'exige pour le son.
  ensure() {
    pianoSynth.ensureContext()
    const { ctx } = pianoSynth
    if (!this.bus) {
      this.bus = ctx.createGain()
      this.bus.gain.value = this.volume
      this.bus.connect(pianoSynth.master)
      // une seconde de bruit blanc, réutilisée pour toute la batterie
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const data = this.noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    }
    return ctx
  }

  setVolume(v) {
    this.volume = v
    if (this.bus) this.bus.gain.value = v
  }

  get currentTime() {
    return pianoSynth.ctx?.currentTime ?? 0
  }

  /** Programme une note de l'accompagnement à l'instant audio `when`, pour `duration` secondes. */
  play(note, when, duration) {
    const ctx = this.ensure()
    let midi
    try {
      midi = noteToMidi(note.note)
    } catch {
      return
    }
    if (note.channel === DRUM_CHANNEL) this.drum(ctx, midi, when)
    else this.tone(ctx, midi, familyOf(note.instrument), when, Math.max(0.05, duration))
  }

  tone(ctx, midi, family, when, duration) {
    const t = TIMBRES[family]
    const f = midiToFreq(midi)
    const osc = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    osc.type = t.type
    osc.frequency.value = f
    filter.type = 'lowpass'
    filter.frequency.value = Math.min(9000, f * t.cutoff)
    const end = when + duration
    gain.gain.setValueAtTime(0, when)
    gain.gain.linearRampToValueAtTime(t.gain, when + t.attack)
    if (t.pluck) gain.gain.exponentialRampToValueAtTime(t.gain * 0.25, Math.max(when + t.attack + 0.01, end))
    else gain.gain.setValueAtTime(t.gain, end)
    gain.gain.exponentialRampToValueAtTime(0.0001, end + t.release)
    osc.connect(filter).connect(gain).connect(this.bus)
    osc.start(when)
    osc.stop(end + t.release + 0.05)
    this.track(osc, gain)
  }

  drum(ctx, midi, when) {
    if (midi === 35 || midi === 36) return this.kick(ctx, when)
    if ([41, 43, 45, 47, 48, 50].includes(midi)) return this.tom(ctx, when, 90 + (midi - 41) * 12)
    const hat = midi === 42 || midi === 44
    const openHat = midi === 46
    const cymbal = [49, 51, 52, 53, 55, 57, 59].includes(midi)
    const snare = midi === 38 || midi === 40 || midi === 37 || midi === 39
    const decay = hat ? 0.05 : openHat ? 0.25 : cymbal ? 0.7 : snare ? 0.15 : 0.08
    const level = hat ? 0.12 : cymbal ? 0.08 : snare ? 0.3 : 0.12
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = snare ? 'bandpass' : 'highpass'
    filter.frequency.value = snare ? 1800 : hat || openHat ? 7000 : 5000
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(level, when)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + decay)
    src.connect(filter).connect(gain).connect(this.bus)
    src.start(when)
    src.stop(when + decay + 0.05)
    this.track(src, gain)
    if (snare) this.tom(ctx, when, 180, 0.12)
  }

  kick(ctx, when) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.setValueAtTime(150, when)
    osc.frequency.exponentialRampToValueAtTime(40, when + 0.12)
    gain.gain.setValueAtTime(0.6, when)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.3)
    osc.connect(gain).connect(this.bus)
    osc.start(when)
    osc.stop(when + 0.35)
    this.track(osc, gain)
  }

  tom(ctx, when, freq, level = 0.3) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.setValueAtTime(freq, when)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, when + 0.2)
    gain.gain.setValueAtTime(level, when)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.25)
    osc.connect(gain).connect(this.bus)
    osc.start(when)
    osc.stop(when + 0.3)
    this.track(osc, gain)
  }

  track(source, gain) {
    const voice = { source, gain }
    this.voices.add(voice)
    source.onended = () => this.voices.delete(voice)
  }

  /** Coupe tout ce qui sonne ou est programmé (pause, recommencer, changement de vitesse). */
  stopAll() {
    const now = this.currentTime
    for (const { source, gain } of this.voices) {
      try {
        gain.gain.cancelScheduledValues(now)
        gain.gain.setTargetAtTime(0, now, 0.02)
        source.stop(now + 0.1)
      } catch {
        // déjà arrêtée
      }
    }
    this.voices.clear()
  }
}

// Une seule instance pour toute l'application.
export const backingSynth = new BackingSynth()
