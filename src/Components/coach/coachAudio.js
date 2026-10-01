import { pianoSynth } from '../piano'

// Voix et petits sons du coach Reachy.
// Pendant le jeu : des sons courts façon robot (ils ne couvrent pas la musique).
// Au bilan et à l'accueil : des phrases dites par la synthèse vocale du navigateur.

// Chaque son : une suite de notes [fréquence en Hz, durée en s], jouées d'affilée.
const SOUNDS = {
  happy: [[880, 0.07], [1320, 0.1]],
  cheer: [[784, 0.07], [988, 0.07], [1175, 0.07], [1568, 0.16]],
  oops: [[740, 0.09], [554, 0.16]],
  go: [[660, 0.06], [990, 0.12]],
  think: [[620, 0.08], [700, 0.08], [620, 0.12]],
  hello: [[523, 0.08], [784, 0.08], [1046, 0.14]],
}

/** Joue un petit son du coach : 'happy', 'cheer', 'oops', 'go', 'think' ou 'hello'. */
export function playCoachSound(name, volume = 0.18) {
  const notes = SOUNDS[name]
  if (!notes) return
  pianoSynth.ensureContext()
  const { ctx, master } = pianoSynth
  let t = ctx.currentTime + 0.02
  for (const [freq, length] of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, t)
    // petit glissé vers le haut : son « vivant » plutôt que bip de machine
    osc.frequency.exponentialRampToValueAtTime(freq * 1.06, t + length)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(volume, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
    osc.connect(gain).connect(master)
    osc.start(t)
    osc.stop(t + length + 0.02)
    t += length * 0.9
  }
}

// ---------- Voix ----------

let frenchVoice
function pickVoice() {
  if (frenchVoice !== undefined) return frenchVoice
  const voices = window.speechSynthesis?.getVoices() ?? []
  if (!voices.length) return null // pas encore chargées : on réessaiera
  frenchVoice = voices.find((v) => v.lang === 'fr-FR' && /google|natural|online/i.test(v.name)) ?? voices.find((v) => v.lang?.startsWith('fr')) ?? null
  return frenchVoice
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    frenchVoice = undefined
    pickVoice()
  })
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/**
 * Dit une phrase à voix haute (coupe la phrase précédente). `onEnd` est appelé à la fin.
 * `quick` : débit un peu plus rapide, pour les encouragements pendant le jeu.
 */
export function speak(text, { onEnd, onStart, quick = false } = {}) {
  if (!canSpeak()) {
    onEnd?.()
    return
  }
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'fr-FR'
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  utterance.rate = quick ? 1.15 : 1.05
  utterance.pitch = 1.25 // voix un peu plus aiguë : un petit robot sympathique
  utterance.onstart = () => onStart?.()
  utterance.onend = () => onEnd?.()
  utterance.onerror = () => onEnd?.()
  synth.speak(utterance)
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
