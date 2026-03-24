import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const THEME_KEY = "geniego_theme";

// ── 5가지 프리미엄 테마 정의 ──────────────────────────────────────────────────
export const THEMES = [
    {
        key: "deep_space",
        name: "Deep Space",
        desc: "Deep Space Nebula · Default Theme",
        icon: "🌌",
        preview: ["#060b14", "#4f8ef7", "#a855f7"],
        vars: {
            "--bg": "#060b14",
            "--surface": "#0d1525",
            "--surface2": "#111e33",
            "--border": "rgba(99,140,255,0.12)",
            "--border2": "rgba(99,140,255,0.20)",
            "--text-1": "#e8f0ff",
            "--text-2": "#8da4c4",
            "--text-3": "#4e6080",
            "--accent": "#4f8ef7",
            "--bg-card": "rgba(13,21,37,0.85)",

              "--topbar-bg": "#0d1525",
              "--topbar-border": "rgba(99,140,255,0.12)",
              "--topbar-text": "#e8f0ff",
            },
        bodyBefore: `
      radial-gradient(ellipse 1400px 900px at 5% -10%, rgba(79,142,247,0.13) 0%, transparent 60%),
      radial-gradient(ellipse 1000px 800px at 90% 5%, rgba(168,85,247,0.12) 0%, transparent 55%),
      radial-gradient(ellipse 800px 600px at 50% 95%, rgba(20,217,176,0.08) 0%, transparent 55%),
      radial-gradient(ellipse 500px 400px at 80% 60%, rgba(249,115,22,0.05) 0%, transparent 50%)
    `,
    },
    {
        key: "aurora",
        name: "Aurora Borealis",
        desc: "Arctic Aurora · Green & Purple",
        icon: "🌠",
        preview: ["#04100f", "#14d9b0", "#a855f7"],
        vars: {
            "--bg": "#03100d",
            "--surface": "#071a15",
            "--surface2": "#0b2420",
            "--border": "rgba(20,217,176,0.12)",
            "--border2": "rgba(20,217,176,0.22)",
            "--text-1": "#d6fff8",
            "--text-2": "#6fb8aa",
            "--text-3": "#3a7a6a",
            "--accent": "#14d9b0",
            "--bg-card": "rgba(7,26,21,0.88)",

            "--topbar-bg": "#0d1525",
            "--topbar-border": "rgba(99,140,255,0.12)",
            "--topbar-text": "#e8f0ff",
          },
        bodyBefore: `
      radial-gradient(ellipse 1600px 700px at -5% 15%, rgba(20,217,176,0.16) 0%, transparent 55%),
      radial-gradient(ellipse 900px 1000px at 95% -10%, rgba(168,85,247,0.14) 0%, transparent 50%),
      radial-gradient(ellipse 1000px 600px at 40% 90%, rgba(20,217,176,0.10) 0%, transparent 50%),
      radial-gradient(ellipse 700px 500px at 70% 40%, rgba(79,142,247,0.06) 0%, transparent 45%)
    `,
    },
    {
        key: "midnight_gold",
        name: "Midnight Gold",
        desc: "Gold Premium · Luxury Dark",
        icon: "👑",
        preview: ["#0c0900", "#eab308", "#f97316"],
        vars: {
            "--bg": "#0c0900",
            "--surface": "#14100a",
            "--surface2": "#1d1708",
            "--border": "rgba(234,179,8,0.12)",
            "--border2": "rgba(234,179,8,0.22)",
            "--text-1": "#fff8e0",
            "--text-2": "#b8a060",
            "--text-3": "#6b5c30",
            "--accent": "#eab308",
            "--bg-card": "rgba(20,16,10,0.90)",
            "--topbar-bg": "#0d1525",
            "--topbar-border": "rgba(99,140,255,0.12)",
            "--topbar-text": "#e8f0ff",
          },
        bodyBefore: `
      radial-gradient(ellipse 1400px 800px at 0% -5%, rgba(234,179,8,0.12) 0%, transparent 55%),
      radial-gradient(ellipse 900px 900px at 95% 10%, rgba(249,115,22,0.10) 0%, transparent 50%),
      radial-gradient(ellipse 700px 600px at 50% 100%, rgba(234,179,8,0.09) 0%, transparent 50%),
      radial-gradient(ellipse 500px 400px at 20% 70%, rgba(249,115,22,0.06) 0%, transparent 45%)
    `,
    },
    {
        key: "ocean_depth",
        name: "Ocean Depth",
        desc: "심해 블루 · 사이버 트랜퀼",
        icon: "🌊",
        preview: ["#000d1a", "#0ea5e9", "#14d9b0"],
        vars: {
            "--bg": "#000d1a",
            "--surface": "#041729",
            "--surface2": "#072038",
            "--border": "rgba(14,165,233,0.12)",
            "--border2": "rgba(14,165,233,0.22)",
            "--text-1": "#d0eeff",
            "--text-2": "#5b99c0",
            "--text-3": "#2e5c7a",
            "--accent": "#0ea5e9",
            "--bg-card": "rgba(4,23,41,0.90)",
            "--topbar-bg": "#0d1525",
            "--topbar-border": "rgba(99,140,255,0.12)",
            "--topbar-text": "#e8f0ff",
           },
        bodyBefore: `
      radial-gradient(ellipse 1600px 900px at 10% -5%, rgba(14,165,233,0.15) 0%, transparent 55%),
      radial-gradient(ellipse 800px 1000px at 90% 20%, rgba(20,217,176,0.10) 0%, transparent 50%),
      radial-gradient(ellipse 1000px 600px at 30% 100%, rgba(14,165,233,0.12) 0%, transparent 52%),
      radial-gradient(ellipse 600px 500px at 80% 65%, rgba(79,142,247,0.07) 0%, transparent 45%)
    `,
    },
    {
        key: "arctic_white",
        name: "Arctic White",
        desc: "클린 화이트 · 밝고 깔끔한 라이트",
        icon: "☀️",
        preview: ["#f0f4ff", "#4f8ef7", "#a855f7"],
        vars: {
            "--bg": "#eef2fb",
            "--surface": "#f8faff",
            "--surface2": "#ffffff",
            "--border": "rgba(79,142,247,0.15)",
            "--border2": "rgba(79,142,247,0.25)",
            "--text-1": "#0f1c3a",
            "--text-2": "#3d5075",
            "--text-3": "#8096b8",
            "--accent": "#4f8ef7",
            "--bg-card": "rgba(255,255,255,0.92)",
            "--card": "rgba(255,255,255,0.92)",
            "--topbar-bg": "#0d1525",
            "--topbar-border": "rgba(99,140,255,0.12)",
            "--topbar-text": "#e8f0ff",
          },
        bodyBefore: `
      radial-gradient(ellipse 1400px 900px at 10% -10%, rgba(79,142,247,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 900px 800px at 90% 5%, rgba(168,85,247,0.06) 0%, transparent 55%),
      radial-gradient(ellipse 700px 600px at 50% 95%, rgba(20,217,176,0.04) 0%, transparent 55%)
    `,
    },
    {
        key: "pearl_office",
        name: "Pearl Office",
        desc: "뉴트럴 그레이 · 오피스 라이트",
        icon: "🏢",
        preview: ["#f4f5f7", "#374151", "#6366f1"],
        vars: {
            "--bg": "#f1f3f8",
            "--surface": "#f8f9fc",
            "--surface2": "#ffffff",
            "--border": "rgba(55,65,81,0.10)",
            "--border2": "rgba(55,65,81,0.18)",
            "--text-1": "#111827",
            "--text-2": "#374151",
            "--text-3": "#9ca3af",
            "--accent": "#6366f1",
            "--bg-card": "rgba(255,255,255,0.95)",
            "--card": "rgba(255,255,255,0.95)",
            "--topbar-bg": "#0d1525",
            "--topbar-border": "rgba(99,140,255,0.12)",
            "--topbar-text": "#e8f0ff",
          },
        bodyBefore: `
      radial-gradient(ellipse 1600px 700px at 5% 0%, rgba(99,102,241,0.05) 0%, transparent 60%),
      radial-gradient(ellipse 900px 900px at 95% 20%, rgba(168,85,247,0.04) 0%, transparent 50%)
    `,
    },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [themeKey, setThemeKey] = useState(
        () => localStorage.getItem(THEME_KEY) || "deep_space"
    );

    const theme = THEMES.find(t => t.key === themeKey) ?? THEMES[0];

    // Apply CSS variables to :root and body::before background
    const applyTheme = useCallback((t) => {
        const root = document.documentElement;
        // Apply CSS vars
        Object.entries(t.vars).forEach(([k, v]) => root.style.setProperty(k, v));
        // Apply body background
        document.body.style.background = t.vars["--bg"];
        // Apply ::before via data attribute
        document.documentElement.setAttribute("data-theme", t.key);
    }, []);

    useEffect(() => {
        applyTheme(theme);
    }, [theme, applyTheme]);

    const setTheme = useCallback((key) => {
        setThemeKey(key);
        localStorage.setItem(THEME_KEY, key);
    }, []);

    return (
        <ThemeContext.Provider value={{ themeKey, theme, themes: THEMES, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
    return ctx;
}
