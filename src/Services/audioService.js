const positiveSounds = [
  new Audio("/sound/bravo.mp3"),
  new Audio("/sound/super.mp3"),
  new Audio("/sound/genial.mp3"),
  new Audio("/sound/parfait.mp3"),
]

const encouragementSounds = [
  new Audio("/sound/courage.mp3"),
  new Audio("/sound/lache_rien.mp3"),
  new Audio("/sound/presque.mp3"),
  new Audio("/sound/reessaie.mp3"),
]

// Préchargement de tous les sons
const allSounds = [
  ...positiveSounds,
  ...encouragementSounds,
]

allSounds.forEach((audio) => {
  audio.preload = "auto"
  audio.load()
})

function playRandomSound(sounds) {
  if (!sounds.length) {
    return Promise.resolve()
  }

  const randomIndex = Math.floor(
    Math.random() * sounds.length
  )

  const audio = sounds[randomIndex]

  // Repart du début si ce son a déjà été joué
  audio.currentTime = 0

  return audio.play()
}


// Réaction après 10 bonnes notes
export function playPositive() {
  return playRandomSound(positiveSounds)
}


// Réaction après 10 mauvaises notes
export function playEncouragement() {
  return playRandomSound(encouragementSounds)
}