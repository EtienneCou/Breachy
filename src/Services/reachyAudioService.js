const AUDIO_API =
  "http://localhost:3001"

export async function playBravo() {
  const response =
    await fetch(
      `${AUDIO_API}/sound/bravo`,
      {
        method: "POST",
      }
    )

  if (!response.ok) {
    throw new Error(
      "Impossible de jouer Bravo"
    )
  }
}

export async function playEncouragement() {
  const response =
    await fetch(
      `${AUDIO_API}/sound/encouragement`,
      {
        method: "POST",
      }
    )

  if (!response.ok) {
    throw new Error(
      "Impossible de jouer l'encouragement"
    )
  }
}