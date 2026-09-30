import React, { useMemo, useState } from "react";
import songsCatalog from "../resources/catalog";
import PracticePlayer from "../Components/Practice/PracticePlayer";
import useSongPlayer from "../hooks/useSongPlayer";

const songs = songsCatalog;



const filters = [
  "Tous",
  "Débutant",
  "Intermédiaire",
  "Classique",
  "Pop",
  "Films & Séries",
  "Variété",
  "Enfants",
  "Noël",
  "Mes favoris",
];

export default function SongsPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [favorites, setFavorites] = useState([]);
  const [isPracticeActive, setIsPracticeActive] = useState(false);
  const { playSong } = useSongPlayer();

  const handleStartPractice = (song) => {
    playSong(song);
    setIsPracticeActive(true);
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
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #ffffff;
          color: #0b1026;
        }

        button,
        input {
          font: inherit;
        }

        .songs-page {
          min-height: 100vh;
          padding: 28px 4vw 36px;
          background:
            radial-gradient(circle at 18% 10%, rgba(227, 236, 255, 0.24), transparent 32%),
            linear-gradient(180deg, #ffffff 0%, #ffffff 100%);
        }

        .container {
          max-width: 1500px;
          margin: 0 auto;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 40px;
          font-size: 31px;
          font-weight: 800;
          letter-spacing: -0.9px;
        }

        .brand-mark {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 32px;
        }

        .brand-mark span {
          display: block;
          width: 3px;
          border-radius: 999px;
          background: #0b1026;
        }

        .brand-mark span:nth-child(1) { height: 17px; }
        .brand-mark span:nth-child(2) { height: 30px; }
        .brand-mark span:nth-child(3) { height: 37px; }
        .brand-mark span:nth-child(4) { height: 24px; }
        .brand-mark span:nth-child(5) { height: 14px; }

        .top-row {
          display: grid;
          grid-template-columns: minmax(420px, 1fr) minmax(420px, 0.95fr);
          gap: 40px;
          align-items: center;
          margin-bottom: 22px;
        }

        h1 {
          margin: 0 0 4px;
          font-size: clamp(34px, 3vw, 52px);
          line-height: 1.04;
          letter-spacing: -1.6px;
        }

        .subtitle {
          margin: 0;
          color: #7180b0;
          font-size: 18px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 15px;
          width: 100%;
          min-height: 62px;
          padding: 0 20px;
          border: 1px solid #e6e9f3;
          border-radius: 18px;
          box-shadow: 0 8px 24px rgba(30, 45, 90, 0.04);
          background: rgba(255, 255, 255, 0.96);
        }

        .search-icon {
          width: 20px;
          height: 20px;
          border: 2px solid #8392c0;
          border-radius: 50%;
          position: relative;
          flex: 0 0 auto;
        }

        .search-icon::after {
          content: "";
          position: absolute;
          width: 9px;
          height: 2px;
          right: -7px;
          bottom: -4px;
          background: #8392c0;
          transform: rotate(45deg);
          border-radius: 999px;
        }

        .search-box input {
          border: none;
          outline: none;
          flex: 1;
          color: #17203c;
          background: transparent;
          font-size: 17px;
        }

        .search-box input::placeholder {
          color: #7e8db9;
        }

        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 22px;
        }

        .filter-btn {
          border: 1px solid #e4e8f2;
          background: #ffffff;
          color: #0f1630;
          padding: 15px 26px;
          border-radius: 18px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .filter-btn:hover {
          border-color: #cbd8f7;
          transform: translateY(-1px);
        }

        .filter-btn.active {
          background: #eaf3ff;
          color: #0d69ff;
          border-color: transparent;
          font-weight: 700;
        }

        .songs-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          padding-bottom: 80px;
        }

        .song-card {
          display: grid;
          grid-template-columns: 128px minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
          min-height: 142px;
          padding: 12px;
          border: 1px solid #edf0f5;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 6px 24px rgba(28, 38, 78, 0.035);
        }

        .song-cover {
          width: 128px;
          height: 118px;
          object-fit: cover;
          border-radius: 12px;
          background: #eef2f9;
        }

        .song-main {
          min-width: 0;
          align-self: stretch;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 2px 0;
        }

        .song-title {
          margin: 0 0 4px;
          font-size: 18px;
          font-weight: 800;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .artist {
          margin: 0 0 8px;
          color: #7381ad;
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .song-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          min-height: 25px;
          padding: 3px 10px;
          border-radius: 9px;
          font-size: 13px;
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
          display: flex;
          align-items: center;
          gap: 7px;
          color: #6879ab;
          font-size: 14px;
        }

        .clock {
          width: 17px;
          height: 17px;
          border: 2px solid #8190bd;
          border-radius: 50%;
          position: relative;
        }

        .clock::before,
        .clock::after {
          content: "";
          position: absolute;
          left: 7px;
          top: 3px;
          width: 2px;
          border-radius: 999px;
          background: #8190bd;
          transform-origin: bottom;
        }

        .clock::before {
          height: 5px;
        }

        .clock::after {
          height: 4px;
          transform: rotate(125deg);
        }

        .song-actions {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-end;
          align-self: stretch;
          padding: 4px 4px 4px 0;
        }

        .favorite-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          color: #6f82b7;
          cursor: pointer;
          font-size: 28px;
          line-height: 1;
        }

        .favorite-btn.active {
          color: #3579ff;
        }

        .play-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-width: 118px;
          height: 44px;
          border: none;
          border-radius: 10px;
          background: #edf5ff;
          color: #0d6dff;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
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
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-left: 13px solid #1677ff;
        }

        .reachy {
          position: fixed;
          right: 22px;
          bottom: 18px;
          display: flex;
          align-items: end;
          gap: 14px;
          pointer-events: none;
        }

        .reachy-bubble {
          max-width: 180px;
          padding: 14px 18px;
          border-radius: 28px 28px 10px 28px;
          background: #ffffff;
          border: 1px solid #e9edf6;
          color: #6b7daf;
          font-size: 14px;
          line-height: 1.35;
          box-shadow: 0 8px 30px rgba(34, 47, 87, 0.07);
        }

        .reachy-robot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #7180b0;
          font-size: 13px;
        }

        .robot-head {
          position: relative;
          width: 70px;
          height: 58px;
          border-radius: 50%;
          background: linear-gradient(145deg, #ffffff, #e9edf4);
          border: 1px solid #dfe5ef;
          box-shadow: 0 8px 20px rgba(20, 34, 70, 0.10);
        }

        .robot-head::before {
          content: "";
          position: absolute;
          left: 50%;
          top: -28px;
          width: 2px;
          height: 28px;
          background: #757e8f;
        }

        .robot-head::after {
          content: "";
          position: absolute;
          left: calc(50% - 4px);
          top: -32px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #757e8f;
        }

        .eye {
          position: absolute;
          top: 22px;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #0c0f16;
        }

        .eye.left { left: 17px; }
        .eye.right { right: 17px; }

        .empty {
          grid-column: 1 / -1;
          padding: 60px 20px;
          text-align: center;
          color: #7c88aa;
        }

        @media (max-width: 1200px) {
          .songs-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 850px) {
          .songs-page {
            padding: 22px 18px 120px;
          }

          .brand {
            margin-bottom: 28px;
          }

          .top-row {
            grid-template-columns: 1fr;
            gap: 22px;
          }

          .songs-grid {
            grid-template-columns: 1fr;
          }

          .filters {
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 4px;
          }

          .filter-btn {
            white-space: nowrap;
          }

          .reachy {
            right: 12px;
            bottom: 10px;
          }

          .reachy-bubble {
            display: none;
          }
        }

        @media (max-width: 560px) {
          .brand {
            font-size: 25px;
          }

          h1 {
            font-size: 36px;
          }

          .subtitle {
            font-size: 16px;
          }

          .song-card {
            grid-template-columns: 92px minmax(0, 1fr);
          }

          .song-cover {
            width: 92px;
            height: 92px;
          }

          .song-actions {
            grid-column: 1 / -1;
            flex-direction: row-reverse;
            align-items: center;
            padding-left: 110px;
            margin-top: -8px;
          }

          .play-btn {
            min-width: 110px;
          }
        }
      `}</style>

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
                      <span className={`badge ${levelClass}`}>{song.level}</span>
                      <span className="duration">
                        <span className="clock" aria-hidden="true" />
                        {song.duration}
                      </span>
                    </div>
                  </div>

                  <div className="song-actions">
                    <button
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
                    </button>

                    <div className="action-buttons-group">
                      <button
                        type="button"
                        className="practice-btn-card"
                        onClick={() => handleStartPractice(song)}
                        title="S'entraîner avec ce morceau en arrière-plan"
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

      <div className="reachy" aria-hidden="true">
        <div className="reachy-bubble">
          Un nouveau morceau pour aujourd'hui ? 🎵
        </div>

        <div className="reachy-robot">
          <div className="robot-head">
            <span className="eye left" />
            <span className="eye right" />
          </div>
          <span>Reachy mini</span>
        </div>
      </div>

      {isPracticeActive && (
        <PracticePlayer onClose={() => setIsPracticeActive(false)} />
      )}
    </div>
  );
}
