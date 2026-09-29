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

  const handlePlaySongFromLibrary = (song) => {
    setCurrentSong(song);
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
    mascotMessage = `C'est parti pour ${currentSong ? currentSong.title : 'le morceau'} ! 🎹`;
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
          <SongPlayer initialSong={currentSong} onBack={handleBackToLibrary} />
        )}
      </main>

      {/* Floating Reachy Mini Mascot (Bottom-Right) */}
      <ReachyFloatingMascot message={mascotMessage} />
    </div>
  );
}

export default App;
