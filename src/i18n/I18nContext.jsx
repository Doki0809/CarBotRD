import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { LOCALES, DEFAULT_LOCALE, SUPPORTED_LOCALES, LOCALE_LABELS } from './index.js';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    const saved = localStorage.getItem('carbot_locale');
    return SUPPORTED_LOCALES.includes(saved) ? saved : DEFAULT_LOCALE;
  });

  const changeLocale = useCallback((next) => {
    if (!SUPPORTED_LOCALES.includes(next)) return;
    localStorage.setItem('carbot_locale', next);
    setLocale(next);
  }, []);

  const t = useCallback(
    (key) => LOCALES[locale]?.[key] ?? LOCALES[DEFAULT_LOCALE]?.[key] ?? key,
    [locale]
  );

  const value = useMemo(
    () => ({ locale, changeLocale, t, SUPPORTED_LOCALES, LOCALE_LABELS }),
    [locale, changeLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
