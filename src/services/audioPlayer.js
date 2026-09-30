/**
 * Service de lecture audio pour l'application Breachy
 * Gère le chargement, la lecture, la pause, l'arrêt, le volume et les erreurs audio.
 */
class AudioPlayerService {
  constructor() {
    this.audio = typeof Audio !== "undefined" ? new Audio() : null;
    this.currentSong = null;
    this.listeners = new Set();
    this.error = null;

    if (this.audio) {
      this._setupListeners();
    }
  }

  /**
   * Configure les écouteurs d'événements de l'élément Audio
   */
  _setupListeners() {
    this.audio.addEventListener("timeupdate", () => {
      this._notify("timeupdate", {
        currentTime: this.audio.currentTime,
        duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
      });
    });

    this.audio.addEventListener("loadedmetadata", () => {
      this._notify("loadedmetadata", {
        duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
      });
    });

    this.audio.addEventListener("ended", () => {
      this._notify("ended", {});
    });

    this.audio.addEventListener("pause", () => {
      this._notify("pause", {});
    });

    this.audio.addEventListener("play", () => {
      this._notify("play", {});
    });

    this.audio.addEventListener("error", () => {
      const mediaError = this.audio.error;
      let message = "Erreur audio : impossible de charger ou lire le fichier.";

      if (mediaError) {
        switch (mediaError.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            message = "La lecture audio a été interrompue.";
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            message = "Erreur réseau lors du chargement du fichier audio.";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            message = "Échec du décodage du fichier audio (fichier corrompu ou format incompatible).";
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = "Fichier audio manquant ou format non supporté.";
            break;
          default:
            message = mediaError.message || message;
            break;
        }
      }

      this.error = message;
      this._notify("error", { error: message });
    });
  }

  /**
   * Permet aux composants ou hooks de s'abonner aux événements de lecture
   * @param {Function} listener
   * @returns {Function} fonction de désabonnement
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notifie tous les abonnés d'un changement
   */
  _notify(event, data) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (err) {
        console.error("Erreur dans l'écouteur AudioPlayer:", err);
      }
    });
  }

  /**
   * Extrait l'URL source d'un morceau
   * Accepte une chaîne directe ou un objet morceau
   */
  _resolveAudioSource(song) {
    if (!song) return null;
    if (typeof song === "string") return song;

    return (
      song.audio ||
      song.audioUrl ||
      song.url ||
      song.src ||
      song.file ||
      null
    );
  }

  /**
   * Charge et lance un morceau sélectionné
   * @param {Object|string} song 
   * @returns {Promise<void>}
   */
  async playSong(song) {
    if (!this.audio) {
      throw new Error("L'API Audio n'est pas disponible dans cet environnement.");
    }

    if (!song) {
      const err = "Aucun morceau sélectionné.";
      this.error = err;
      this._notify("error", { error: err });
      throw new Error(err);
    }

    const source = this._resolveAudioSource(song);

    if (!source) {
      const songTitle = typeof song === "object" && song.title ? `"${song.title}"` : "inconnu";
      const err = `Fichier audio introuvable pour le morceau ${songTitle}. Veuillez spécifier un fichier audio valide.`;
      this.error = err;
      this._notify("error", { error: err });
      throw new Error(err);
    }

    this.error = null;
    this.currentSong = song;

    if (this.audio.src !== source) {
      this.audio.src = source;
      this.audio.load();
    }

    try {
      await this.audio.play();
      this._notify("play", { song });
    } catch (err) {
      const message = `Impossible de lancer la lecture : ${err.message}`;
      this.error = message;
      this._notify("error", { error: message });
      throw err;
    }
  }

  /**
   * Met en pause la lecture en cours
   */
  pause() {
    if (!this.audio) return;
    this.audio.pause();
  }

  /**
   * Reprend la lecture si un morceau est en pause
   * @returns {Promise<void>}
   */
  async resume() {
    if (!this.audio || !this.audio.src) return;

    try {
      this.error = null;
      await this.audio.play();
    } catch (err) {
      const message = `Impossible de reprendre la lecture : ${err.message}`;
      this.error = message;
      this._notify("error", { error: message });
      throw err;
    }
  }

  /**
   * Arrête la lecture et remet la tête de lecture à zéro
   */
  stop() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this._notify("stop", { currentTime: 0 });
  }

  /**
   * Déplace la tête de lecture vers un temps donné en secondes
   * @param {number} timeInSeconds 
   */
  seek(timeInSeconds) {
    if (!this.audio || !Number.isFinite(timeInSeconds)) return;
    const maxDuration = Number.isFinite(this.audio.duration) ? this.audio.duration : Infinity;
    this.audio.currentTime = Math.max(0, Math.min(timeInSeconds, maxDuration));
  }

  /**
   * Définit le volume (entre 0.0 et 1.0)
   * @param {number} volumeLevel 
   */
  setVolume(volumeLevel) {
    if (!this.audio) return;
    const clampedVolume = Math.max(0, Math.min(1, volumeLevel));
    this.audio.volume = clampedVolume;
    this._notify("volumechange", { volume: clampedVolume });
  }

  /**
   * Retourne le volume actuel (0.0 à 1.0)
   * @returns {number}
   */
  getVolume() {
    return this.audio ? this.audio.volume : 1;
  }

  /**
   * Retourne le temps courant de lecture en secondes
   * @returns {number}
   */
  getCurrentTime() {
    return this.audio ? this.audio.currentTime : 0;
  }

  /**
   * Retourne la durée totale en secondes
   * @returns {number}
   */
  getDuration() {
    return this.audio && Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  /**
   * Vérifie si l'audio est actuellement en cours de lecture
   * @returns {boolean}
   */
  isPlaying() {
    return Boolean(this.audio && !this.audio.paused && !this.audio.ended && this.audio.readyState > 2);
  }
}

// Instance singleton
export const audioPlayer = new AudioPlayerService();
export default audioPlayer;
