import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import './ThemeToggle.css';

export default function ThemeToggle({ className = '', compact = false }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const { t } = useLanguage();

  const titleText = isDark ? t('theme.switchToLight') : t('theme.switchToDark');
  const labelText = isDark ? t('theme.dark') : t('theme.light');

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${compact ? 'theme-toggle-btn--compact' : ''} ${className}`}
      onClick={toggleTheme}
      title={titleText}
      aria-label={titleText}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {isDark ? '🌙' : '☀️'}
      </span>
      {!compact && (
        <span className="theme-toggle__text">
          {labelText}
        </span>
      )}
    </button>
  );
}
