import { Midi } from '@tonejs/midi';

// Utility to convert musical note to frequency
const NOTE_SEMITONES = {
  'C': 0, 'C#': 1, 'DB': 1,
  'D': 2, 'D#': 3, 'EB': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'GB': 6,
  'G': 7, 'G#': 8, 'AB': 8,
  'A': 9, 'A#': 10, 'BB': 10,
  'B': 11
};

export function noteToFrequency(noteStr) {
  if (!noteStr || noteStr === '0' || noteStr.toLowerCase() === 'unknown') {
    return 0;
  }
  
  const match = noteStr.trim().match(/^([A-Ga-g][#b]?)(-?\d+)$/);
  if (!match) return 0;

  const noteName = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);
  const semitone = NOTE_SEMITONES[noteName];
  if (semitone === undefined) return 0;

  // MIDI number: C4 is 60, A4 is 69 (440 Hz)
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Parses partition text with format:
 * <Note_or_0> <Duration_in_seconds>
 */
export function parsePartition(textContent) {
  const lines = textContent.split(/\r?\n/);
  const events = [];
  let currentTime = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;

    const noteRaw = parts[0];
    const duration = parseFloat(parts[1]);

    if (isNaN(duration) || duration <= 0) continue;

    const isRest = noteRaw === '0' || noteRaw.toLowerCase() === 'unknown';
    const freq = isRest ? 0 : noteToFrequency(noteRaw);

    events.push({
      id: i,
      note: isRest ? 'Repos' : noteRaw,
      frequency: freq,
      duration: duration,
      startTime: currentTime,
      endTime: currentTime + duration,
      isRest: isRest,
      velocity: 0.7
    });

    currentTime += duration;
  }

  // For text files, all non-rest notes form the lead notes
  const leadNotes = events.filter((ev) => !ev.isRest && ev.frequency > 0);

  return {
    events,
    leadNotes,
    totalDuration: currentTime
  };
}

/**
 * Parses binary MIDI files (.mid)
 */
export function parseMidiBuffer(arrayBuffer) {
  const midi = new Midi(arrayBuffer);
  const rawNotes = [];

  midi.tracks.forEach((track) => {
    // Filter standard percussion to focus on melodic instruments
    if (track.instrument?.percussion || track.channel === 9) return;

    track.notes.forEach((n) => {
      const freq = noteToFrequency(n.name);
      if (freq > 0) {
        rawNotes.push({
          note: n.name,
          frequency: freq,
          duration: Math.max(0.08, n.duration),
          startTime: n.time,
          endTime: n.time + n.duration,
          velocity: n.velocity || 0.7,
          isRest: false
        });
      }
    });
  });

  // Sort notes chronologically by startTime
  rawNotes.sort((a, b) => a.startTime - b.startTime);

  const events = rawNotes.map((ev, index) => ({
    ...ev,
    id: index
  }));

  // Build a distinct melodic lead track for Training Mode
  // Filters notes so the user isn't asked to play 6 chords simultaneously
  const leadNotes = [];
  let lastLeadTime = -1;
  for (const n of events) {
    if (n.startTime >= lastLeadTime + 0.3) {
      leadNotes.push(n);
      lastLeadTime = n.startTime;
    }
  }

  return {
    events,
    leadNotes,
    totalDuration: midi.duration || (events.length > 0 ? events[events.length - 1].endTime : 0)
  };
}

/**
 * Modern Web Audio Synthesizer for Reachy Band
 */
export class SoundPlayerEngine {
  constructor() {
    this.audioCtx = null;
    this.activeOscillators = [];
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playNote(frequency, duration, time = 0, volume = 0.22) {
    if (!frequency || frequency <= 0) return;
    this.initContext();

    const ctx = this.audioCtx;
    const startTime = time || ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Use triangle/square wave for a warm, clean acoustic/melodic timbre
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, startTime);

    // Subtle sub-harmonic or gentle harmonic warmth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, startTime);

    // ADSR Envelope
    const attack = Math.min(0.02, duration * 0.15);
    const decay = Math.min(0.08, duration * 0.3);
    const release = Math.min(0.06, duration * 0.2);
    const sustainLevel = 0.55;
    const peakVolume = volume;

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(peakVolume, startTime + attack);
    gainNode.gain.linearRampToValueAtTime(peakVolume * sustainLevel, startTime + attack + decay);
    gainNode.gain.setValueAtTime(peakVolume * sustainLevel, startTime + Math.max(attack + decay, duration - release));
    gainNode.gain.linearRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);

    this.activeOscillators.push(osc);
    osc.onended = () => {
      const index = this.activeOscillators.indexOf(osc);
      if (index > -1) {
        this.activeOscillators.splice(index, 1);
      }
    };
  }

  stopAll() {
    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Already stopped
      }
    }
    this.activeOscillators = [];
  }
}
