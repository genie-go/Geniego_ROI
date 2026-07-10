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
// [272차 P0 Stage B] 15개국 로케일(총 13MB raw / 4MB gzip)을 정적 import → 동적 import(로더맵)로 전환.
//   기존엔 15개 전부 첫 페인트에 로드(필요분 1/15)돼 초기 페이로드가 과대했다. 이제 활성 언어 + en(폴백)만
//   첫 페인트에 로드하고, 나머지 13개는 첫 렌더 후 유휴시간(requestIdleCallback)에 백그라운드 프리로드해
//   실시간 언어전환 즉시성을 유지한다. 로케일은 React 미import 순수 데이터라 171차 init-order race 무관.
const LOCALE_LOADERS = {
    ko: () => import("./locales/ko.js"),
    en: () => import("./locales/en.js"),
    ja: () => import("./locales/ja.js"),
    zh: () => import("./locales/zh.js"),
    de: () => import("./locales/de.js"),
    th: () => import("./locales/th.js"),
    vi: () => import("./locales/vi.js"),
    id: () => import("./locales/id.js"),
    "zh-TW": () => import("./locales/zh-TW.js"),
    es: () => import("./locales/es.js"),
    fr: () => import("./locales/fr.js"),
    pt: () => import("./locales/pt.js"),
    ru: () => import("./locales/ru.js"),
    ar: () => import("./locales/ar.js"),
    hi: () => import("./locales/hi.js"),
};
// 런타임 로케일 캐시(로드 완료분만 채워짐). LOCALES 는 이 캐시를 가리킨다(외부 소비자 호환).
const _localeCache = {};
const _localeListeners = new Set();
function loadLocale(code) {
    if (!LOCALE_LOADERS[code] || _localeCache[code]) return Promise.resolve();
    return LOCALE_LOADERS[code]()
        .then((m) => { _localeCache[code] = (m && m.default) ? m.default : m; _localeListeners.forEach((fn) => { try { fn(code); } catch (_) {} }); })
        .catch(() => { /* 개별 로케일 로드 실패 = en/폴백으로 계속 동작(치명 아님) */ });
}
// [270차] 자동 번역 오버레이 — tools/i18n_autofill.mjs 가 ko(SSOT)에만 있는 키를 Claude로 13~14개국
//   현지 번역해 채운다(flat dotted-key). base 로케일 미존재 키의 gap 을 현지어로 메운다(영어폴백 대체).
//   신규 UI 는 ko 에만 추가하면 배포 시 자동으로 15개국 현지어가 된다. 1MB base 파일은 미접촉(안전).
// [272차 P0 Stage A] autofill.json(4.17MB)은 entry 청크의 ~68%를 차지하는데 순수 '폴백 오버레이'(base
//   로케일에 키가 없을 때만 조회)라 첫 페인트에 즉시 필요하지 않다. 정적 import → 동적 import 로 전환해
//   entry 청크에서 분리(첫 페인트 페이로드 대폭 감소). 로드 전엔 base/en/인라인폴백으로 흐르고, 로드 완료
//   시 리스너로 Provider 를 1회 재렌더해 오버레이 키를 채운다(무결성 유지·번역 값 후퇴 없음).
let AUTOFILL = { en: {} };
let _autofillLoaded = false;
const _autofillListeners = new Set();
import("./autofill.json")
    .then((m) => { AUTOFILL = (m && m.default) ? m.default : (m || { en: {} }); _autofillLoaded = true; _autofillListeners.forEach((fn) => { try { fn(); } catch (_) {} }); })
    .catch(() => { /* 폴백 오버레이 미로드 = base/en 폴백으로 계속 동작(치명 아님) */ });

// ── Locale registry ────────────────────────────────────────
// [272차 P0 Stage B] 런타임 캐시(로드된 로케일만 존재). Provider 가 활성언어+en 을 렌더 전에 보장.
export const LOCALES = _localeCache;

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
//   [현 차수] export — 공개 랜딩(public/Landing.jsx)이 동일 초기 언어감지를 쓰도록(영어 하드코딩 제거).
export function detectLang() {
    const saved = localStorage.getItem(LS_KEY);
    // [272차 P0 Stage B] 지원여부 검사는 정적 LOCALE_LOADERS 키로(LOCALES 는 런타임 캐시=부팅시 빈 객체라
    //   여기서 검사하면 항상 미매칭→ko 폴백 버그). 값 읽기(t)만 LOCALES 캐시 사용.
    if (saved && LOCALE_LOADERS[saved]) return saved;

    const navLangs = navigator.languages || [navigator.language || "en"];
    for (const raw of navLangs) {
        const full = raw.toLowerCase().replace("_", "-");
        if (LOCALE_LOADERS[full]) return full;
        const code = full.slice(0, 2);
        if (LOCALE_LOADERS[code]) return code;
    }
    return "ko"; // 최종 fallback
}

// ── Step 2: IP 기반 국가 감지 (비동기, 첫 방문자만) ────────
//   [현 차수] 견고화: 기존 ipapi.co 단일 의존(광고차단기·서비스장애·요청한도 취약)을 제거하고
//     ① 동일 출처 백엔드(/api/v424/geo/lang) — 광고차단 불가 + 서버측 다중 제공자 페일오버 + 캐시
//     ② 외부 ipapi.co (동일출처가 국가를 못 얻은 예외 환경의 2차 시도)
//     ③ 서버가 파싱한 Accept-Language (최후 약한 폴백)
//   순으로 폴백한다. 어느 단계든 성공하면 LS_GEO_KEY 로 재감지를 방지한다.
async function detectGeoLang() {
    // 사용자가 이미 언어를 선택했거나 IP 감지 완료된 경우 스킵
    if (localStorage.getItem(LS_KEY))     return null;
    if (localStorage.getItem(LS_GEO_KEY)) return null;

    let acceptFallback = null;

    // ① 동일 출처 백엔드 (IP → 국가코드)
    try {
        const base = import.meta.env.VITE_API_BASE || "";
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${base}/api/v424/geo/lang`, { signal: controller.signal, cache: "no-store" });
        clearTimeout(timer);
        if (res.ok) {
            const data = await res.json();
            const byCountry = data && data.country ? COUNTRY_LANG_MAP[data.country] : null;
            if (byCountry && LOCALE_LOADERS[byCountry]) {
                localStorage.setItem(LS_GEO_KEY, "1");
                // [272차 P2] 감지 언어 영속 — LS_KEY 미저장 시, navigator 가 미지원 언어인 사용자는
                //   재방문마다 detectLang() 이 ko 로 폴백(LS_GEO_KEY 로 geo 재감지도 스킵)돼 영구 한국어 회귀.
                try { localStorage.setItem(LS_KEY, byCountry); } catch (_) {}
                return byCountry;
            }
            if (data && data.accept_lang && LOCALE_LOADERS[data.accept_lang]) acceptFallback = data.accept_lang;
        }
    } catch (_) { /* 동일출처 실패 → 외부 폴백 */ }

    // ② 외부 ipapi.co (2차 시도)
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000); // 4초 타임아웃
        const res = await fetch("https://ipapi.co/json/", { signal: controller.signal, cache: "no-store" });
        clearTimeout(timer);
        if (res.ok) {
            const data = await res.json();
            const lang = COUNTRY_LANG_MAP[data.country_code];
            if (lang && LOCALE_LOADERS[lang]) {
                localStorage.setItem(LS_GEO_KEY, "1"); // 재감지 방지
                try { localStorage.setItem(LS_KEY, lang); } catch (_) {} // [272차 P2] 감지 언어 영속(재방문 ko 회귀 방지)
                return lang;
            }
        }
    } catch (_) {
        // 타임아웃/오류 → 아래 Accept-Language 폴백
    }

    // ③ 서버가 파싱한 Accept-Language (최후 약한 폴백)
    if (acceptFallback) {
        localStorage.setItem(LS_GEO_KEY, "1");
        try { localStorage.setItem(LS_KEY, acceptFallback); } catch (_) {} // [272차 P2] 감지 언어 영속
        return acceptFallback;
    }
    return null;
}

// [271차] 한글 유니코드 블록(가-힣). 비한국어 로케일 값에 이 문자가 있으면 미번역 누출로 판단.
const HANGUL_RE = /[가-힣]/;

// [271차] RTL 언어 집합 + 문서 방향 적용 헬퍼. 아랍어(ar)는 레이아웃까지 RTL(사이드바 우측·본문 우측정렬).
//   dir=rtl 이면 flex-row 레이아웃(사이드바+본문)이 자동 반전되고, styles.css .lang-rtl 보정으로 테두리/여백 정리.
const RTL_LANGS = new Set(["ar"]);
function applyDir(code) {
    try {
        const rtl = RTL_LANGS.has(code);
        document.documentElement.lang = code;
        document.documentElement.dir = rtl ? "rtl" : "ltr";
        document.body.classList.toggle("lang-rtl", rtl);
    } catch (_) { /* SSR/노드 등 document 부재 */ }
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
    // [272차 P0 Stage A] autofill(동적 import) 로드 완료 시 1회 재렌더 → 폴백 오버레이 키 반영.
    // [277차] ★재렌더 전파 결함 수정 — bump 는 Provider 만 재렌더시켰고 t(useCallback[lang])·ctx(useMemo[lang,..])
    //   가 불변이라 Context 소비자는 bail out 했다(오버레이가 첫 렌더보다 늦게 도착하면 en base 값이 그대로 굳음).
    //   tick 을 t 의 의존성에 실어 ctx 참조를 갱신 → 소비자까지 재렌더가 전파된다.
    const [i18nTick, bumpTick] = useState(0);
    // 로케일 도착 리스너는 deps:[] 로 1회만 등록되므로 lang 을 클로저로 잡으면 stale 이 된다(언어 전환 후
    // 새 로케일이 도착해도 발화 조건 불일치). ref 로 최신 언어를 참조한다.
    const langRef = React.useRef(lang);
    langRef.current = lang;
    useEffect(() => {
        if (_autofillLoaded) return;               // 이미 로드됨(빠른 캐시) → 훅 불요
        const fn = () => bumpTick((x) => x + 1);
        _autofillListeners.add(fn);
        return () => { _autofillListeners.delete(fn); };
    }, []);

    // [272차 P0 Stage B] 로케일 렌더 게이트 — 활성 언어 + en(폴백)이 로드되기 전엔 자식을 렌더하지 않는다
    //   (raw 키/한글폴백 flash 방지). 로드 실패도 loadLocale 이 resolve 하므로 splash 무한대기 없음.
    const [localesReady, setLocalesReady] = useState(() => !!(_localeCache[detectLang()] && _localeCache.en));
    useEffect(() => {
        // [277차] 로케일 도착 시 재렌더 유도. 구 구현 setLangState((c)=>c) 는 동일 값이라 React 가 bail out 해
        //   실제로 재렌더되지 않았다. tick 으로 교체하되, idle 프리로드(13개)까지 전 앱을 재렌더하지 않도록
        //   렌더에 실제 쓰이는 로케일(활성 언어 · en 폴백) 도착 시에만 발화한다.
        const fn = (code) => { if (code === langRef.current || code === "en") bumpTick((x) => x + 1); };
        _localeListeners.add(fn);
        let alive = true;
        Promise.all([loadLocale("en"), loadLocale(lang)]).then(() => { if (alive) setLocalesReady(true); });
        // 안전장치: 네트워크 지연 시 5초 후 강제 진입(폴백으로라도 렌더).
        const guard = setTimeout(() => { if (alive) setLocalesReady(true); }, 5000);
        return () => { alive = false; clearTimeout(guard); _localeListeners.delete(fn); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    // 언어 변경 시 해당 로케일 로드(전환 즉시성 — 유휴 프리로드가 대부분 선로드).
    useEffect(() => { loadLocale(lang); }, [lang]);
    // 첫 렌더 후 유휴시간에 나머지 로케일 프리로드 → 실시간 언어전환 즉시성 유지(총 바이트는 동일, 임계경로서만 제거).
    useEffect(() => {
        if (!localesReady) return;
        const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
        const cancel = window.cancelIdleCallback || clearTimeout;
        const h = idle(() => { Object.keys(LOCALE_LOADERS).forEach((c) => loadLocale(c)); });
        return () => { try { cancel(h); } catch (_) {} };
    }, [localesReady]);

    // 사용자가 직접 언어를 선택할 때 (상단 언어 선택바)
    const setLang = useCallback((code) => {
        if (!LOCALE_LOADERS[code]) return;
        localStorage.setItem(LS_KEY, code);   // 영구 저장 → 다음 방문에도 유지
        localStorage.removeItem(LS_GEO_KEY);  // 다음 방문에도 사용자 선택 우선
        // 언어 변경 시 수동 화폐 선택 플래그 해제 → 화폐 자동 전환 허용
        try { localStorage.removeItem("genie_currency_manual"); } catch {}
        // [271차] 언어 선택 즉시 실시간 전면 현지화(새로고침 없음):
        //   ① t() 콘텐츠는 아래 setLangState 로 즉시 재렌더.
        //   ② module-level 로드시점 현지화 데이터(메뉴 라벨/서브탭·연동허브 채널·데모 템플릿)는
        //      아래 dispatch 되는 'genie-lang-change' 이벤트를 utils/reactiveLocalize 레지스트리가 수신해
        //      스냅샷 원본에서 새 언어로 재치환 → 재렌더 시 반영.
        setLangState(code);
        applyDir(code); // [271차] 아랍어=RTL 레이아웃, 그 외=LTR
        // 🔗 CurrencyContext 연동: 언어→화폐 자동 전환 이벤트 발행
        window.dispatchEvent(new CustomEvent('genie-lang-change', { detail: { lang: code } }));
    }, []);

    useEffect(() => {
        // 초기 html lang/dir 설정 — 아랍어면 RTL
        applyDir(lang);
        // 🔗 초기 로드 시에도 CurrencyContext에 현재 언어 알림
        window.dispatchEvent(new CustomEvent('genie-lang-change', { detail: { lang } }));

        // IP 기반 감지 시도 (첫 방문자 & 사용자 미선택)
        detectGeoLang().then((geoLang) => {
            if (geoLang && geoLang !== lang) {
                setLangState(geoLang);
                applyDir(geoLang);
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

        const locale  = LOCALES[lang] || LOCALES["en"] || {};
        const fallback = LOCALES["en"] || {};

        // [271차] ★한글누출 자가치유 — 비한국어 언어에서 base/오버레이 값에 한글(가-힣)이 섞이면
        //   미번역 누출로 간주하고 gap 처리(다음 폴백으로 흘려보냄). 로더단 방어라 어떤 base 로케일에
        //   한글이 남아 있어도 현지어 오버레이→영어로 자동 대체된다(한글 절대 렌더 안 함).
        //   한자/가나는 한글 유니코드 블록과 겹치지 않으므로 zh/ja 에도 안전. inlineFallback 은
        //   미치지 않게 두어(raw 키 노출 방지) 오버레이 미채움 키만 한글폴백 유지.
        const clean = (v) => (lang !== "ko" && typeof v === "string" && HANGUL_RE.test(v)) ? undefined : v;

        // Primary lookup: base 로케일 → [270차] 자동번역 오버레이(현지어) → en base → en 오버레이
        let value = clean(deepGet(locale, key))
            ?? clean(AUTOFILL[lang] && AUTOFILL[lang][key])
            ?? clean(deepGet(fallback, key))
            ?? (AUTOFILL["en"] && AUTOFILL["en"][key]);
        // Fallback: try "pages." prefix (keys were restructured under pages namespace)
        if (value === undefined && !key.startsWith("pages.")) {
            value = clean(deepGet(locale, "pages." + key))
                ?? clean(AUTOFILL[lang] && AUTOFILL[lang]["pages." + key])
                ?? clean(deepGet(fallback, "pages." + key));
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
        // [277차] i18nTick — 오버레이/로케일 도착 시 t 참조를 갱신해 ctx→소비자까지 재렌더를 전파.
    }, [lang, i18nTick]);

    const ctx = useMemo(
        () => ({ lang, setLang, t, locales: LANG_OPTIONS }),
        [lang, setLang, t]
    );

    // [272차 P0 Stage B] 활성 로케일 준비 전에는 자식 렌더 보류(미번역 flash 방지). entry 축소로 이 대기는
    //   대부분 수십~수백 ms(로케일 1~2개만 로드). 최소 브랜드 스플래시(테마무관 중립) 표시.
    if (!localesReady) {
        return React.createElement("div", {
            style: {
                position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: "#0b1220",
            },
        }, React.createElement("div", {
            style: {
                width: 34, height: 34, border: "3px solid rgba(255,255,255,0.18)", borderTopColor: "#4f8ef7",
                borderRadius: "50%", animation: "genie-i18n-spin 0.8s linear infinite",
            },
        }), React.createElement("style", null, "@keyframes genie-i18n-spin{to{transform:rotate(360deg)}}"));
    }

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
