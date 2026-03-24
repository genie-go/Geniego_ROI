/**
 * CurrencyContext — Global currency selection & real-time conversion
 * Usage: const { currency, setCurrency, fmt, convert, fxRateUpdated } = useCurrency();
 *
 * - Real-time rates fetched from open APIs (no API key required), KRW-based
 * - Cached in localStorage for 1 hour
 * - Falls back to hardcoded rates if network unavailable
 * - Works for ALL users: Demo / Free Coupon / Paid
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";

// ── Fallback hardcoded rates (KRW base, ~2026-03) ────────────
const FALLBACK_RATES = {
    KRW: 1,
    USD: 1 / 1380,
    JPY: 9.35,
    EUR: 1 / 1490,
    CNY: 1 / 190,
    SGD: 1 / 1020,
};

// ── Currency definitions (rate will be updated dynamically) ──
export const CURRENCIES = [
    { code: "KRW", symbol: "₩", label: "Korean Won (KRW)",       flag: "🇰🇷" },
    { code: "USD", symbol: "$", label: "US Dollar (USD)",         flag: "🇺🇸" },
    { code: "JPY", symbol: "¥", label: "Japanese Yen (JPY)",      flag: "🇯🇵" },
    { code: "EUR", symbol: "€", label: "Euro (EUR)",              flag: "🇪🇺" },
    { code: "CNY", symbol: "¥", label: "Chinese Yuan (CNY)",      flag: "🇨🇳" },
    { code: "SGD", symbol: "S$", label: "Singapore Dollar (SGD)", flag: "🇸🇬" },
];

// ── Real-time rate fetch (KRW base) ──────────────────────────
async function fetchLiveRates() {
    // Source 1: exchangerate-api.com (free, no key)
    try {
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/KRW", {
            signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
            const d = await res.json();
            if (d?.rates?.USD) {
                return {
                    KRW: 1,
                    USD: d.rates.USD,
                    JPY: d.rates.JPY,
                    EUR: d.rates.EUR,
                    CNY: d.rates.CNY,
                    SGD: d.rates.SGD,
                };
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
                return {
                    KRW: 1,
                    USD: r.usd,
                    JPY: r.jpy,
                    EUR: r.eur,
                    CNY: r.cny,
                    SGD: r.sgd,
                };
            }
        }
    } catch { /* fallback */ }

    return null;
}

// ── localStorage cache (1hr TTL) ─────────────────────────────
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

// ── Module-level fmt singleton (safe to use anywhere, no hook needed) ──
// Updated by Provider on every render. Falls back to KRW format.
let _globalFmt = (krwAmount, opts = {}) => {
    const val = Number(krwAmount);
    if (opts.compact) {
        if (Math.abs(val) >= 1e8) return `₩${(val / 1e8).toFixed(1)}B`;
        if (Math.abs(val) >= 1e4) return `₩${(val / 1e4).toFixed(0)}M`;
        return `₩${Math.round(val).toLocaleString()}`;
    }
    return `₩${Math.round(val).toLocaleString()}`;
};

/**
 * globalFmt(krwAmount, opts?) — works outside React components.
 * Uses the last-known currency selected by the user.
 * Prefer useCurrency().fmt inside React components.
 */
export function globalFmt(krwAmount, opts = {}) {
    return _globalFmt(krwAmount, opts);
}

// ─────────────────────────────────────────────────────────────
const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
    const savedCode = typeof localStorage !== "undefined"
        ? localStorage.getItem("genie_currency") || "KRW"
        : "KRW";

    const [currencyCode, setCurrencyCode] = useState(savedCode);

    // Dynamic exchange rates (start with fallback, update from API)
    const [rates, setRates] = useState(() => loadCached() || FALLBACK_RATES);
    const [fxRateUpdated, setFxRateUpdated] = useState(false);

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

    const setCurrency = useCallback((code) => {
        setCurrencyCode(code);
        if (typeof localStorage !== "undefined") {
            localStorage.setItem("genie_currency", code);
        }
    }, []);

    // Build currency object with live rate
    const currency = useMemo(() => {
        const def = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
        return { ...def, rate: rates[currencyCode] ?? 1 };
    }, [currencyCode, rates]);

    /** convert(krwAmount) → number in selected currency */
    const convert = useCallback(
        (krwAmount) => Number(krwAmount) * currency.rate,
        [currency]
    );

    /**
     * fmt(krwAmount, options?)
     * options.compact  → abbreviate (억/만 or B/M/K)
     * options.digits   → override decimal places
     */
    const fmt = useCallback(
        (krwAmount, options = {}) => {
            const val = Number(krwAmount) * currency.rate;
            const sym = currency.symbol;

            if (options.compact) {
                if (currency.code === "KRW") {
                    if (Math.abs(val) >= 1e8) return `${sym}${(val / 1e8).toFixed(1)}B`;
                    if (Math.abs(val) >= 1e4) return `${sym}${(val / 1e4).toFixed(0)}M`;
                    return `${sym}${Math.round(val).toLocaleString()}`;
                }
                if (Math.abs(val) >= 1e9) return `${sym}${(val / 1e9).toFixed(2)}B`;
                if (Math.abs(val) >= 1e6) return `${sym}${(val / 1e6).toFixed(2)}M`;
                if (Math.abs(val) >= 1e3) return `${sym}${(val / 1e3).toFixed(1)}K`;
                return `${sym}${val.toFixed(2)}`;
            }

            const decimals = options.digits ?? (["KRW", "JPY"].includes(currency.code) ? 0 : 2);
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
        convert,
        fmt,
    };

    // Keep global singleton in sync with current currency
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

/**
 * CurrencySelector — Dropdown UI (used in Topbar)
 */
export function CurrencySelector({ compact = false }) {
    const { currency, setCurrency, currencies, rates, fxRateUpdated } = useCurrency();
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    const isCompact = compact || isMobile;

    return (
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", flexDirection: "column" }}>
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <select
                    value={currency.code}
                    onChange={e => {
                        setCurrency(e.target.value);
                        // Mark as manually selected so language-switch won't auto-override
                        try { localStorage.setItem("genie_currency_manual", "1"); } catch { /* ignore */ }
                    }}
                    title={`Select Currency${fxRateUpdated ? " (live rate)" : " (fallback rate)"}`}
                    className="currency-selector"
                    style={{
                        appearance: "none",
                        background: "rgba(79,142,247,0.08)",
                        border: "1px solid rgba(79,142,247,0.25)",
                        borderRadius: 10,
                        color: "#e8eaf0",
                        cursor: "pointer",
                        fontSize: isCompact ? 10 : 13,
                        fontWeight: 700,
                        padding: isCompact ? "4px 22px 4px 6px" : "7px 32px 7px 12px",
                        outline: "none",
                        maxWidth: isCompact ? 72 : 140,
                    }}
                >
                    {currencies.map(c => (
                        <option key={c.code} value={c.code} style={{ background: "#0d1829" }}>
                            {c.flag} {isCompact ? c.code : c.label}
                        </option>
                    ))}
                </select>
                <span style={{
                    position: "absolute", right: isCompact ? 5 : 10,
                    pointerEvents: "none", fontSize: 9, color: "rgba(255,255,255,0.45)",
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
