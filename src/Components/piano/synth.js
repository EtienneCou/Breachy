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
  master = null // sortie commune (piano + accompagnement)
  pianoBus = null // voie du piano seul
  volume = 0.7 // volume du piano joué par le joueur, de 0 à 1
  sustain = false
  voices = new Map() // midi -> { out, oscs }
  held = new Set() // notes dont la touche est encore enfoncée

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
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  // Volume du piano seul (l'accompagnement a son propre réglage dans backingSynth).
  setVolume(v) {
    this.volume = v
    if (this.pianoBus) this.pianoBus.gain.value = v
  }

  setSustain(on) {
    this.sustain = on
    if (!on) {
      for (const midi of [...this.voices.keys()]) if (!this.held.has(midi)) this.stop(midi, 0.15)
    }
  }

  noteOn(midi) {
    this.ensureContext()
    this.held.add(midi)
    // Le navigateur démarre le son de façon asynchrone : tant qu'il n'est pas prêt,
    // on attend au lieu de jouer dans le vide (sinon les premières notes sont perdues).
    if (this.ctx.state !== 'running') {
      this.ctx.resume().then(() => {
        this.startVoice(midi)
        // touche déjà relâchée pendant le démarrage : on joue quand même une note courte
        if (!this.held.has(midi) && !this.sustain) this.stop(midi, 0.15)
      })
      return
    }
    this.startVoice(midi)
  }

  startVoice(midi) {
    this.stop(midi, 0.02)
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
