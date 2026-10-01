# 📋 Rapport de Sprint — Reachy

## 📌 Sprint 3 : Gameplay Interactif, Défilement des Notes & Autonomie Utilisateur

---

### 1. 🎯 Objectifs du Sprint
Ce troisième sprint marquait une étape décisive dans le développement de l'expérience interactive de Reachy :
* **Interactivité temps réel :** Implémenter le clavier piano numérique et gérer les interactions de l'utilisateur à l'arrivée de chaque note.
* **Piste de jeu dynamique (NoteScroller) :** Concevoir le défilement visuel des notes qui descendent vers les touches correspondantes.
* **Évaluation & Statistiques :** Établir un système de scoring mesurant la justesse des notes et la précision rythmique (temps réel vs attendu).
* **Personnalisation & Bibliothèque :** Permettre aux utilisateurs d'importer directement leurs propres morceaux MIDI et d'enrichir la navigation (favoris, morceaux les plus joués, niveaux de difficulté).

---

### 2. 🚀 Fonctionnalités & Livrables Réalisés

| Fonctionnalité | Description | Statut |
| :--- | :--- | :---: |
| **Clavier numérique interactif** | Clavier de piano virtuel réactif (souris et raccourcis clavier), gestion de l'octave et retour visuel des touches | ✅ Validé |
| **Gestion des notes à l'arrivée** | Détection précise des appuis utilisateur (`onNoteOn`), identification des notes jouées et feedback en temps réel | ✅ Validé |
| **Défilement des notes (`NoteScroller`)** | Composant de défilement temporel des notes qui descendent verticalement vers la ligne de frappe | ✅ Validé |
| **Rapport de statistiques & Précision** | Calcul et affichage des métriques de performance : notes justes, notes manquées, écart temporel attendu/réalisé | ✅ Validé |
| **Import de morceaux par l'utilisateur** | Module d'upload de fichiers MIDI avec stockage persistant local (`IndexedDB`) et affichage dans la bibliothèque | ✅ Validé |
| **Refonte des cartes & Onglets bibliothèque** | Onglets "Tous les morceaux" / "Mes morceaux", section "Favoris / Les plus joués" et badges de difficulté | ✅ Validé |

---

### 3. ⚠️ Difficultés & Points de Blocage

* **Aucun blocage technique majeur à signaler.**
* Grâce aux résolutions adoptées lors du Sprint 2 (communication directe entre développeurs sur des sous-tâches liées), l'intégration entre la piste de notes, l'horloge de lecture, le clavier et la base de données s'est déroulée de manière fluide et coordonnée.

---

### 4. 💡 Dynamique d'Équipe & Facteurs de Réussite

* **Amélioration de la communication :** Les binômes se sont concertés en amont sur les interfaces de données (`songId`, formats MIDI, horloge commune `useSongClock`), évitant les conflits d'intégration.
* **Autonomie renforcée :** Chaque membre de l'équipe a pu livrer sa brique technique avec une architecture modulaire et bien articulée.
* **Rythme de delivery soutenu :** Déploiement simultané du moteur de jeu et des fonctionnalités d'import utilisateur dans les délais impartis.

---

### 5. 🏆 Résultats & Bilan

* Le cœur interactif de **Reachy** est désormais fonctionnel : un utilisateur peut choisir un morceau du catalogue ou importer son propre fichier MIDI, lancer la session d'entraînement, voir les notes descendre sur la piste, jouer sur les touches du piano et obtenir ses statistiques de justesse.
* Le produit gagne fortement en maturité technique et en valeur d'usage.

---

### 6. 🔮 Prochaines Étapes — Objectifs du Sprint 4

Pour la prochaine itération, l'équipe se focalisera sur l'expérience utilisateur et l'interaction avec le robot :

1. **🤖 Réaction de Reachy à l'interaction :**
   * Animer le robot Reachy au moment où l'utilisateur joue ou valide une note (expressions visuelles, encouragements, feedback vivant).
2. **🎮 Contrôles de partie (Recommencer / Quitter) :**
   * Intégrer les boutons permettant de recommencer facilement le morceau à tout moment ou de quitter pour revenir à l'accueil.
3. **🎹 Mode « Jeu Libre » :**
   * Créer un bouton d'accès dédié au mode espace libre.
   * Proposer un clavier numérique ouvert pour jouer librement du piano, sans défilement de partition ni contrainte de temps.
