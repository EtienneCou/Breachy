# 📋 Rapport de Sprint — Reachy

## 📌 Sprint 0 & 1 : Prototype & Présentation Client

---

### 1. 🎯 Objectifs du Sprint
L'objectif principal de ce premier sprint était de concevoir et présenter un **prototype fonctionnel (maquette interactive)** à la cliente afin de valider les choix ergonomiques et techniques :
* **Découverte et sélection de morceaux :** Intégration d'une interface claire présentant le catalogue musical.
* **Recherche dynamique :** Mise en place d'une barre de recherche permettant aux utilisateurs de trouver rapidement un morceau par titre, artiste ou difficulté.
* **Déclenchement audio :** Possibilité de lancer l'écoute d'un morceau sélectionné.
* **Collecte de retours :** Recueillir le feedback utilisateur/client dès les premières itérations pour orienter les développements futurs.

---

### 2. 🚀 Fonctionnalités & Livrables Réalisés

| Fonctionnalité | Description | Statut |
| :--- | :--- | :---: | 
| **Catalogue musical** | Affichage en grille des morceaux avec pochettes, styles et durées | ✅ Validé |
| **Barre de recherche** | Filtrage instantané des morceaux en temps réel selon la saisie | ✅ Validé |
| **Démonstration client** | Présentation de la maquette navigable et interactive | ✅ Réalisée |

---

### 3. ⚠️ Difficultés & Points de Blocage Rencontrés

* **Conflits de versions et écrasement de code sur Git :**
  * Plusieurs membres de l'équipe ont écrasé par inadvertance les modifications distantes en poussant (`push`) leur code sans avoir préalablement récupéré et fusionné les dernières mises à jour (`pull`).
* **Manque de communication transverse :**
  * Une synchronisation insuffisante entre les développeurs lors des merges simultanés a accentué les risques de désynchronisation des branches.
* **Impact :**
  * Perte de temps substantielle à démêler l'historique Git et ralentissement temporaire de l'équipe à l'approche de la démonstration.

---

### 4. 💡 Solutions Apportées & Déblocage

* **Restauration de l'historique par la PO :**
  * La Product Owner (PO) est intervenue pour analyser l'historique Git, récupérer la version stable et saine du code avant écrasement, et restaurer l'état fonctionnel du projet.
* **Mise au point d'un protocole d'équipe :**
  * Instauration de la bonne pratique systématique : **toujours faire un `git pull` (ou `fetch`/rebase) avant tout `git push`**.
  * Amélioration de la communication d'équipe sur les canaux d'échange avant toute fusion majeure sur les branches partagées.

---

### 5. 🏆 Résultats & Bilan Client

* **Objectif atteint :** Malgré l'incident de versioning, le projet a été stabilisé à temps pour la session de démonstration.
* **Présentation client réussie :** La maquette interactive a été présentée avec succès à la cliente.
* **Retours & Demandes prioritaires de la cliente :**
  * Validation globale du parcours utilisateur et de l'ergonomie de l'interface.
  * **🎯 Priorité n°1 pour la suite :** Permettre à l'utilisateur d'**ajouter son propre morceau** (import de fichiers personnels) et d'**avoir un mode dédié pour s'entraîner dessus**.

---

### 6. 🔄 Axes d'Amélioration pour les Prochains Sprints

1. **Règles Git strictes :** Ne jamais forcer un push (`git push --force`) et effectuer systématiquement un `git pull origin main` avant d'ouvrir une pull request.
2. **Communication active :** Prévenir l'équipe lors des livraisons importantes pour éviter les collisions sur les mêmes fichiers.
