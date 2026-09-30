# 📋 Rapport de Sprint — Breachy

## 📌 Sprint 2 : Consolidation, Entraînement & Alignement d'Équipe

---

### 1. 🎯 Objectifs du Sprint
L'objectif central de ce deuxième sprint était de présenter au client l'état d'avancement du projet et de valider les fonctionnalités prioritaires demandées lors du Sprint 1 :
* **Confirmation des attentes du Sprint 1 :** Répondre concrètement à la demande prioritaire du client en fournissant un véritable mode pour s'entraîner sur des morceaux.
* **Moteur audio et accompagnement :** Développer un lecteur de fond sonore interactif permettant à l'utilisateur de pratiquer à son rythme.
* **Enrichissement du catalogue :** Intégrer une bibliothèque musicale diversifiée (plus de 30 morceaux) avec un système de filtres par genre musical (Pop, Classique, Variété, Films & Séries, Enfants, Noël).
* **Ajout de morceaux personnels :** Préparer et intégrer l'importation de fichiers MIDI utilisateur stockés localement.

---

### 2. 🚀 Fonctionnalités & Livrables Réalisés

| Fonctionnalité | Description | Statut |
| :--- | :--- | :---: |
| **Mode « S'entraîner »** | Barre de contrôle d'entraînement en fond sonore avec gestion de vitesse (0.5x, 0.75x, 1x), boucle et timeline | ✅ Validé |
| **Moteur audio hybride** | Synthèse des partitions `.txt` et fichiers `.mid` en notes réelles au piano + support des enregistrements audio | ✅ Validé |
| **Bibliothèque étendue (32 morceaux)** | Intégration complète de morceaux variés classés par styles musicaux | ✅ Validé |
| **Système de filtres par genre** | Filtrage instantané des morceaux par onglet (Pop, Variété, Classique, Films, Enfants, Noël) et barre de recherche | ✅ Validé |
| **Upload de morceaux utilisateur** | Module d'import de fichiers MIDI dans la base locale IndexedDB | ✅ Validé |

---

### 3. ⚠️ Difficultés & Points de Blocage Rencontrés

* **Forte interdépendance des sous-tâches techniques :**
  * Plusieurs développeurs travaillaient simultanément sur des briques très proches ou interdépendantes (ex. la gestion de l'audio/horloge de lecture d'un côté, et l'affichage des touches du clavier/interface de l'autre), où le travail de l'un conditionnait directement celui de l'autre.
* **Manque de communication directe en amont :**
  * Une synchronisation insuffisante entre les développeurs concernés par ces modules couplés a entraîné des incompréhensions techniques, des risques de doublons et des difficultés lors de la fusion du code.
* **Impact :**
  * Ralentissement dans l'assemblage final des composants et perte d'efficacité technique avant la mise en commun des branches.

---

### 4. 💡 Décisions Prises & Solutions Organisationnelles

* **Protocole de synchronisation obligatoire sur les tâches couplées :**
  * Instauration d'une règle d'équipe claire : dès lors que deux développeurs travaillent sur des sous-tâches similaires, dépendantes ou touchant aux mêmes modules, **ils ont l'obligation de communiquer directement et régulièrement ensemble**.
* **Points de contact et Pair Programming ponctuel :**
  * Définition en amont des interfaces communes (formats de données partagés, props, services) pour que chaque développeur avance sans bloquer son binôme.
* **Communication continue avant merge :**
  * Concertation obligatoire sur les canaux de messagerie avant de pousser des modifications structurelles sur les fichiers partagés (`App.jsx`, `catalog.js`, composants communs).

---

### 5. 🏆 Résultats & Démonstration Client

* **Objectifs atteints à 100% :** La démonstration présentée au client a confirmé l'intégration réussie de la fonctionnalité majeure d'entraînement et la jouabilité réelle des morceaux.
* **Validation client :** Le client a pu constater la prise en compte directe de ses retours du Sprint 1, notamment sur l'écoute de véritables morceaux et la richesse du catalogue.
* **Amélioration de la fluidité d'équipe :** L'alignement renforcé entre les développeurs sur les tâches liées a permis de stabiliser le code et d'assurer une meilleure cohésion technique.

---

### 6. 🔄 Axes d'Amélioration pour le Sprint 3

1. **Cartographie des dépendances en Sprint Planning :** Identifier dès le début du sprint les sous-tâches couplées pour assigner explicitement les binômes correspondants.
2. **Harmonisation continue des composants :** Poursuivre l'intégration entre la piste de notes, le clavier interactif et le lecteur audio pour une expérience utilisateur encore plus fluide.
