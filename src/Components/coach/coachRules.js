// Le « caractère » du coach : comment Reachy réagit à chaque événement de la séance.
// Une réaction décrit tout ce qu'il fait en même temps :
// {
//   mood:     humeur de l'avatar ('happy', 'cheer', 'sad', 'think', 'attentive', 'surprised', 'dance', 'proud', 'calm', 'sleepy', 'idle')
//   bubble:   texte de la bulle (mot ou phrase très courte pendant le jeu)
//   sound:    petit son ('happy', 'cheer', 'oops', 'go', 'think', 'hello')
//   speech:   phrase dite à voix haute (bilan et accueil)
//   say:      encouragement parlé pendant le jeu (mots très courts) ; il se tait si le
//             joueur a coupé les encouragements, et ne parle pas plus d'une fois toutes les 9 s
//   robot:    { emotion } | { dance } | { gesture } : ce que fait le vrai robot ; pendant le
//             morceau, seulement des gestes : ils s'ajoutent à sa danse sans l'interrompre
//   priority: 1 (petit geste) à 3 (moment important) ; une réaction n'en coupe pas une plus importante
//   cooldown: secondes avant de pouvoir rejouer ce type de réaction
// }

const pick = (list) => list[Math.floor(Math.random() * list.length)]

// ---------- Phrases sans répétition ----------
// Chaque moment a plusieurs phrases. On évite les dernières déjà dites pour ce moment,
// et la toute dernière phrase prononcée : sinon on a vite envie qu'il se taise.
const recentByMoment = new Map()
let lastLine = ''

function line(moment, choices) {
  const recent = recentByMoment.get(moment) ?? []
  const fresh = choices.filter((c) => !recent.includes(c) && c !== lastLine)
  const chosen = pick(fresh.length ? fresh : choices.filter((c) => c !== lastLine).length ? choices.filter((c) => c !== lastLine) : choices)
  recentByMoment.set(moment, [...recent, chosen].slice(-Math.min(3, choices.length - 1)))
  lastLine = chosen
  return chosen
}

// Ce que Reachy dit pendant le jeu : des mots courts, qui ne couvrent pas la musique.
export const LINES = {
  start: ['C\'est parti !', 'Allez, à toi !', 'On y va !', 'Go, je te suis !', 'Montre-moi ce que tu sais faire !', 'En avant la musique !'],
  // Décompte avant le morceau (dans l'ordre : 3, 2, 1)
  count: ['Trois !', 'Deux !', 'Un !'],
  // Réveil, quand on rejoue après l'avoir laissé s'endormir
  wake: ['Oh ! Je m\'étais endormi… On joue ?', 'Hein ? Ah, te revoilà ! On joue ?', 'Oups, je somnolais ! C\'est reparti ?'],
  resume: ['On reprend !', 'C\'est reparti !', 'Allez, on continue !', 'Je t\'attendais !', 'Prêt ? On y retourne !'],
  milestone10: ['10 d\'affilée !', 'Et de 10 !', '10, bravo !', 'Belle série !'],
  milestone25: ['25 ! Trop fort !', '25 d\'affilée, waouh !', 'Quelle série !', 'Tu es lancé !'],
  milestone50: ['50 ! Incroyable !', '50, tu es en feu !', 'Mais tu es inarrêtable !'],
  milestoneBig: ['Légendaire !', 'Je n\'en reviens pas !', 'Tu es un vrai pro !'],
  streakLost: ['Oups, on repart !', 'Pas grave, on continue !', 'Allez, on se relance !', 'Ça arrive à tout le monde !', 'Zut ! Nouvelle série !', 'On repart de plus belle !'],
  struggle: ['Respire, ça va venir.', 'Doucement, prends ton temps.', 'Regarde bien les notes qui tombent.', 'Tu peux ralentir si besoin.', 'On ne lâche rien !', 'Concentre-toi sur la prochaine note.'],
  comeback: ['Bien rattrapé !', 'Voilà, c\'est ça !', 'Tu es revenu !', 'Super, ça repart !', 'Je le savais !', 'Bien joué !'],
  danceUp: ['Là je danse !', 'Ça groove !', 'Tu me fais danser !', 'Quel rythme !', 'J\'adore ce morceau !', 'Continue, je m\'éclate !', 'Ça, c\'est du son !'],
  danceDown: ['Fais-moi danser !', 'Allez, réveille-moi !', 'Je compte sur toi pour le rythme !', 'Donne-moi du rythme !'],
}

// Réaction parlée : le même texte dans la bulle et à voix haute.
const spoken = (moment) => {
  const text = line(moment, LINES[moment])
  return { bubble: text, say: text }
}

// ---------- Pendant l'entraînement ----------

export const TRAINING_RULES = {
  ready: ({ title }) => ({
    mood: 'attentive',
    bubble: title ? `On joue « ${title} » ? Appuie sur Entrée !` : 'Prêt ? Appuie sur Entrée !',
    robot: { emotion: 'attentive1' },
    priority: 2,
  }),

  start: () => ({
    mood: 'happy',
    ...spoken('start'),
    sound: 'go',
    robot: { gesture: 'perk' },
    priority: 2,
  }),

  // Décompte avant le morceau : « Trois ! Deux ! Un ! » avec une antenne, l'autre, les deux.
  // Toujours dit à voix haute (sauf voix coupée), même juste après une autre phrase.
  count: ({ n }) => ({
    mood: 'attentive',
    bubble: String(n),
    speech: LINES.count[3 - n],
    quick: true,
    robot: { gesture: `count${n}` },
    priority: 3,
    holdMs: 900,
  }),

  // Fin du décompte : « C'est parti ! » et un hochement.
  go: () => {
    const text = line('start', LINES.start)
    return { mood: 'happy', bubble: text, speech: text, quick: true, sound: 'go', robot: { gesture: 'go' }, priority: 3, holdMs: 1200 }
  },

  // Une note réussie : petit geste ajouté à sa danse, pour sentir qu'il suit.
  // Pas d'humeur ni de parole : c'est la danse elle-même qui montre si le joueur joue bien.
  hit: ({ precision }) => ({
    bubble: precision === 'perfect' && Math.random() < 0.2 ? pick(['Oui !', 'Joli !', 'Top !']) : null,
    robot: { gesture: Math.random() < 0.5 ? 'antennaFlick' : 'nod' },
    priority: 1,
    cooldown: 1.2,
  }),

  miss: () => ({
    bubble: Math.random() < 0.3 ? pick(['Presque…', 'Hmm ?', 'Pas grave']) : null,
    robot: { gesture: 'tilt' },
    priority: 1,
    cooldown: 2,
  }),

  milestone: ({ streak }) => {
    const moment = streak >= 100 ? 'milestoneBig' : streak >= 50 ? 'milestone50' : streak >= 25 ? 'milestone25' : 'milestone10'
    return {
      mood: streak >= 50 ? 'dance' : 'cheer',
      ...spoken(moment),
      sound: 'cheer',
      robot: { gesture: 'perk' },
      priority: 3,
    }
  },

  // Une belle série vient de se casser.
  streakLost: () => ({
    mood: 'sad',
    ...spoken('streakLost'),
    sound: 'oops',
    robot: { gesture: 'tilt' },
    priority: 2,
    cooldown: 6,
  }),

  // Beaucoup de notes ratées d'un coup.
  struggle: () => ({
    mood: 'calm',
    ...spoken('struggle'),
    sound: 'think',
    robot: { gesture: 'tilt' },
    priority: 2,
    cooldown: 18,
  }),

  // Ça repart bien après un passage difficile.
  comeback: () => ({
    mood: 'proud',
    ...spoken('comeback'),
    sound: 'happy',
    robot: { gesture: 'perk' },
    priority: 2,
    cooldown: 10,
  }),

  // Sa danse vient de passer à un bon niveau (3 ou 4) : il le dit en dansant.
  danceUp: () => ({
    ...spoken('danceUp'),
    priority: 1,
    cooldown: 20,
  }),

  // Sa danse retombe au plus bas : il réclame du rythme, gentiment.
  danceDown: () => ({
    ...spoken('danceDown'),
    priority: 1,
    cooldown: 25,
  }),

  pause: () => ({
    mood: 'attentive',
    bubble: 'Je t\'attends',
    robot: { emotion: 'serenity1' }, // commence et finit au neutre : la pause ne fait pas sursauter le robot
    priority: 2,
  }),

  resume: () => ({
    mood: 'happy',
    ...spoken('resume'),
    sound: 'go',
    robot: { gesture: 'perk' },
    priority: 2,
  }),
}

// ---------- Bilan de fin de morceau ----------

/**
 * Bilan dit par Reachy à la fin d'un morceau, à partir de computeGameStats(results) :
 * une ouverture, les chiffres, un conseil, et toujours un encouragement pour finir.
 * previousBest : meilleur résultat d'avant cette partie (pour fêter un record), ou null.
 * Retourne une réaction avec une vraie phrase (speech) et la même en bulle.
 */
export function finishReaction(stats, { speed = 1, title, previousBest = null } = {}) {
  const { successPercent: percent, stars, bestStreak, tendency } = stats
  const opening = [
    'C\'est un début !',
    'Pas mal du tout !',
    'Très bien joué !',
    'Magnifique, bravo !',
  ][stars] ?? 'Bravo !'

  const figures = `${percent} % de notes réussies${bestStreak > 1 ? `, et une série de ${bestStreak}` : ''}.`
  const record =
    previousBest && percent > previousBest.successPercent
      ? `Nouveau record : ${percent} %, contre ${previousBest.successPercent} % la dernière fois !`
      : null

  let advice
  if (stars === 3 && speed >= 1) advice = `Tu maîtrises ${title ? `« ${title} »` : 'ce morceau'}. Essaie un morceau plus difficile !`
  else if (percent >= 90 && speed < 1) advice = 'Tu es prêt pour la vitesse supérieure.'
  else if (percent < 60 && speed > 0.5) advice = 'Essaie un peu plus lentement, pour bien poser chaque note.'
  else if (tendency === 'early') advice = 'Tu joues un peu en avance : attends que la note touche la ligne.'
  else if (tendency === 'late') advice = 'Tu joues un peu en retard : anticipe un tout petit peu.'
  else if (stats.missedNotes > stats.wrongNotes) advice = 'Quelques notes oubliées : garde les yeux sur les notes qui arrivent.'
  else advice = null

  // Encouragement : il change avec le résultat, mais il y en a toujours un.
  const cheer = record
    ? 'Tu progresses, continue comme ça !'
    : [
        'Ne lâche rien, chaque essai te rapproche du but. On recommence ensemble ?',
        'Tu es sur la bonne voie, encore un essai et ça va le faire !',
        'Je suis fier de toi, continue comme ça !',
        'Tu es un vrai musicien, je me régale à danser avec toi !',
      ][stars] ?? 'Continue comme ça !'

  const speech = [opening, figures, record, advice, cheer].filter(Boolean).join(' ')
  return {
    mood: stars >= 3 || record ? 'dance' : stars === 2 ? 'proud' : stars === 1 ? 'happy' : 'calm',
    bubble: speech,
    speech,
    sound: stars >= 2 || record ? 'cheer' : 'happy',
    robot: stars >= 3 || record ? { emotion: 'success2' } : stars === 2 ? { emotion: 'proud2' } : stars === 1 ? { emotion: 'cheerful1' } : { emotion: 'understanding2' },
    priority: 3,
    holdMs: 14000,
  }
}

// ---------- Accueil ----------

/**
 * Accueil : Reachy dit bonjour et propose un morceau adapté, dans sa bulle.
 * suggestion : { title, levelLabel } ou null. `day` fait varier les phrases d'un jour à l'autre.
 * Retourne la réaction, avec `text` : le message à garder dans la bulle.
 */
export function welcomeReaction({ suggestion, firstVisitToday, day = 0 }) {
  const hello = (firstVisitToday ? ['Salut ! Content de te voir.', 'Coucou ! On fait de la musique ?', 'Bonjour ! Prêt à jouer ?'] : ['Re-bonjour !', 'On continue ?', 'Te revoilà !'])[day % 3]
  const offer = suggestion
    ? `Aujourd'hui, je te conseille « ${suggestion.title} »${suggestion.levelLabel ? ` (niveau ${suggestion.levelLabel.toLowerCase()})` : ''}.`
    : 'Choisis un morceau, je t\'accompagne pendant que tu joues.'
  const text = `${hello} ${offer}`
  return {
    text,
    mood: 'happy',
    bubble: text,
    speech: firstVisitToday ? text : null, // la voix seulement à la première visite du jour
    sound: 'hello',
    robot: { emotion: day % 2 ? 'welcoming2' : 'welcoming1' },
    priority: 3,
    holdMs: 6000,
  }
}

// ---------- Sommeil ----------

// Quand personne ne joue : il s'ennuie, puis s'endort ; il se réveille au premier appui.
export const SLEEP_RULES = {
  bored: () => ({
    mood: 'sleepy',
    bubble: pick(['Tu es là ? On joue ?', 'Je m\'ennuie un peu…', 'Une petite chanson ?']),
    sound: 'think',
    robot: { emotion: pick(['boredom1', 'boredom2']) },
    priority: 2,
    holdMs: 5000,
  }),

  wake: () => {
    const text = line('wake', LINES.wake)
    return { mood: 'surprised', bubble: text, speech: text, sound: 'hello', priority: 3, holdMs: 4000 }
  },
}
