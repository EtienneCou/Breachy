# Breachy

Application web pour apprendre le piano en s'amusant, accompagnée par **Reachy**, un petit robot coach (Reachy Mini de Pollen Robotics).

Le site fonctionne seul : sans robot, Reachy apparaît comme un avatar dessiné à l'écran. Avec le robot (simulé ou réel), c'est le vrai Reachy qui bouge et qui parle.

---

## Lancer le site

**Prérequis :** Node.js 22 ou plus récent.

```bash
npm install
npm run dev
```

Puis ouvrir **http://localhost:5173** dans Chrome ou Edge.

---

## Lancer le robot

Le site communique avec le robot par son serveur local, le **daemon**, sur `http://localhost:8000`. Le site le détecte tout seul (vérification toutes les 4 secondes) : il suffit de lancer le daemon, avant ou après le site.

Dans le panneau du coach, le bouton d'état ouvre les réglages (⚙). On y voit si le robot est connecté (« simulation » ou « robot ») et par où sort la voix.

### Option 1 : la simulation (sans robot physique)

Ces commandes se lancent dans un terminal **Linux / WSL**.

**Installation (une seule fois) :**

```bash
python3 -m venv ~/reachy_mini_env
source ~/reachy_mini_env/bin/activate
pip install "reachy-mini[mujoco]"
```

**À chaque session :**

```bash
source ~/reachy_mini_env/bin/activate
GALLIUM_DRIVER=d3d12 reachy-mini-daemon --sim
```

- `GALLIUM_DRIVER=d3d12` fait calculer l'affichage 3D par la carte graphique dans WSL. Sans ce réglage, la simulation tourne à environ 1 image par seconde.
- Au démarrage, le message `Backend is not ready after 2 seconds` peut apparaître : c'est sans conséquence, la simulation fonctionne.
- La simulation n'a ni caméra ni haut-parleur. La voix du robot est donc jouée par l'ordinateur, et le regard (suivi du visage) ne fonctionne pas.
- ⚠️ **La simulation montre environ la moitié des mouvements réels.** Elle suit bien les positions fixes, mais écrase les mouvements continus. Ne pas régler l'amplitude des danses d'après elle (voir [Régler l'intensité des mouvements](#régler-lintensité-des-mouvements)).

### Option 2 : le vrai robot (Reachy Mini Lite en USB)

> Pas encore testé avec le robot physique.

Le daemon doit tourner sous **Windows** (PowerShell), pas dans WSL : WSL ne voit pas les appareils USB, ni le haut-parleur et la caméra du robot. Le site, lui, peut rester dans WSL : le navigateur relie les deux.

**Installation (une seule fois), dans PowerShell :**

```powershell
winget install -e --id Python.Python.3.12
```

Fermer puis rouvrir PowerShell, puis :

```powershell
mkdir $HOME\reachy
cd $HOME\reachy
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install reachy-mini
```

Si PowerShell refuse d'activer l'environnement (scripts désactivés) :

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**À chaque session :**

1. Brancher le robot en USB et l'allumer.
2. Dans PowerShell, lancer le daemon :

   ```powershell
   cd $HOME\reachy
   .\.venv\Scripts\Activate.ps1
   reachy-mini-daemon
   ```

3. Vérifier que le daemon répond en ouvrant http://localhost:8000/docs.
4. Lancer le site (`npm run dev`) et ouvrir http://localhost:5173.

### Arrêter le robot

Pour qu'il range sa tête avant l'arrêt, lancer depuis un autre terminal PowerShell :

```powershell
Invoke-WebRequest -Method Post -UseBasicParsing http://localhost:8000/api/move/play/goto_sleep
```

Puis faire **`Ctrl + C`** dans le terminal du daemon.

> Fermer la fenêtre 3D de la simulation n'arrête pas le daemon : le site verra toujours un robot connecté. Il faut faire `Ctrl + C` dans son terminal.

---

## Ce que Reachy sait faire

### Sa voix

- Quand le robot est branché, Reachy parle par **son propre haut-parleur**, avec une voix de « petit robot » : voix française Piper (siwis), un peu plus aiguë et rapide, avec une légère touche métallique. Sa tête bouge en rythme quand il parle.
- La voix est fabriquée directement dans le navigateur. **La première fois, il faut Internet** pour la télécharger (environ 63 Mo). Ensuite, elle est gardée par le navigateur.
- En simulation, la voix du robot est jouée par l'ordinateur.
- Sans robot, ou tant que sa voix n'est pas prête, il parle avec la voix du navigateur.

### À l'accueil

- Il dit bonjour et **propose un morceau adapté au niveau du joueur**, d'après ses meilleurs scores. La proposition change chaque jour.
- Avec le vrai robot, il **suit le joueur du regard** grâce à sa caméra.

### Pendant l'entraînement

- **Décompte avant le morceau** : « Trois ! Deux ! Un ! » avec une antenne, puis l'autre, puis les deux, et « C'est parti ! » avec un hochement de tête.
- **Il danse en rythme** sur le tempo du morceau les chorégraphies de Pollen Robotics (le fabricant), de plus en plus énergiques selon la réussite du joueur sur ses 10 dernières notes :

  | Réussite | Danses (elles alternent toutes les 4 mesures) |
  |---|---|
  | moins de 50 % | calme : tête qui tourne en rond, balancier |
  | 50 à 74 % | il se laisse porter : « mmh mmh » (penche et hoche), tête penchée |
  | 75 à 89 % | ça groove : spirales, chaloupé |
  | 90 % et plus | rock star : headbang |

  La danse ne s'arrête jamais pendant le morceau. On passe d'une danse à l'autre en fondu. Les formules viennent de [reachy_mini_dances_library](https://github.com/pollen-robotics/reachy_mini_dances_library), portées dans [pollenMoves.js](src/Components/coach/pollenMoves.js) ; les autres danses de Pollen y restent disponibles pour changer les niveaux (`DANCE_LEVELS` dans danceEngine.js).
- **Bilan à la fin du morceau**, dit à voix haute : pourcentage de réussite, meilleure série, nouveau record s'il y en a un, un conseil (jouer plus lentement, en avance, en retard…) et un encouragement. Il l'accompagne d'une émotion selon le résultat.
- Le volume de l'accompagnement baisse pendant qu'il parle.

### En jeu libre et au Studio

- **Métronome vivant** : quand le métronome sonne (y compris avec « ▶ Essayer »), Reachy bat la mesure avec la tête et les antennes, calé sur les clics.

### Quand personne ne joue

- Après **40 secondes** sans jouer, il s'ennuie (« Tu es là ? On joue ? »).
- Après **1 minute**, il **s'endort** : il baisse lentement la tête, replie ses antennes et respire doucement.
- **Une touche, un clic ou une note** (y compris sur un clavier MIDI) le réveille.
- Il ne s'endort pas tant que de la musique joue : morceau, réécoute d'un enregistrement, boucles du Studio, métronome.

### Sans robot

Tout ce qui précède est aussi joué par l'**avatar dessiné** à l'écran : humeurs, danses, sommeil, bulles de texte.

---

## Régler l'intensité des mouvements

L'amplitude de la danse et des petits gestes se règle **dans le code**, pas dans le site : c'est un réglage pour l'équipe, le joueur n'y a pas accès.

Dans [src/Components/coach/danceEngine.js](src/Components/coach/danceEngine.js) :

```js
export const ROBOT_INTENSITY = 0.3 // 1 = amplitudes des danses de Pollen
```

Elle est réglée à 0,3 pour le vrai robot ; à ajuster à l'œil. La simulation montre environ la moitié des mouvements réels : ne pas régler d'après elle. L'ampleur de chaque niveau de danse se règle dans `DANCE_LEVELS` (même fichier).

Les émotions enregistrées de Pollen (accueil, pause, bilan…) ne passent pas par ce réglage : elles sont toujours jouées en entier.

---

## Dépannage

| Problème | Solution |
|---|---|
| Le coach affiche « Robot non connecté » | Le daemon ne tourne pas, ou n'est pas sur `http://localhost:8000` (adresse modifiable dans les réglages ⚙ du coach). |
| Le site voit toujours un robot alors qu'on a fermé la simulation | Le daemon tourne encore : `Ctrl + C` dans son terminal. |
| La simulation est saccadée (environ 1 image/s) | La lancer avec `GALLIUM_DRIVER=d3d12` devant la commande. |
| La danse avance par à-coups | Le navigateur ralentit les pages cachées : garder la page du site visible (pas entièrement recouverte par une autre fenêtre). |
| Avec le vrai robot, les réglages indiquent « Il parle par l'ordinateur » | La partie audio du daemon n'a pas démarré : regarder les messages d'erreur dans son terminal. |
| La voix du robot n'arrive pas la première fois | Elle se télécharge (environ 63 Mo, connexion Internet nécessaire). En attendant, il parle avec la voix du navigateur. |
