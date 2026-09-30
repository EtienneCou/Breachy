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
      song.fallbackAudio ||
      song.file ||
      this._generateFallbackAudio()
    );
  }

  /**
   * Génère une piste audio harmonique de secours (WAV en mémoire)
   * Permet de tester le mode entraînement même si aucun fichier .mp3 n'a encore été déposé.
   */
  _generateFallbackAudio() {
    if (this._cachedFallbackWav) return this._cachedFallbackWav;
    try {
      const sampleRate = 22050;
      const duration = 6;
      const numSamples = sampleRate * duration;
      const buffer = new Uint8Array(44 + numSamples);

      const writeStr = (offset, str) => {
        for (let i = 0; i < str.length; i++) buffer[offset + i] = str.charCodeAt(i);
      };
      const write32 = (offset, val) => {
        buffer[offset] = val & 0xff;
        buffer[offset + 1] = (val >> 8) & 0xff;
        buffer[offset + 2] = (val >> 16) & 0xff;
        buffer[offset + 3] = (val >> 24) & 0xff;
      };
      const write16 = (offset, val) => {
        buffer[offset] = val & 0xff;
        buffer[offset + 1] = (val >> 8) & 0xff;
      };

      writeStr(0, "RIFF");
      write32(4, 36 + numSamples);
      writeStr(8, "WAVE");
      writeStr(12, "fmt ");
      write32(16, 16);
      write16(20, 1);
      write16(22, 1);
      write32(24, sampleRate);
      write32(28, sampleRate);
      write16(32, 1);
      write16(34, 8);
      writeStr(36, "data");
      write32(40, numSamples);

      const notes = [261.63, 329.63, 392.0, 523.25];
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const noteIdx = Math.floor(t * 2) % notes.length;
        const freq = notes[noteIdx];
        const envelope = Math.exp(-((t * 2) % 1) * 3);
        const sample = Math.sin(2 * Math.PI * freq * t) * envelope;
        buffer[44 + i] = Math.floor((sample * 0.35 + 0.5) * 255);
      }

      let binary = "";
      for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
      }
      this._cachedFallbackWav = "data:audio/wav;base64," + btoa(binary);
      return this._cachedFallbackWav;
    } catch {
      return null;
    }
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

    let source = this._resolveAudioSource(song);

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
      // Si la source a échoué (ex: 404 fichier local manquant), essayer le fallback audio
      if (source !== this._cachedFallbackWav) {
        try {
          source = this._generateFallbackAudio();
          this.audio.src = source;
          this.audio.load();
          await this.audio.play();
          this._notify("play", { song });
          return;
        } catch {
          // ignorer et propager l'erreur ci-dessous
        }
      }
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
   * Définit la vitesse de lecture (ex: 0.5, 0.75, 1, 1.25)
   * @param {number} rate
   */
  setPlaybackRate(rate) {
    if (!this.audio || !Number.isFinite(rate)) return;
    const clampedRate = Math.max(0.25, Math.min(2.0, rate));
    this.audio.playbackRate = clampedRate;
    this._notify("ratechange", { playbackRate: clampedRate });
  }

  /**
   * Retourne la vitesse de lecture actuelle
   * @returns {number}
   */
  getPlaybackRate() {
    return this.audio ? this.audio.playbackRate : 1.0;
  }

  /**
   * Active ou désactive la boucle de lecture
   * @param {boolean} shouldLoop
   */
  setLoop(shouldLoop) {
    if (!this.audio) return;
    this.audio.loop = Boolean(shouldLoop);
    this._notify("loopchange", { loop: this.audio.loop });
  }

  /**
   * Retourne l'état de la boucle
   * @returns {boolean}
   */
  getLoop() {
    return this.audio ? this.audio.loop : false;
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
