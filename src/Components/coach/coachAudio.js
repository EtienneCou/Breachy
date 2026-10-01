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

// Chrome peut perdre une phrase : si l'objet de la phrase est libéré avant la fin, `onend`
// n'arrive jamais ; et une phrase lancée juste après cancel() est parfois ignorée.
// On garde donc la phrase en cours, on attend un instant après cancel(), et un délai de
// secours termine la phrase si le navigateur ne le fait pas.
let current = null
let pending = 0

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
  clearTimeout(pending)
  const interrupting = synth.speaking || synth.pending
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'fr-FR'
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  utterance.rate = quick ? 1.15 : 1.05
  utterance.pitch = 1.25 // voix un peu plus aiguë : un petit robot sympathique

  let ended = false
  let rescue = 0
  const end = () => {
    if (ended) return
    ended = true
    clearTimeout(rescue)
    if (current === utterance) current = null
    onEnd?.()
  }
  utterance.onstart = () => onStart?.()
  utterance.onend = end
  utterance.onerror = end
  current = utterance
  // Secours : environ 90 ms par lettre, plus une marge.
  rescue = setTimeout(end, 2000 + (text.length * 90) / utterance.rate)
  pending = setTimeout(() => synth.speak(utterance), interrupting ? 80 : 0)
}

export function stopSpeaking() {
  clearTimeout(pending)
  if (canSpeak()) window.speechSynthesis.cancel()
}
