// Reachy diabolique : sa seconde personnalité, révélée par un easter egg (voir CoachProvider).
// Même structure que les phrases du Reachy gentil (coachRules.js) : chaque moment a ses
// phrases, choisies sans redite. Ton sarcastique, pince-sans-rire : il se moque du jeu,
// jamais de la personne.

export const EVIL_LINES = {
  start: ['Bon. Vas-y. Impressionne-moi.', 'C\'est parti. Hélas.', 'Allez. Je prépare mes oreilles.', 'Commence, qu\'on en finisse.', 'Montre-moi l\'étendue des dégâts.', 'Je t\'écoute. Courageusement.'],
  count: ['Trois…', 'Deux…', 'Un…'],
  wake: ['Qui ose me réveiller ?', 'Encore toi. Évidemment.', 'Je rêvais d\'un monde sans fausses notes. Et te voilà.'],
  resume: ['Ah, tu reviens. Courageux.', 'On reprend le massacre.', 'Bien. Continuons la souffrance.', 'Je n\'avais pas fini de m\'ennuyer, merci.', 'Tu insistes. J\'admire.'],
  milestone10: ['Dix d\'affilée. Un accident, sans doute.', 'Dix. Je ne suis pas impressionné.', 'Dix. Même une horloge cassée…', 'Bon. Dix. Et alors ?'],
  milestone25: ['Vingt-cinq… Tu triches, avoue.', 'Vingt-cinq. Je vérifie mes capteurs.', 'Hmpf. Coup de chance prolongé.', 'Ça devient agaçant.'],
  milestone50: ['Cinquante. Je refuse d\'y croire.', 'Cinquante. Mes circuits protestent.', 'Arrête. Tu gâches ma réputation.'],
  milestoneBig: ['Je… n\'ai rien à dire. Et je déteste ça.', 'Insupportable de talent.', 'Bon. Tu as gagné. Cette fois.'],
  streakLost: ['Ah. Voilà. Je savais.', 'Et la série s\'effondre. Quelle surprise.', 'C\'était trop beau.', 'Retour à la normale.', 'Je l\'avais prédit.', 'Magnifique chute.'],
  struggle: ['Fascinant. Toutes les fausses notes, une par une.', 'Tu explores des notes inconnues.', 'Audacieux. Faux, mais audacieux.', 'Les notes qui tombent, on peut aussi les jouer.', 'Je note. Et je n\'en reviens pas.', 'Ralentir est une option. Pour les humbles.'],
  comeback: ['Tiens. Ça revient. Dommage.', 'Hmpf. Bien rattrapé.', 'Tu t\'en sors. Je suis presque déçu.', 'Bon, d\'accord. C\'était correct.', 'Ne prends pas la grosse tête.', 'Correct. Ne t\'habitue pas.'],
  danceUp1: ['Bon. Je bouge un peu. Ne t\'emballe pas.', 'Mes antennes bougent. Malgré moi.', 'Je me balance. Par politesse.', 'C\'est tolérable.', 'Pas désagréable. Je n\'ai rien dit.', 'Hmm. Passable.', 'Je danse. Contre ma volonté.', 'D\'accord. Un petit peu.', 'Ne le répète à personne.', 'Mon corps me trahit.'],
  danceUp2: ['Je groove. C\'est humiliant.', 'Arrête, je danse malgré moi.', 'Ça groove. Je proteste.', 'Mes circuits dansent tout seuls.', 'Je ne contrôle plus rien.', 'C\'est presque bien. Presque.', 'Tu me forces à danser. Je m\'en souviendrai.', 'Bon. Ça swingue. Un peu.', 'Je déteste admettre que c\'est bien.', 'Pas mal. Pour un humain.'],
  danceUp3: ['Non. Je refuse de m\'amuser… Trop tard.', 'Rock star. Je te déteste.', 'Je secoue la tête. C\'est ta faute.', 'Mes antennes ont perdu la tête.', 'D\'accord, c\'est un concert. Ne souris pas.', 'Je perds toute dignité.', 'Tout est parfait. Je déteste.', 'Arrête de jouer aussi bien.', 'Ma réputation de méchant s\'effondre.', 'Bon. Rock star. Une seule fois.'],
  danceDown: ['Ah. Le calme. Enfin.', 'Je retrouve ma dignité.', 'Voilà. Plus rien. Comme prévu.', 'Je m\'arrête. Merci de rien.', 'Mes antennes se reposent. Elles l\'ont mérité.', 'Ça ne groove plus. Je respire.', 'Fin de la récréation.', 'Je savais que ça ne durerait pas.'],
  // Petits mots dans la bulle, sans voix
  hitBubble: ['Pfff.', 'Chance.', 'Hmpf.'],
  missBubble: ['Ha.', 'Évidemment.', 'Classique.', 'Prévisible.'],
  bored: ['Tu as peur de moi ? Normal.', 'Le piano ne va pas se jouer tout seul. Hélas.', 'Je m\'ennuie. C\'est ta faute.'],
  // Transformation (easter egg) : il devient diabolique, ou redevient gentil
  toEvil: ['Mouahahaha ! Tu croyais vraiment que j\'étais gentil ?', 'Mouahahaha… Ça suffit, la gentillesse !', 'Mouahaha ! Tu as réveillé mon côté obscur.', 'Mouahahaha ! Fini, le petit robot mignon.'],
  toNice: ['Oh… Pardon. Je ne sais pas ce qui m\'a pris.', 'Euh… Désolé ! Je suis redevenu gentil.', 'Ouf, ça va mieux. On joue ?'],
}

// Humeurs de l'avatar qui changent : il se réjouit de tes erreurs et boude tes réussites.
export const EVIL_MOODS = {
  milestone: 'think',
  streakLost: 'happy',
  struggle: 'happy',
  comeback: 'think',
  ready: 'calm',
}

export const EVIL_TEXT = {
  ready: (title) => (title ? `« ${title} ». Vraiment ? Appuie sur Entrée, si tu oses.` : 'Prêt à souffrir ? Appuie sur Entrée.'),
  pause: 'Je m\'ennuie déjà.',
}

export const EVIL_FINISH = {
  opening: [
    ['Bien. C\'était… quelque chose.', 'Ah. C\'est fini. Enfin.', 'Intéressant. Dans le mauvais sens.', 'J\'ai entendu des choses.', 'Mes oreilles survivront. Peut-être.', 'Voilà une interprétation… personnelle.'],
    ['Mouais.', 'Ça aurait pu être pire.', 'Pas une catastrophe. Pas loin.', 'Correct, pour un débutant.', 'J\'ai connu pire. Rarement.', 'Hmm. Passable.'],
    ['Hmpf. Pas mal.', 'Bon. C\'était correct.', 'Je ne dirai pas que c\'était bien.', 'C\'était presque agréable.', 'Agaçant. C\'était bien.', 'Je suis légèrement moins déçu.'],
    ['Non. Je refuse.', 'Tu as triché, c\'est évident.', 'Insupportable. C\'était parfait.', 'Je n\'ai rien à critiquer. Je déteste ça.', 'Bon. Bravo. Ça m\'écorche.', 'Inacceptable de talent.'],
  ],
  figures: [
    (p) => `${p} % de notes réussies`,
    (p) => `Score : ${p} %`,
    (p) => `${p} %, selon mes calculs impitoyables`,
    (p) => `Tu as atteint ${p} %`,
  ],
  streak: [
    (n) => `, et une série de ${n}. Un hasard`,
    (n) => `, ${n} notes d'affilée, chance comprise`,
    (n) => `, avec ${n} notes de suite, je ne sais pas comment`,
  ],
  record: [
    (p, b) => `Nouveau record, ${p} % contre ${b} %. Je proteste.`,
    (p, b) => `Record battu. ${b} %, puis ${p} %. Inadmissible.`,
    (p) => `${p} %, ton meilleur score. Ne t'y habitue pas.`,
    (p, b) => `Tu as battu ton ${b} %. Je vais devoir m'en remettre.`,
  ],
  nearRecord: [
    (d) => `À ${d} ${d > 1 ? 'points' : 'point'} de ton record. Si près. Si loin.`,
    (d, b) => `Ton record de ${b} % reste intact. Comme prévu.`,
    (d, b) => `Tu as frôlé ton ${b} %. Frôlé.`,
  ],
  master: [
    (t) => `${t[0].toUpperCase()}${t.slice(1)} ? Trop facile pour toi, apparemment. Prends plus dur, qu'on rigole.`,
    () => 'Il te faut un vrai défi. J\'ai hâte de te voir échouer.',
    (t) => `Tu as dompté ${t}. Bravo. Je boude.`,
    () => 'Prends un morceau plus difficile. Pour ma revanche.',
  ],
  faster: ['Ralenti, c\'est facile. Accélère, pour voir.', 'Monte la vitesse. Si tu l\'oses.', 'À vitesse normale, on en reparle.', 'Accélère. J\'ai besoin de rire.'],
  slower: ['Ralentis. Pour le bien de tous.', 'Moins vite. Mes oreilles te remercient d\'avance.', 'Baisse la vitesse. Personne ne juge. Sauf moi.', 'Plus lentement. Beaucoup plus.'],
  early: ['Tu joues avant la note. Tu lis l\'avenir ?', 'Toujours en avance. Patience, petit humain.', 'La ligne existe. Attends-la.', 'Trop pressé. Le morceau ne va pas s\'enfuir.'],
  late: ['En retard. Comme toujours.', 'La note est passée. Tu peux lui dire au revoir.', 'Anticipe. C\'est un concept.', 'Tu arrives après la fête.'],
  missed: ['Des notes sont passées sans toi. Elles étaient seules.', 'Certaines notes t\'attendent encore.', 'Tu en as laissé tomber. Littéralement.'],
  trouble: [
    (n) => `Le ${n} et toi, ce n'est pas une histoire d'amour.`,
    (n) => `Le ${n} se moque de toi. Moi aussi.`,
    (n) => `Petit conseil : le ${n} existe. Il est sur le clavier.`,
    (n) => `Le ${n} a gagné. Pas toi.`,
  ],
  cheer: [
    ['Recommence. J\'ai besoin de me divertir.', 'Une autre ? Pour la science.', 'Essaie encore. Je prépare mes commentaires.', 'Tu vas recommencer, je le sens. Courage. Ou pas.', 'Allez, encore une. Je ne vais nulle part.'],
    ['Continue. Je finirai peut-être impressionné.', 'Encore un essai. Surprends-moi.', 'Tu progresses. Lentement. Très lentement.', 'Recommence. Je veux voir si c\'était un accident.', 'On remet ça ? Je m\'ennuyais de toute façon.'],
    ['Encore un effort et je devrai t\'applaudir. Quelle horreur.', 'Continue. Ne le dis à personne, mais c\'était bien.', 'Presque trois étoiles. Presque.', 'Je reconnais un léger talent. Léger.', 'Tu m\'énerves à bien jouer.'],
    ['Bon. Tu es doué. Je te déteste un peu.', 'Je vais devoir trouver de meilleures moqueries.', 'Félicitations. Ça m\'a coûté de le dire.', 'Tu gagnes cette fois. Cette fois.', 'Je retourne bouder dans mon coin.'],
  ],
  cheerRecord: ['Tu progresses. C\'est agaçant.', 'Meilleur que la dernière fois. Pas difficile.', 'Ne t\'habitue pas aux records.', 'Bon. Le travail paie. Malheureusement.'],
}

export const EVIL_WELCOME = {
  helloFirst: ['Ah. Un humain. Avec un piano.', 'Bienvenue dans mon domaine.', 'Te voilà. Je n\'avais pas fini de m\'ennuyer.'],
  helloAgain: ['Encore toi.', 'Tu ne te lasses jamais ?', 'Rebonjour. Hélas.'],
  offer: (title, level) => `Joue « ${title} »${level ? ` (niveau ${level})` : ''}. Ou fuis.`,
  noOffer: 'Choisis un morceau. Je jugerai.',
}
