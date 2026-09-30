import { Midi } from '@tonejs/midi';
import pirateText from './pirate.txt?raw';
import marioText from './mario.txt?raw';
import takeOnMeUrl from './Aha__Take_on_me.mid?url';
import bohemianRhapsodyUrl from './Queen_Bohemian_Rhapsody.mid?url';
import showMustGoOnUrl from './show_must_go_on_Queen.mid?url';

function parseTextNotes(content, idPrefix) {
  let start = 0;

  return content
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter(([note, duration]) => note && Number.isFinite(Number(duration)))
    .flatMap(([note, duration], index) => {
      const parsedDuration = Number(duration);
      const result = note !== '0' && note.toLowerCase() !== 'unknown'
        ? [{ id: `${idPrefix}-${index}`, note, start, duration: parsedDuration }]
        : [];
      start += parsedDuration;
      return result;
    });
}

function parseMidiNotes(arrayBuffer, idPrefix) {
  const midi = new Midi(arrayBuffer);

  return midi.tracks
    // on garde la piste et l'instrument de chaque note pour pouvoir n'en jouer qu'une
    .flatMap((track, trackIndex) => track.notes.map((note) => ({ note, track, trackIndex })))
    .map(({ note, track, trackIndex }, index) => ({
      id: `${idPrefix}-${index}`,
      note: note.name,
      start: note.time,
      duration: note.duration,
      track: trackIndex,
      channel: track.channel,
      instrument: track.instrument?.name,
    }))
    .sort((a, b) => a.start - b.start);
}

export const musicCatalog = [
  { id: 'pirate', label: 'Pirate', type: 'txt', content: pirateText },
  { id: 'mario', label: 'Mario', type: 'txt', content: marioText },
  { id: 'take-on-me', label: 'A-ha - Take on Me', type: 'midi', url: takeOnMeUrl },
  { id: 'bohemian-rhapsody', label: 'Queen - Bohemian Rhapsody', type: 'midi', url: bohemianRhapsodyUrl },
  { id: 'show-must-go-on', label: 'Queen - The Show Must Go On', type: 'midi', url: showMustGoOnUrl },
];

export async function loadMusic(music) {
  if (music.type === 'txt') return parseTextNotes(music.content, music.id);

  const response = await fetch(music.url);
  if (!response.ok) throw new Error(`Impossible de charger ${music.label}`);
  return parseMidiNotes(await response.arrayBuffer(), music.id);
}