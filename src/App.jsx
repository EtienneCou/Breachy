import React, { useState } from 'react';
import Navbar from './components/Navbar';
import SongLibrary from './pages/SongLibrary';
import FreePlay from './pages/FreePlay';
import Home from './pages/Home';
import SongPlayer from './components/SongPlayer';
import ReachyFloatingMascot from './components/ReachyFloatingMascot';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('morceaux'); // 'accueil' | 'morceaux' | 'jeu_libre' | 'player'
  const [currentSong, setCurrentSong] = useState(null);
  const [currentMode, setCurrentMode] = useState('listen'); // 'listen' | 'training'

  const handlePlaySongFromLibrary = (song, mode = 'listen') => {
    setCurrentSong(song);
    setCurrentMode(mode);
    setActiveTab('player');
  };

  const handleBackToLibrary = () => {
    setActiveTab('morceaux');
  };

  // Determine mascot speech message based on current view
  let mascotMessage = "Un nouveau morceau pour aujourd'hui ? 🎵";
  if (activeTab === 'jeu_libre') {
    mascotMessage = "À toi de jouer !";
  } else if (activeTab === 'player') {
    mascotMessage = currentMode === 'training'
      ? `Reachy t'entraîne sur ${currentSong?.title || 'le morceau'} ! 🎯`
      : `Reachy te joue ${currentSong?.title || 'le morceau'} ! 🎧`;
  } else if (activeTab === 'accueil') {
    mascotMessage = "Bienvenue dans Reachy Band ! ✨";
  }

  return (
    <div className="reachy-app-root">
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="reachy-main-content">
        {activeTab === 'accueil' && <Home onNavigate={setActiveTab} />}
        {activeTab === 'morceaux' && <SongLibrary onPlaySong={handlePlaySongFromLibrary} />}
        {activeTab === 'jeu_libre' && <FreePlay />}
        {activeTab === 'player' && (
          <SongPlayer
            initialSong={currentSong}
            initialMode={currentMode}
            onBack={handleBackToLibrary}
          />
        )}
      </main>

      {/* Floating Reachy Mini Mascot (Bottom-Right) */}
      <ReachyFloatingMascot message={mascotMessage} />
    </div>
  );
}

export default App;
