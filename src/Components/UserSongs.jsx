import React, { useEffect, useState } from "react";
import { DifficultyBadge } from "./difficulty";


import {
  getAllMidiSongs,
  deleteMidiSong,
} from "../Services/MidiDatabase";

export default function UserSongs({
  refreshKey,
  onPlay,
  onPractice, // ouvre le jeu (piano + notes qui tombent) avec ce morceau
}) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userSongsRefresh, setUserSongsRefresh] =
  useState(0);

  const loadSongs = async () => {
    try {
      setLoading(true);

      const storedSongs =
        await getAllMidiSongs();

      // Les plus récents en premier
      const sortedSongs = [...storedSongs].sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );

      setSongs(sortedSongs);
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
    loadSongs();
  }, [refreshKey]);

  const handleDelete = async (id) => {
    const confirmDelete =
      window.confirm(
        "Supprimer ce morceau ?"
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
        <div className="user-songs-header">
          <h2>Mes musiques</h2>
        </div>

        <div className="empty-user-songs">
          <span>♫</span>

          <div>
            <strong>
              Aucune musique ajoutée
            </strong>

            <p>
              Utilisez le bouton
              « Ajouter mes musiques »
              pour importer un fichier MIDI.
            </p>
          </div>
        </div>

        <Styles />
      </section>
    );
  }

  return (
    <section className="user-songs-section">

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


      <div className="user-songs-grid">

        {songs.map((song) => (

          <article
            className="user-song-card"
            key={song.id}
          >

            <div className="user-song-icon">
              ♫
            </div>


            <div className="user-song-main">

              <h3>
                {song.title}
              </h3>

              <p>
                Ma musique
              </p>

              <span>
                {song.size
                  ? `${(
                      song.size / 1024
                    ).toFixed(1)} Ko`
                  : "Fichier MIDI"}
              </span>

              {/* Difficulté calculée à partir des notes du fichier */}
              <div className="user-song-difficulty">
                <DifficultyBadge musicId={`user:${song.id}`} />
              </div>

            </div>


            <div className="user-song-actions">

              {onPractice && (
                <button
                  type="button"
                  className="user-play-btn user-practice-btn"
                  onClick={() => onPractice(song)}
                  title="S'entraîner au piano sur ce morceau"
                >
                  🎹 S'entraîner
                </button>
              )}

              <button
                type="button"
                className="user-play-btn"
                onClick={() =>
                  onPlay?.(song)
                }
              >
                <span className="play-icon">
                  ▶
                </span>

                Jouer
              </button>


              <button
                type="button"
                className="user-delete-btn"
                onClick={() =>
                  handleDelete(song.id)
                }
                title="Supprimer"
              >
                ×
              </button>

            </div>

          </article>

        ))}

      </div>

      <Styles />

    </section>
  );
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

        grid-template-columns:
          repeat(3, minmax(0, 1fr));

        gap: 12px;
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

      .user-song-difficulty {
        margin-top: 6px;
      }

      .user-song-difficulty:empty {
        display: none;
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
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

      }


      @media (max-width: 700px) {

        .user-songs-grid {
          grid-template-columns: 1fr;
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