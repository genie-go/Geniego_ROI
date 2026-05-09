import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { themes, defaultTheme } from './tokens.js';

const THEME_KEY = "geniego_theme";

// ── 6가지 프리미엄 테마 정의 (i18n nameKey/descKey 포함) ──────────────────────
export const THEMES = [
    {
        key: "deep_space",
        name: "Deep Space",
        nameKey: "topbar.themeDeepSpace",
        desc: "Deep Space Nebula · Default Theme",
        descKey: "topbar.themeDeepSpaceDesc",
        icon: "🌌",
        preview: ["var(--bg)", "#4f8ef7", "#a855f7"],
        vars: themes.deep_space,
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
        nameKey: "topbar.themeAurora",
        desc: "Arctic Aurora · Green & Purple",
        descKey: "topbar.themeAuroraDesc",
        icon: "🌠",
        preview: ["#04100f", "#14d9b0", "#a855f7"],
        vars: themes.aurora,
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
        nameKey: "topbar.themeMidnightGold",
        desc: "Gold Premium · Luxury Dark",
        descKey: "topbar.themeMidnightGoldDesc",
        icon: "👑",
        preview: ["#0c0900", "#eab308", "#f97316"],
        vars: themes.midnight_gold,
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
        nameKey: "topbar.themeOceanDepth",
        desc: "Deep Blue · Cyber Tranquil",
        descKey: "topbar.themeOceanDepthDesc",
        icon: "🌊",
        preview: ["#000d1a", "#0ea5e9", "#14d9b0"],
        vars: themes.ocean_depth,
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
        nameKey: "topbar.themeArcticWhite",
        desc: "Soft White · Hybrid Light",
        descKey: "topbar.themeArcticWhiteDesc",
        icon: "☀️",
        preview: ["#f5f7fb", "#4f8ef7", "#6366f1"],
        vars: themes.arctic_white,
        bodyBefore: `
      radial-gradient(ellipse 1400px 900px at 10% -10%, rgba(79,142,247,0.05) 0%, transparent 60%),
      radial-gradient(ellipse 900px 800px at 90% 5%, rgba(168,85,247,0.04) 0%, transparent 55%),
      radial-gradient(ellipse 700px 600px at 50% 95%, rgba(20,217,176,0.03) 0%, transparent 55%)
    `,
    },
    {
        key: "pearl_office",
        name: "Pearl Office",
        nameKey: "topbar.themePearlOffice",
        desc: "Neutral Gray · Office Light",
        descKey: "topbar.themePearlOfficeDesc",
        icon: "🏢",
        preview: ["#f4f5f7", "#374151", "#6366f1"],
        vars: themes.pearl_office,
        bodyBefore: `
      radial-gradient(ellipse 1600px 700px at 5% 0%, rgba(99,102,241,0.05) 0%, transparent 60%),
      radial-gradient(ellipse 900px 900px at 95% 20%, rgba(168,85,247,0.04) 0%, transparent 50%)
    `,
    },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [themeKey, setThemeKey] = useState(
        () => localStorage.getItem(THEME_KEY) || defaultTheme
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
