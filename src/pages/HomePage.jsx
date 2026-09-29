import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const songs = [
  {
    id: "au_clair_de_la_lune",
    title: "Au clair de la lune",
    artist: "Traditionnel",
    level: "Débutant",
    category: "Enfants",
    duration: "2:36",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80",
    file: "/songs/au_clair_de_la_lune.txt",
    defaultOctave: 4,
  },
  {
    id: "frere_jacques",
    title: "Frère Jacques",
    artist: "Traditionnel",
    level: "Débutant",
    category: "Enfants",
    duration: "1:40",
    image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=300&q=80",
    file: "/songs/frere_jacques.txt",
    defaultOctave: 4,
  },
  {
    id: "let_it_be",
    title: "Let It Be",
    artist: "The Beatles",
    level: "Intermédiaire",
    category: "Pop",
    duration: "4:03",
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=300&q=80",
    file: "/songs/au_clair_de_la_lune.txt",
    defaultOctave: 4,
  },
  {
    id: "comptine",
    title: "Comptine d'un autre été",
    artist: "Yann Tiersen",
    level: "Intermédiaire",
    category: "Films & Séries",
    duration: "3:18",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80",
    file: "/songs/pirate.txt",
    defaultOctave: 4,
  },
  {
    id: "la_vie_en_rose",
    title: "La Vie en rose",
    artist: "Édith Piaf",
    level: "Intermédiaire",
    category: "Variété",
    duration: "3:22",
    image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=300&q=80",
    file: "/songs/pirate.txt",
    defaultOctave: 4,
  },
  {
    id: "fur_elise",
    title: "Für Elise",
    artist: "L. van Beethoven",
    level: "Classique",
    category: "Classique",
    duration: "3:02",
    image: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=300&q=80",
    file: "/songs/mario.txt",
    defaultOctave: 4,
  },
  {
    id: "clair_de_lune",
    title: "Clair de lune",
    artist: "C. Debussy",
    level: "Classique",
    category: "Classique",
    duration: "5:12",
    image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=300&q=80",
    file: "/songs/au_clair_de_la_lune.txt",
    defaultOctave: 4,
  },
  {
    id: "can_you_feel_the_love",
    title: "Can you feel the love tonight",
    artist: "Elton John (Le Roi Lion)",
    level: "Intermédiaire",
    category: "Films & Séries",
    duration: "4:10",
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=300&q=80",
    file: "/songs/pirate.txt",
    defaultOctave: 4,
  },
  {
    id: "hallelujah",
    title: "Hallelujah",
    artist: "Leonard Cohen",
    level: "Intermédiaire",
    category: "Pop",
    duration: "5:08",
    image: "https://images.unsplash.com/photo-1524650359799-842906ca1c06?auto=format&fit=crop&w=300&q=80",
    file: "/songs/au_clair_de_la_lune.txt",
    defaultOctave: 4,
  },
  {
    id: "river_flows_in_you",
    title: "River Flows in You",
    artist: "Yiruma",
    level: "Intermédiaire",
    category: "Pop",
    duration: "4:02",
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=300&q=80",
    file: "/songs/pirate.txt",
    defaultOctave: 4,
  },
  {
    id: "joyeux_anniversaire",
    title: "Joyeux anniversaire",
    artist: "Traditionnel",
    level: "Débutant",
    category: "Enfants",
    duration: "1:12",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=300&q=80",
    file: "/songs/frere_jacques.txt",
    defaultOctave: 4,
  },
  {
    id: "bella_ciao",
    title: "Bella Ciao",
    artist: "Traditionnel",
    level: "Intermédiaire",
    category: "Films & Séries",
    duration: "3:45",
    image: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?auto=format&fit=crop&w=300&q=80",
    file: "/songs/pirate.txt",
    defaultOctave: 4,
  },
  {
    id: "take_on_me",
    title: "Take On Me",
    artist: "A-ha",
    level: "Intermédiaire",
    category: "Pop",
    duration: "3:45",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=300&q=80",
    file: "/songs/Aha__Take_on_me.mid",
    defaultOctave: 5,
  },
  {
    id: "queen_bohemian",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    level: "Intermédiaire",
    category: "Pop",
    duration: "5:55",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80",
    file: "/songs/Queen_Bohemian_Rhapsody.mid",
    defaultOctave: 4,
  },
  {
    id: "queen_show_must_go_on",
    title: "The Show Must Go On",
    artist: "Queen",
    level: "Intermédiaire",
    category: "Pop",
    duration: "4:30",
    image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=300&q=80",
    file: "/songs/show_must_go_on_Queen.mid",
    defaultOctave: 4,
  },
  {
    id: "mario",
    title: "Super Mario Bros - Thème",
    artist: "Koji Kondo",
    level: "Intermédiaire",
    category: "Films & Séries",
    duration: "1:25",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=300&q=80",
    file: "/songs/mario.txt",
    defaultOctave: 6,
  },
  {
    id: "pirate",
    title: "He's a Pirate",
    artist: "Hans Zimmer & Klaus Badelt",
    level: "Intermédiaire",
    category: "Films & Séries",
    duration: "1:50",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80",
    file: "/songs/pirate.txt",
    defaultOctave: 4,
  },
];

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

export default function HomePage({ onPlaySong, onNavigate }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tous");
  const [favorites, setFavorites] = useState([]);

  const filteredSongs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return songs.filter((song) => {
      const matchesSearch =
        !q ||
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.level.toLowerCase().includes(q) ||
        song.category.toLowerCase().includes(q);

      const matchesFilter =
        activeFilter === "Tous"
          ? true
          : activeFilter === "Mes favoris"
          ? favorites.includes(song.title)
          : song.level === activeFilter || song.category === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [search, activeFilter, favorites]);

  const toggleFavorite = (title) => {
    setFavorites((current) =>
      current.includes(title)
        ? current.filter((item) => item !== title)
        : [...current, title]
    );
  };

  const handlePlay = (song, mode = "training") => {
    if (onPlaySong) {
      onPlaySong({
        id: song.id,
        title: song.title,
        composer: song.artist,
        category: song.category || song.level,
        difficulty: song.level,
        duration: song.duration,
        file: song.file || "/songs/au_clair_de_la_lune.txt",
        defaultOctave: song.defaultOctave || 4,
      }, mode);
    } else {
      navigate("/pianoPage");
    }
  };

  return (
    <div className="songs-page">
      <style>{`
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
          .reachy-image {
  width: 95px;
  height: auto;
  object-fit: contain;
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

                    <button
                      type="button"
                      className="play-btn"
                      onClick={() => handlePlay(song, 'training')}
                    >
                      <span className="play-triangle" aria-hidden="true" />
                      Jouer
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty">Aucun morceau ne correspond à votre recherche.</div>
          )}
        </main>
      </div>

      {/* <div className="reachy" aria-hidden="true">
        <div className="reachy-bubble">
          Un nouveau morceau pour aujourd'hui ? 🎵
        </div>

        <div className="reachy-robot">
         <img
  src="https://store.pollen-robotics.com/cdn/shop/files/reachy-mini-wireless-front_df78baf3-d984-45b2-8647-12c891a3ee32.png?v=1779980188&width=2560"
  alt="Reachy Mini"
  className="reachy-image"/>
          <span>Reachy mini</span>
        </div>
      </div> */}
    </div>
  );
}
