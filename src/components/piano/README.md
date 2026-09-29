# Piano : comment le brancher

La page du piano est `src/pages/PianoPage.jsx`. Elle affiche la piste des notes en haut, le clavier au milieu et les réglages en bas. Sans morceau, c'est du jeu libre.

## Donner un morceau au piano

```jsx
<PianoPage notes={[60, 62, 64, 65, 67]} hints={hints} onNoteOn={handleNoteOn}>
  {/* notes qui tombent */}
</PianoPage>
```

- **`notes`** : les notes midi du morceau. Le clavier choisit tout seul sa plage et ses touches pour toutes les couvrir, et le changement d'octave est alors bloqué.
  - Jusqu'à 11 touches blanches : une seule rangée.
  - Jusqu'à 22 touches blanches (environ 3 octaves) : deux rangées.
  - Au-delà, les notes sans touche sont signalées sur la page.
- **`children`** : ce qui s'affiche sur la piste, au-dessus du clavier (conteneur `position: absolute; inset: 0`).
- **`onNoteOn(midi, { time })`** : appelé à chaque appui. `time` vaut `performance.now()`.
- **`hints`** : `{ [midi]: 'target' | 'hit' | 'miss' }` colore la touche et sa case sur la ligne de frappe : doré pour la note à jouer, vert si réussie, rouge si ratée.

Pour convertir des noms de notes : `noteToMidi('D#5')` renvoie `75`.

## Notes qui tombent

- **Position horizontale** : `getKeyboardLayout(from, to)` donne pour chaque note `{ midi, black, left, width }` en %. Utiliser la même plage que le piano pour que chaque note tombe dans l'axe de sa touche. On peut aussi utiliser directement `keymapForNotes(notes)`, qui renvoie `{ from, to }`.
- **Ligne d'arrivée** : le bas de la piste touche la bande rouge du clavier.
- **Horloge** : `src/game/useSongClock.js` est prévu pour la partie. Il donne `time` en secondes (négatif pendant un décompte), `play`, `pause` et `restart`. `toSongTime(time)` convertit le `time` d'un appui en temps du morceau, à comparer avec le moment prévu de la note.

## Composants disponibles (`src/components/piano`)

| Élément | Rôle |
|---|---|
| `usePiano({ notes, onNoteOn, onNoteOff })` | Clavier d'ordinateur, son, touches enfoncées, plage |
| `PianoStage` | Piste + clavier collés, qui remplissent la hauteur disponible |
| `Piano` / `PianoLanes` | Le clavier seul / la piste seule |
| `PianoSettings` | Volume et choix AZERTY / QWERTY |
| `getKeyboardLayout`, `keymapForNotes`, `noteToMidi`, `noteName` | Calculs de notes et de positions |

Touches réservées : `Espace` pour la pédale, `Entrée` et `Échap` libres pour le jeu (démarrer, pause).
