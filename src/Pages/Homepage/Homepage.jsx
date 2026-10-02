import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DifficultyFilter } from "../../Components/difficulty";
import { SongCard } from "../../Components/songCard";
import { CoachPanel, suggestSong, useCoach, welcomeReaction } from "../../Components/coach";
import { useSongsInfo } from "../../hooks/useSongsInfo";
import { getPlayCounts, recordPlay, resetPlayCount } from "../../utils/playCounts";

import songsCatalog from "../../resources/catalog";

import PracticePlayer from "../../Components/Practice/PracticePlayer";

import useSongPlayer from "../../hooks/useSongPlayer";
import audioPlayer from "../../services/audioPlayer";
import LanguageToggle from "../../Components/LanguageToggle/LanguageToggle";
import { useLanguage } from "../../context/LanguageContext";
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
  "Les plus joués",

  // "Mes favoris",

];



const MOST_PLAYED = "Les plus joués"; // filtre : morceaux déjà joués, du plus joué au moins joué
const FAVORITES_COUNT = 5; // taille de la section « Favoris »

export default function SongsPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [activeFilter, setActiveFilter] = useState("Tous");


  const [isPracticeActive, setIsPracticeActive] = useState(false);
  const [userSongsRefresh, setUserSongsRefresh] = useState(0);

  const { playSong } = useSongPlayer();

  // En quittant l'accueil (jeu, jeu libre…), l'écoute en cours s'arrête.
  useEffect(() => () => {
    if (audioPlayer.currentSong) audioPlayer.stop();
  }, []);

  const navigate = useNavigate();

  const [activeDifficulty, setActiveDifficulty] = useState(null);

  // Onglet de la bibliothèque : "catalog" (tous les morceaux), "mine" (mes morceaux)
  // ou "recordings" (mes enregistrements du jeu libre, ouvert par /?onglet=enregistrements)
  const [searchParams] = useSearchParams();
  const [libraryTab, setLibraryTab] = useState(() =>
    searchParams.get("onglet") === "enregistrements" ? "recordings" : "catalog"
  );
  const [userSongs, setUserSongs] = useState([]); // morceaux ajoutés (fournis par UserSongs)
  const [recordings, setRecordings] = useState([]); // enregistrements sauvegardés depuis le jeu libre

  // Nombre de lancements de chaque morceau (« Écouter » ou « S'entraîner »)
  const [playCounts, setPlayCounts] = useState(() => getPlayCounts());
  const countPlay = (key) => setPlayCounts(recordPlay(key));
  const resetListens = (key) => setPlayCounts(resetPlayCount(key));

  // Morceaux du catalogue et morceaux ajoutés, sous une même forme pour les cartes.
  // `key` : id pour le jeu, les compteurs et les infos (`user:<id>` pour un morceau ajouté).
  const catalogItems = songs.map((song) => ({
    key: song.id,
    song,
    title: song.title,
    subtitle: song.artist,
    image: song.image,
    genre: song.level,
    playable: Boolean(song.musicItem),
    fallbackDuration: song.duration,
  }));
  // Morceaux ajoutés et enregistrements : tous deux rangés dans la base du navigateur.
  const userItems = [...userSongs, ...recordings].map((song) => ({
    key: `user:${song.id}`,
    song,
    title: song.title,
    subtitle: song.origin === "studio" ? t('home.studioSubtitle') : song.source === "recording" ? t('home.myRecording') : t('home.myMusic'),
    playable: true,
    isNew: song.isNew,
  }));

  // Difficulté, durée exacte et mélodie de chaque morceau jouable (calculées à partir des notes)
  const songInfos = useSongsInfo(
    [...catalogItems, ...userItems].map((item) => (item.playable ? item.key : null))
  );

  // « S'entraîner » ouvre le jeu (piano + notes qui tombent) avec ce morceau.
  const handleStartPractice = (item) => {
    countPlay(item.key);
    navigate(`/piano?morceau=${encodeURIComponent(item.key)}`);
  };

  // Reachy, le coach : il dit bonjour et propose un morceau adapté au niveau du joueur
  // (le choix change chaque jour).
  const { react } = useCoach();
  const [day] = useState(() => Math.floor(Date.now() / 86400000));
  const suggestion = useMemo(
    () =>
      suggestSong(
        songs.filter((song) => song.musicItem).map((song) => ({ key: song.id, title: song.title, info: songInfos[song.id] })),
        day
      ),
    [songInfos, day]
  );
  const [firstVisitToday] = useState(isFirstVisitToday);
  useEffect(() => rememberVisitToday(), []);
  // Message de la bulle : bonjour + morceau conseillé ; il reste affiché.
  const welcome = useMemo(
    () => welcomeReaction({ suggestion, firstVisitToday, day }),
    [suggestion, firstVisitToday, day]
  );
  const welcomed = useRef(false);
  useEffect(() => {
    const greet = (offer) => {
      if (welcomed.current) return;
      welcomed.current = true;
      react("welcome", welcomeReaction({ suggestion: offer, firstVisitToday, day }));
    };
    if (suggestion) greet(suggestion);
    // Les difficultés des morceaux se calculent en arrière-plan : on n'attend pas indéfiniment.
    const timer = setTimeout(() => greet(null), 2500);
    return () => clearTimeout(timer);
  }, [suggestion, firstVisitToday, day, react]);

  const handlePlay = (item) => {
    countPlay(item.key);
    playSong(item.song);
    setIsPracticeActive(true);
  };

  // Filtres : recherche, genre (ou « Les plus joués ») et difficulté.
  const query = search.trim().toLowerCase();
  const isFiltering = activeFilter !== "Tous" || Boolean(activeDifficulty) || Boolean(query);
  const byPlays = (a, b) => (playCounts[b.key] ?? 0) - (playCounts[a.key] ?? 0);

  const matches = (item) => {
    const matchesSearch =
      !query ||
      [item.title, item.subtitle, item.genre].some((text) => text?.toLowerCase().includes(query));
    const matchesGenre =
      activeFilter === "Tous" || activeFilter === MOST_PLAYED || item.genre === activeFilter;
    const matchesDifficulty =
      !activeDifficulty || songInfos[item.key]?.difficulty?.level.id === activeDifficulty;
    return matchesSearch && matchesGenre && matchesDifficulty;
  };

  // Avec un filtre : une seule liste. « Les plus joués » inclut les morceaux ajoutés.
  const filteredItems =
    activeFilter === MOST_PLAYED
      ? [...catalogItems, ...userItems].filter((item) => playCounts[item.key] > 0 && matches(item)).sort(byPlays)
      : catalogItems.filter(matches);

  // Sans filtre : « Favoris » (les 5 plus joués, morceaux ajoutés compris), puis tous les autres.
  const favoriteItems = [...catalogItems, ...userItems]
    .filter((item) => playCounts[item.key] > 0)
    .sort(byPlays)
    .slice(0, FAVORITES_COUNT);
  const otherItems = catalogItems.filter((item) => !favoriteItems.includes(item));

  const renderCard = (item, isFavorite = false) => (
    <SongCard
      key={item.key}
      title={item.title}
      subtitle={item.subtitle}
      image={item.image}
      musicId={item.playable ? item.key : null}
      info={item.playable ? songInfos[item.key] : null}
      fallbackDuration={item.fallbackDuration}
      isNew={item.isNew}
      onPractice={() => handleStartPractice(item)}
      onListen={() => handlePlay(item)}
      onResetListens={isFavorite ? () => resetListens(item.key) : undefined}
    />
  );






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

        <header className="home-header">
          <div className="brand-wrapper" style={{ gridArea: 'brand', display: 'inline-flex', alignItems: 'center', gap: '14px' }}>
            <div className="brand" style={{ marginBottom: 0 }}>
              <div className="brand-mark" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <span>Reachy band</span>
            </div>
            <LanguageToggle />
          </div>

          <div className="home-header__actions">
            <button type="button" className="free-play-btn" onClick={() => navigate("/jeu-libre")}>
              {t('home.freePlay')}
            </button>
            {/* Studio : pistes en boucle, plusieurs instruments */}
            <button type="button" className="free-play-btn" onClick={() => navigate("/studio")}>
              {t('home.studio')}
            </button>
            <button type="button" className="add-music-btn" onClick={() => setIsUploadOpen(true)}>
              {t('home.addMusic')}
            </button>
          </div>

          <label className="search-box home-header__search">
            <span className="search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder={t('home.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

        </header>

        <section className="top-row">
          <div>
            <h1>{t('home.heroTitle')}</h1>
            <p className="subtitle">
              {t('home.heroSubtitle')}
            </p>
          </div>
        </section>

        <CoachPanel layout="wide" className="home-coach" idleText={welcome.text}>
          {suggestion && (
            <button
              type="button"
              className="home-coach__play"
              onClick={() => handleStartPractice({ key: suggestion.key })}
            >
              🎹 S'entraîner sur « {suggestion.title} »
            </button>
          )}
        </CoachPanel>

        {/* Onglets : le catalogue, ou les morceaux ajoutés par l'utilisateur */}
        <div className="library-tabs" role="tablist" aria-label="Bibliothèque">
          <button
            type="button"
            role="tab"
            aria-selected={libraryTab === "catalog"}
            className={`library-tab${libraryTab === "catalog" ? " is-active" : ""}`}
            onClick={() => setLibraryTab("catalog")}
          >
            {/* libellé court sur téléphone (voir .library-tab__short) */}
            <span className="library-tab__long">{t('home.tabAll')}</span>
            <span className="library-tab__short">{t('home.tabAllShort')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={libraryTab === "mine"}
            className={`library-tab${libraryTab === "mine" ? " is-active" : ""}`}
            onClick={() => setLibraryTab("mine")}
          >
            <span className="library-tab__long">{t('home.tabMine')}</span>
            <span className="library-tab__short">{t('home.tabMineShort')}</span>
            {userSongs.length > 0 && <span className="library-tab__count">{userSongs.length}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={libraryTab === "recordings"}
            className={`library-tab${libraryTab === "recordings" ? " is-active" : ""}`}
            onClick={() => setLibraryTab("recordings")}
          >
            <span className="library-tab__long">{t('home.tabRecordings')}</span>
            <span className="library-tab__short">{t('home.tabRecordingsShort')}</span>
            {recordings.length > 0 && <span className="library-tab__count">{recordings.length}</span>}
          </button>
        </div>

        {/* Filtres et bouton d'ajout sur la même rangée */}
        <div className="library-toolbar">
          {libraryTab === "catalog" ? (
            <nav className="filters" aria-label="Filtres">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`filter-btn ${activeFilter === filter ? "active" : ""}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {t('filters.' + filter)}
                </button>
              ))}
            </nav>
          ) : libraryTab === "mine" ? (
            <p className="library-toolbar__hint">{t('home.hintMine')}</p>
          ) : (
            <p className="library-toolbar__hint">{t('home.hintRecordings')}</p>
          )}

          {libraryTab === "catalog" && (
            <div className="library-toolbar__difficulty">
              <DifficultyFilter value={activeDifficulty} onChange={setActiveDifficulty} />
            </div>
          )}

        </div>

        {libraryTab === "catalog" ? (
          <>
            <div className="filter-controls">
              {isFiltering && (
                <button
                  type="button"
                  className="clear-filters-btn"
                  aria-label={t('home.clearFiltersTitle')}
                  title={t('home.clearFiltersTitle')}
                  onClick={() => {
                    setActiveFilter("Tous");
                    setActiveDifficulty(null);
                    setSearch("");
                  }}
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </div>

            {isFiltering ? (
              // Un filtre ou une recherche est actif : une seule liste, sans titres
              <main className="songs-grid">
                {filteredItems.length > 0 ? (
                  filteredItems.map(renderCard)
                ) : (
                  <div className="empty">
                    {activeFilter === MOST_PLAYED && !Object.keys(playCounts).length
                      ? t('home.emptyMostPlayed')
                      : t('home.emptySearch')}
                  </div>
                )}
              </main>
            ) : (
              <>
                {favoriteItems.length > 0 && (
                  <section className="library-section" aria-labelledby="section-favoris">
                    <header className="library-section__head">
                      <h2 id="section-favoris" className="library-section__title">{t('home.favorites')}</h2>
                      <p className="library-section__subtitle">{t('home.favoritesSubtitle', favoriteItems.length)}</p>
                    </header>
                    <div className="songs-grid">
                      {favoriteItems.map((item) => renderCard(item, true))}
                    </div>
                  </section>
                )}
                <section className="library-section" aria-labelledby="section-tous">
                  <header className="library-section__head">
                  </header>
                  <main className="songs-grid">{otherItems.map(renderCard)}</main>
                </section>
              </>
            )}
          </>
        ) : null}

        {/* Toujours monté (même caché) pour connaître le nombre de morceaux ajoutés */}
        <div hidden={libraryTab !== "mine"}>
          <UserSongs
            refreshKey={userSongsRefresh}
            onSongsChange={setUserSongs}
            showHeader={false}
            onPlay={(song) => handlePlay({ key: `user:${song.id}`, song })}
            onPractice={(song) => handleStartPractice({ key: `user:${song.id}` })}
          />
        </div>
        <div hidden={libraryTab !== "recordings"}>
          <UserSongs
            source="recording"
            refreshKey={userSongsRefresh}
            onSongsChange={setRecordings}
            showHeader={false}
            onPlay={(song) => handlePlay({ key: `user:${song.id}`, song })}
            onPractice={(song) => handleStartPractice({ key: `user:${song.id}` })}
          />
        </div>

      </div>








{isUploadOpen &&

        createPortal(

          <div

            className="modal-overlay songs-upload-modal"

            onClick={() => setIsUploadOpen(false)}

          >

            <div

              className="modal-content songs-upload-modal__content"

              onClick={(e) => e.stopPropagation()}

            >

              <button

                type="button"

                className="modal-close"

                onClick={() => setIsUploadOpen(false)}

                aria-label={t('common.close')}

              >

                ×

              </button>



              <div className="modal-header">
                <h2>{t('modal.uploadTitle')}</h2>
                <p>
                  {t('modal.uploadSubtitle')}
                </p>
              </div>



              <MidiUploader

                onSongAdded={(song) => {

                  console.log("Morceau ajouté :", song);

                  setUserSongsRefresh((current) => current + 1);
                  setLibraryTab("mine"); // on montre le morceau qui vient d'être ajouté

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

// Première visite de l'accueil aujourd'hui ? (Reachy ne parle à voix haute qu'à ce moment-là.)
const LAST_VISIT_KEY = "breachy.coach.lastVisit";

function isFirstVisitToday() {
  try {
    return localStorage.getItem(LAST_VISIT_KEY) !== new Date().toDateString();
  } catch {
    return false;
  }
}

function rememberVisitToday() {
  try {
    localStorage.setItem(LAST_VISIT_KEY, new Date().toDateString());
  } catch {
    // stockage indisponible : Reachy reparlera à la prochaine visite
  }
}
