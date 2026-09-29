import React, { useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import SongLibrary from './pages/SongLibrary';
import FreePlay from './pages/FreePlay';
import Home from './pages/Home';
import SongPlayer from './components/SongPlayer';
import PianoPage from './pages/PianoPage.jsx';
import NoteScrollerDemo from './components/Notes_scroller/Notescrollerdemo.jsx';
import ReachyFloatingMascot from './components/ReachyFloatingMascot';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('morceaux'); // 'accueil' | 'morceaux' | 'jeu_libre' | 'player'
  const [currentSong, setCurrentSong] = useState(null);
  const [currentMode, setCurrentMode] = useState('listen'); // 'listen' | 'training'
  const location = useLocation();
  const navigate = useNavigate();

  // Les onglets s'affichent sur "/", les autres routes (/pianoPage, /notes-scroller) ont leur propre page.
  const onTabsPage = location.pathname === '/';

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (!onTabsPage) navigate('/');
  };

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
      <Navbar activeTab={onTabsPage ? activeTab : null} onTabChange={handleTabChange} />

      {/* Main Content Area wrapped in ErrorBoundary */}
      <main className="reachy-main-content">
        <ErrorBoundary onReset={() => handleTabChange('morceaux')}>
          {onTabsPage && activeTab === 'accueil' && <Home onNavigate={setActiveTab} />}
          {onTabsPage && activeTab === 'morceaux' && <SongLibrary onPlaySong={handlePlaySongFromLibrary} />}
          {onTabsPage && activeTab === 'jeu_libre' && <FreePlay />}
          {onTabsPage && activeTab === 'player' && (
            <SongPlayer
              initialSong={currentSong}
              initialMode={currentMode}
              onBack={handleBackToLibrary}
            />
          )}

          {/* Additional routes support for teammates */}
          <Routes>
            <Route path="/pianoPage" element={<PianoPage />} />
            <Route path="/notes-scroller" element={<NoteScrollerDemo />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* Floating Reachy Mini Mascot (Bottom-Right) */}
      <ReachyFloatingMascot message={mascotMessage} />
    </div>
  );
}

export default App;
