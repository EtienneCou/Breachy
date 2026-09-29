import React from 'react';
import './Home.css';

export default function Home({ onNavigate }) {
  return (
    <div className="home-page-container">
      {/* Hero Welcome Banner */}
      <section className="home-hero-banner">
        <div className="hero-content">
          <span className="hero-tag">Coach musical interactif</span>
          <h1 className="hero-title">
            Apprenez la musique avec <strong>Reachy Mini</strong>
          </h1>
          <p className="hero-desc">
            Découvrez le plaisir de jouer du piano à votre rythme. Reachy vous guide note par note,
            réagit à vos progrès et vous accompagne dans vos répétitions !
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={() => onNavigate('morceaux')}
            >
              🎵 Découvrir les morceaux
            </button>
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => onNavigate('jeu_libre')}
            >
              🎹 Accéder au jeu libre
            </button>
          </div>
        </div>
        <div className="hero-robot-preview">
          <div className="preview-robot-card">
            <span className="robot-big-avatar">🤖🎶</span>
            <div className="robot-dialogue">
              <strong>Coucou ! Je suis Reachy.</strong>
              <span>Prêt pour une session de musique aujourd'hui ?</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="home-features-grid">
        <div className="feature-card" onClick={() => onNavigate('morceaux')}>
          <span className="feat-icon">🎼</span>
          <h3>Bibliothèque de Morceaux</h3>
          <p>Classiques, variété, rock, bandes originales. Écoutez Reachy ou entraînez-vous pas à pas au clavier AZERTY.</p>
          <span className="feat-link">Explorer les morceaux →</span>
        </div>

        <div className="feature-card" onClick={() => onNavigate('jeu_libre')}>
          <span className="feat-icon">🎹</span>
          <h3>Studio Jeu Libre</h3>
          <p>Clavier 4 octaves réaliste, métronome, détection d'accords et enregistrement en temps réel.</p>
          <span className="feat-link">Lancer le piano →</span>
        </div>

        <div className="feature-card">
          <span className="feat-icon">✨</span>
          <h3>Pédagogie Bienveillante</h3>
          <p>Reachy encourage chaque essai, félicite les réussites et vous aide à progresser sans frustration.</p>
          <span className="feat-link">Découvrir la méthode →</span>
        </div>
      </section>
    </div>
  );
}
