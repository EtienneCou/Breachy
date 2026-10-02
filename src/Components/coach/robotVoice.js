// Voix du robot : chaque phrase devient un fichier WAV (Piper, dans le navigateur, avec un
// style « petit robot »), que le robot joue sur son haut-parleur. La voix de chaque langue
// (française, anglaise) est téléchargée une fois (~63 Mo),
// puis gardée par le navigateur. Tant qu'elle n'est pas prête, le coach parle avec la voix
// du navigateur.

// Une voix par langue du site (téléchargée la première fois qu'on en a besoin)
const VOICES = { fr: 'fr_FR-siwis-medium', en: 'en_US-amy-medium' }
const voiceOf = (lang) => VOICES[lang] ?? VOICES.fr

// Styles de voix (un par personnalité du coach) :
// - nice : « petit robot mignon », choisi à l'écoute : voix plus aiguë et plus rapide,
//          légère touche métallique, un peu plus de présence ;
// - evil : Reachy diabolique : plus grave et plus lent, grain métallique plus rugueux,
//          avec un léger écho de caverne.
const STYLES = {
  nice: {
    rate: 1.22, // vitesse et hauteur ensemble (1 = voix d'origine)
    ring: 60, // fréquence de la touche métallique (Hz)
    ringMix: 0.25, // part de son métallique (0 à 1)
    presence: 3, // dB ajoutés vers 3 kHz : la voix ressort mieux sur un petit haut-parleur
    echo: 0, // part de l'écho (0 = aucun)
  },
  evil: { rate: 0.8, ring: 32, ringMix: 0.4, presence: 2, echo: 0.28 },
}

// Les fichiers du moteur de calcul doivent être de la même version que le paquet
// onnxruntime-web installé (version fixée dans package.json).
const WASM_PATHS = {
  onnxWasm: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/',
  piperData: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data',
  piperWasm: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',
}

const CACHE_SIZE = 150 // phrases déjà fabriquées, gardées pour les redire sans attendre

let worker = null
let nextId = 0
const waiting = new Map()
const ready = new Map() // langue → promesse : sa voix est prête
const isReady = new Set() // langues dont la voix est prête
const cache = new Map()

function send(text, lang) {
  worker ??= createWorker()
  const id = ++nextId
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject })
    worker.postMessage({ id, voiceId: voiceOf(lang), wasmPaths: WASM_PATHS, text })
  })
}

function createWorker() {
  const w = new Worker(new URL('./robotVoiceWorker.js', import.meta.url), { type: 'module' })
  w.onmessage = ({ data }) => {
    if (data.progress != null) return
    const job = waiting.get(data.id)
    waiting.delete(data.id)
    if (data.error) job?.reject(new Error(data.error))
    else job?.resolve(data.blob)
  }
  return w
}

/** Prépare la voix d'une langue (téléchargement la première fois), sans attendre. */
export function prepareRobotVoice(lang = 'fr') {
  if (!ready.has(lang)) {
    ready.set(
      lang,
      send(null, lang).then(
        () => {
          isReady.add(lang)
        },
        (error) => {
          ready.delete(lang) // on réessaiera plus tard
          console.warn('Voix du robot indisponible :', error.message)
        },
      ),
    )
  }
  return ready.get(lang)
}

export const robotVoiceReady = (lang = 'fr') => isReady.has(lang)

/**
 * Fabrique à l'avance des phrases (ex. les encouragements du jeu), une par une, en
 * arrière-plan : elles partiront sans délai.
 */
export async function prepareLines(lines, style = 'nice', lang = 'fr') {
  for (const line of lines) {
    try {
      await synthesize(line, style, lang)
    } catch {
      return // voix indisponible : on n'insiste pas
    }
  }
}

/**
 * Fabrique la phrase dans le style voulu ('nice' ou 'evil') : { blob (WAV), duration (s),
 * name (nom de fichier stable pour cette phrase) }. Les phrases déjà dites sont gardées.
 */
export async function synthesize(text, style = 'nice', lang = 'fr') {
  const key = `${lang}|${style}|${text}`
  const known = cache.get(key)
  if (known) return known
  const blob = await robotStyle(await send(text, lang), STYLES[style] ?? STYLES.nice)
  const prefix = `${lang === 'fr' ? '' : `${lang}-`}${style === 'nice' ? '' : `${style}-`}`
  const sound = { blob, duration: await wavDuration(blob), name: `breachy-coach-${prefix}${hash(text)}.wav` }
  cache.set(key, sound)
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value)
  return sound
}

/** Applique un style de voix (STYLES) à la phrase de Piper ; retourne un WAV 16 bits mono. */
async function robotStyle(wav, STYLE) {
  const source = await new OfflineAudioContext(1, 1, 22050).decodeAudioData(await wav.arrayBuffer())
  const rate = source.sampleRate
  const ctx = new OfflineAudioContext(1, Math.ceil((source.duration / STYLE.rate + 0.1 + (STYLE.echo ? 0.4 : 0)) * rate), rate)
  const voice = ctx.createBufferSource()
  voice.buffer = source
  voice.playbackRate.value = STYLE.rate

  // Touche métallique : une part de la voix est multipliée par une onde à STYLE.ring Hz.
  const dry = ctx.createGain()
  dry.gain.value = 1 - STYLE.ringMix
  const metal = ctx.createGain()
  metal.gain.value = 0
  const wave = ctx.createOscillator()
  wave.frequency.value = STYLE.ring
  const depth = ctx.createGain()
  depth.gain.value = STYLE.ringMix
  wave.connect(depth).connect(metal.gain)
  const mix = ctx.createGain()
  voice.connect(dry).connect(mix)
  voice.connect(metal).connect(mix)

  const presence = ctx.createBiquadFilter()
  presence.type = 'peaking'
  presence.frequency.value = 3000
  presence.Q.value = 0.9
  presence.gain.value = STYLE.presence
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -20
  compressor.ratio.value = 4
  mix.connect(presence).connect(compressor).connect(ctx.destination)

  // Écho : la voix revient, plus faible, un peu plus tard (deux fois).
  if (STYLE.echo) {
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.13
    const feedback = ctx.createGain()
    feedback.gain.value = STYLE.echo
    compressor.connect(delay).connect(feedback).connect(ctx.destination)
    feedback.connect(delay)
  }

  wave.start()
  voice.start()
  const data = (await ctx.startRendering()).getChannelData(0)
  return toWav(data, rate)
}

// WAV 16 bits mono, volume remonté au maximum sans saturer.
function toWav(data, sampleRate) {
  let peak = 0
  for (const v of data) peak = Math.max(peak, Math.abs(v))
  const gain = peak ? 0.9 / peak : 1
  const view = new DataView(new ArrayBuffer(44 + data.length * 2))
  const text = (offset, s) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + data.length * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, data.length * 2, true)
  for (let i = 0; i < data.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i] * gain)) * 32767, true)
  return new Blob([view.buffer], { type: 'audio/wav' })
}

// Durée d'un WAV 16 bits mono : taille des données / (fréquence × 2 octets).
async function wavDuration(blob) {
  const header = new DataView(await blob.slice(0, 44).arrayBuffer())
  const sampleRate = header.getUint32(24, true)
  return (blob.size - 44) / (sampleRate * 2)
}

function hash(text) {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
  return h.toString(36)
}
