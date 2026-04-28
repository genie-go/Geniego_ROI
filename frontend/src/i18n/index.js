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
import es from "./locales/es.js";
import fr from "./locales/fr.js";
import pt from "./locales/pt.js";
import ru from "./locales/ru.js";
import ar from "./locales/ar.js";
import hi from "./locales/hi.js";

// ── Locale registry ────────────────────────────────────────
export const LOCALES = { ko, en, ja, zh, de, th, vi, id, "zh-TW": zhTW, es, fr, pt, ru, ar, hi };

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
    { code: "es",    label: "Español",          flag: "🇪🇸", name: "Spanish" },
    { code: "fr",    label: "Français",         flag: "🇫🇷", name: "French" },
    { code: "pt",    label: "Português",        flag: "🇧🇷", name: "Portuguese" },
    { code: "ru",    label: "Русский",           flag: "🇷🇺", name: "Russian" },
    { code: "ar",    label: "العربية",            flag: "🇸🇦", name: "Arabic", dir: "rtl" },
    { code: "hi",    label: "हिन्दी",              flag: "🇮🇳", name: "Hindi" },
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
    // Spanish
    ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es", GT: "es", CU: "es",
    BO: "es", DO: "es", HN: "es", PY: "es", SV: "es", NI: "es", CR: "es", PA: "es", UY: "es",
    // French
    FR: "fr", BE: "fr", MC: "fr", SN: "fr", CI: "fr", ML: "fr", BF: "fr", NE: "fr",
    TG: "fr", BJ: "fr", MG: "fr", CM: "fr", CD: "fr", CG: "fr", GA: "fr", HT: "fr",
    // Portuguese
    BR: "pt", PT: "pt", AO: "pt", MZ: "pt",
    // Russian
    RU: "ru", BY: "ru", KZ: "ru", UA: "ru",
    // Arabic
    SA: "ar", AE: "ar", EG: "ar", MA: "ar", IQ: "ar", JO: "ar", KW: "ar", QA: "ar", BH: "ar", OM: "ar", LB: "ar", LY: "ar", TN: "ar", DZ: "ar",
    // Hindi
    // (India already maps to "en" — override for Hindi if needed)
    // Numeric fallback (기존 호환)
    840: "en", 826: "en", 36: "en", 124: "en",
    392: "ja", 156: "zh", 158: "zh-TW", 344: "zh-TW",
    410: "ko", 276: "de", 764: "th", 704: "vi", 360: "id",
    724: "es", 484: "es", 32: "es", 250: "fr",
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
        // 언어 변경 시 수동 화폐 선택 플래그 해제 → 화폐 자동 전환 허용
        try { localStorage.removeItem("genie_currency_manual"); } catch {}
        setLangState(code);
        document.documentElement.lang = code;
        // 🚨 레이아웃은 항상 LTR 유지 (사이드바 좌측 고정)
        document.documentElement.dir = "ltr";
        if (LOCALES[code]?.dir === "rtl") {
            document.body.classList.add("lang-rtl");
        } else {
            document.body.classList.remove("lang-rtl");
        }
        // 🔗 CurrencyContext 연동: 언어→화폐 자동 전환 이벤트 발행
        window.dispatchEvent(new CustomEvent('genie-lang-change', { detail: { lang: code } }));
    }, []);

    useEffect(() => {
        // 초기 html lang 설정 — dir은 항상 LTR (레이아웃 보존)
        document.documentElement.lang = lang;
        document.documentElement.dir = "ltr";
        if (LOCALES[lang]?.dir === "rtl") {
            document.body.classList.add("lang-rtl");
        } else {
            document.body.classList.remove("lang-rtl");
        }
        // 🔗 초기 로드 시에도 CurrencyContext에 현재 언어 알림
        window.dispatchEvent(new CustomEvent('genie-lang-change', { detail: { lang } }));

        // IP 기반 감지 시도 (첫 방문자 & 사용자 미선택)
        detectGeoLang().then((geoLang) => {
            if (geoLang && geoLang !== lang) {
                setLangState(geoLang);
                document.documentElement.lang = geoLang;
                document.documentElement.dir = "ltr";
                if (LOCALES[geoLang]?.dir === "rtl") {
                    document.body.classList.add("lang-rtl");
                } else {
                    document.body.classList.remove("lang-rtl");
                }
                // 🔗 IP 감지된 언어도 CurrencyContext에 알림
                window.dispatchEvent(new CustomEvent('genie-lang-change', { detail: { lang: geoLang } }));
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
        
        // Primary lookup: root-level key
        let value = deepGet(locale, key) ?? deepGet(fallback, key);
        // Fallback: try "pages." prefix (keys were restructured under pages namespace)
        if (value === undefined && !key.startsWith("pages.")) {
            value = deepGet(locale, "pages." + key) ?? deepGet(fallback, "pages." + key);
        }
        // SAFETY: never return objects to React — React error #31 prevention
        if (typeof value === "object" && value !== null) {
            value = undefined;
        }
        value = value ?? inlineFallback ?? key;
        
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
