import React from 'react';
import './Navbar.css';

export default function Navbar({ activeTab, onTabChange }) {
  return (
    <nav className="reachy-nav-bar">
      {/* Brand */}
      <div className="nav-brand" onClick={() => onTabChange('morceaux')}>
        <span className="brand-logo-icon">🎵</span>
        <span className="brand-text">Reachy <strong>band</strong></span>
      </div>

      {/* Nav Menu Links */}
      <div className="nav-links">
        <button
          type="button"
          className={`nav-item ${activeTab === 'accueil' ? 'active' : ''}`}
          onClick={() => onTabChange('accueil')}
        >
          <span className="nav-icon">🏠</span>
          <span>Accueil</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'morceaux' ? 'active' : ''}`}
          onClick={() => onTabChange('morceaux')}
        >
          <span className="nav-icon">🎵</span>
          <span>Morceaux</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'jeu_libre' ? 'active' : ''}`}
          onClick={() => onTabChange('jeu_libre')}
        >
          <span className="nav-icon">🎹</span>
          <span>Jeu libre</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="nav-right-actions">
        <button type="button" className="btn-icon-nav" title="Rechercher">
          🔍
        </button>
        <button type="button" className="btn-icon-nav profile-avatar" title="Mon Profil">
          👤
        </button>
        <button type="button" className="btn-icon-nav" title="Paramètres">
          ⚙️
        </button>
      </div>
    </nav>
  );
}
