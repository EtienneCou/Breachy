// Fabrique la voix du robot (fichier WAV) à partir d'une phrase, avec Piper, dans un
// « worker » : le calcul ne bloque ni le jeu ni la danse du robot.
// Messages reçus : { id, voiceId, lengthScale, wasmPaths, text } (sans text : prépare seulement la voix).
// Messages envoyés : { id, blob } ou { id, error }, et { progress } pendant le téléchargement.
import { TtsSession } from '@mintplex-labs/piper-tts-web'

// Débit de la diction : Piper le lit dans le fichier de réglages de la voix (length_scale,
// plus grand = plus lent), au chargement. On l'ajuste au passage, pour la session en cours
// de création : le style « petit robot » accélère la voix, la diction compense.
let pendingLengthScale = 1
const parseJson = JSON.parse
JSON.parse = (text, reviver) => {
  const value = parseJson(text, reviver)
  if (pendingLengthScale !== 1 && value?.inference?.length_scale && value?.espeak) {
    value.inference.length_scale *= pendingLengthScale
  }
  return value
}

// Une session par voix (une par langue) et par débit. La bibliothèque n'en garde qu'une
// pour toute la page (elle réutiliserait le modèle de la première langue) : on lui fait
// créer une vraie session à chaque fois, une à la fois.
const sessions = new Map()
let creating = Promise.resolve()

function sessionFor(voiceId, lengthScale, wasmPaths) {
  const key = `${voiceId}|${lengthScale}`
  if (!sessions.has(key)) {
    const made = creating.then(async () => {
      TtsSession._instance = null
      pendingLengthScale = lengthScale
      try {
        return await TtsSession.create({
          voiceId,
          wasmPaths,
          progress: ({ loaded, total }) => self.postMessage({ progress: total ? loaded / total : 0 }),
        })
      } finally {
        pendingLengthScale = 1
      }
    })
    creating = made.catch(() => {})
    sessions.set(key, made)
  }
  return sessions.get(key)
}

self.onmessage = async ({ data: { id, voiceId, lengthScale = 1, wasmPaths, text } }) => {
  try {
    const tts = await sessionFor(voiceId, lengthScale, wasmPaths)
    self.postMessage({ id, blob: text ? await tts.predict(text) : null })
  } catch (error) {
    sessions.delete(`${voiceId}|${lengthScale}`) // on réessaiera à la prochaine phrase
    self.postMessage({ id, error: String(error?.message ?? error) })
  }
}
