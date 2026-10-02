import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './LanguageToggle.css';

export default function LanguageToggle({ className = '' }) {
  const { language, toggleLanguage, isFr } = useLanguage();

  return (
    <button
      type="button"
      className={`lang-toggle-btn ${className}`}
      onClick={toggleLanguage}
      title={isFr ? 'Switch to English (Passer en anglais)' : 'Passer en français (Switch to French)'}
      aria-label="Changer de langue / Change language"
    >
      <span className="lang-toggle__flag" aria-hidden="true">
        {isFr ? '🇫🇷' : '🇬🇧'}
      </span>
      <span className="lang-toggle__text">
        {isFr ? 'FR' : 'EN'}
      </span>
    </button>
  );
}
