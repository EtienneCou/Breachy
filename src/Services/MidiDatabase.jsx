import { openDB } from "idb";

const DB_NAME = "reachy-band-db";
const DB_VERSION = 1;
const STORE_NAME = "midi-songs";

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: "id",
      });

      store.createIndex("title", "title");
      store.createIndex("createdAt", "createdAt");
    }
  },
});

export async function addMidiSong(song) {
  const db = await dbPromise;
  return db.put(STORE_NAME, song);
}

export async function getAllMidiSongs() {
  const db = await dbPromise;
  return db.getAll(STORE_NAME);
}

export async function getMidiSong(id) {
  const db = await dbPromise;
  return db.get(STORE_NAME, id);
}

export async function deleteMidiSong(id) {
  const db = await dbPromise;
  return db.delete(STORE_NAME, id);
}