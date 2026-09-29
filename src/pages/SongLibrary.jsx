import React, { useState } from 'react';
import './SongLibrary.css';

export const LIBRARY_SONGS = [
  {
    id: 'au_clair_de_la_lune',
    title: 'Au clair de la lune',
    composer: 'Traditionnel',
    category: 'Enfants',
    difficulty: 'Débutant',
    duration: '2:36',
    coverGradient: 'linear-gradient(135deg, #1e293b, #0f172a)',
    coverEmoji: '🌕',
    file: '/songs/au_clair_de_la_lune.txt',
    defaultOctave: 4
  },
  {
    id: 'frere_jacques',
    title: 'Frère Jacques',
    composer: 'Traditionnel',
    category: 'Enfants',
    difficulty: 'Débutant',
    duration: '1:40',
    coverGradient: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    coverEmoji: '👦👦',
    file: '/songs/frere_jacques.txt',
    defaultOctave: 4
  },
  {
    id: 'mario',
    title: 'Super Mario Bros - Thème',
    composer: 'Koji Kondo',
    category: 'Films & Séries',
    difficulty: 'Intermédiaire',
    duration: '1:25',
    coverGradient: 'linear-gradient(135deg, #fee2e2, #ef4444)',
    coverEmoji: '🍄',
    file: '/songs/mario.txt',
    defaultOctave: 6
  },
  {
    id: 'pirate',
    title: 'He\'s a Pirate',
    composer: 'Klaus Badelt & Hans Zimmer',
    category: 'Films & Séries',
    difficulty: 'Intermédiaire',
    duration: '1:50',
    coverGradient: 'linear-gradient(135deg, #0284c7, #0f172a)',
    coverEmoji: '🏴‍☠️',
    file: '/songs/pirate.txt',
    defaultOctave: 4
  },
  {
    id: 'take_on_me',
    title: 'Take On Me',
    composer: 'A-ha',
    category: 'Pop',
    difficulty: 'Intermédiaire',
    duration: '3:45',
    coverGradient: 'linear-gradient(135deg, #06b6d4, #2563eb)',
    coverEmoji: '⚡',
    file: '/songs/Aha__Take_on_me.mid',
    defaultOctave: 5
  },
  {
    id: 'bohemian',
    title: 'Bohemian Rhapsody',
    composer: 'Queen',
    category: 'Pop',
    difficulty: 'Intermédiaire',
    duration: '5:55',
    coverGradient: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
    coverEmoji: '👑',
    file: '/songs/Queen_Bohemian_Rhapsody.mid',
    defaultOctave: 4
  },
  {
    id: 'show_must_go_on',
    title: 'The Show Must Go On',
    composer: 'Queen',
    category: 'Pop',
    difficulty: 'Intermédiaire',
    duration: '4:30',
    coverGradient: 'linear-gradient(135deg, #b91c1c, #450a0a)',
    coverEmoji: '🎭',
    file: '/songs/show_must_go_on_Queen.mid',
    defaultOctave: 4
  },

  {
    id: 'comptine',
    title: 'Comptine d\'un autre été',
    composer: 'Yann Tiersen',
    category: 'Variété',
    difficulty: 'Intermédiaire',
    duration: '3:18',
    coverGradient: 'linear-gradient(135deg, #fbcfe8, #f43f5e)',
    coverEmoji: '🌅',
    file: '/songs/pirate.txt'
  },
  {
    id: 'la_vie_en_rose',
    title: 'La Vie en rose',
    composer: 'Édith Piaf',
    category: 'Variété',
    difficulty: 'Intermédiaire',
    duration: '3:22',
    coverGradient: 'linear-gradient(135deg, #fecdd3, #e11d48)',
    coverEmoji: '🌹',
    file: '/songs/pirate.txt'
  },
  {
    id: 'fur_elise',
    title: 'Für Elise (Lettre à Élise)',
    composer: 'L. van Beethoven',
    category: 'Classique',
    difficulty: 'Classique',
    duration: '3:02',
    coverGradient: 'linear-gradient(135deg, #dcfce7, #16a34a)',
    coverEmoji: '🎼',
    file: '/songs/mario.txt'
  },
  {
    id: 'bella_ciao',
    title: 'Bella Ciao',
    composer: 'Traditionnel (Casa de Papel)',
    category: 'Films & Séries',
    difficulty: 'Intermédiaire',
    duration: '3:45',
    coverGradient: 'linear-gradient(135deg, #991b1b, #000000)',
    coverEmoji: '👺',
    file: '/songs/pirate.txt'
  },
  {
    id: 'joyeux_anniversaire',
    title: 'Joyeux anniversaire',
    composer: 'Traditionnel',
    category: 'Enfants',
    difficulty: 'Débutant',
    duration: '1:12',
    coverGradient: 'linear-gradient(135deg, #fde68a, #f59e0b)',
    coverEmoji: '🎂',
    file: '/songs/mario.txt'
  }
];

const CATEGORIES = [
  'Tous',
  'Débutant',
  'Intermédiaire',
  'Classique',
  'Pop',
  'Films & Séries',
  'Variété',
  'Enfants',
  'Mes favoris'
];

export default function SongLibrary({ onPlaySong }) {
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState({});

  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredSongs = LIBRARY_SONGS.filter((song) => {
    // Search query filter
    const matchesSearch =
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.composer.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Category filter
    if (selectedCategory === 'Tous') return true;
    if (selectedCategory === 'Mes favoris') return !!favorites[song.id];
    if (selectedCategory === 'Débutant') return song.difficulty === 'Débutant';
    if (selectedCategory === 'Intermédiaire') return song.difficulty === 'Intermédiaire';
    if (selectedCategory === 'Classique') return song.category === 'Classique' || song.difficulty === 'Classique';

    return song.category === selectedCategory;
  });

  return (
    <div className="song-library-page">
      {/* Page Header */}
      <div className="library-header-row">
        <div>
          <h1 className="library-title">Tous les morceaux disponibles</h1>
          <p className="library-subtitle">
            Découvrez notre bibliothèque et apprenez vos morceaux préférés pas à pas.
          </p>
        </div>

        {/* Search bar */}
        <div className="library-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher un morceau, un artiste ou un style..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="category-filters-row">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`filter-pill ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Song Cards Grid */}
      <div className="library-cards-grid">
        {filteredSongs.map((song) => {
          const isFav = !!favorites[song.id];
          let diffClass = 'intermediaire';
          if (song.difficulty === 'Débutant') diffClass = 'debutant';
          if (song.difficulty === 'Classique') diffClass = 'classique';

          return (
            <div
              key={song.id}
              className="song-cover-card"
              onClick={() => onPlaySong(song)}
            >
              {/* Cover Art Thumbnail */}
              <div className="card-thumbnail" style={{ background: song.coverGradient }}>
                <span className="thumbnail-emoji">{song.coverEmoji}</span>
              </div>

              {/* Song Information */}
              <div className="card-details">
                <div className="details-top">
                  <div className="title-block">
                    <h3 className="song-card-title">{song.title}</h3>
                    <span className="song-card-artist">{song.composer}</span>
                  </div>
                  <button
                    type="button"
                    className={`btn-fav ${isFav ? 'active' : ''}`}
                    onClick={(e) => toggleFavorite(song.id, e)}
                    title="Ajouter aux favoris"
                  >
                    {isFav ? '❤️' : '🤍'}
                  </button>
                </div>

                <div className="details-bottom">
                  <div className="meta-left">
                    <span className={`diff-pill ${diffClass}`}>{song.difficulty}</span>
                    <span className="duration-tag">🕒 {song.duration}</span>
                  </div>

                  <div className="card-actions-group">
                    <button
                      type="button"
                      className="btn-card-listen"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaySong(song, 'listen');
                      }}
                      title="Écouter Reachy jouer le morceau"
                    >
                      ▶ Écouter
                    </button>
                    <button
                      type="button"
                      className="btn-card-train"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaySong(song, 'training');
                      }}
                      title="S'entraîner à jouer le morceau au piano AZERTY"
                    >
                      🎯 S'entraîner
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
