/**
 * GENIE ROI — i18n Engine v2.1
 * ─────────────────────────────────────────────────────────
 * • No external dependencies — pure React Context + hooks
 * • IP-based country detection (ipapi.co, first visit only)
 * • Browser language auto-detection (navigator.language)
 * • Manual override persisted in localStorage
 * • Deep-merge fallback to English if key missing
 * • Supports: ko · en · ja · zh · de · th · vi · id · zh-TW
 * • Mobile-compatible: works on all mobile browsers
 */

import React, { useEffect, createContext, useCallback, useContext, useMemo, useState } from "react";
import ko from "./locales/ko.js";
import en from "./locales/en.js";
import ja from "./locales/ja.js";
import zh from "./locales/zh.js";
import de from "./locales/de.js";
import th from "./locales/th.js";
import vi from "./locales/vi.js";
import id from "./locales/id.js";
import zhTW from "./locales/zh-TW.js";

// ── Locale registry ────────────────────────────────────────
export const LOCALES = { ko, en, ja, zh, de, th, vi, id, "zh-TW": zhTW };

export const LANG_OPTIONS = [
    { code: "ko",    label: "한국어",            flag: "🇰🇷", name: "Korean" },
    { code: "en",    label: "English",          flag: "🇺🇸", name: "English" },
    { code: "ja",    label: "日本語",            flag: "🇯🇵", name: "Japanese" },
    { code: "zh",    label: "简体中文",           flag: "🇨🇳", name: "Chinese (Simplified)" },
    { code: "zh-TW", label: "繁體中文",           flag: "🇹🇼", name: "Chinese (Traditional)" },
    { code: "de",    label: "Deutsch",          flag: "🇩🇪", name: "German" },
    { code: "th",    label: "ภาษาไทย",          flag: "🇹🇭", name: "Thai" },
    { code: "vi",    label: "Tiếng Việt",       flag: "🇻🇳", name: "Vietnamese" },
    { code: "id",    label: "Bahasa Indonesia", flag: "🇮🇩", name: "Indonesian" },
];

// ── 국가 ISO 2-char code → 언어 코드 매핑 ──────────────────
export const COUNTRY_LANG_MAP = {
    // English
    US: "en", GB: "en", AU: "en", CA: "en", NZ: "en", SG: "en",
    PH: "en", IN: "en", NG: "en", ZA: "en", MY: "en", IE: "en",
    // Japanese
    JP: "ja",
    // Chinese
    CN: "zh", HK: "zh-TW", TW: "zh-TW", MO: "zh-TW",
    // Korean
    KR: "ko",
    // German
    DE: "de", AT: "de", CH: "de", LU: "de",
    // Thai
    TH: "th",
    // Vietnamese
    VN: "vi",
    // Indonesian
    ID: "id", BN: "id",
    // Numeric fallback (기존 호환)
    840: "en", 826: "en", 36: "en", 124: "en",
    392: "ja", 156: "zh", 158: "zh-TW", 344: "zh-TW",
    410: "ko", 276: "de", 764: "th", 704: "vi", 360: "id",
};

const LS_KEY     = "genie_roi_lang";
const LS_GEO_KEY = "genie_roi_geo_done"; // IP 감지 완료 플래그

// ── Step 1: navigator.language 기반 즉시 감지 (동기) ──────
function detectLang() {
    const saved = localStorage.getItem(LS_KEY);
    if (saved && LOCALES[saved]) return saved;

    const navLangs = navigator.languages || [navigator.language || "en"];
    for (const raw of navLangs) {
        const full = raw.toLowerCase().replace("_", "-");
        if (LOCALES[full]) return full;
        const code = full.slice(0, 2);
        if (LOCALES[code]) return code;
    }
    return "ko"; // 최종 fallback
}

// ── Step 2: IP 기반 국가 감지 (비동기, 첫 방문자만) ────────
async function detectGeoLang() {
    // 사용자가 이미 언어를 선택했거나 IP 감지 완료된 경우 스킵
    if (localStorage.getItem(LS_KEY))     return null;
    if (localStorage.getItem(LS_GEO_KEY)) return null;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000); // 4초 타임아웃
        const res = await fetch("https://ipapi.co/json/", {
            signal: controller.signal,
            cache: "no-store",
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        const data = await res.json();
        const lang = COUNTRY_LANG_MAP[data.country_code];
        if (lang && LOCALES[lang]) {
            localStorage.setItem(LS_GEO_KEY, "1"); // 재감지 방지
            return lang;
        }
    } catch (_) {
        // 타임아웃/오류 → navigator.language fallback 유지
    }
    return null;
}

// ── Deep-get helper ────────────────────────────────────────
function deepGet(obj, path) {
    return path.split(".").reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
        obj
    );
}

// ── Context ────────────────────────────────────────────────
const I18nContext = createContext(null);

// ── Provider ───────────────────────────────────────────────
export function I18nProvider({ children }) {
    const [lang, setLangState] = useState(detectLang);

    // 사용자가 직접 언어를 선택할 때 (상단 언어 선택바)
    const setLang = useCallback((code) => {
        if (!LOCALES[code]) return;
        localStorage.setItem(LS_KEY, code);   // 영구 저장 → 다음 방문에도 유지
        localStorage.removeItem(LS_GEO_KEY);  // 다음 방문에도 사용자 선택 우선
        setLangState(code);
        document.documentElement.lang = code;
        document.documentElement.dir = LOCALES[code].dir || "ltr";
    }, []);

    useEffect(() => {
        // 초기 html lang/dir 설정
        document.documentElement.lang = lang;
        document.documentElement.dir = LOCALES[lang]?.dir || "ltr";

        // IP 기반 감지 시도 (첫 방문자 & 사용자 미선택)
        detectGeoLang().then((geoLang) => {
            if (geoLang && geoLang !== lang) {
                setLangState(geoLang);
                document.documentElement.lang = geoLang;
                document.documentElement.dir = LOCALES[geoLang]?.dir || "ltr";
            }
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const t = useCallback((key, fallbackOrVars = {}, varsObj = {}) => {
        let actualVars = fallbackOrVars;
        let inlineFallback = null;
        if (typeof fallbackOrVars === "string") {
            inlineFallback = fallbackOrVars;
            actualVars = varsObj;
        }

        const locale  = LOCALES[lang] || en;
        const fallback = LOCALES["en"] || {};
        
        let value = deepGet(locale, key) ?? deepGet(fallback, key) ?? inlineFallback ?? key;
        
        if (typeof value === "string" && actualVars && typeof actualVars === "object") {
            Object.entries(actualVars).forEach(([k, v]) => {
                value = value.replaceAll("{{" + k + "}}", String(v));
            });
        }
        return value;
    }, [lang]);

    const ctx = useMemo(
        () => ({ lang, setLang, t, locales: LANG_OPTIONS }),
        [lang, setLang, t]
    );

    return React.createElement(I18nContext.Provider, { value: ctx }, children);
}

// ── Hooks ──────────────────────────────────────────────────
export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
    return ctx;
}

export function useT() {
    return useI18n().t;
}
