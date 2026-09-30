/**
 * Service de lecture audio pour l'application Breachy
 * Gère à la fois :
 * 1. Les partitions & fichiers MIDI du projet (Mario, Pirates des Caraïbes, Queen, Take on Me...)
 *    en jouant directement les véritables notes via l'API Web Audio haute fidélité.
 * 2. Les fichiers audio réels (.mp3, .ogg, .wav).
 */
import { Sequencer } from "spessasynth_lib";
import { loadMusic } from "../data/musicData";
import { createGMSynth } from "../Components/piano/gmSynth";
import { createInstrumentPlayer } from "../Components/piano/instruments";
import { noteToMidi } from "../Components/piano/notes";

const MIDI_LOOP_COUNT = 9999; // « en boucle » pour le lecteur MIDI

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

    // Lecture des fichiers MIDI « tels quels » : synthétiseur General MIDI (vrais
    // instruments de la banque de sons) + lecteur MIDI qui suit tout le fichier.
    this.gm = null;
    this.sequencer = null;
    this.gmPromise = null;
    this.isMidi = false;
    this.midiFrameId = null;
    this.midiDurationNotified = false;
    this.notesUseGM = false;

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
      // Chaque piste est jouée par son instrument (piano, basse, batterie…), comme dans
      // l'entraînement. Gain de sortie x3 pour compenser le limiteur des instruments.
      this.instruments = createInstrumentPlayer(this.audioCtx, this.synthMaster, { makeup: 3 });
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
   * Synthétiseur General MIDI et lecteur MIDI, créés une seule fois (la banque de
   * sons se télécharge au premier usage).
   */
  _ensureGM() {
    const ctx = this._getAudioContext();
    this.gmPromise ??= createGMSynth(ctx).then((synth) => {
      synth.connect(this.synthMaster);
      this.gm = synth;
      this.sequencer = new Sequencer(synth);
      return synth;
    });
    return this.gmPromise;
  }

  /**
   * Lance un morceau sélectionné
   */
  async playSong(song) {
    if (!song) throw new Error("Aucun morceau sélectionné.");
    this.error = null;
    this.currentSong = song;
    this._stopMidiPlayback();

    // 0. Fichier MIDI (morceau ajouté par l'utilisateur, ou MIDI du catalogue) :
    //    joué tel quel, avec les instruments, volumes et effets du fichier.
    const midiItem = song.musicItem?.type === "midi" ? song.musicItem : null;
    if (song.file instanceof Blob || midiItem) {
      let buffer;
      try {
        buffer = song.file instanceof Blob
          ? await song.file.arrayBuffer()
          : await (await fetch(midiItem.url)).arrayBuffer();
      } catch (err) {
        throw new Error(`Impossible de lire le fichier MIDI « ${song.title} ».`, { cause: err });
      }
      try {
        await this._startMidiPlayback(buffer, song);
        return;
      } catch (err) {
        // banque de sons indisponible : lecture note par note avec les instruments de secours
        console.warn("Lecteur MIDI indisponible, lecture de secours :", err);
        const url = URL.createObjectURL(new Blob([buffer]));
        try {
          const notes = await loadMusic({ id: song.id, label: song.title, type: "midi", url });
          this._startNotesPlayback(notes, song);
          return;
        } finally {
          URL.revokeObjectURL(url);
        }
      }
    }

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

  async _startMidiPlayback(buffer, song) {
    this._stopNotesPlayback();
    this.currentNotes = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    await this._ensureGM();
    const seq = this.sequencer;
    seq.loadNewSongList([{ binary: buffer, fileName: song.title || "morceau.mid" }]);
    seq.playbackRate = this.playbackRate;
    seq.loopCount = this.loop ? MIDI_LOOP_COUNT : 0;
    seq.play();
    this.isMidi = true;
    this.midiDurationNotified = false;
    this._notify("play", { song });
    this._runMidiLoop();
  }

  // Suit la position du lecteur MIDI pour l'interface (temps, durée, fin du morceau).
  _runMidiLoop() {
    if (this.midiFrameId) cancelAnimationFrame(this.midiFrameId);
    const tick = () => {
      if (!this.isMidi || !this.sequencer) return;
      const seq = this.sequencer;
      const duration = seq.duration || 0;
      const currentTime = duration ? Math.min(seq.currentTime, duration) : seq.currentTime;
      if (duration && !this.midiDurationNotified) {
        this.midiDurationNotified = true;
        this._notify("loadedmetadata", { duration });
      }
      this._notify("timeupdate", { currentTime, duration });
      if (!this.loop && duration && (seq.isFinished || seq.currentTime >= duration)) {
        seq.pause();
        this.midiFrameId = null;
        this._notify("ended", {});
        return;
      }
      this.midiFrameId = requestAnimationFrame(tick);
    };
    this.midiFrameId = requestAnimationFrame(tick);
  }

  _stopMidiPlayback() {
    if (this.midiFrameId) cancelAnimationFrame(this.midiFrameId);
    this.midiFrameId = null;
    if (this.isMidi) {
      this.sequencer?.pause();
      this.gm?.stopAll(true);
    }
    this.isMidi = false;
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
    this.notesUseGM = false;
    this._ensureGM()
      .then((synth) => {
        synth.programChange(0, 0); // piano à queue
        this.notesUseGM = true;
      })
      .catch(() => {});
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
        this._playNote(note, startTime, noteDuration);
      }
      this.scheduledNoteIndex++;
    }

    this.animFrameId = requestAnimationFrame(() => this._runNotesLoop());
  }

  // Une note d'une partition : vrai piano si la banque de sons est prête, sinon secours.
  _playNote(note, when, duration) {
    if (!this.notesUseGM || !this.gm) {
      this.instruments.play(note, when, duration);
      return;
    }
    let midi;
    try {
      midi = noteToMidi(note.note);
    } catch {
      return;
    }
    const velocity = Math.round(Math.min(1, Math.max(0.05, note.velocity ?? 0.7)) * 127);
    this.gm.noteOn(0, midi, velocity, { time: when });
    this.gm.noteOff(0, midi, { time: when + Math.max(0.05, duration) });
  }

  _stopNotesPlayback() {
    this.isPlayingNotes = false;
    this.instruments?.stopAll();
    if (this.currentNotes) this.gm?.stopAll(true);
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  pause() {
    if (this.isMidi) {
      this.sequencer.pause();
      if (this.midiFrameId) cancelAnimationFrame(this.midiFrameId);
      this.midiFrameId = null;
      this._notify("pause", {});
      return;
    }
    if (this.currentNotes && this.isPlayingNotes) {
      this.isPlayingNotes = false;
      this.instruments?.stopAll();
      this.gm?.stopAll(true);
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
    if (this.isMidi) {
      this.sequencer.play();
      this._notify("play", { song: this.currentSong });
      this._runMidiLoop();
      return;
    }
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
    if (this.isMidi) {
      this.sequencer.pause();
      this.sequencer.currentTime = 0;
      this.gm?.stopAll(true);
      if (this.midiFrameId) cancelAnimationFrame(this.midiFrameId);
      this.midiFrameId = null;
      this._notify("stop", { currentTime: 0 });
      return;
    }
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

    if (this.isMidi) {
      const duration = this.sequencer.duration || target;
      this.sequencer.currentTime = Math.min(target, duration);
      this._notify("timeupdate", { currentTime: this.sequencer.currentTime, duration });
      return;
    }

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
    if (this.sequencer) this.sequencer.playbackRate = clamped;
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
    if (this.sequencer) this.sequencer.loopCount = this.loop ? MIDI_LOOP_COUNT : 0;
    if (this.audio) {
      this.audio.loop = this.loop;
    }
    this._notify("loopchange", { loop: this.loop });
  }

  getLoop() {
    return this.loop;
  }

  getCurrentTime() {
    if (this.isMidi) return this.sequencer.currentTime;
    if (this.currentNotes) return this.virtualTime;
    return this.audio ? this.audio.currentTime : 0;
  }

  getDuration() {
    if (this.isMidi) return this.sequencer.duration || 0;
    if (this.currentNotes) return this.notesDuration;
    return this.audio && Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  isPlaying() {
    if (this.isMidi) return !this.sequencer.paused;
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
