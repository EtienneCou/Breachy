import { pianoSynth } from '../piano'
import { robotVoiceReady, synthesize } from './robotVoice.js'

// Voix et petits sons du coach Reachy.
// Petits sons : courts, façon robot (ils ne couvrent pas la musique), joués par l'ordinateur.
// Voix : sur le haut-parleur du robot quand il est branché (voir robotVoice.js), sinon
// la synthèse vocale du navigateur.

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

// Phrase en cours : `turn` change à chaque nouvelle phrase (ou silence), ce qui
// abandonne une phrase du robot encore en préparation.
let turn = 0
let pending = 0
let robotTimer = 0
let speakingRobot = null // client du robot qui parle, pour le faire taire
let preview = null // voix du robot écoutée sur l'ordinateur (simulation)
const uploaded = new Set() // phrases déjà envoyées au robot

/** Oublie les phrases envoyées : à appeler quand le robot (re)démarre. */
export function forgetRobotSounds() {
  uploaded.clear()
}

/**
 * Dit une phrase à voix haute (coupe la phrase précédente). `onEnd` est appelé à la fin.
 * - quick   débit un peu plus rapide (voix du navigateur), pour les encouragements en jeu
 * - robot   où parler avec la voix du robot : { kind: 'robot', client } sur son haut-parleur,
 *           { kind: 'preview' } sur l'ordinateur (simulation sans haut-parleur), ou null.
 *           Si cette voix n'est pas prête ou échoue, c'est la voix du navigateur qui parle.
 * - evil    voix du Reachy diabolique (plus grave, plus lente)
 */
export function speak(text, { onEnd, onStart, quick = false, robot = null, evil = false } = {}) {
  const interrupting = canSpeak() && (window.speechSynthesis.speaking || window.speechSynthesis.pending)
  stopSpeaking()
  const myTurn = turn
  if (robot && robotVoiceReady()) {
    speakWithRobotVoice(text, robot, myTurn, { onStart, onEnd, evil }).catch((error) => {
      console.warn('Voix du robot : repli sur la voix du navigateur.', error.message)
      if (myTurn === turn) speakInBrowser(text, { onStart, onEnd, quick, interrupting, evil })
    })
  } else {
    speakInBrowser(text, { onStart, onEnd, quick, interrupting, evil })
  }
}

async function speakWithRobotVoice(text, robot, myTurn, { onStart, onEnd, evil }) {
  const { blob, duration, name } = await synthesize(text, evil ? 'evil' : 'nice')
  if (myTurn !== turn) return // une autre phrase est arrivée entre-temps
  if (robot.kind === 'preview') {
    preview = new Audio(URL.createObjectURL(blob))
    const audio = preview
    const end = () => {
      URL.revokeObjectURL(audio.src)
      if (myTurn === turn) onEnd?.()
    }
    audio.onended = end
    audio.onerror = end
    await audio.play()
    onStart?.()
    return
  }
  const { client } = robot
  if (!uploaded.has(name)) {
    await client.uploadSound(blob, name)
    uploaded.add(name)
  }
  if (myTurn !== turn) return
  await client.playSound(name)
  speakingRobot = client
  onStart?.()
  // Le robot ne prévient pas quand il a fini : on se fie à la durée du fichier.
  robotTimer = setTimeout(() => {
    speakingRobot = null
    if (myTurn === turn) onEnd?.()
  }, duration * 1000 + 250)
}

// Chrome peut perdre une phrase : si l'objet de la phrase est libéré avant la fin, `onend`
// n'arrive jamais ; et une phrase lancée juste après cancel() est parfois ignorée.
// On garde donc la phrase en cours, on attend un instant après cancel(), et un délai de
// secours termine la phrase si le navigateur ne le fait pas.
let current = null

function speakInBrowser(text, { onEnd, onStart, quick, interrupting, evil }) {
  if (!canSpeak()) {
    onEnd?.()
    return
  }
  const synth = window.speechSynthesis
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'fr-FR'
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  utterance.rate = (quick ? 1.15 : 1.05) * (evil ? 0.85 : 1)
  utterance.pitch = evil ? 0.3 : 1.25 // aiguë : un petit robot sympathique ; grave : le diabolique

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

/** Coupe la phrase en cours, où qu'elle soit dite. */
export function stopSpeaking() {
  turn++
  clearTimeout(pending)
  clearTimeout(robotTimer)
  if (canSpeak()) window.speechSynthesis.cancel()
  if (preview) {
    preview.pause()
    URL.revokeObjectURL(preview.src)
    preview = null
  }
  if (speakingRobot) {
    speakingRobot.stopSound().catch(() => {})
    speakingRobot = null
  }
}
