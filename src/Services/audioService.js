const PRAISES = ['bravo', 'bravooo', 'super', 'excellent', 'parfait', 'genial'];
const ENCOURAGEMENTS = ['lache_rien', 'courage', 'presque', 'reessaie', 'concentre'];

function getCurrentLanguage() {
  try {
    const lang = localStorage.getItem('reachy-lang') || localStorage.getItem('reachy.language');
    if (lang === 'en' || lang === 'fr') return lang;
  } catch {
    // ignore
  }
  return 'fr';
}

export function playBravo(explicitLang) {
  const lang = explicitLang || getCurrentLanguage();
  const soundName = PRAISES[Math.floor(Math.random() * PRAISES.length)];
  const path = lang === 'en'
    ? `/audio/reachy/en/${soundName}.mp3`
    : `/audio/reachy/${soundName}.mp3`;

  const audio = new Audio(path);
  audio.volume = 0.9;
  return audio.play().catch((error) => {
    console.error('Erreur lecture son bravo :', error);
  });
}

export function playEncouragement(explicitLang) {
  const lang = explicitLang || getCurrentLanguage();
  const soundName = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
  const path = lang === 'en'
    ? `/audio/reachy/en/${soundName}.mp3`
    : `/audio/reachy/${soundName}.mp3`;

  const audio = new Audio(path);
  audio.volume = 0.9;
  return audio.play().catch((error) => {
    console.error('Erreur lecture son encouragement :', error);
  });
}