import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DifficultyBadge } from "../../Components/difficulty";

import songsCatalog from "../../resources/catalog";

import PracticePlayer from "../../Components/Practice/PracticePlayer";

import useSongPlayer from "../../hooks/useSongPlayer";
import "./Homepage-style.css";



const songs = songsCatalog;





import { createPortal } from "react-dom";

import MidiUploader from "../../Components/MidiUploader";

import UserSongs from "../../Components/UserSongs";



const filters = [

  "Tous",

  // "Débutant",

  // "Intermédiaire",

  "Classique",

  "Pop",

  "Films & Séries",

  "Variété",

  "Enfants",

  "Noël",

  // "Mes favoris",

];



export default function SongsPage() {

  const [search, setSearch] = useState("");

  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [activeFilter, setActiveFilter] = useState("Tous");

  const [favorites, setFavorites] = useState([]);

  const [isPracticeActive, setIsPracticeActive] = useState(false);
  const [userSongsRefresh, setUserSongsRefresh] = useState(0);

  const { playSong } = useSongPlayer();

  const navigate = useNavigate();



  // « S'entraîner » ouvre le jeu (piano + notes qui tombent) avec ce morceau.
  // Seuls les morceaux qui ont une partition (`musicItem`) peuvent être joués.
  const handleStartPractice = (song) => {

    navigate(`/piano?morceau=${encodeURIComponent(song.id)}`);

  };



  const handlePlay = (song) => {

    playSong(song);

    setIsPracticeActive(true);

  };



  const filteredSongs = useMemo(() => {

    const q = search.trim().toLowerCase();



    return songs.filter((song) => {

      const matchesSearch =

        !q ||

        song.title.toLowerCase().includes(q) ||

        song.artist.toLowerCase().includes(q) ||

        song.level.toLowerCase().includes(q);



      const matchesFilter =

        activeFilter === "Tous" ||

        activeFilter === "Mes favoris"

          ? true

          : song.level === activeFilter;



      const matchesFavorite =

        activeFilter !== "Mes favoris" || favorites.includes(song.title);



      return matchesSearch && matchesFilter && matchesFavorite;

    });

  }, [search, activeFilter, favorites]);



  const toggleFavorite = (title) => {

    setFavorites((current) =>

      current.includes(title)

        ? current.filter((item) => item !== title)

        : [...current, title]

    );

  };



  return (

    <div className="songs-page">

      {/* <style>{`

        * {

          box-sizing: border-box;

        }



        html,

        body,

        #root {

          margin: 0;

          min-height: 100%;

        }



        body {

          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

          background: #ffffff;

          color: #0b1026;

        }



        button,

        input {

          font: inherit;

        }



        button {

          -webkit-tap-highlight-color: transparent;

        }



        .songs-page {

          min-height: 100vh;

          padding: clamp(16px, 2vw, 28px);

          background:

            radial-gradient(circle at 18% 10%, rgba(227, 236, 255, 0.22), transparent 34%),

            #ffffff;

        }



        .container {

          width: min(100%, 1500px);

          margin: 0 auto;

        }



        .brand {

          display: inline-flex;

          align-items: center;

          gap: 10px;

          margin-bottom: clamp(22px, 3vw, 34px);

          font-size: clamp(22px, 2vw, 29px);

          font-weight: 800;

          letter-spacing: -0.7px;

        }



        .brand-mark {

          display: flex;

          align-items: center;

          gap: 4px;

          height: 28px;

          flex-shrink: 0;

        }



        .brand-mark span {

          display: block;

          width: 3px;

          border-radius: 999px;

          background: #0b1026;

        }



        .brand-mark span:nth-child(1) { height: 14px; }

        .brand-mark span:nth-child(2) { height: 24px; }

        .brand-mark span:nth-child(3) { height: 31px; }

        .brand-mark span:nth-child(4) { height: 20px; }

        .brand-mark span:nth-child(5) { height: 12px; }



        .top-row {

          display: grid;

          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.85fr);

          gap: clamp(20px, 3vw, 42px);

          align-items: center;

          margin-bottom: 18px;

        }



        h1 {

          margin: 0 0 6px;

          font-size: clamp(30px, 3vw, 46px);

          line-height: 1.05;

          letter-spacing: -1.2px;

        }



        .subtitle {

          margin: 0;

          color: #7180b0;

          font-size: clamp(14px, 1.2vw, 17px);

          line-height: 1.45;

        }



        .search-box {

          display: flex;

          align-items: center;

          gap: 13px;

          width: 100%;

          min-height: 50px;

          padding: 0 17px;

          border: 1px solid #e5e9f2;

          border-radius: 14px;

          background: rgba(255, 255, 255, 0.97);

          box-shadow: 0 6px 20px rgba(30, 45, 90, 0.04);

        }



        .search-icon {

          position: relative;

          width: 18px;

          height: 18px;

          border: 2px solid #8392c0;

          border-radius: 50%;

          flex: 0 0 auto;

        }



        .search-icon::after {

          content: "";

          position: absolute;

          width: 7px;

          height: 2px;

          right: -6px;

          bottom: -3px;

          border-radius: 999px;

          background: #8392c0;

          transform: rotate(45deg);

        }



        .search-box input {

          width: 100%;

          min-width: 0;

          border: 0;

          outline: 0;

          background: transparent;

          color: #17203c;

          font-size: 14px;

        }



        .search-box input::placeholder {

          color: #7e8db9;

        }



        .filters {

          display: flex;

          gap: 9px;

          margin-bottom: 18px;

          padding-bottom: 2px;

          overflow-x: auto;

          scrollbar-width: none;

        }



        .filters::-webkit-scrollbar {

          display: none;

        }



        .filter-btn {

          flex: 0 0 auto;

          min-height: 42px;

          padding: 0 18px;

          border: 1px solid #e4e8f2;

          border-radius: 13px;

          background: #ffffff;

          color: #0f1630;

          font-size: 13px;

          cursor: pointer;

          transition:

            background 0.2s ease,

            border-color 0.2s ease,

            transform 0.2s ease;

        }



        .filter-btn:hover {

          border-color: #cbd8f7;

          transform: translateY(-1px);

        }



        .filter-btn.active {

          border-color: transparent;

          background: #eaf3ff;

          color: #0d69ff;

          font-weight: 700;

        }



        .songs-grid {

          display: grid;

          grid-template-columns: repeat(3, minmax(0, 1fr));

          gap: 12px;

          padding-bottom: 80px;

        }



        .song-card {

          display: grid;

          grid-template-columns: 88px minmax(0, 1fr) auto;

          gap: 12px;

          align-items: center;

          min-width: 0;

          min-height: 108px;

          padding: 9px;

          border: 1px solid #edf0f5;

          border-radius: 15px;

          background: rgba(255, 255, 255, 0.98);

          box-shadow: 0 5px 18px rgba(28, 38, 78, 0.035);

          transition:

            transform 0.2s ease,

            box-shadow 0.2s ease;

        }



        .song-card:hover {

          transform: translateY(-1px);

          box-shadow: 0 8px 24px rgba(28, 38, 78, 0.06);

        }



        .song-cover {

          width: 88px;

          aspect-ratio: 1 / 1;

          object-fit: cover;

          border-radius: 10px;

          background: #eef2f9;

        }



        .song-main {

          min-width: 0;

          display: flex;

          flex-direction: column;

          justify-content: center;

        }



        .song-title {

          margin: 0 0 3px;

          font-size: clamp(14px, 1vw, 16px);

          font-weight: 800;

          line-height: 1.25;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;

        }



        .artist {

          margin: 0 0 7px;

          color: #7381ad;

          font-size: 12.5px;

          line-height: 1.3;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;

        }



        .song-meta {

          display: flex;

          align-items: center;

          flex-wrap: wrap;

          gap: 7px;

        }



        .badge {

          display: inline-flex;

          align-items: center;

          min-height: 21px;

          padding: 2px 8px;

          border-radius: 8px;

          font-size: 11px;

          font-weight: 600;

        }



        .badge.beginner {

          color: #13a06a;

          background: #dff8ed;

        }



        .badge.intermediate {

          color: #d98200;

          background: #fff2d2;

        }



        .badge.classical {

          color: #7836d9;

          background: #efe4ff;

        }



        .duration {

          display: inline-flex;

          align-items: center;

          gap: 6px;

          color: #6879ab;

          font-size: 12px;

        }



        .clock {

          position: relative;

          width: 14px;

          height: 14px;

          border: 1.5px solid #8190bd;

          border-radius: 50%;

          flex: 0 0 auto;

        }



        .clock::before,

        .clock::after {

          content: "";

          position: absolute;

          left: 5.5px;

          width: 1.5px;

          border-radius: 999px;

          background: #8190bd;

          transform-origin: bottom center;

        }



        .clock::before {

          top: 2px;

          height: 4px;

        }



        .clock::after {

          top: 5px;

          height: 3px;

          transform: rotate(125deg);

        }



        .song-actions {

          align-self: stretch;

          display: flex;

          flex-direction: column;

          justify-content: space-between;

          align-items: flex-end;

          gap: 8px;

          padding: 1px 2px 1px 0;

        }



        .favorite-btn {

          display: grid;

          place-items: center;

          width: 28px;

          height: 28px;

          padding: 0;

          border: 0;

          background: transparent;

          color: #6f82b7;

          font-size: 23px;

          line-height: 1;

          cursor: pointer;

        }



        .favorite-btn.active {

          color: #3579ff;

        }



        .play-btn {

          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 8px;

          min-width: 88px;

          height: 36px;

          padding: 0 13px;

          border: 0;

          border-radius: 9px;

          background: #edf5ff;

          color: #0d6dff;

          font-size: 13px;

          font-weight: 700;

          cursor: pointer;

          transition:

            background 0.2s ease,

            transform 0.2s ease;

        }



        .play-btn:hover {

          background: #deedff;

          transform: translateY(-1px);

        }



        .action-buttons-group {

          display: flex;

          flex-direction: column;

          gap: 6px;

          align-items: flex-end;

        }



        .practice-btn-card {

          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 6px;

          min-width: 118px;

          height: 36px;

          border: 1px solid #c7d2fe;

          border-radius: 10px;

          background: #eef2ff;

          color: #4338ca;

          font-weight: 700;

          font-size: 13px;

          cursor: pointer;

          transition: all 0.2s ease;

        }



        .practice-btn-card:hover {

          background: #e0e7ff;

          border-color: #818cf8;

          transform: translateY(-1px);

          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);

        }



        .play-triangle {

          width: 0;

          height: 0;

          border-top: 6px solid transparent;

          border-bottom: 6px solid transparent;

          border-left: 10px solid #1677ff;

        }



        .reachy {

          position: fixed;

          right: 18px;

          bottom: 14px;

          z-index: 20;

          display: flex;

          align-items: flex-end;

          gap: 10px;

          pointer-events: none;

        }



        .reachy-bubble {

          max-width: 150px;

          padding: 12px 14px;

          border: 1px solid #e9edf6;

          border-radius: 22px 22px 8px 22px;

          background: #ffffff;

          color: #6b7daf;

          font-size: 12px;

          line-height: 1.4;

          box-shadow: 0 8px 26px rgba(34, 47, 87, 0.07);

        }



        .reachy-robot {

          display: flex;

          flex-direction: column;

          align-items: center;

          gap: 4px;

          color: #7180b0;

          font-size: 11px;

        }



        .robot-head {

          position: relative;

          width: 58px;

          height: 48px;

          border: 1px solid #dfe5ef;

          border-radius: 50%;

          background: linear-gradient(145deg, #ffffff, #e9edf4);

          box-shadow: 0 7px 16px rgba(20, 34, 70, 0.1);

        }



        .robot-head::before {

          content: "";

          position: absolute;

          left: 50%;

          top: -21px;

          width: 2px;

          height: 21px;

          background: #757e8f;

        }



        .robot-head::after {

          content: "";

          position: absolute;

          left: calc(50% - 3px);

          top: -25px;

          width: 6px;

          height: 6px;

          border-radius: 50%;

          background: #757e8f;

        }



        .eye {

          position: absolute;

          top: 18px;

          width: 9px;

          height: 9px;

          border-radius: 50%;

          background: #0c0f16;

        }



        .eye.left {

          left: 14px;

        }



        .eye.right {

          right: 14px;

        }



        .empty {

          grid-column: 1 / -1;

          padding: 50px 20px;

          text-align: center;

          color: #7c88aa;

          font-size: 14px;

        }



        .top-actions {

  display: flex;

  align-items: center;

  gap: 10px;

}



.top-actions .search-box {

  flex: 1;

}



.add-music-btn {

  flex: 0 0 auto;

  height: 50px;

  padding: 0 18px;



  border: 0;

  border-radius: 12px;



  background: #1677ff;

  color: #ffffff;



  font-size: 14px;

  font-weight: 700;



  cursor: pointer;

}



.add-music-btn:hover {

  background: #0d6ce8;

}



.modal-overlay {

  position: fixed;

  inset: 0;



  z-index: 99999;



  display: flex;

  align-items: center;

  justify-content: center;



  padding: 20px;



  background: rgba(15, 23, 42, 0.5);



  backdrop-filter: blur(4px);

}



.modal-content {

  position: relative;



  width: min(560px, 100%);

  max-height: 90vh;



  overflow-y: auto;



  padding: 28px;



  border-radius: 20px;



  background: #ffffff;



  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.25);

}



.modal-close {

  position: absolute;



  top: 14px;

  right: 14px;



  width: 34px;

  height: 34px;



  display: flex;

  align-items: center;

  justify-content: center;



  border: 0;

  border-radius: 50%;



  background: #f2f4f8;

  color: #5f6b85;



  font-size: 24px;



  cursor: pointer;

}



.modal-header {

  margin-bottom: 20px;

  padding-right: 40px;

}



.modal-header h2 {

  margin: 0 0 6px;



  font-size: 23px;

  color: #111827;

}



.modal-header p {

  margin: 0;



  color: #7581a2;

  font-size: 14px;

}



@media (max-width: 650px) {

  .top-actions {

    flex-direction: column;

    align-items: stretch;

  }



  .add-music-btn {

    width: 100%;

  }



  .modal-content {

    padding: 22px 16px;

  }

}



        @media (max-width: 1180px) {

          .songs-grid {

            grid-template-columns: repeat(2, minmax(0, 1fr));

          }

        }



        @media (max-width: 900px) {

          .top-row {

            grid-template-columns: 1fr;

            gap: 16px;

          }



          .search-box {

            max-width: 100%;

          }

        }



        @media (max-width: 700px) {

          .songs-page {

            padding: 16px 14px 100px;

          }



          .brand {

            margin-bottom: 20px;

          }



          h1 {

            font-size: clamp(28px, 8vw, 36px);

          }



          .songs-grid {

            grid-template-columns: 1fr;

            gap: 10px;

          }



          .song-card {

            grid-template-columns: 78px minmax(0, 1fr) auto;

            min-height: 96px;

            padding: 8px;

          }



          .song-cover {

            width: 78px;

          }



          .filter-btn {

            min-height: 39px;

            padding: 0 15px;

          }



          .reachy-bubble {

            display: none;

          }

        }



        @media (max-width: 480px) {

          .songs-page {

            padding-inline: 12px;

          }



          .brand {

            font-size: 21px;

          }



          .brand-mark {

            transform: scale(0.9);

            transform-origin: left center;

          }



          .subtitle {

            font-size: 14px;

          }



          .search-box {

            min-height: 46px;

          }



          .song-card {

            grid-template-columns: 68px minmax(0, 1fr);

            gap: 10px;

          }



          .song-cover {

            width: 68px;

          }



          .song-actions {

            grid-column: 1 / -1;

            flex-direction: row-reverse;

            align-items: center;

            padding: 0 0 0 78px;

            margin-top: -2px;

          }



          .favorite-btn {

            margin-left: auto;

          }



          .play-btn {

            min-width: 84px;

            height: 34px;

            font-size: 12px;

          }



          .reachy {

            right: 10px;

            bottom: 8px;

          }



          .robot-head {

            width: 52px;

            height: 43px;

          }

        }



      `}</style> */}



      <div className="container">

        <header className="brand">

          <div className="brand-mark" aria-hidden="true">

            <span />

            <span />

            <span />

            <span />

            <span />

          </div>

          <span>Reachy band</span>

        </header>



        <section className="top-row">

          <div>

            <h1>Tous les morceaux disponibles</h1>

            <p className="subtitle">

              Découvrez notre bibliothèque et apprenez vos morceaux préférés pas à pas.

            </p>

          </div>



          <label className="search-box">

            <span className="search-icon" aria-hidden="true" />

            <input

              type="search"

              placeholder="Rechercher un morceau, un artiste ou un style..."

              value={search}

              onChange={(e) => setSearch(e.target.value)}

            />

          </label>

        </section>



        <nav className="filters" aria-label="Filtres">

          {filters.map((filter) => (

            <button

              key={filter}

              type="button"

              className={`filter-btn ${activeFilter === filter ? "active" : ""}`}

              onClick={() => setActiveFilter(filter)}

            >

              {filter}

            </button>

          ))}

        </nav>



         <button

    type="button"

    className="add-music-btn"

    onClick={() => setIsUploadOpen(true)}

  >

    + Ajouter mes musiques

  </button>



  <UserSongs
          refreshKey={userSongsRefresh}
          onPlay={(song) => {
            playSong(song);
            setIsPracticeActive(true);
          }}
          onPractice={(song) => navigate(`/piano?morceau=${encodeURIComponent(`user:${song.id}`)}`)}
        />



        <main className="songs-grid">

          {filteredSongs.length > 0 ? (

            filteredSongs.map((song) => {

              const isFavorite = favorites.includes(song.title);

              const levelClass =

                song.level === "Débutant"

                  ? "beginner"

                  : song.level === "Classique"

                  ? "classical"

                  : "intermediate";



              return (

                <article className="song-card" key={song.title}>

                  <img

                    className="song-cover"

                    src={song.image}

                    alt=""

                    loading="lazy"

                  />



                  <div className="song-main">

                    <h2 className="song-title">{song.title}</h2>

                    <p className="artist">{song.artist}</p>



                    <div className="song-meta">

                      {/* <span className={`badge ${levelClass}`}>{song.level}</span> */}
                      {/* Difficulté calculée à partir des notes (rien pour un morceau sans partition) */}
                      <DifficultyBadge musicId={song.id} />

                      <span className="duration">

                        <span className="clock" aria-hidden="true" />

                        {song.duration}

                      </span>

                    </div>

                  </div>



                  <div className="song-actions">

                   {/* <button

                      type="button"

                      className={`favorite-btn ${isFavorite ? "active" : ""}`}

                      onClick={() => toggleFavorite(song.title)}

                      aria-label={

                        isFavorite

                          ? `Retirer ${song.title} des favoris`

                          : `Ajouter ${song.title} aux favoris`

                      }

                    >

                      {isFavorite ? "♥" : "♡"}

                    </button> */}



                    <div className="action-buttons-group">

                      <button

                        type="button"

                        className="practice-btn-card"

                        onClick={() => handleStartPractice(song)}

                        disabled={!song.musicItem}

                        title={song.musicItem ? "S'entraîner au piano sur ce morceau" : "Pas encore de partition pour ce morceau"}

                      >

                        🎹 S'entraîner

                      </button>



                      <button

                        type="button"

                        className="play-btn"

                        onClick={() => handlePlay(song)}

                      >

                        <span className="play-triangle" aria-hidden="true" />

                        Jouer

                      </button>

                    </div>

                  </div>

                </article>

              );

            })

          ) : (

            <div className="empty">Aucun morceau ne correspond à votre recherche.</div>

          )}

        </main>

      </div>



          {isPracticeActive && (

        <PracticePlayer onClose={() => setIsPracticeActive(false)} />

      )}





{isUploadOpen &&

        createPortal(

          <div

            className="modal-overlay"

            onClick={() => setIsUploadOpen(false)}

          >

            <div

              className="modal-content"

              onClick={(e) => e.stopPropagation()}

            >

              <button

                type="button"

                className="modal-close"

                onClick={() => setIsUploadOpen(false)}

                aria-label="Fermer"

              >

                ×

              </button>



              <div className="modal-header">

                <h2>Ajouter mes musiques</h2>

                <p>

                  Importez vos fichiers MIDI pour les retrouver dans votre bibliothèque.

                </p>

              </div>



              <MidiUploader

                onSongAdded={(song) => {

                  console.log("Morceau ajouté :", song);

                  setUserSongsRefresh((current) => current + 1);

                  setIsUploadOpen(false);

                }}

              />




            </div>

          </div>,

          document.body

        )}













      {isPracticeActive && (
        <PracticePlayer onClose={() => setIsPracticeActive(false)} />
      )}
    </div>
  );
}
