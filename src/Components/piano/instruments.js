import { midiToFreq, noteToMidi } from './notes.js'

// Instruments synthétisés, communs à l'écoute d'un morceau (services/audioPlayer)
// et à l'accompagnement de l'entraînement (backingSynth) : chaque piste MIDI est
// jouée par le même instrument dans les deux modes.

const DRUM_CHANNEL = 9 // canal MIDI 10 : batterie (chaque numéro de note = un instrument)

// Timbre par famille : forme d'onde, attaque, relâchement, volume, ouverture du filtre
// (en multiple de la fréquence), et `pluck` pour les sons qui s'éteignent d'eux-mêmes.
export const TIMBRES = {
  bass: { type: 'triangle', attack: 0.005, release: 0.08, gain: 0.22, cutoff: 6, pluck: false },
  pluck: { type: 'triangle', attack: 0.003, release: 0.15, gain: 0.12, cutoff: 5, pluck: true },
  keys: { type: 'triangle', attack: 0.004, release: 0.2, gain: 0.1, cutoff: 6, pluck: true },
  organ: { type: 'square', attack: 0.005, release: 0.08, gain: 0.035, cutoff: 4, pluck: false },
  pad: { type: 'sawtooth', attack: 0.12, release: 0.35, gain: 0.035, cutoff: 3, pluck: false },
  brass: { type: 'sawtooth', attack: 0.03, release: 0.12, gain: 0.05, cutoff: 4, pluck: false },
  reed: { type: 'square', attack: 0.025, release: 0.1, gain: 0.045, cutoff: 3, pluck: false },
  flute: { type: 'sine', attack: 0.06, release: 0.15, gain: 0.14, cutoff: 4, pluck: false },
  lead: { type: 'sawtooth', attack: 0.01, release: 0.1, gain: 0.05, cutoff: 5, pluck: false },
}

/** Famille d'instrument d'une piste, d'après son nom General MIDI (ex. « pan flute »). */
export function familyOf(instrument = '') {
  const name = instrument.toLowerCase()
  if (!name) return 'keys' // partition sans instrument (fichiers .txt) : son de clavier
  // l'ordre compte : « bassoon » contient « bass », « english horn » contient « horn »
  if (/timpani|taiko|melodic tom|steel drum/.test(name)) return 'timpani'
  if (/bassoon|oboe|english horn|clarinet|sax|bagpipe|shanai|harmonica/.test(name)) return 'reed'
  if (/flute|piccolo|recorder|whistle|ocarina|bottle/.test(name)) return 'flute'
  if (name.includes('bass')) return 'bass'
  if (/distortion|overdriven|lead|square|sawtooth|calliope|chiff|charang/.test(name)) return 'lead'
  if (/organ|accordion|bandoneon/.test(name)) return 'organ'
  if (/guitar|harp|pluck|pizzicato|banjo|sitar|koto|shamisen/.test(name)) return 'pluck'
  if (/piano|harpsichord|clav|celesta|glock|vibra|marimba|xylo|bell|music box|dulcimer/.test(name)) return 'keys'
  if (/string|ensemble|pad|choir|voice|aahs|oohs|violin|viola|cello|contrabass/.test(name)) return 'pad'
  if (/brass|horn|trumpet|trombone|tuba|orchestra hit/.test(name)) return 'brass'
  return 'lead'
}

/**
 * Lecteur d'instruments branché sur un contexte audio et une destination.
 * Les notes passent par un limiteur (même 20 à 30 notes simultanées restent
 * maîtrisées), puis un gain `makeup` pour régler le niveau de sortie.
 * - play(note, when, duration) : note = { note: 'C#4', channel, instrument, velocity }
 * - stopAll() : coupe tout ce qui sonne ou est programmé
 */
export function createInstrumentPlayer(ctx, destination, { makeup = 1 } = {}) {
  const input = ctx.createGain()
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -24
  limiter.knee.value = 6
  limiter.ratio.value = 12
  limiter.attack.value = 0.005
  limiter.release.value = 0.2
  const output = ctx.createGain()
  output.gain.value = makeup
  input.connect(limiter).connect(output).connect(destination)

  // une seconde de bruit blanc, réutilisée pour toute la batterie
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  const voices = new Set()
  const track = (source, gain) => {
    const voice = { source, gain }
    voices.add(voice)
    source.onended = () => voices.delete(voice)
  }

  function tone(midi, family, when, duration, velocity) {
    const base = TIMBRES[family]
    const t = { ...base, gain: base.gain * velocity }
    const f = midiToFreq(midi)
    const osc = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    osc.type = t.type
    osc.frequency.value = f
    filter.type = 'lowpass'
    // graves : filtre moins fermé pour garder les harmoniques (sinon ils s'entendent mal)
    filter.frequency.value = Math.min(9000, Math.max(f * t.cutoff, 900))
    const end = when + duration
    gain.gain.setValueAtTime(0, when)
    gain.gain.linearRampToValueAtTime(t.gain, when + t.attack)
    if (t.pluck) gain.gain.exponentialRampToValueAtTime(t.gain * 0.25, Math.max(when + t.attack + 0.01, end))
    else gain.gain.setValueAtTime(t.gain, Math.max(when + t.attack, end))
    gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(when + t.attack, end) + t.release)
    osc.connect(filter).connect(gain).connect(input)
    osc.start(when)
    osc.stop(Math.max(when + t.attack, end) + t.release + 0.05)
    track(osc, gain)
  }

  function pitchedDrum(when, freq, level, decay = 0.25) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.setValueAtTime(freq, when)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, when + 0.2)
    gain.gain.setValueAtTime(level, when)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + decay)
    osc.connect(gain).connect(input)
    osc.start(when)
    osc.stop(when + decay + 0.05)
    track(osc, gain)
  }

  function kick(when, velocity) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.setValueAtTime(150, when)
    osc.frequency.exponentialRampToValueAtTime(40, when + 0.12)
    gain.gain.setValueAtTime(0.4 * velocity, when)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.3)
    osc.connect(gain).connect(input)
    osc.start(when)
    osc.stop(when + 0.35)
    track(osc, gain)
  }

  // Batterie General MIDI : le numéro de note choisit l'instrument, pas une hauteur.
  function drum(midi, when, velocity) {
    if (midi === 35 || midi === 36) return kick(when, velocity)
    if ([41, 43, 45, 47, 48, 50].includes(midi)) return pitchedDrum(when, 90 + (midi - 41) * 12, 0.3 * velocity)
    const hat = midi === 42 || midi === 44
    const openHat = midi === 46
    const cymbal = [49, 51, 52, 53, 55, 57, 59].includes(midi)
    const snare = [37, 38, 39, 40].includes(midi)
    const decay = hat ? 0.05 : openHat ? 0.25 : cymbal ? 0.7 : snare ? 0.15 : 0.08
    const level = (hat ? 0.08 : cymbal ? 0.06 : snare ? 0.2 : 0.08) * velocity
    const src = ctx.createBufferSource()
    src.buffer = noise
    const filter = ctx.createBiquadFilter()
    filter.type = snare ? 'bandpass' : 'highpass'
    filter.frequency.value = snare ? 1800 : hat || openHat ? 7000 : 5000
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(level, when)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + decay)
    src.connect(filter).connect(gain).connect(input)
    src.start(when)
    src.stop(when + decay + 0.05)
    track(src, gain)
    if (snare) pitchedDrum(when, 180, 0.12 * velocity)
  }

  return {
    play(note, when, duration) {
      let midi
      try {
        midi = noteToMidi(note.note)
      } catch {
        return
      }
      // force de la note dans le fichier MIDI : garde les nuances au lieu de tout jouer fort
      const velocity = note.velocity ?? 0.7
      if (note.channel === DRUM_CHANNEL) return drum(midi, when, velocity)
      const family = familyOf(note.instrument)
      if (family === 'timpani') return pitchedDrum(when, midiToFreq(midi), 0.35 * velocity, 0.6)
      tone(midi, family, when, Math.max(0.05, duration), velocity)
    },

    stopAll() {
      const now = ctx.currentTime
      for (const { source, gain } of voices) {
        try {
          gain.gain.cancelScheduledValues(now)
          gain.gain.setTargetAtTime(0, now, 0.02)
          source.stop(now + 0.1)
        } catch {
          // déjà arrêtée
        }
      }
      voices.clear()
    },
  }
}
