import { midiToFreq } from './notes.js'

// Petit synthé de piano en Web Audio : quelques partiels, attaque rapide,
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
  master = null
  volume = 0.7
  sustain = false
  voices = new Map() // midi -> { out, oscs }
  held = new Set() // notes dont la touche est encore enfoncée

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
      const comp = this.ctx.createDynamicsCompressor()
      comp.threshold.value = -14
      comp.ratio.value = 4
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(comp).connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  setVolume(v) {
    this.volume = v
    if (this.master) this.master.gain.value = v
  }

  setSustain(on) {
    this.sustain = on
    if (!on) {
      for (const midi of [...this.voices.keys()]) if (!this.held.has(midi)) this.stop(midi, 0.15)
    }
  }

  noteOn(midi) {
    this.ensureContext()
    this.stop(midi, 0.02)
    this.held.add(midi)

    const { ctx } = this
    const t = ctx.currentTime
    const f = midiToFreq(midi)
    const decay = Math.max(1.2, 6 - (midi - 36) * 0.07)

    const out = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 0.6
    filter.frequency.setValueAtTime(Math.min(f * 8, 16000), t)
    filter.frequency.exponentialRampToValueAtTime(Math.min(f * 2.5, 16000), t + decay * 0.5)
    out.gain.setValueAtTime(0, t)
    out.gain.linearRampToValueAtTime(0.32, t + 0.004)
    out.gain.exponentialRampToValueAtTime(0.11, t + 0.35)
    out.gain.exponentialRampToValueAtTime(0.0006, t + decay)
    filter.connect(out).connect(this.master)

    const oscs = PARTIALS.map(([mult, type, amp, detune]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = f * mult
      osc.detune.value = detune
      gain.gain.value = amp
      osc.connect(gain).connect(filter)
      osc.start(t)
      osc.stop(t + decay + 0.1)
      return osc
    })
    this.voices.set(midi, { out, oscs })
  }

  noteOff(midi) {
    this.held.delete(midi)
    if (!this.sustain) this.stop(midi)
  }

  stop(midi, timeConstant = 0.09) {
    const voice = this.voices.get(midi)
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
    this.voices.delete(midi)
  }
}

// Une seule instance audio pour toute l'application.
export const pianoSynth = new PianoSynth()
