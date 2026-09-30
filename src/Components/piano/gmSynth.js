import { WorkletSynthesizer } from 'spessasynth_lib'
import processorUrl from 'spessasynth_lib/dist/spessasynth_processor.min.js?url'

// Synthétiseur General MIDI avec de vrais instruments enregistrés (banque de sons
// GeneralUser GS, public/soundfonts). Sert à l'écoute des morceaux (services/audioPlayer)
// et à l'entraînement (piano du joueur + accompagnement).
// La banque est téléchargée une seule fois, puis partagée par tous les synthétiseurs.

const SOUND_BANK_URL = `${import.meta.env.BASE_URL}soundfonts/GeneralUserGS.sf3`

let soundBank = null
function loadSoundBank() {
  soundBank ??= fetch(SOUND_BANK_URL).then((response) => {
    if (!response.ok) throw new Error(`Banque de sons introuvable (${response.status})`)
    return response.arrayBuffer()
  })
  return soundBank
}

const worklets = new WeakMap() // contexte audio -> chargement du processeur

/**
 * Crée un synthétiseur General MIDI sur le contexte audio donné, prêt à jouer.
 * Il n'est branché nulle part : appeler synth.connect(noeud) pour l'entendre.
 */
export async function createGMSynth(ctx) {
  if (!worklets.has(ctx)) worklets.set(ctx, ctx.audioWorklet.addModule(processorUrl))
  await worklets.get(ctx)
  const synth = new WorkletSynthesizer(ctx)
  const bank = await loadSoundBank()
  // copie : le tampon est transféré au processeur audio, et d'autres synthés en ont besoin
  await synth.soundBankManager.addSoundBank(bank.slice(0), 'main')
  await synth.isReady
  return synth
}

// Contrôleur MIDI de la pédale forte
export const SUSTAIN_PEDAL = 64
