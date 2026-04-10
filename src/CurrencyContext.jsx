import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const CurrencyContext = createContext(null);

const CURRENCIES = {
  DOP: { symbol: 'RD$', code: 'DOP', locale: 'es-DO', name: 'Peso Dominicano', flag: '🇩🇴' },
  USD: { symbol: 'US$', code: 'USD', locale: 'en-US', name: 'US Dollar', flag: '🇺🇸' },
  EUR: { symbol: '€',   code: 'EUR', locale: 'de-DE', name: 'Euro', flag: '🇪🇺' },
  COP: { symbol: 'COP$', code: 'COP', locale: 'es-CO', name: 'Peso Colombiano', flag: '🇨🇴' },
};

const CURRENCY_CODES = Object.keys(CURRENCIES);

const STORAGE_KEY = 'carbot_currencies';
const DEFAULT_SELECTED = ['DOP', 'USD'];

export function CurrencyProvider({ children }) {
  const [selected, setSelected] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(saved) && saved.length >= 1 && saved.length <= 2 && saved.every(c => CURRENCIES[c])) {
        return saved;
      }
      if (saved?.primary && saved?.secondary && CURRENCIES[saved.primary] && CURRENCIES[saved.secondary]) {
        return [saved.primary, saved.secondary];
      }
    } catch {}
    return DEFAULT_SELECTED;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
  }, [selected]);

  const toggleCurrency = useCallback((code) => {
    if (!CURRENCIES[code]) return;
    setSelected(prev => {
      if (prev.includes(code)) {
        if (prev.length <= 1) return prev;
        return prev.filter(c => c !== code);
      }
      if (prev.length >= 2) return [prev[0], code];
      return [...prev, code];
    });
  }, []);

  // Format a raw number with a currency symbol — NO conversion, just display
  const formatPrice = useCallback((amount, currencyCode) => {
    if (amount == null || isNaN(amount) || amount === 0) return '—';
    const c = CURRENCIES[currencyCode] || CURRENCIES.USD;
    return `${c.symbol} ${Math.round(Number(amount)).toLocaleString('en-US')}`;
  }, []);

  const getSymbol = useCallback((code) => CURRENCIES[code]?.symbol || code, []);

  // Format a vehicle's price as-is using its stored currency
  const formatVehiclePrice = useCallback((item) => {
    if (!item) return '—';
    // Use the stored currency and price directly — no conversion
    const curr = item.currency || 'USD';
    // price_dop is used when currency is DOP, otherwise use price
    const amount = curr === 'DOP'
      ? (item.price_dop || item.price || 0)
      : (item.price || 0);
    return formatPrice(amount, curr);
  }, [formatPrice]);

  // Get totals for dashboard — group by currency, no conversion
  const getTotals = useCallback((inventory) => {
    const available = (inventory || []).filter(i => i && (i.status === 'available' || i.status === 'quoted'));

    // Sum per selected currency
    return selected.map(code => {
      let total = 0;
      for (const item of available) {
        const itemCurrency = item.currency || 'USD';
        if (itemCurrency === code) {
          if (code === 'DOP') {
            total += item.price_dop || item.price || 0;
          } else {
            total += item.price || 0;
          }
        }
      }
      return { total: Math.round(total), symbol: CURRENCIES[code].symbol, code };
    });
  }, [selected]);

  // Format with text suffix (for GHL/contracts)
  const formatWithText = useCallback((amount, currencyCode) => {
    if (!amount || isNaN(amount)) return '';
    const c = CURRENCIES[currencyCode];
    if (!c) return `${Number(amount).toLocaleString('en-US')}`;
    const formatted = Math.round(Number(amount)).toLocaleString('en-US');
    const names = { DOP: 'Pesos', USD: 'Dólares', EUR: 'Euros', COP: 'Pesos' };
    return `${c.symbol} ${formatted} ${names[currencyCode] || ''}`.trim();
  }, []);

  const value = useMemo(() => ({
    selected,
    toggleCurrency,
    formatPrice,
    getSymbol,
    formatVehiclePrice,
    formatWithText,
    getTotals,
    CURRENCIES,
    CURRENCY_CODES,
  }), [selected, toggleCurrency, formatPrice, getSymbol, formatVehiclePrice, formatWithText, getTotals]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}

export { CURRENCIES, CURRENCY_CODES };
