import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n, LANG_OPTIONS } from "../i18n/index.js";
import { useTheme, THEMES } from "../theme/ThemeContext.jsx";
import GlobalSearch, { useGlobalSearch } from "../components/GlobalSearch.jsx";
import HelpPanel from "../components/HelpPanel.jsx";
import { useNotification, NOTIF_TYPES } from "../context/NotificationContext.jsx";
import { CurrencySelector, useCurrency } from "../contexts/CurrencyContext.jsx";
import { useMobileSidebar } from "../context/MobileSidebarContext.jsx";

/* ── 모바일 감지 훅 ────────────────────── */
function useIsMobile() {
  const [is, setIs] = React.useState(() => window.innerWidth <= 768);
  React.useEffect(() => {
    const h = () => setIs(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return is;
}

// ── Page path → i18n key mapping ──────────────────────────
const PATH_TO_KEY = {
  "/dashboard": "dashboard",
  "/marketing": "marketing",
  "/influencer": "influencer",
  "/attribution": "attribution",
  "/graph-score": "graphScore",
  "/commerce": "commerce",
  "/amazon-risk": "amazonRisk",
  "/digital-shelf": "digitalShelf",
  "/reviews-ugc": "reviewsUgc",
  "/kr-channel": "krChannel",
  "/price-opt": "priceOpt",
  "/reconciliation": "reconciliation",
  "/settlements": "settlements",
  "/reports": "reports",
  "/alert-policies": "alertPolicies",
  "/ai-policy": "aiPolicy",
  "/action-presets": "actionPresets",
  "/approvals": "approvals",
  "/writeback": "writeback",
  "/mapping-registry": "mappingRegistry",
  "/connectors": "connectors",
  "/audit": "audit",
  "/admin": "admin",
  "/help": "help",
};

// ── Real-time clock ────────────────────────────────────────
function Clock() {
  const [t, setT] = useState(new Date());
  const { lang } = useI18n();
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const locale = lang === "ko" ? "ko-KR" : lang === "ja" ? "ja-JP" : lang === "zh" ? "zh-CN" : "en-US";
  return (
    <span className="topbar-clock" style={{ fontSize: 11, color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
      {t.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

const LIGHT_THEMES = new Set(["arctic_white", "pearl_office"]);
const DEFAULT_DARK = "deep_space";
const DEFAULT_LIGHT = "arctic_white";

// ── Day / Night One-Click Toggle ───────────────────────────
function DayNightToggle() {
  const { themeKey, setTheme } = useTheme();
  const { t } = useI18n();
  const isLight = LIGHT_THEMES.has(themeKey);

  const toggle = () => {
    if (isLight) {
      // Switch to last-used dark (or default dark)
      const lastDark = localStorage.getItem("geniego_last_dark") || DEFAULT_DARK;
      setTheme(lastDark);
    } else {
      // Remember current dark theme, then switch to last-used light
      localStorage.setItem("geniego_last_dark", themeKey);
      const lastLight = localStorage.getItem("geniego_last_light") || DEFAULT_LIGHT;
      setTheme(lastLight);
    }
    if (isLight) {
      localStorage.removeItem("geniego_last_light");
    } else {
      localStorage.setItem("geniego_last_light", LIGHT_THEMES.has(themeKey) ? themeKey : DEFAULT_LIGHT);
    }
  };

  return (
    <button
      onClick={toggle}
      title={isLight ? t('topbar.darkModeToggle') : t('topbar.lightModeToggle')}
      style={{
        width: 34, height: 34,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isLight
          ? "rgba(251,191,36,0.12)"
          : "rgba(79,142,247,0.08)",
        border: `1px solid ${isLight ? "rgba(251,191,36,0.4)" : "rgba(99,140,255,0.25)"}`,
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        fontSize: 17,
        transition: "all 200ms ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <span style={{
        display: "inline-block",
        transition: "transform 300ms ease, opacity 300ms ease",
        transform: "scale(1)",
      }}>
        {isLight ? "🌙" : "☀️"}
      </span>
    </button>
  );
}

// ── Theme Switcher ─────────────────────────────────────────
function ThemeSwitcher() {
  const { t } = useI18n();
  const { themeKey, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = THEMES.find(th => th.key === themeKey) ?? THEMES[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={t('topbar.themeChangeTitle')}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: open ? "rgba(99,140,255,0.15)" : "rgba(99,140,255,0.06)",
          border: "1px solid " + (open ? "rgba(99,140,255,0.4)" : "var(--border)"),
          borderRadius: "var(--radius-sm)",
          color: "var(--text-1)", fontSize: 12, fontWeight: 600,
          padding: "5px 8px", cursor: "pointer",
          transition: "all 160ms ease",
        }}
      >
        <span style={{ fontSize: 15 }}>{current.icon}</span>
        <span className="topbar-theme-label" style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current.name}
        </span>
        <span className="topbar-theme-label" style={{ fontSize: 9, color: "var(--text-3)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "var(--surface, rgba(10,16,30,0.98))", backdropFilter: "blur(24px)",
          border: "1px solid var(--border2)",
          borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          zIndex: 600, width: 280, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 14px 8px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>🎨</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 12, color: "var(--text-1)" }}>{t("topbar.themeLabel")}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)" }}>Background Theme</div>
            </div>
          </div>

          {/* Theme list */}
          <div style={{ padding: "8px 8px" }}>
            {THEMES.map(th => {
              const isActive = th.key === themeKey;
              return (
                <button
                  key={th.key}
                  onClick={() => { setTheme(th.key); setOpen(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 10px", borderRadius: 10,
                    background: isActive
                      ? "linear-gradient(135deg, rgba(99,140,255,0.15), rgba(168,85,247,0.08))"
                      : "transparent",
                    border: isActive ? "1px solid rgba(99,140,255,0.3)" : "1px solid transparent",
                    cursor: "pointer", textAlign: "left",
                    transition: "all 140ms ease",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Icon thumbnail */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: `radial-gradient(circle at 30% 30%, ${th.preview[1]}, ${th.preview[0]})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, position: "relative", overflow: "hidden",
                    border: `1px solid ${th.preview[1]}44`,
                    boxShadow: isActive ? `0 0 12px ${th.preview[1]}55` : "none",
                  }}>
                    <div style={{
                      position: "absolute", inset: 0,
                      background: `radial-gradient(circle at 70% 70%, ${th.preview[2]}66, transparent 60%)`,
                    }} />
                    <span style={{ position: "relative", zIndex: 1 }}>{th.icon}</span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700, fontSize: 12,
                      color: isActive ? "var(--text-1)" : "var(--text-1)",
                    }}>{th.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{th.desc}</div>
                    {/* Color swatches */}
                    <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                      {th.preview.map((c, i) => (
                        <div key={i} style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: c, border: "1px solid rgba(255,255,255,0.2)",
                        }} />
                      ))}
                    </div>
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: "linear-gradient(135deg,#4f8ef7,#a855f7)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, color: "#fff", flexShrink: 0,
                    }}>✓</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: "8px 14px 10px",
            borderTop: "1px solid var(--border)",
            fontSize: 10, color: "var(--text-3)", lineHeight: 1.5,
          }}>
            💾 {t("topbar.themeSave")}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Language → Default Currency mapping ───────────────────────
const LANG_DEFAULT_CURRENCY = {
  ko: "KRW",
  ja: "JPY",
  zh: "CNY",
  "zh-TW": "CNY",
  de: "EUR",
  th: "THB",   // Thai Baht (fallback to KRW if not in list)
  vi: "KRW",   // Vietnamese Dong — use KRW as proxy
  id: "KRW",   // Indonesian Rupiah — use KRW as proxy
  en: "USD",
};

// ── Language Switcher ──────────────────────────────────────
function LangSwitcher() {
  const { lang, setLang, t } = useI18n();
  const { setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const handleLangChange = (code) => {
    setLang(code);
    setOpen(false);
    // Auto-switch currency to that country's default,
    // UNLESS user has manually selected a currency
    const manualPick = localStorage.getItem("genie_currency_manual") === "1";
    if (!manualPick) {
      const defaultCurr = LANG_DEFAULT_CURRENCY[code] || "KRW";
      setCurrency(defaultCurr);
    }
  };

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANG_OPTIONS.find(l => l.code === lang) || LANG_OPTIONS[0];


  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: open ? "rgba(79,142,247,0.15)" : "rgba(79,142,247,0.06)",
          border: "1px solid " + (open ? "rgba(79,142,247,0.4)" : "var(--border)"),
          borderRadius: "var(--radius-sm)",
          color: "var(--text-1)", fontSize: 12, fontWeight: 600,
          padding: "5px 10px", cursor: "pointer",
          transition: "all 160ms ease",
        }}
        title="Switch Language"
      >
        <span style={{ fontSize: 15 }}>{current.flag}</span>
        <span>{current.label}</span>
        <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 2 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "var(--surface, rgba(13,21,37,0.98))",
          border: "1px solid var(--border2)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          zIndex: 500,
          minWidth: 160,
          backdropFilter: "blur(20px)",
        }}>
          <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid var(--border)", fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            {t('topbar.langSelect')}
          </div>

          {LANG_OPTIONS.map(opt => {
            const isActive = opt.code === lang;
            return (
              <button
                key={opt.code}
                onClick={() => handleLangChange(opt.code)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "9px 12px",
                  background: isActive ? "rgba(79,142,247,0.12)" : "transparent",
                  border: "none",
                  borderLeft: isActive ? "2px solid var(--blue)" : "2px solid transparent",
                  color: isActive ? "var(--blue)" : "var(--text-2)",
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: "pointer", textAlign: "left",
                  transition: "all 120ms ease",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 18 }}>{opt.flag}</span>
                <div>
                  <div>{opt.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{opt.name}</div>
                </div>
                {isActive && <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--blue)" }}>✓</span>}
              </button>
            );
          })}

          <div style={{ padding: "6px 12px 8px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text-3)" }}>
            {t('topbar.detectedLang', { lang: navigator.language })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notification Bell ─────────────────────────────────────────────────
function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, removeNotification } = useNotification();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (notif) => {
    markRead(notif.id);
    if (notif.link) navigate(notif.link);
    setOpen(false);
  };

  const timeAgo = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return t('topbar.secAgo', { n: diff });
    if (diff < 3600) return t('topbar.minAgo', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('topbar.hrAgo', { n: Math.floor(diff / 3600) });
    return t('topbar.dayAgo', { n: Math.floor(diff / 86400) });
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        id="notification-bell-btn"
        onClick={() => setOpen(o => !o)}
        title={t('topbar.notifCenter')}
        style={{
          width: 34, height: 34, display: "flex", alignItems: "center",
          justifyContent: "center", position: "relative",
          background: open ? "rgba(239,68,68,0.12)" : "rgba(79,142,247,0.07)",
          border: `1px solid ${open ? "rgba(239,68,68,0.4)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 17,
          transition: "all 200ms ease",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
        onMouseLeave={e => e.currentTarget.style.background = open ? "rgba(239,68,68,0.12)" : "rgba(79,142,247,0.07)"}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            minWidth: 16, height: 16, borderRadius: 99,
            background: "linear-gradient(135deg,#ef4444,#f97316)",
            color: "#fff", fontSize: 9, fontWeight: 900,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid var(--surface-1, #070f1a)",
            padding: "0 3px",
            animation: "pulse 2s infinite",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 380, maxHeight: 520,
          background: "var(--surface, rgba(10,16,30,0.98))",
          border: "1px solid var(--border2)",
          borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          zIndex: 700, display: "flex", flexDirection: "column",
          overflow: "hidden", backdropFilter: "blur(24px)",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px 10px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text-1)" }}>{t('topbar.notifCenter')}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                  {unreadCount > 0 ? t('topbar.unreadCount', { n: unreadCount }) : t('topbar.allRead')}
                </div>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontSize: 10, padding: "4px 10px", borderRadius: 99,
                  background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.3)",
                  color: "#4f8ef7", cursor: "pointer", fontWeight: 700,
                }}
              >{t('topbar.markAllRead')}</button>
            )}
          </div>

          {/* Notification List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-3)", fontSize: 13 }}>
                {t('topbar.noNotif')}
              </div>
            ) : notifications.map(notif => {
              const cfg = NOTIF_TYPES[notif.type] || NOTIF_TYPES.system;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  style={{
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    background: notif.read ? "transparent" : "rgba(79,142,247,0.05)",
                    border: `1px solid ${notif.read ? "transparent" : "rgba(79,142,247,0.1)"}`,
                    marginBottom: 4, transition: "all 150ms",
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = notif.read ? "transparent" : "rgba(79,142,247,0.05)"}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: `${cfg.color}18`, border: `1px solid ${cfg.color}33`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                  }}>{cfg.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                      <div style={{
                        fontWeight: notif.read ? 500 : 700, fontSize: 12,
                        color: "var(--text-1)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220,
                      }}>{notif.title}</div>
                      <div style={{ fontSize: 9, color: "var(--text-3)", flexShrink: 0, marginLeft: 6 }}>{timeAgo(notif.time)}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{notif.body}</div>
                    <div style={{
                      marginTop: 4, display: "inline-block", fontSize: 9, fontWeight: 700,
                      padding: "1px 6px", borderRadius: 99,
                      background: `${cfg.color}18`, border: `1px solid ${cfg.color}33`, color: cfg.color,
                    }}>{cfg.label}</div>
                  </div>
                  {!notif.read && (
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4f8ef7", flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: "8px 16px 10px",
            borderTop: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <button
              onClick={() => { navigate("/feedback"); setOpen(false); }}
              style={{
                fontSize: 11, padding: "5px 12px", borderRadius: 8,
                background: "linear-gradient(135deg,#4f8ef7,#a855f7)",
                border: "none", color: "#fff", fontWeight: 700, cursor: "pointer",
              }}
            >{t('topbar.sendFeedback')}</button>
            <button
              onClick={() => { if (window.confirm(t('topbar.confirmClear'))) { markAllRead(); } }}
              style={{
                fontSize: 10, padding: "4px 10px", borderRadius: 8,
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text-3)", cursor: "pointer",
              }}
            >{t('topbar.clearAll')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 모바일 전용: 더 보기 메뉴 ────────────────────────────────
function MobileMoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { lang, setLang, t } = useI18n();
  const { themeKey, setTheme } = useTheme();
  const navigate = useNavigate();

  // 외부 클릭 시 Close
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, []);

  const current = LANG_OPTIONS.find(l => l.code === lang) || LANG_OPTIONS[0];
  const currentTheme = THEMES.find(t => t.key === themeKey) || THEMES[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* 더 보기 버튼 */}
      <button
        onClick={() => setOpen(o => !o)}
        title={t('topbar.moreMenu')}
        style={{
          width: 34, height: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'rgba(99,140,255,0.18)' : 'rgba(79,142,247,0.07)',
          border: `1px solid ${open ? 'rgba(99,140,255,0.4)' : 'rgba(99,140,255,0.2)'}`,
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          fontSize: 16,
          color: 'var(--text-1)',
          transition: 'all 200ms',
          flexShrink: 0,
        }}
      >⋯</button>

      {/* 드롭다운 패널 */}
      {open && (
        <div style={{
          position: 'fixed',
          top: 56,
          right: 8,
          left: 8,
          background: 'rgba(10,16,30,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(99,140,255,0.2)',
          borderRadius: 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          zIndex: 10000,
          padding: '12px 0',
          animation: 'moreMenuDown 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}>

          {/* ─ 언어 선택 ─ */}
          <div style={{ padding: '6px 14px 4px', fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            {t('topbar.langSelect')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 12px 10px' }}>
            {LANG_OPTIONS.map(opt => (
              <button
                key={opt.code}
                onClick={() => { setLang(opt.code); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 10,
                  background: lang === opt.code ? 'rgba(79,142,247,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${lang === opt.code ? 'rgba(79,142,247,0.4)' : 'transparent'}`,
                  color: lang === opt.code ? '#4f8ef7' : 'var(--text-2)',
                  fontSize: 12, fontWeight: lang === opt.code ? 700 : 500,
                  cursor: 'pointer', transition: 'all 150ms',
                  minHeight: 36,
                }}
              >
                <span style={{ fontSize: 16 }}>{opt.flag}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* 구분선 */}
          <div style={{ height: 1, background: 'rgba(99,140,255,0.1)', margin: '2px 0' }} />

          {/* ─ 테마 선택 ─ */}
          <div style={{ padding: '8px 14px 4px', fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            {t('topbar.themeSelect')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 12px 10px' }}>
            {THEMES.map(th => (
              <button
                key={th.key}
                onClick={() => { setTheme(th.key); setOpen(false); }}
                title={th.name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', borderRadius: 10,
                  background: themeKey === th.key ? 'rgba(99,140,255,0.16)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${themeKey === th.key ? 'rgba(99,140,255,0.35)' : 'transparent'}`,
                  color: themeKey === th.key ? 'var(--text-1)' : 'var(--text-3)',
                  fontSize: 11, fontWeight: themeKey === th.key ? 700 : 400,
                  cursor: 'pointer', transition: 'all 150ms',
                  minHeight: 36,
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: `radial-gradient(circle, ${th.preview[1]}, ${th.preview[0]})`,
                  display: 'inline-block',
                }} />
                <span>{th.icon}</span>
              </button>
            ))}
          </div>

          {/* 구분선 */}
          <div style={{ height: 1, background: 'rgba(99,140,255,0.1)', margin: '2px 0' }} />

          {/* ─ 단축 액션 ─ */}
          <div style={{ display: 'flex', gap: 6, padding: '8px 12px' }}>
            <button
              onClick={() => { navigate('/help'); setOpen(false); }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, minHeight: 40,
                background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
                color: 'var(--text-2)', fontSize: 12, cursor: 'pointer', fontWeight: 600,
              }}
            >{t('topbar.helpBtn')}</button>
            <CurrencySelector compact={true} />
          </div>

          {/* Close */}
          <div style={{ padding: '4px 12px 4px' }}>
            <button
              onClick={() => setOpen(false)}
              style={{
                width: '100%', padding: '10px', borderRadius: 10, minHeight: 40,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-3)', fontSize: 12, cursor: 'pointer',
              }}
            >{t('topbar.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Topbar ─────────────────────────────────────────────────
export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch();
  const [helpOpen, setHelpOpen] = useState(false);
  const { toggle: toggleSidebar, open: sidebarOpen } = useMobileSidebar();

  const pageKey = PATH_TO_KEY[pathname];
  const title = pageKey && pageKey !== "help" ? t(`pages.${pageKey}.title`) : (pathname === "/help" ? t("topbar.helpPage") : "Geniego-ROI");
  const sub = pageKey && pageKey !== "help" ? t(`pages.${pageKey}.sub`) : "";

  const iconBtn = (onClick, title, children, color = "rgba(79,142,247,0.06)") => ({
    onClick,
    title,
    style: {
      display: "flex", alignItems: "center", gap: 5,
      background: color,
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)",
      color: "var(--text-1)", fontSize: 12, fontWeight: 700,
      padding: "5px 10px", cursor: "pointer",
      transition: "all 160ms ease",
      whiteSpace: "nowrap",
    },
    onMouseEnter: e => e.currentTarget.style.background = "rgba(79,142,247,0.14)",
    onMouseLeave: e => e.currentTarget.style.background = color,
  });

  return (
    <> 

      <div
       className="topbar"
       style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: "64px",
        background: "var(--topbar-bg)",
        borderBottom: "1px solid var(--topbar-border)",
        color: "var(--topbar-text)",
        transition: "all 0.3s ease",
       }}
     >
        {/* ── 모바일: 로고 클릭 = 사이드바 토글 / PC: 로고 이미지 표시 ── */}
        <button
          className="topbar-hamburger"
          onClick={toggleSidebar}
          title={t('topbar.menuToggle')}
          aria-label={t('topbar.sidebarToggle')}
          style={{
            display: 'none',
            alignItems: 'center', justifyContent: 'center',
            width: 42, height: 42, flexShrink: 0,
            background: 'transparent', border: 'none',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            padding: 0, transition: 'all 200ms ease',
          }}
        >
          <div style={{
            width: 46, height: 46, borderRadius: 11, overflow: 'hidden',
            background: 'rgba(255,255,255,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: sidebarOpen ? '0 0 0 2px rgba(79,142,247,0.6)' : '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'all 200ms ease',
          }}>
            <img
              src="/logo_v3.png"
              alt="Geniego-ROI"
              style={{
                width: 44, height: 44, objectFit: 'contain',
                transform: sidebarOpen ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 200ms ease',
              }}
            />
          </div>
        </button>

        <div>
          <div className="topbar-title">{title}</div>
        </div>

        {/* ── PC 전용 우측 컨트롤 ── */}
        <div className="topbar-right topbar-right-desktop">
          <Clock />
          <div className="badge badge-green">
            <span className="dot dot-green" />
            {t("live")}
          </div>
          {/* 🔍 통합조회 */}
          <button
            onClick={() => setSearchOpen(true)}
            title={t("topbar.searchTooltip")}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "rgba(79,142,247,0.06)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-1)", fontSize: 12, fontWeight: 700,
              padding: "5px 10px", cursor: "pointer",
              transition: "all 160ms ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(79,142,247,0.14)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(79,142,247,0.06)"}
          >
            <span style={{ fontSize: 14 }}>🔍</span>
            <span className="topbar-btn-text">{t("topbar.unifiedSearch")}</span>
            <kbd className="topbar-btn-kbd" style={{
              fontSize: 9, padding: "1px 5px", borderRadius: 4,
              background: "rgba(99,140,255,0.12)",
              border: "1px solid rgba(99,140,255,0.25)",
              color: "var(--text-3)", lineHeight: 1,
            }}>^K</kbd>
          </button>
          {/* 📚 Help */}
          <button
            onClick={() => navigate("/help")}
            title={t("topbar.helpTooltip")}
            style={{
              width: 34, height: 34,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(168,85,247,0.06)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-1)", fontSize: 16, cursor: "pointer",
              transition: "all 160ms ease",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(168,85,247,0.15)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(168,85,247,0.06)"}
          >📚</button>
          <NotificationBell />
          <DayNightToggle />
          <ThemeSwitcher />
          <CurrencySelector compact={true} />
          <LangSwitcher />
        </div>

        {/* ── 모바일 전용 우측 컨트롤 ── */}
        <div className="topbar-right topbar-right-mobile">
          {/* 🔍 Search (아이콘만) */}
          <button
            onClick={() => setSearchOpen(true)}
            title={t("topbar.searchTooltip")}
            style={{
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(79,142,247,0.07)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontSize: 16,
              flexShrink: 0,
              transition: 'all 160ms',
            }}
          >🔍</button>
          {/* 🔔 Notification */}
          <NotificationBell />
          {/* 🌙/☀️ 다크/라이트 토글 */}
          <DayNightToggle />
          {/* ⋯ 더 보기 */}
          <MobileMoreMenu />
        </div>
      </div>

      {/* 통합조회 모달 */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Help 패널 */}
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
