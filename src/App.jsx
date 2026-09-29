import React from 'react';
import SongPlayer from './components/SongPlayer';
import './App.css';

function App() {
  return (
    <div className="reachy-app-root">
      {/* Top Navbar */}
      <nav className="reachy-nav">
        <div className="nav-brand">
          <span className="brand-logo">🤖🎵</span>
          <span className="brand-name">REACHY BAND</span>
          <span className="sprint-tag">Sprint 1 • Tâche : Écoute de morceau</span>
        </div>
        <div className="nav-status">
          <span className="status-indicator"></span>
          <span className="status-text">Simulateur Audio Actif</span>
        </div>
      </nav>

      {/* Main Container */}
      <main className="reachy-main">
        <SongPlayer />
      </main>

      {/* Footer */}
      <footer className="reachy-footer">
        <p>Projet Reachy Band • Coach musical virtuel interactif • Clavier AZERTY prévu</p>
      </footer>
    </div>
  );
}

export default App;
