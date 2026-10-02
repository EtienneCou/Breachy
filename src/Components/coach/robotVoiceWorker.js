// Fabrique la voix du robot (fichier WAV) à partir d'une phrase, avec Piper, dans un
// « worker » : le calcul ne bloque ni le jeu ni la danse du robot.
// Messages reçus : { id, voiceId, wasmPaths, text } (sans text : prépare seulement la voix).
// Messages envoyés : { id, blob } ou { id, error }, et { progress } pendant le téléchargement.
import { TtsSession } from '@mintplex-labs/piper-tts-web'

let session = null

self.onmessage = async ({ data: { id, voiceId, wasmPaths, text } }) => {
  try {
    session ??= TtsSession.create({
      voiceId,
      wasmPaths,
      progress: ({ loaded, total }) => self.postMessage({ progress: total ? loaded / total : 0 }),
    })
    const tts = await session
    self.postMessage({ id, blob: text ? await tts.predict(text) : null })
  } catch (error) {
    session = null // on réessaiera à la prochaine phrase
    self.postMessage({ id, error: String(error?.message ?? error) })
  }
}
