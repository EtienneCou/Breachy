/**
 * Service de lecture audio pour l'application Breachy
 * Gère à la fois :
 * 1. Les partitions & fichiers MIDI du projet (Mario, Pirates des Caraïbes, Queen, Take on Me...)
 *    en jouant directement les véritables notes via l'API Web Audio haute fidélité.
 * 2. Les fichiers audio réels (.mp3, .ogg, .wav).
 */
import { loadMusic } from "../data/musicData";
import { noteToMidi } from "../Components/piano/notes";

function safeNoteToMidi(noteName) {
  if (typeof noteName === "number") return noteName;
  if (!noteName) return null;
  try {
    return noteToMidi(noteName);
  } catch {
    return null;
  }
}

class AudioPlayerService {
  constructor() {
    this.audio = typeof Audio !== "undefined" ? new Audio() : null;
    this.audioCtx = null;
    this.synthMaster = null;
    this.currentSong = null;
    this.currentNotes = null;
    this.notesDuration = 0;
    this.virtualTime = 0;
    this.isPlayingNotes = false;
    this.lastFrameTime = 0;
    this.scheduledNoteIndex = 0;
    this.animFrameId = null;
    this.playbackRate = 1.0;
    this.volume = 0.8;
    this.loop = false;
    this.listeners = new Set();
    this.error = null;

    if (this.audio) {
      this._setupAudioListeners();
    }
  }

  _getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.synthMaster = this.audioCtx.createGain();
      this.synthMaster.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      this.synthMaster.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  _setupAudioListeners() {
    this.audio.addEventListener("timeupdate", () => {
      if (!this.currentNotes) {
        this._notify("timeupdate", {
          currentTime: this.audio.currentTime,
          duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
        });
      }
    });

    this.audio.addEventListener("loadedmetadata", () => {
      if (!this.currentNotes) {
        this._notify("loadedmetadata", {
          duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
        });
      }
    });

    this.audio.addEventListener("ended", () => {
      if (!this.currentNotes) {
        this._notify("ended", {});
      }
    });

    this.audio.addEventListener("pause", () => {
      if (!this.currentNotes) {
        this._notify("pause", {});
      }
    });

    this.audio.addEventListener("play", () => {
      if (!this.currentNotes) {
        this._notify("play", {});
      }
    });

    this.audio.addEventListener("error", () => {
      if (!this.currentNotes) {
        const mediaError = this.audio.error;
        let message = "Erreur audio : format non supporté ou fichier introuvable.";
        if (mediaError?.message) message = mediaError.message;
        this.error = message;
        this._notify("error", { error: message });
      }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

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
   * Lance un morceau sélectionné
   */
  async playSong(song) {
    if (!song) throw new Error("Aucun morceau sélectionné.");
    this.error = null;
    this.currentSong = song;

    const musicItem =
      song.musicItem ||
      (song.type && (song.content || song.url) ? song : null);

    // 1. Jouer les morceaux de partition/MIDI (Mario, Pirates, Queen, A-ha...)
    if (musicItem) {
      if (this.audio) {
        this.audio.pause();
        this.audio.currentTime = 0;
      }
      try {
        const notes = await loadMusic(musicItem);
        this._startNotesPlayback(notes, song);
        return;
      } catch (err) {
        console.warn("Échec du chargement des notes partition :", err);
      }
    }

    // 2. Jouer un fichier audio standard (.ogg, .mp3, etc.)
    this._stopNotesPlayback();

    const source = song.audio || song.url || song.src;
    if (!source) {
      throw new Error(`Aucune source audio trouvée pour "${song.title}".`);
    }

    if (this.audio) {
      if (this.audio.src !== source) {
        this.audio.src = source;
        this.audio.load();
      }
      this.audio.playbackRate = this.playbackRate;
      this.audio.loop = this.loop;
      this.audio.volume = this.volume;
      await this.audio.play();
      this._notify("play", { song });
    }
  }

  _startNotesPlayback(notes, song) {
    this._stopNotesPlayback();
    this.currentNotes = notes;
    const maxEnd = notes.reduce(
      (max, n) => Math.max(max, (n.start || 0) + (n.duration || 0)),
      0
    );
    this.notesDuration = maxEnd > 0 ? maxEnd : 30;
    this.virtualTime = 0;
    this.scheduledNoteIndex = 0;
    this.isPlayingNotes = true;
    this.lastFrameTime = performance.now();

    this._getAudioContext();
    this._notify("play", { song });
    this._notify("loadedmetadata", { duration: this.notesDuration });

    this._runNotesLoop();
  }

  _runNotesLoop() {
    if (!this.isPlayingNotes) return;

    const now = performance.now();
    const dt = ((now - this.lastFrameTime) / 1000) * this.playbackRate;
    this.lastFrameTime = now;

    this.virtualTime += dt;

    if (this.virtualTime >= this.notesDuration) {
      if (this.loop) {
        this.virtualTime = 0;
        this.scheduledNoteIndex = 0;
      } else {
        this.virtualTime = this.notesDuration;
        this._notify("timeupdate", {
          currentTime: this.notesDuration,
          duration: this.notesDuration,
        });
        this.isPlayingNotes = false;
        this._notify("ended", {});
        return;
      }
    }

    this._notify("timeupdate", {
      currentTime: this.virtualTime,
      duration: this.notesDuration,
    });

    // Planifier les notes dans une fenêtre d'anticipation de 250ms
    const lookahead = 0.25 * this.playbackRate;
    const windowEnd = this.virtualTime + lookahead;
    const ctx = this._getAudioContext();

    while (
      this.scheduledNoteIndex < this.currentNotes.length &&
      this.currentNotes[this.scheduledNoteIndex].start <= windowEnd
    ) {
      const note = this.currentNotes[this.scheduledNoteIndex];
      if (note.start >= this.virtualTime - 0.05) {
        const delay = Math.max(0, (note.start - this.virtualTime) / this.playbackRate);
        const startTime = ctx.currentTime + delay;
        const noteDuration = (note.duration || 0.25) / this.playbackRate;
        this._playSynthNote(note.note, startTime, noteDuration);
      }
      this.scheduledNoteIndex++;
    }

    this.animFrameId = requestAnimationFrame(() => this._runNotesLoop());
  }

  _playSynthNote(noteName, startTime, duration) {
    const midi = safeNoteToMidi(noteName);
    if (midi === null || midi < 21 || midi > 108) return;

    const ctx = this._getAudioContext();
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const t = startTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(f, t);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(f * 2, t);
    osc2.detune.setValueAtTime(3, t);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(f * 5, 9000), t);

    const decay = Math.max(0.4, Math.min(2.5, duration * 1.4));
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.synthMaster || ctx.destination);

    try {
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + decay);
      osc2.stop(t + decay);
    } catch {
      // Ignorer
    }
  }

  _stopNotesPlayback() {
    this.isPlayingNotes = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  pause() {
    if (this.currentNotes && this.isPlayingNotes) {
      this.isPlayingNotes = false;
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      this._notify("pause", {});
      return;
    }
    if (this.audio) {
      this.audio.pause();
      this._notify("pause", {});
    }
  }

  async resume() {
    if (this.currentNotes) {
      if (!this.isPlayingNotes) {
        this.isPlayingNotes = true;
        this.lastFrameTime = performance.now();
        this._notify("play", { song: this.currentSong });
        this._runNotesLoop();
      }
      return;
    }
    if (this.audio && this.audio.src) {
      await this.audio.play();
      this._notify("play", { song: this.currentSong });
    }
  }

  stop() {
    this._stopNotesPlayback();
    this.virtualTime = 0;
    this.scheduledNoteIndex = 0;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this._notify("stop", { currentTime: 0 });
  }

  seek(timeInSeconds) {
    const target = Math.max(0, Number.isFinite(timeInSeconds) ? timeInSeconds : 0);

    if (this.currentNotes) {
      this.virtualTime = Math.min(target, this.notesDuration);
      this.scheduledNoteIndex = this.currentNotes.findIndex(
        (n) => n.start >= this.virtualTime
      );
      if (this.scheduledNoteIndex === -1) {
        this.scheduledNoteIndex = this.currentNotes.length;
      }
      this._notify("timeupdate", {
        currentTime: this.virtualTime,
        duration: this.notesDuration,
      });
      return;
    }

    if (this.audio) {
      const max = Number.isFinite(this.audio.duration) ? this.audio.duration : Infinity;
      this.audio.currentTime = Math.min(target, max);
    }
  }

  setVolume(volumeLevel) {
    const clamped = Math.max(0, Math.min(1, volumeLevel));
    this.volume = clamped;
    if (this.synthMaster && this.audioCtx) {
      this.synthMaster.gain.setValueAtTime(clamped, this.audioCtx.currentTime);
    }
    if (this.audio) {
      this.audio.volume = clamped;
    }
    this._notify("volumechange", { volume: clamped });
  }

  getVolume() {
    return this.volume;
  }

  setPlaybackRate(rate) {
    if (!Number.isFinite(rate)) return;
    const clamped = Math.max(0.25, Math.min(2.0, rate));
    this.playbackRate = clamped;
    if (this.audio) {
      this.audio.playbackRate = clamped;
    }
    this._notify("ratechange", { playbackRate: clamped });
  }

  getPlaybackRate() {
    return this.playbackRate;
  }

  setLoop(shouldLoop) {
    this.loop = Boolean(shouldLoop);
    if (this.audio) {
      this.audio.loop = this.loop;
    }
    this._notify("loopchange", { loop: this.loop });
  }

  getLoop() {
    return this.loop;
  }

  getCurrentTime() {
    if (this.currentNotes) return this.virtualTime;
    return this.audio ? this.audio.currentTime : 0;
  }

  getDuration() {
    if (this.currentNotes) return this.notesDuration;
    return this.audio && Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  isPlaying() {
    if (this.currentNotes) return this.isPlayingNotes;
    return Boolean(
      this.audio &&
        !this.audio.paused &&
        !this.audio.ended &&
        this.audio.readyState > 2
    );
  }
}

export const audioPlayer = new AudioPlayerService();
export default audioPlayer;
