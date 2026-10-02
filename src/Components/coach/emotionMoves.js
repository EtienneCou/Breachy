// Émotions de la bibliothèque Pollen utilisées par le coach : durée réelle (secondes) et
// première position de l'enregistrement (tête : x, y, z en mm, angles en degrés ; antennes
// [droite, gauche] en degrés), relevées dans les fichiers de la bibliothèque.
//
// Le daemon joue une émotion sans rejoindre d'abord sa position de départ : la tête y
// sauterait d'un coup. Le coach l'y amène donc en douceur avant de la lancer, et laisse
// le robot à l'émotion pendant toute sa durée (sinon la danse reprendrait par-dessus).
// Pour ajouter une émotion au coach, relever ses valeurs de la même façon.

export const EMOTION_MOVES = {
  attentive1: { length: 4.3, head: { x: -3, y: -5, z: 6, roll: -2, pitch: -18, yaw: 2 }, antennas: [-29, 37] },
  serenity1: { length: 4.6, head: { x: -1, y: 1, z: -1, roll: 0, pitch: 0, yaw: 0 }, antennas: [2, 19] },
  success2: { length: 2.4, head: { x: -8, y: 1, z: 14, roll: 0, pitch: -2, yaw: -7 }, antennas: [-5, 5] },
  proud2: { length: 3.2, head: { x: -2, y: -1, z: 4, roll: 2, pitch: -8, yaw: 14 }, antennas: [3, -2] },
  cheerful1: { length: 2.8, head: { x: -13, y: -4, z: 20, roll: -2, pitch: 1, yaw: 9 }, antennas: [-12, 30] },
  understanding2: { length: 2.6, head: { x: -12, y: -11, z: 16, roll: 4, pitch: 1, yaw: 2 }, antennas: [-8, 13] },
  welcoming1: { length: 3.5, head: { x: -7, y: -11, z: 10, roll: 3, pitch: -5, yaw: -1 }, antennas: [-8, 5] },
  welcoming2: { length: 4.3, head: { x: -5, y: -6, z: 0, roll: 2, pitch: -8, yaw: 0 }, antennas: [-13, 16] },
  boredom1: { length: 15.7, head: { x: -11, y: -1, z: 3, roll: -1, pitch: -2, yaw: 1 }, antennas: [-8, 7] },
  boredom2: { length: 14.2, head: { x: -11, y: 4, z: 1, roll: 1, pitch: 1, yaw: -2 }, antennas: [0, 9] },
}

// Émotion absente du tableau : durée prudente, et pas d'approche.
export const UNKNOWN_EMOTION_LENGTH = 6
