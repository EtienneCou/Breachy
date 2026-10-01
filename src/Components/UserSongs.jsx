import React, { useEffect, useState } from "react";
import { SongCard } from "./songCard";
import { useSongsInfo } from "../hooks/useSongsInfo";

const NEW_FOR_DAYS = 7; // étiquette « Nouveau » pendant une semaine après l'ajout


import {
  getAllMidiSongs,
  deleteMidiSong,
} from "../Services/MidiDatabase";

export default function UserSongs({
  refreshKey,
  onPlay,
  onPractice, // ouvre le jeu (piano + notes qui tombent) avec ce morceau
  onSongsChange, // (morceaux) prévient la page de la liste des morceaux ajoutés
  showHeader = true, // titre « Mes musiques » (inutile dans l'onglet « Mes morceaux »)
  source = "user", // "user" : fichiers MIDI importés ; "recording" : enregistrements du jeu libre
}) {
  const isRecordings = source === "recording";
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSongsRefresh, setUserSongsRefresh] =
  useState(0);

  useEffect(() => {
    onSongsChange?.(songs);
  }, [songs, onSongsChange]);

  // Difficulté, durée et mélodie de chaque morceau ajouté (calculées à partir du fichier)
  const songInfos = useSongsInfo(songs.map((song) => `user:${song.id}`));

  const loadSongs = async (recordings) => {
    try {
      setLoading(true);

      const storedSongs =
        await getAllMidiSongs();

      // Les plus récents en premier (les morceaux sans `source` sont des imports)
      const sortedSongs = storedSongs
        .filter((song) => (song.source === "recording") === recordings)
        .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );

      // « Nouveau » : ajouté il y a moins de NEW_FOR_DAYS jours (calculé au chargement)
      const now = Date.now();
      setSongs(
        sortedSongs.map((song) => ({
          ...song,
          isNew: now - new Date(song.createdAt) < NEW_FOR_DAYS * 24 * 3600 * 1000,
        }))
      );
    } catch (error) {
      console.error(
        "Erreur chargement MIDI :",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSongs(isRecordings);
  }, [refreshKey, isRecordings]);

  const handleDelete = async (id) => {
    const confirmDelete =
      window.confirm(
        isRecordings ? "Supprimer cet enregistrement ?" : "Supprimer ce morceau ?"
      );

    if (!confirmDelete) return;

    await deleteMidiSong(id);

    setSongs((current) =>
      current.filter(
        (song) => song.id !== id
      )
    );
  };

  if (loading) {
    return (
      <p className="user-songs-loading">
        Chargement de vos morceaux...
      </p>
    );
  }

  if (songs.length === 0) {
    return (
      <section className="user-songs-section">
        {showHeader && (
          <div className="user-songs-header">
            <h2>Mes musiques</h2>
          </div>
        )}

        <div className="empty-user-songs">
          <span>♫</span>

          <div>
            <strong>
              {isRecordings ? "Aucun enregistrement" : "Aucune musique ajoutée"}
            </strong>

            <p>
              {isRecordings
                ? "Ouvre le « Jeu libre », enregistre ta session puis sauvegarde-la pour la retrouver ici."
                : "Utilisez le bouton « Ajouter mes musiques » pour importer un fichier MIDI."}
            </p>
          </div>
        </div>

        <Styles />
      </section>
    );
  }

  return (
    <section className="user-songs-section">

      {showHeader && (
        <div className="user-songs-header">
          <div>
            <h2>Mes musiques</h2>

            <p>
              {songs.length} morceau
              {songs.length > 1 ? "x" : ""}
              {" "}ajouté
              {songs.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}


      <div className="user-songs-grid">

        {songs.map((song) => (
          <SongCard
            key={song.id}
            title={song.title}
            subtitle={subtitleOf(song)}
            musicId={`user:${song.id}`}
            info={songInfos[`user:${song.id}`]}
            isNew={song.isNew}
            onPractice={onPractice ? () => onPractice(song) : undefined}
            onListen={() => onPlay?.(song)}
            onDelete={() => handleDelete(song.id)}
          />
        ))}

      </div>

      <Styles />

    </section>
  );
}



// Sous-titre d'une carte. Morceau du Studio : la piste jouée à l'entraînement.
function subtitleOf(song) {
  if (song.origin === "studio") {
    return song.practiceTrack
      ? `Studio · 🎯 tu joues la ${song.practiceTrack.label.toLowerCase()}`
      : "Studio · pas de piste piano (écoute seulement)";
  }
  if (song.source === "recording") return `Mon enregistrement${song.tempo ? ` · ${song.tempo.bpm} BPM` : ""}`;
  return "Ma musique";
}

function Styles() {
  return (
    <style>{`

      .user-songs-section {
        margin-top: 34px;
        margin-bottom: 45px;
      }


      .user-songs-header {
        display: flex;
        align-items: center;
        justify-content: space-between;

        margin-bottom: 14px;
      }


      .user-songs-header h2 {
        margin: 0;

        color: #0b1026;

        font-size: 23px;
        font-weight: 800;
      }


      .user-songs-header p {
        margin: 4px 0 0;

        color: #7885aa;

        font-size: 13px;
      }


      .user-songs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 18px;
      }


      .user-song-card {
        display: grid;

        grid-template-columns:
          68px minmax(0, 1fr) auto;

        align-items: center;

        gap: 12px;

        min-width: 0;

        padding: 10px;

        border: 1px solid #edf0f5;
        border-radius: 15px;

        background: #ffffff;

        box-shadow:
          0 5px 18px
          rgba(28, 38, 78, 0.035);
      }


      .user-song-icon {
        display: grid;
        place-items: center;

        width: 68px;
        height: 68px;

        border-radius: 12px;

        background:
          linear-gradient(
            135deg,
            #eaf3ff,
            #f1edff
          );

        color: #1677ff;

        font-size: 27px;
      }


      .user-song-main {
        min-width: 0;
      }


      .user-song-main h3 {
        margin: 0 0 3px;

        overflow: hidden;

        color: #111827;

        font-size: 15px;
        font-weight: 800;

        text-overflow: ellipsis;
        white-space: nowrap;
      }


      .user-song-main p {
        margin: 0 0 6px;

        color: #7381ad;

        font-size: 12px;
      }


      .user-song-main span {
        color: #8b97b6;

        font-size: 11px;
      }


      .user-song-actions {
        display: flex;
        flex-direction: column;

        align-items: flex-end;

        gap: 8px;
      }


      .user-play-btn {
        display: flex;

        align-items: center;
        justify-content: center;

        gap: 6px;

        min-width: 86px;
        height: 36px;

        padding: 0 12px;

        border: 0;
        border-radius: 9px;

        background: #edf5ff;
        color: #0d6dff;

        font-size: 13px;
        font-weight: 700;

        cursor: pointer;
      }


      .user-play-btn:hover {
        background: #dfeeff;
      }


      .user-practice-btn {
        color: #4338ca;
        background: #eef2ff;
      }


      .user-practice-btn:hover {
        background: #e0e7ff;
      }


      .play-icon {
        font-size: 11px;
      }


      .user-delete-btn {
        display: grid;
        place-items: center;

        width: 27px;
        height: 27px;

        padding: 0;

        border: 0;
        border-radius: 50%;

        background: #f4f5f8;
        color: #8290b0;

        font-size: 20px;

        cursor: pointer;
      }


      .user-delete-btn:hover {
        background: #feecec;
        color: #dc2626;
      }


      .empty-user-songs {
        display: flex;

        align-items: center;

        gap: 14px;

        padding: 18px;

        border: 1px dashed #d9dfeb;
        border-radius: 15px;

        background: #fafbfe;
      }


      .empty-user-songs > span {
        display: grid;
        place-items: center;

        width: 48px;
        height: 48px;

        flex-shrink: 0;

        border-radius: 50%;

        background: #eaf3ff;
        color: #1677ff;

        font-size: 23px;
      }


      .empty-user-songs strong {
        color: #111827;

        font-size: 14px;
      }


      .empty-user-songs p {
        margin: 4px 0 0;

        color: #7d89a9;

        font-size: 12px;
      }


      .user-songs-loading {
        margin: 30px 0;

        color: #7d89a9;

        font-size: 13px;
      }


      @media (max-width: 1180px) {
        .user-songs-grid {
          /* mêmes colonnes que le catalogue */
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        }
      }


      @media (max-width: 700px) {
        .user-songs-grid {
          grid-template-columns: repeat(auto-fill, minmax(165px, 1fr));
          gap: 12px;
        }
      }


      @media (max-width: 450px) {

        .user-song-card {
          grid-template-columns:
            58px minmax(0, 1fr);
        }


        .user-song-icon {
          width: 58px;
          height: 58px;

          font-size: 23px;
        }


        .user-song-actions {
          grid-column: 1 / -1;

          flex-direction: row;

          justify-content: flex-end;
        }

      }

    `}</style>
  );
}