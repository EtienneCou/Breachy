const bravoAudio = new Audio("/sound/bravo-kid.mp3")
const encouragementAudio = new Audio(
  "/sound/courage-kid.mp3"
)

// Préchargement dès le démarrage
bravoAudio.preload = "auto"
encouragementAudio.preload = "auto"

bravoAudio.load()
encouragementAudio.load()

export function playBravo() {
  bravoAudio.currentTime = 0

  return bravoAudio.play()
}

export function playEncouragement() {
  encouragementAudio.currentTime = 0

  return encouragementAudio.play()
}