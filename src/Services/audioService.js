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

// Cache for preloaded audio elements to prevent latency
const audioCache = new Map();

function getCachedAudio(url) {
  if (typeof Audio === 'undefined') return null;
  let audio = audioCache.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = 'auto';
    audio.volume = 0.95;
    audioCache.set(url, audio);
  }
  return audio;
}

// Preload common clips in advance
if (typeof window !== 'undefined') {
  setTimeout(() => {
    ['fr', 'en'].forEach((lang) => {
      const prefix = lang === 'en' ? '/audio/reachy/en/' : '/audio/reachy/';
      PRAISES.forEach((name) => getCachedAudio(`${prefix}${name}.mp3`));
      ENCOURAGEMENTS.forEach((name) => getCachedAudio(`${prefix}${name}.mp3`));
    });
    getCachedAudio('/sound/bravo-kid.mp3');
    getCachedAudio('/sound/courage-kid.mp3');
    getCachedAudio('/sound/bravo-kid-en.mp3');
    getCachedAudio('/sound/courage-kid-en.mp3');
  }, 100);
}

export function playBravo(explicitLang) {
  const lang = explicitLang || getCurrentLanguage();
  const soundName = PRAISES[Math.floor(Math.random() * PRAISES.length)];
  const primaryPath = lang === 'en'
    ? `/audio/reachy/en/${soundName}.mp3`
    : `/audio/reachy/${soundName}.mp3`;
  const fallbackPath = lang === 'en'
    ? '/sound/bravo-kid-en.mp3'
    : '/sound/bravo-kid.mp3';

  const audio = getCachedAudio(primaryPath) || new Audio(primaryPath);
  audio.currentTime = 0;
  audio.volume = 0.95;

  return audio.play().catch((err) => {
    console.warn(`[audioService] Erreur avec ${primaryPath}, essai fallback ${fallbackPath}:`, err);
    const fb = new Audio(fallbackPath);
    fb.volume = 0.95;
    return fb.play().catch((fbErr) => {
      console.error('[audioService] Erreur lecture bravo fallback :', fbErr);
    });
  });
}

export function playEncouragement(explicitLang) {
  const lang = explicitLang || getCurrentLanguage();
  const soundName = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
  const primaryPath = lang === 'en'
    ? `/audio/reachy/en/${soundName}.mp3`
    : `/audio/reachy/${soundName}.mp3`;
  const fallbackPath = lang === 'en'
    ? '/sound/courage-kid-en.mp3'
    : '/sound/courage-kid.mp3';

  const audio = getCachedAudio(primaryPath) || new Audio(primaryPath);
  audio.currentTime = 0;
  audio.volume = 0.95;

  return audio.play().catch((err) => {
    console.warn(`[audioService] Erreur avec ${primaryPath}, essai fallback ${fallbackPath}:`, err);
    const fb = new Audio(fallbackPath);
    fb.volume = 0.95;
    return fb.play().catch((fbErr) => {
      console.error('[audioService] Erreur lecture encouragement fallback :', fbErr);
    });
  });
}