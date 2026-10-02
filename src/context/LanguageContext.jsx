import React, { createContext, useContext, useState } from 'react';
import { getTranslation, getReachyVoiceUrl } from '../utils/translations';

const STORAGE_KEY = 'reachy-lang';

const LanguageContext = createContext({
  language: 'fr',
  setLanguage: () => {},
  toggleLanguage: () => {},
  isEn: false,
  isFr: true,
  t: (path) => path,
  getVoiceUrl: (name) => `/audio/reachy/${name}.mp3`,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'fr' || saved === 'en') return saved;
      if (typeof navigator !== 'undefined' && navigator.language?.startsWith('en')) {
        return 'en';
      }
    } catch {
      // Ignorer si localStorage n'est pas disponible
    }
    return 'fr';
  });

  const setLanguage = (lang) => {
    const valid = lang === 'en' ? 'en' : 'fr';
    setLanguageState(valid);
    try {
      localStorage.setItem(STORAGE_KEY, valid);
      localStorage.setItem('reachy.language', valid);
    } catch {
      // Ignorer
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'en' : 'fr');
  };

  const t = (path, ...args) => getTranslation(path, language, ...args);
  const getVoiceUrl = (name) => getReachyVoiceUrl(name, language);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        isEn: language === 'en',
        isFr: language === 'fr',
        t,
        getVoiceUrl,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage doit être utilisé dans un LanguageProvider');
  }
  return context;
}
