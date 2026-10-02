const AUDIO_API = "http://localhost:3001"

function getCurrentLanguage() {
  try {
    const lang = localStorage.getItem('reachy-lang') || localStorage.getItem('reachy.language')
    if (lang === 'en' || lang === 'fr') return lang
  } catch {
    // ignore
  }
  return 'fr'
}

export async function playBravo(explicitLang) {
  const lang = explicitLang || getCurrentLanguage()
  const response = await fetch(`${AUDIO_API}/sound/bravo?lang=${lang}`, {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error("Impossible de jouer Bravo")
  }
}

export async function playEncouragement(explicitLang) {
  const lang = explicitLang || getCurrentLanguage()
  const response = await fetch(`${AUDIO_API}/sound/encouragement?lang=${lang}`, {
    method: "POST",
  })

  if (!response.ok) {
    throw new Error("Impossible de jouer l'encouragement")
  }
}