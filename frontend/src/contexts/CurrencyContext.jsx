/**
 * CurrencyContext — Enterprise-grade Global Currency Localization
 * ═══════════════════════════════════════════════════════════════
 * Architecture:
 *   1. Language → Currency AUTO-MAPPING (15 languages → 15 currencies)
 *   2. Intl.NumberFormat-based FULL localization:
 *      - Symbol position (prefix/suffix)
 *      - Thousands separator (comma / period / space / arabic comma)
 *      - Decimal separator (period / comma / momayyez)
 *      - Precision rules (0 decimals for KRW/JPY/VND, 2 for USD/EUR etc.)
 *   3. Real-time FX rates from open APIs (KRW base)
 *   4. Manual override respected (localStorage flag)
 *   5. Compact formatting (K/M/B with locale-aware symbols)
 *
 * Usage:
 *   const { currency, setCurrency, fmt, convert, fxRateUpdated } = useCurrency();
 *   fmt(1500000)        → "₩1,500,000" (KO) / "$1,086.96" (EN) / "€1,006.71" (DE)
 *   fmt(1500000, {compact:true}) → "₩150만" (KO) / "$1.09K" (EN) / "1.007K €" (DE)
 *
 * Policy: All monetary values stored as KRW internally.
 *         Display layer converts & formats per user's language/currency.
 *         Original data integrity is NEVER modified.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════
// 1. LANGUAGE → CURRENCY MAPPING (15 languages)
// ═══════════════════════════════════════════════════════════
export const LANG_CURRENCY_MAP = {
  ko:      'KRW',   // 한국어 → 대한민국 원
  en:      'USD',   // English → US Dollar
  ja:      'JPY',   // 日本語 → 日本円
  zh:      'CNY',   // 简体中文 → 人民币
  'zh-TW': 'TWD',   // 繁體中文 → 新台幣
  de:      'EUR',   // Deutsch → Euro
  th:      'THB',   // ภาษาไทย → บาท
  vi:      'VND',   // Tiếng Việt → Đồng
  id:      'IDR',   // Bahasa Indonesia → Rupiah
  es:      'EUR',   // Español → Euro (Spain primary)
  fr:      'EUR',   // Français → Euro
  pt:      'BRL',   // Português → Real
  ru:      'RUB',   // Русский → Рубль
  ar:      'SAR',   // العربية → ريال سعودي
  hi:      'INR',   // हिंदी → भारतीय रुपया
};

// ═══════════════════════════════════════════════════════════
// 2. CURRENCY DEFINITIONS — Extended for 15+ currencies
// ═══════════════════════════════════════════════════════════
export const CURRENCIES = [
  { code: 'KRW', symbol: '₩',   label: 'Korean Won (KRW)',       flag: '🇰🇷', locale: 'ko-KR', decimals: 0 },
  { code: 'USD', symbol: '$',   label: 'US Dollar (USD)',         flag: '🇺🇸', locale: 'en-US', decimals: 2 },
  { code: 'JPY', symbol: '¥',   label: 'Japanese Yen (JPY)',      flag: '🇯🇵', locale: 'ja-JP', decimals: 0 },
  { code: 'EUR', symbol: '€',   label: 'Euro (EUR)',              flag: '🇪🇺', locale: 'de-DE', decimals: 2 },
  { code: 'CNY', symbol: '¥',   label: 'Chinese Yuan (CNY)',      flag: '🇨🇳', locale: 'zh-CN', decimals: 2 },
  { code: 'TWD', symbol: 'NT$', label: 'Taiwan Dollar (TWD)',     flag: '🇹🇼', locale: 'zh-TW', decimals: 0 },
  { code: 'THB', symbol: '฿',   label: 'Thai Baht (THB)',         flag: '🇹🇭', locale: 'th-TH', decimals: 2 },
  { code: 'VND', symbol: '₫',   label: 'Vietnamese Dong (VND)',   flag: '🇻🇳', locale: 'vi-VN', decimals: 0 },
  { code: 'IDR', symbol: 'Rp',  label: 'Indonesian Rupiah (IDR)', flag: '🇮🇩', locale: 'id-ID', decimals: 0 },
  { code: 'BRL', symbol: 'R$',  label: 'Brazilian Real (BRL)',    flag: '🇧🇷', locale: 'pt-BR', decimals: 2 },
  { code: 'RUB', symbol: '₽',   label: 'Russian Ruble (RUB)',     flag: '🇷🇺', locale: 'ru-RU', decimals: 2 },
  { code: 'SAR', symbol: 'ر.س', label: 'Saudi Riyal (SAR)',       flag: '🇸🇦', locale: 'ar-SA', decimals: 2 },
  { code: 'INR', symbol: '₹',   label: 'Indian Rupee (INR)',      flag: '🇮🇳', locale: 'hi-IN', decimals: 2 },
  { code: 'SGD', symbol: 'S$',  label: 'Singapore Dollar (SGD)',  flag: '🇸🇬', locale: 'en-SG', decimals: 2 },
];

// ═══════════════════════════════════════════════════════════
// 3. FALLBACK FX RATES (KRW base, ~2026-Q1)
// ═══════════════════════════════════════════════════════════
const FALLBACK_RATES = {
  KRW: 1,
  USD: 1 / 1380,
  JPY: 1 / 9.35,
  EUR: 1 / 1490,
  CNY: 1 / 190,
  TWD: 1 / 43,
  THB: 1 / 38,
  VND: 1 / 0.0555,
  IDR: 1 / 0.0865,
  BRL: 1 / 270,
  RUB: 1 / 15,
  SAR: 1 / 368,
  INR: 1 / 16.5,
  SGD: 1 / 1020,
};

// ═══════════════════════════════════════════════════════════
// 4. REAL-TIME RATE FETCHING (KRW base)
// ═══════════════════════════════════════════════════════════
async function fetchLiveRates() {
  const targets = Object.keys(FALLBACK_RATES);

  // Source 1: exchangerate-api.com (free, no key)
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/KRW", {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d?.rates?.USD) {
        const out = { KRW: 1 };
        for (const c of targets) {
          if (c !== 'KRW' && d.rates[c]) out[c] = d.rates[c];
        }
        // Fill missing with fallback
        for (const c of targets) {
          if (!out[c]) out[c] = FALLBACK_RATES[c];
        }
        return out;
      }
    }
  } catch { /* next */ }

  // Source 2: fawazahmed0 currency API (jsdelivr CDN)
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/krw.min.json",
      { signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const d = await res.json();
      const r = d?.krw;
      if (r?.usd) {
        const out = { KRW: 1 };
        for (const c of targets) {
          const key = c.toLowerCase();
          if (key !== 'krw' && r[key]) out[c] = r[key];
        }
        for (const c of targets) {
          if (!out[c]) out[c] = FALLBACK_RATES[c];
        }
        return out;
      }
    }
  } catch { /* fallback */ }

  return null;
}

// ═══════════════════════════════════════════════════════════
// 5. CACHE (localStorage, 1hr TTL)
// ═══════════════════════════════════════════════════════════
const CACHE_KEY = "geniego_fx_rates";
const CACHE_TTL = 60 * 60 * 1000;

function loadCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { rates, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return rates;
  } catch { /* ignore */ }
  return null;
}

function saveCache(rates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, ts: Date.now() }));
  } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════
// 6. Intl.NumberFormat FORMATTER FACTORY
//    Produces locale-aware currency strings per spec #67-75
// ═══════════════════════════════════════════════════════════

/**
 * Build an Intl.NumberFormat instance for a given currency definition.
 * This handles: symbol position, thousands separator, decimal separator,
 * precision rules, and display conventions — all per locale.
 */
function buildFormatter(currDef) {
  try {
    return new Intl.NumberFormat(currDef.locale, {
      style: 'currency',
      currency: currDef.code,
      minimumFractionDigits: currDef.decimals,
      maximumFractionDigits: currDef.decimals,
    });
  } catch {
    // Fallback for unsupported locales
    return null;
  }
}

/**
 * Build a compact Intl.NumberFormat for abbreviated display.
 */
function buildCompactFormatter(currDef) {
  try {
    return new Intl.NumberFormat(currDef.locale, {
      style: 'currency',
      currency: currDef.code,
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// 7. GLOBAL FMT SINGLETON (for non-React usage)
// ═══════════════════════════════════════════════════════════
let _globalFmt = (krwAmount, opts = {}) => {
  const val = Number(krwAmount);
  if (opts.compact) {
    if (Math.abs(val) >= 1e8) return `₩${(val / 1e8).toFixed(1)}억`;
    if (Math.abs(val) >= 1e4) return `₩${(val / 1e4).toFixed(0)}만`;
    return `₩${Math.round(val).toLocaleString('ko-KR')}`;
  }
  return `₩${Math.round(val).toLocaleString('ko-KR')}`;
};

/**
 * globalFmt(krwAmount, opts?) — works outside React components.
 * Uses the last-known currency selected by the user.
 * Prefer useCurrency().fmt inside React components.
 */
export function globalFmt(krwAmount, opts = {}) {
  return _globalFmt(krwAmount, opts);
}

// ═══════════════════════════════════════════════════════════
// 8. CONTEXT + PROVIDER
// ═══════════════════════════════════════════════════════════
const CurrencyContext = createContext(null);

const LS_CURRENCY_KEY = "genie_currency";
const LS_CURRENCY_MANUAL = "genie_currency_manual";

export function CurrencyProvider({ children }) {
  const savedCode = typeof localStorage !== "undefined"
    ? localStorage.getItem(LS_CURRENCY_KEY) || "KRW"
    : "KRW";

  const [currencyCode, setCurrencyCode] = useState(savedCode);
  const [rates, setRates] = useState(() => loadCached() || FALLBACK_RATES);
  const [fxRateUpdated, setFxRateUpdated] = useState(false);
  const prevLangRef = useRef(null);

  // Fetch live rates on mount
  useEffect(() => {
    const cached = loadCached();
    if (cached) {
      setRates(cached);
      setFxRateUpdated(true);
      return;
    }
    fetchLiveRates().then(live => {
      if (live) {
        setRates(live);
        saveCache(live);
        setFxRateUpdated(true);
      }
    });
  }, []);

  // ── Language-based auto-switching ────────────────────────
  // When language changes, auto-switch currency UNLESS manually selected
  const syncCurrencyToLang = useCallback((langCode) => {
    if (!langCode) return;

    // Don't override manual selection
    const isManual = localStorage.getItem(LS_CURRENCY_MANUAL) === "1";
    if (isManual) return;

    const mappedCurrency = LANG_CURRENCY_MAP[langCode];
    if (mappedCurrency && mappedCurrency !== currencyCode) {
      setCurrencyCode(mappedCurrency);
      localStorage.setItem(LS_CURRENCY_KEY, mappedCurrency);
    }
  }, [currencyCode]);

  // Expose syncCurrencyToLang so I18nProvider can call it
  // We'll also listen for lang changes via a custom event
  useEffect(() => {
    const handler = (e) => {
      const newLang = e.detail?.lang;
      if (newLang && newLang !== prevLangRef.current) {
        prevLangRef.current = newLang;
        syncCurrencyToLang(newLang);
      }
    };
    window.addEventListener('genie-lang-change', handler);
    return () => window.removeEventListener('genie-lang-change', handler);
  }, [syncCurrencyToLang]);

  // Manual currency selection
  const setCurrency = useCallback((code) => {
    setCurrencyCode(code);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LS_CURRENCY_KEY, code);
      // Mark as manually selected so language-switch won't auto-override
      localStorage.setItem(LS_CURRENCY_MANUAL, "1");
    }
  }, []);

  // Reset manual flag (called when user explicitly changes language)
  const resetManualCurrency = useCallback(() => {
    localStorage.removeItem(LS_CURRENCY_MANUAL);
  }, []);

  // Build currency object with live rate + Intl formatters
  const currency = useMemo(() => {
    const def = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
    const rate = rates[currencyCode] ?? FALLBACK_RATES[currencyCode] ?? 1;
    const intlFmt = buildFormatter(def);
    const intlCompact = buildCompactFormatter(def);
    return { ...def, rate, intlFmt, intlCompact };
  }, [currencyCode, rates]);

  /** convert(krwAmount) → number in selected currency */
  const convert = useCallback(
    (krwAmount) => Number(krwAmount) * currency.rate,
    [currency]
  );

  /**
   * fmt(krwAmount, options?)
   * ─────────────────────────────────────────────────
   * THE CORE FORMATTER — Spec #67-75 compliant
   *
   * Uses Intl.NumberFormat for:
   * - Correct symbol position (₩1,000 vs 1.000 € vs ر.س 1,000)
   * - Locale thousands separator (, . ٬ etc.)
   * - Locale decimal separator (. , ٫ etc.)
   * - Precision rules (0 for KRW/JPY/VND, 2 for USD/EUR/THB etc.)
   *
   * options.compact  → abbreviated (K/M/B with locale formatting)
   * options.digits   → override decimal places
   */
  const fmt = useCallback(
    (krwAmount, options = {}) => {
      const val = Number(krwAmount) * currency.rate;

      // Compact mode
      if (options.compact) {
        if (currency.intlCompact) {
          try { return currency.intlCompact.format(val); } catch { /* fallback */ }
        }
        // Manual compact fallback
        const sym = currency.symbol;
        if (currency.code === 'KRW') {
          if (Math.abs(val) >= 1e8) return `${sym}${(val / 1e8).toFixed(1)}억`;
          if (Math.abs(val) >= 1e4) return `${sym}${(val / 1e4).toFixed(0)}만`;
          return `${sym}${Math.round(val).toLocaleString('ko-KR')}`;
        }
        if (Math.abs(val) >= 1e9) return `${sym}${(val / 1e9).toFixed(2)}B`;
        if (Math.abs(val) >= 1e6) return `${sym}${(val / 1e6).toFixed(2)}M`;
        if (Math.abs(val) >= 1e3) return `${sym}${(val / 1e3).toFixed(1)}K`;
        return `${sym}${val.toFixed(currency.decimals)}`;
      }

      // Standard mode — Intl.NumberFormat (locale-aware)
      if (options.digits !== undefined) {
        // Custom digit override
        try {
          const customFmt = new Intl.NumberFormat(currency.locale, {
            style: 'currency',
            currency: currency.code,
            minimumFractionDigits: options.digits,
            maximumFractionDigits: options.digits,
          });
          return customFmt.format(val);
        } catch { /* fallback below */ }
      }

      if (currency.intlFmt) {
        try { return currency.intlFmt.format(val); } catch { /* fallback */ }
      }

      // Ultimate fallback
      const sym = currency.symbol;
      const decimals = options.digits ?? currency.decimals;
      return `${sym}${val.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    },
    [currency]
  );

  const value = {
    currency,
    currencies: CURRENCIES,
    rates,
    fxRateUpdated,
    setCurrency,
    resetManualCurrency,
    syncCurrencyToLang,
    convert,
    fmt,
  };

  // Keep global singleton in sync
  _globalFmt = fmt;

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

// ═══════════════════════════════════════════════════════════
// 9. CURRENCY SELECTOR UI (Topbar dropdown)
// ═══════════════════════════════════════════════════════════
export function CurrencySelector({ compact = false }) {
  const { currency, setCurrency, currencies, rates, fxRateUpdated } = useCurrency();
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const isCompact = compact || isMobile;

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", flexDirection: "column" }}>
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <select
          value={currency.code}
          onChange={e => setCurrency(e.target.value)}
          title={`Select Currency${fxRateUpdated ? " (live rate)" : " (fallback rate)"}`}
          className="currency-selector"
          style={{
            appearance: "none",
            background: "rgba(79,142,247,0.08)",
            border: "1px solid rgba(79,142,247,0.25)",
            borderRadius: 10,
            color: "var(--text-1)",
            cursor: "pointer",
            fontSize: isCompact ? 10 : 13,
            fontWeight: 700,
            padding: isCompact ? "4px 22px 4px 6px" : "7px 32px 7px 12px",
            outline: "none",
            maxWidth: isCompact ? 72 : 160,
          }}
        >
          {currencies.map(c => (
            <option key={c.code} value={c.code} style={{ background: "var(--surface)" }}>
              {c.flag} {isCompact ? c.code : c.label}
            </option>
          ))}
        </select>
        <span style={{
          position: "absolute", right: isCompact ? 5 : 10,
          pointerEvents: "none", fontSize: 9, color: "var(--text-3)",
        }}>▾</span>
      </div>
      {/* Live rate indicator */}
      {!isCompact && currency.code !== "KRW" && (
        <div style={{ fontSize: 9, color: fxRateUpdated ? "#22c55e" : "#f59e0b", marginTop: 2, lineHeight: 1 }}>
          {fxRateUpdated ? "● live" : "● fallback"} 1₩ = {currency.rate?.toFixed(6)} {currency.code}
        </div>
      )}
    </div>
  );
}
