// ─────────────────────────────────────────────────────────────────────
//  Geniego-ROI  |  Enterprise Topbar (초고도화 v2)
//  글로벌 검색 · 알림 · 테마 전환 · 통화 · 환경 배지 · 시계
// ─────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useI18n } from "../i18n/index.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useCurrency } from "../contexts/CurrencyContext.jsx";
import { useMobileSidebar } from "../context/MobileSidebarContext.jsx";

/* 데모 모드 감지 */
const IS_DEMO = typeof window !== 'undefined'
  ? (window.location.hostname.includes('roidemo') || window.location.hostname.includes('demo') || import.meta.env.VITE_DEMO_MODE === 'true')
  : false;

/* 테마 목록 */
const THEMES = [
  { id: 'arctic_white',  label: '☀️ Arctic White', color: '#f8fafc', light: true },
  { id: 'deep_space',    label: 'Deep Space',      color: '#4f8ef7' },
  { id: 'aurora',        label: 'Aurora',           color: '#14d9b0' },
  { id: 'midnight_gold', label: 'Midnight Gold',    color: '#eab308' },
  { id: 'ocean_depth',   label: 'Ocean Depth',      color: '#0ea5e9' },
  { id: 'crimson_nexus', label: 'Crimson Nexus',    color: '#ec4899' },
];

/* 다국어 옵션 (i18n LANG_OPTIONS 미러) */
const LANG_OPTIONS_TOPBAR = [
  { code: 'ko',    label: '한국어',            flag: '🇰🇷' },
  { code: 'en',    label: 'English',          flag: '🇺🇸' },
  { code: 'ja',    label: '日本語',            flag: '🇯🇵' },
  { code: 'zh',    label: '简体中文',           flag: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文',           flag: '🇹🇼' },
  { code: 'de',    label: 'Deutsch',          flag: '🇩🇪' },
  { code: 'th',    label: 'ภาษาไทย',          flag: '🇹🇭' },
  { code: 'vi',    label: 'Tiếng Việt',       flag: '🇻🇳' },
  { code: 'id',    label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'es',    label: 'Español',          flag: '🇪🇸' },
  { code: 'fr',    label: 'Français',         flag: '🇫🇷' },
  { code: 'pt',    label: 'Português',        flag: '🇧🇷' },
  { code: 'ru',    label: 'Русский',           flag: '🇷🇺' },
  { code: 'ar',    label: 'العربية',            flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi',    label: 'हिन्दी',              flag: '🇮🇳' },
];

/* 페이지 타이틀 매핑 — titleKey를 통해 다국어 지원 */
const PAGE_TITLES = {
  '/dashboard': { icon: '⬡', titleKey: 'topbar.pg.dashboard', fallback: 'Dashboard' },
  '/marketing': { icon: '📣', titleKey: 'topbar.pg.adPerformance', fallback: 'Ad Performance' },
  '/auto-marketing': { icon: '💎', titleKey: 'topbar.pg.autoMarketing', fallback: 'Auto Marketing' },
  '/campaign-manager': { icon: '🎯', titleKey: 'topbar.pg.campaignManager', fallback: 'Campaign Manager' },
  '/journey-builder': { icon: '🗺️', titleKey: 'topbar.pg.journeyBuilder', fallback: 'Journey Builder' },
  '/budget-tracker': { icon: '💰', titleKey: 'topbar.pg.budgetTracker', fallback: 'Budget Tracker' },
  '/account-performance': { icon: '🏢', titleKey: 'topbar.pg.accountPerformance', fallback: 'Account Performance' },
  '/attribution': { icon: '🔗', titleKey: 'topbar.pg.attribution', fallback: 'Attribution' },
  '/channel-kpi': { icon: '📊', titleKey: 'topbar.pg.channelKpi', fallback: 'Channel KPI' },
  '/graph-score': { icon: '🕸️', titleKey: 'topbar.pg.graphScore', fallback: 'Graph Score' },
  '/crm': { icon: '👥', titleKey: 'topbar.pg.crm', fallback: 'CRM' },
  '/kakao-channel': { icon: '💬', titleKey: 'topbar.pg.kakaoChannel', fallback: 'Kakao Channel' },
  '/email-marketing': { icon: '✉️', titleKey: 'topbar.pg.emailMarketing', fallback: 'Email Marketing' },
  '/sms-marketing': { icon: '📱', titleKey: 'topbar.pg.smsMarketing', fallback: 'SMS Marketing' },
  '/influencer': { icon: '🤝', titleKey: 'topbar.pg.influencer', fallback: 'Influencer UGC' },
  '/content-calendar': { icon: '📅', titleKey: 'topbar.pg.contentCalendar', fallback: 'Content Calendar' },
  '/reviews-ugc': { icon: '⭐', titleKey: 'topbar.pg.reviewsUgc', fallback: 'Reviews & UGC' },
  '/web-popup': { icon: '🎯', titleKey: 'topbar.pg.webPopup', fallback: 'Web Popup' },
  '/omni-channel': { icon: '🌐', titleKey: 'topbar.pg.omniChannel', fallback: 'Omni Channel' },
  '/catalog-sync': { icon: '📂', titleKey: 'topbar.pg.catalogSync', fallback: 'Catalog Sync' },
  '/order-hub': { icon: '📦', titleKey: 'topbar.pg.orderHub', fallback: 'Order Hub' },
  '/wms-manager': { icon: '🏭', titleKey: 'topbar.pg.wmsManager', fallback: 'WMS Manager' },
  '/price-opt': { icon: '💡', titleKey: 'topbar.pg.priceOpt', fallback: 'Price Optimization' },
  '/supply-chain': { icon: '🔭', titleKey: 'topbar.pg.supplyChain', fallback: 'Supply Chain' },
  '/returns-portal': { icon: '🔄', titleKey: 'topbar.pg.returnsPortal', fallback: 'Returns Portal' },
  '/performance': { icon: '📊', titleKey: 'topbar.pg.performanceHub', fallback: 'Performance Hub' },
  '/report-builder': { icon: '📋', titleKey: 'topbar.pg.reportBuilder', fallback: 'Report Builder' },
  '/pnl': { icon: '🌊', titleKey: 'topbar.pg.pnl', fallback: 'P&L Analytics' },
  '/ai-insights': { icon: '🤖', titleKey: 'topbar.pg.aiInsights', fallback: 'AI Insights' },
  '/data-product': { icon: '🗂️', titleKey: 'topbar.pg.dataProduct', fallback: 'Data Product' },
  '/ai-rule-engine': { icon: '🧠', titleKey: 'topbar.pg.aiRuleEngine', fallback: 'AI Rule Engine' },
  '/approvals': { icon: '✅', titleKey: 'topbar.pg.approvals', fallback: 'Approvals' },
  '/writeback': { icon: '↩', titleKey: 'topbar.pg.writeback', fallback: 'Writeback' },
  '/onboarding': { icon: '🗺️', titleKey: 'topbar.pg.onboarding', fallback: 'Onboarding' },
  '/integration-hub': { icon: '🔗', titleKey: 'topbar.pg.integrationHub', fallback: 'Integration Hub' },
  '/data-schema': { icon: '📋', titleKey: 'topbar.pg.dataSchema', fallback: 'Data Schema' },
  '/data-trust': { icon: '🔬', titleKey: 'topbar.pg.dataTrust', fallback: 'Data Trust' },
  '/settlements': { icon: '📋', titleKey: 'topbar.pg.settlements', fallback: 'Settlements' },
  '/reconciliation': { icon: '💰', titleKey: 'topbar.pg.reconciliation', fallback: 'Reconciliation' },
  '/app-pricing': { icon: '💳', titleKey: 'topbar.pg.pricing', fallback: 'Pricing' },
  '/audit': { icon: '🧾', titleKey: 'topbar.pg.auditLog', fallback: 'Audit Log' },
  '/workspace': { icon: '👥', titleKey: 'topbar.pg.workspace', fallback: 'Team Workspace' },
  '/operations': { icon: '⚡', titleKey: 'topbar.pg.operations', fallback: 'Operations Hub' },
  '/help': { icon: '📚', titleKey: 'topbar.pg.help', fallback: 'Help Center' },
  '/feedback': { icon: '💬', titleKey: 'topbar.pg.feedback', fallback: 'Feedback' },
  '/developer-hub': { icon: '⚙️', titleKey: 'topbar.pg.developerHub', fallback: 'Developer Hub' },
  '/admin': { icon: '⚙', titleKey: 'topbar.pg.admin', fallback: 'Platform Admin' },
  '/db-admin': { icon: '🗄️', titleKey: 'topbar.pg.dbAdmin', fallback: 'DB Admin' },
  '/pg-config': { icon: '💳', titleKey: 'topbar.pg.pgConfig', fallback: 'PG Config' },
  '/rollup': { icon: '🗂️', titleKey: 'topbar.pg.rollup', fallback: 'Rollup Dashboard' },
  '/case-study': { icon: '🏆', titleKey: 'topbar.pg.caseStudy', fallback: 'Case Study' },
  '/demand-forecast': { icon: '📈', titleKey: 'topbar.pg.demandForecast', fallback: 'Demand Forecast' },
  '/supplier-portal': { icon: '🏭', titleKey: 'topbar.pg.supplierPortal', fallback: 'Supplier Portal' },
  '/my-coupons': { icon: '🎫', titleKey: 'topbar.pg.myCoupons', fallback: 'My Coupons' },
  '/license': { icon: '🔑', titleKey: 'topbar.pg.license', fallback: 'License Activation' },
};

/* 알림 드롭다운 */
function NotificationDropdown({ alerts, onDismiss, onMarkRead, onMarkAllRead, onClose, t }) {
  const unread = alerts.filter(a => !a.read);
  return (
    <div style={{
      position: 'absolute', top: '100%', right: 0, marginTop: 8,
      width: 360, maxHeight: 420, borderRadius: 14,
      background: 'rgba(13,21,37,0.97)', border: '1px solid rgba(99,140,255,0.2)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)',
      zIndex: 200, overflow: 'hidden',
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid rgba(99,140,255,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-1)' }}>
          🔔 {t('topbar.notifications', 'Notifications')} {unread.length > 0 && <span style={{ color: '#f59e0b', fontSize: 11 }}>({unread.length})</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unread.length > 0 && (
            <button onClick={onMarkAllRead} style={{
              background: 'none', border: 'none', color: '#4f8ef7', fontSize: 10,
              fontWeight: 700, cursor: 'pointer',
            }}>{t('topbar.markAllRead', 'Mark all read')}</button>
          )}
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 14, cursor: 'pointer',
          }}>✕</button>
        </div>
      </div>
      {/* 목록 */}
      <div style={{ overflowY: 'auto', maxHeight: 340 }}>
        {alerts.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
            {t('topbar.noNotifications', 'No notifications')}
          </div>
        ) : alerts.slice(0, 15).map(alert => (
          <div key={alert.id} style={{
            padding: '10px 16px', borderBottom: '1px solid rgba(99,140,255,0.06)',
            background: alert.read ? 'transparent' : 'rgba(79,142,247,0.04)',
            display: 'flex', gap: 10, alignItems: 'flex-start',
            cursor: 'pointer', transition: 'background 120ms',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = alert.read ? 'transparent' : 'rgba(79,142,247,0.04)'}
            onClick={() => onMarkRead(alert.id)}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5,
              background: alert.read ? 'transparent' : (
                alert.type === 'warn' ? '#f59e0b' : alert.type === 'success' ? '#22c55e' : '#4f8ef7'
              ),
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-1)', lineHeight: 1.5 }}>{alert.msg}</div>
              <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 3 }}>{alert.time}</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }} style={{
              background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 10,
              cursor: 'pointer', padding: 2, flexShrink: 0, opacity: 0.5,
            }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}


export default function Topbar() {
  const { t, lang, setLang } = useI18n();
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { alerts = [], dismissAlert, markAlertRead, markAllRead, unreadAlertCount = 0 } = useGlobalData();
  const { toggle: toggleMobileSidebar } = useMobileSidebar();

  const [now, setNow] = useState(new Date());
  const [showNotif, setShowNotif] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const notifRef = useRef(null);
  const themeRef = useRef(null);
  const langRef = useRef(null);

  // 시계 업데이트
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // 외부 클릭 감지
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (themeRef.current && !themeRef.current.contains(e.target)) setShowTheme(false);
      if (langRef.current && !langRef.current.contains(e.target)) setShowLang(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 현재 페이지 정보 (i18n 적용)
  const rawPageInfo = PAGE_TITLES[location.pathname] || { icon: '📄', titleKey: null, fallback: location.pathname.replace(/^\//, '').replace(/-/g, ' ') };
  const pageTitle = rawPageInfo.titleKey ? t(rawPageInfo.titleKey, rawPageInfo.fallback) : rawPageInfo.fallback;
  const pageInfo = { icon: rawPageInfo.icon, title: pageTitle };

  // 테마 변경
  const currentTheme = typeof document !== 'undefined'
    ? document.documentElement.getAttribute('data-theme') || 'deep_space'
    : 'deep_space';

  const setTheme = useCallback((themeId) => {
    document.documentElement.setAttribute('data-theme', themeId);
    try { localStorage.setItem('geniego_theme', themeId); } catch {}
    setShowTheme(false);
  }, []);

  // 초기 테마 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem('geniego_theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    } catch {}
  }, []);

  const activeTheme = THEMES.find(th => th.id === currentTheme) || THEMES[0];

  // Detect actual topbar background luminance at runtime using ref
  const topbarRef = useRef(null);
  const [isLightTopbar, setIsLightTopbar] = useState(activeTheme.light || false);
  useEffect(() => {
    const detect = () => {
      const tb = topbarRef.current;
      if (!tb) return;
      const bg = getComputedStyle(tb).backgroundColor;
      const m = bg.match(/[\d.]+/g);
      if (m && m.length >= 3) {
        const lum = 0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2];
        setIsLightTopbar(lum > 140);
      }
    };
    // Multiple detection passes to catch async CSS application
    requestAnimationFrame(detect);
    const t1 = setTimeout(detect, 200);
    const t2 = setTimeout(detect, 600);
    const t3 = setTimeout(detect, 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [currentTheme]);

  return (
    <div ref={topbarRef} className="topbar" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px', gap: 10,
      borderBottom: '1px solid var(--border)',
      /* background removed from inline — controlled by CSS .topbar rules */
      backdropFilter: 'blur(20px) saturate(1.4)',
      position: 'sticky', top: 0, zIndex: 90,
      minHeight: 52,
    }}>
      {/* 좌측: 햄버거 + 페이지 정보 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        {/* 모바일 햄버거 */}
        <button
          className="topbar-hamburger"
          onClick={toggleMobileSidebar}
          style={{
            display: 'none', background: 'none', border: 'none',
            color: isLightTopbar ? '#334155' : 'var(--text-1)', fontSize: 20, cursor: 'pointer', padding: '4px 6px',
            borderRadius: 8,
          }}
        >☰</button>

        {/* 현재 페이지 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 18 }}>{pageInfo.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div className="topbar-title" style={{
              fontSize: 14, fontWeight: 800, color: isLightTopbar ? '#1e293b' : 'var(--text-1)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{pageInfo.title}</div>
          </div>
        </div>

        {/* 환경 배지 */}
        {IS_DEMO && (
          <span style={{
            padding: '2px 10px', borderRadius: 99, fontSize: 9, fontWeight: 800,
            background: 'rgba(251,146,60,0.12)', color: '#fb923c',
            border: '1px solid rgba(251,146,60,0.3)',
            flexShrink: 0,
          }}>DEMO</span>
        )}
      </div>

      {/* 우측: 도구 모음 */}
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* 시계 */}
        <span className="topbar-clock" style={{
          fontSize: 10, color: isLightTopbar ? '#475569' : 'var(--text-3)', fontFamily: 'monospace',
          fontWeight: 600, letterSpacing: '0.5px',
        }}>
          {now.toLocaleTimeString(
            { ko:'ko-KR', en:'en-US', ja:'ja-JP', zh:'zh-CN', 'zh-TW':'zh-TW', de:'de-DE', th:'th-TH', vi:'vi-VN', id:'id-ID', es:'es-ES', fr:'fr-FR', pt:'pt-BR', ru:'ru-RU', ar:'ar-SA', hi:'hi-IN' }[lang] || 'en-US',
            { hour: '2-digit', minute: '2-digit', hour12: false }
          )}
        </span>

        {/* 🌐 다국어 선택 */}
        <div ref={langRef} style={{ position: 'relative' }}>
          <button
            className="topbar-lang-btn"
            onClick={() => { setShowLang(!showLang); setShowTheme(false); setShowNotif(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 10,
              border: isLightTopbar ? '1.5px solid rgba(79,142,247,0.4)' : '1px solid rgba(148,163,184,0.3)',
              background: showLang
                ? (isLightTopbar ? 'rgba(79,142,247,0.12)' : 'rgba(99,140,255,0.2)')
                : (isLightTopbar ? 'rgba(79,142,247,0.06)' : 'rgba(99,140,255,0.1)'),
              cursor: 'pointer', transition: 'all 150ms',
              color: isLightTopbar ? '#1e40af' : '#93c5fd',
              fontSize: 11, fontWeight: 800,
              height: 34,
            }}
            onMouseEnter={e => e.currentTarget.style.background = isLightTopbar ? 'rgba(79,142,247,0.15)' : 'rgba(99,140,255,0.2)'}
            onMouseLeave={e => { if (!showLang) e.currentTarget.style.background = isLightTopbar ? 'rgba(79,142,247,0.06)' : 'rgba(99,140,255,0.1)'; }}
            title={t('topbar.langSelect', 'Language')}
          >
            <span style={{ fontSize: 14 }}>
              {(LANG_OPTIONS_TOPBAR.find(l => l.code === lang) || {}).flag || '🌐'}
            </span>
            <span className="topbar-lang-label" style={{ maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(LANG_OPTIONS_TOPBAR.find(l => l.code === lang) || {}).label || lang.toUpperCase()}
            </span>
            <span style={{ fontSize: 8, opacity: 0.6 }}>▼</span>
          </button>

          {showLang && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              width: 220, maxHeight: 420, borderRadius: 14,
              background: 'rgba(13,21,37,0.97)', border: '1px solid rgba(99,140,255,0.2)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)', backdropFilter: 'blur(24px)',
              zIndex: 200, padding: 6, overflowY: 'auto',
              scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,140,255,0.3) transparent',
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', padding: '6px 8px', letterSpacing: 1, textTransform: 'uppercase' }}>
                🌐 Language · 언어
              </div>
              {LANG_OPTIONS_TOPBAR.map(l => {
                const isActive = lang === l.code;
                return (
                  <button key={l.code} onClick={() => { setLang(l.code); setShowLang(false); }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '9px 10px', border: 'none', borderRadius: 9,
                    background: isActive ? 'rgba(79,142,247,0.15)' : 'transparent',
                    color: isActive ? '#60a5fa' : '#e2e8f0',
                    fontSize: 12, fontWeight: isActive ? 800 : 500,
                    cursor: 'pointer', transition: 'all 120ms',
                    direction: l.dir === 'rtl' ? 'rtl' : 'ltr',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(79,142,247,0.15)' : 'transparent'}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{l.flag}</span>
                    <span style={{ flex: 1, textAlign: 'left', color: isActive ? '#60a5fa' : '#e2e8f0' }}>{l.label}</span>
                    <span style={{ fontSize: 9, color: '#94a3b8', flexShrink: 0 }}>{l.code.toUpperCase()}</span>
                    {isActive && <span style={{ fontSize: 10, color: '#60a5fa', flexShrink: 0 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 테마 전환 */}
        <div ref={themeRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowTheme(!showTheme); setShowNotif(false); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 10, border: 'none',
              background: 'var(--topbar-icon-bg, rgba(99,140,255,0.07))',
              cursor: 'pointer', transition: 'all 150ms', position: 'relative',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,140,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,140,255,0.07)'}
            title={t('topbar.themeChange', 'Change Theme')}
          >
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: activeTheme.color, boxShadow: `0 0 8px ${activeTheme.color}60` }} />
          </button>

          {/* 테마 드롭다운 */}
          {showTheme && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              width: 180, borderRadius: 12,
              background: 'rgba(13,21,37,0.97)', border: '1px solid rgba(99,140,255,0.2)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)',
              zIndex: 200, padding: 6,
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', padding: '6px 8px', letterSpacing: 1 }}>
                🎨 THEME
              </div>
              {THEMES.map(th => (
                <button key={th.id} onClick={() => setTheme(th.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 10px', border: 'none', borderRadius: 8,
                  background: currentTheme === th.id ? `${th.color}1A` : 'transparent',
                  color: currentTheme === th.id ? th.color : 'var(--text-2)',
                  fontSize: 11, fontWeight: currentTheme === th.id ? 700 : 500,
                  cursor: 'pointer', transition: 'all 120ms',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = `${th.color}12`}
                  onMouseLeave={e => e.currentTarget.style.background = currentTheme === th.id ? `${th.color}1A` : 'transparent'}
                >
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%', background: th.color,
                    boxShadow: currentTheme === th.id ? `0 0 10px ${th.color}60` : 'none',
                    border: th.light ? '2px solid #94a3b8' : 'none',
                    flexShrink: 0,
                  }} />
                  <span className="topbar-theme-label">{th.label}</span>
                  {currentTheme === th.id && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 알림 벨 */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowNotif(!showNotif); setShowTheme(false); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 10, border: 'none',
              background: 'var(--topbar-icon-bg, rgba(99,140,255,0.07))',
              cursor: 'pointer', transition: 'all 150ms', position: 'relative',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,140,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,140,255,0.07)'}
            title={t('topbar.notifications', 'Notifications')}
          >
            <span style={{ fontSize: 16 }}>🔔</span>
            {unreadAlertCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                minWidth: 16, height: 16, borderRadius: 99,
                background: '#ef4444', color: '#fff',
                fontSize: 8, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px',
                boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
                animation: 'pulseScale 2s ease-in-out infinite',
              }}>
                {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
              </span>
            )}
          </button>

          {/* 알림 드롭다운 */}
          {showNotif && (
            <NotificationDropdown
              alerts={alerts}
              onDismiss={dismissAlert}
              onMarkRead={markAlertRead}
              onMarkAllRead={() => { markAllRead(); }}
              onClose={() => setShowNotif(false)}
              t={t}
            />
          )}
        </div>

        {/* 사용자 아바타 & 프로필 드롭다운 */}
        {user && <ProfileDropdown user={user} navigate={navigate} logout={logout} token={token} t={t} />}
      </div>
    </div>
  );
}

/* ─── 프로필 드롭다운 + 회원정보 수정 모달 컴포넌트 ────────────────── */
function ProfileDropdown({ user, navigate, logout, token, t }) {
  const [showProfile, setShowProfile] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const profRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profRef.current && !profRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuBtnStyle = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px',
    border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8,
    fontSize: 12, fontWeight: 600, color: 'var(--text-2, #cbd5e1)', textAlign: 'left',
    transition: 'background 120ms',
  };

  return (
    <>
      <div ref={profRef} style={{ position: 'relative' }}>
        <div
          onClick={() => setShowProfile(v => !v)}
          style={{
            width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
            background: IS_DEMO
              ? 'linear-gradient(135deg,#fb923c,#f59e0b)'
              : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 900, color: '#fff',
            boxShadow: IS_DEMO
              ? '0 2px 12px rgba(251,146,60,0.3)'
              : '0 2px 12px rgba(79,142,247,0.3)',
            transition: 'transform 150ms',
            border: showProfile ? '2px solid rgba(79,142,247,0.6)' : '2px solid transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          title={user.name || 'User'}
        >
          {user.name?.[0]?.toUpperCase() || 'U'}
        </div>
        {/* 프로필 드롭다운 */}
        {showProfile && (
          <div style={{
            position: 'absolute', top: 42, right: 0, width: 240, zIndex: 9999,
            background: 'var(--bg-card, #1e293b)', borderRadius: 14,
            border: '1px solid var(--border, rgba(99,140,255,0.2))',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '16px 14px',
            animation: 'fadeInDown 150ms ease-out',
          }}>
            {/* 사용자 정보 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border, rgba(99,140,255,0.1))' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: IS_DEMO ? 'linear-gradient(135deg,#fb923c,#f59e0b)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 900, color: '#fff',
              }}>{user.name?.[0]?.toUpperCase() || 'U'}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-1, #e2e8f0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3, #94a3b8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            </div>
            {/* 메뉴 항목 */}
            <div style={{ display: 'grid', gap: 2 }}>
              <button onClick={() => { setShowProfile(false); setShowEditModal(true); }}
                style={menuBtnStyle}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              ><span style={{ fontSize: 14 }}>👤</span> {t('topbar.editProfile', 'Edit Profile')}</button>
              <button onClick={() => { setShowProfile(false); navigate('/dashboard'); }}
                style={menuBtnStyle}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              ><span style={{ fontSize: 14 }}>🏠</span> {t('topbar.pg.dashboard', 'Dashboard')}</button>
              <button onClick={() => { setShowProfile(false); navigate('/operations'); }}
                style={menuBtnStyle}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              ><span style={{ fontSize: 14 }}>⚡</span> {t('topbar.pg.operations', 'Operations Hub')}</button>
              <button onClick={() => { setShowProfile(false); navigate('/app-pricing'); }}
                style={menuBtnStyle}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              ><span style={{ fontSize: 14 }}>💳</span> {t('topbar.subscription', 'Subscription')}</button>
            </div>
            {/* 로그아웃 */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border, rgba(99,140,255,0.1))' }}>
              <button onClick={() => { setShowProfile(false); logout(); navigate('/login', { replace: true }); }}
                style={{ ...menuBtnStyle, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', fontWeight: 700, color: '#ef4444' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.05)'}
              ><span style={{ fontSize: 14 }}>🚪</span> {t('topbar.logout', 'Logout')}</button>
            </div>
          </div>
        )}
      </div>
      {/* 회원정보 수정 모달 */}
      {showEditModal && (
        <ProfileEditModal user={user} token={token} onClose={() => setShowEditModal(false)} />
      )}
    </>
  );
}

/* ─── 회원정보 수정 + 비밀번호 변경 모달 ────────────────────────────── */
function ProfileEditModal({ user, token, onClose }) {
  const { t } = useI18n();
  const [tab, setTab] = useState('info'); // 'info' | 'password'
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [company, setCompany] = useState(user.company || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // 비밀번호 변경
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const showMsg = (text, type = 'ok') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 5000); };

  const pwStrength = (pw) => {
    if (!pw) return { label: '', color: '', pct: 0 };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: t('profile.strWeak', 'Weak'), color: '#ef4444', pct: 20 };
    if (score === 2) return { label: t('profile.strFair', 'Fair'), color: '#f59e0b', pct: 40 };
    if (score === 3) return { label: t('profile.strGood', 'Good'), color: '#eab308', pct: 60 };
    if (score === 4) return { label: t('profile.strStrong', 'Strong'), color: '#22c55e', pct: 80 };
    return { label: t('profile.strVeryStrong', 'Very Strong'), color: '#14d9b0', pct: 100 };
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) { showMsg(t('profile.nameRequired', 'Please enter your name.'), 'err'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), company: company.trim() }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.ok) {
          // 로컬 캐시 업데이트
          const KEY_PREFIX = (window.location.hostname.includes('demo') ? 'demo_genie_' : 'genie_');
          try {
            const cached = JSON.parse(localStorage.getItem(KEY_PREFIX + 'user') || '{}');
            const updated = { ...cached, name: name.trim(), phone: phone.trim(), company: company.trim() };
            localStorage.setItem(KEY_PREFIX + 'user', JSON.stringify(updated));
          } catch {}
          showMsg(t('profile.saved', 'Profile updated.'), 'ok');
          setTimeout(() => window.location.reload(), 1200);
          return;
        }
      }
      // API가 없는 경우 로컬 캐시만 업데이트
      const KEY_PREFIX = (window.location.hostname.includes('demo') ? 'demo_genie_' : 'genie_');
      try {
        const cached = JSON.parse(localStorage.getItem(KEY_PREFIX + 'user') || '{}');
        const updated = { ...cached, name: name.trim(), phone: phone.trim(), company: company.trim() };
        localStorage.setItem(KEY_PREFIX + 'user', JSON.stringify(updated));
      } catch {}
      showMsg(t('profile.saved', 'Profile updated.'), 'ok');
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      // 서버 연결 실패 시 로컬 캐시만 업데이트
      const KEY_PREFIX = (window.location.hostname.includes('demo') ? 'demo_genie_' : 'genie_');
      try {
        const cached = JSON.parse(localStorage.getItem(KEY_PREFIX + 'user') || '{}');
        const updated = { ...cached, name: name.trim(), phone: phone.trim(), company: company.trim() };
        localStorage.setItem(KEY_PREFIX + 'user', JSON.stringify(updated));
      } catch {}
      showMsg(t('profile.savedLocal', 'Profile saved locally.'), 'ok');
      setTimeout(() => window.location.reload(), 1200);
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!curPw) { showMsg(t('profile.pwCurRequired', 'Please enter current password.'), 'err'); return; }
    if (newPw.length < 8) { showMsg(t('profile.pwMinLength', 'Password must be 8+ chars.'), 'err'); return; }
    if (newPw !== confirmPw) { showMsg(t('profile.pwMismatch', 'Passwords do not match.'), 'err'); return; }
    if (curPw === newPw) { showMsg(t('profile.pwSameAsCur', 'Must differ from current.'), 'err'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: curPw, new_password: newPw }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.ok) {
          showMsg(t('profile.pwChanged', 'Password changed.'), 'ok');
          setCurPw(''); setNewPw(''); setConfirmPw('');
          return;
        }
        showMsg(d.error || t('profile.pwChangeFail', 'Failed to change.'), 'err');
        return;
      }
      if (r.status === 401 || r.status === 403) {
        showMsg(t('profile.pwCurWrong', 'Current password incorrect.'), 'err');
        return;
      }
      showMsg(t('profile.pwApiNotReady', 'API not ready.'), 'warn');
    } catch {
      showMsg(t('profile.serverError', 'Server error. Try again.'), 'err');
    } finally { setSaving(false); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
    border: '1px solid var(--border, rgba(99,140,255,0.2))',
    background: 'var(--bg, rgba(15,23,42,0.6))', color: 'var(--text-1, #e2e8f0)',
    outline: 'none', boxSizing: 'border-box', transition: 'border 200ms',
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text-3, #94a3b8)', marginBottom: 4, display: 'block' };
  const strength = pwStrength(newPw);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '92%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
        background: 'linear-gradient(180deg, var(--surface, #1e293b), var(--bg, #0f172a))',
        border: '1px solid var(--border, rgba(99,140,255,0.2))', borderRadius: 20,
        padding: '28px 24px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1, #e2e8f0)' }}>👤 {t('profile.title', 'Profile Settings')}</div>
          <button onClick={onClose} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border, rgba(99,140,255,0.15))', background: 'transparent', color: 'var(--text-3, #94a3b8)', fontSize: 16, cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>

        {/* 탭 전환 */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(79,142,247,0.05)', borderRadius: 12, padding: 4 }}>
          {[
            { id: 'info', label: t('profile.tabInfo', '📋 Profile Info'), icon: '' },
            { id: 'password', label: t('profile.tabPassword', '🔐 Change Password'), icon: '' },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setMsg({ text: '', type: '' }); }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: tab === t.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--text-3, #94a3b8)',
                fontSize: 12, fontWeight: 800, transition: 'all 200ms',
                boxShadow: tab === t.id ? '0 4px 12px rgba(79,142,247,0.3)' : 'none',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* 상태 메시지 */}
        {msg.text && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
            background: msg.type === 'ok' ? 'rgba(34,197,94,0.1)' : msg.type === 'warn' ? 'rgba(234,179,8,0.08)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.3)' : msg.type === 'warn' ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: msg.type === 'ok' ? '#22c55e' : msg.type === 'warn' ? '#fbbf24' : '#ef4444',
          }}>
            <span>{msg.type === 'ok' ? '✅' : msg.type === 'warn' ? '⚠️' : '❌'}</span>{msg.text}
          </div>
        )}

        {/* 회원정보 탭 */}
        {tab === 'info' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* 프로필 카드 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.1)' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: IS_DEMO ? 'linear-gradient(135deg,#fb923c,#f59e0b)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 900, color: '#fff',
                boxShadow: '0 4px 16px rgba(79,142,247,0.25)',
              }}>{user.name?.[0]?.toUpperCase() || 'U'}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-1, #e2e8f0)' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3, #94a3b8)', marginTop: 2 }}>{user.email}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 99, fontSize: 9, fontWeight: 800,
                    background: 'rgba(79,142,247,0.12)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.25)',
                  }}>{(user.plan || 'free').toUpperCase()}</span>
                  {user.company && <span style={{
                    padding: '2px 10px', borderRadius: 99, fontSize: 9, fontWeight: 700,
                    background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)',
                  }}>{user.company}</span>}
                </div>
              </div>
            </div>

            {/* 이메일 (읽기 전용) */}
            <div>
              <label style={labelStyle}>{t('profile.emailLabel', 'Email (read-only)')}</label>
              <input value={user.email || ''} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
            </div>

            {/* 이름 */}
            <div>
              <label style={labelStyle}>{t('profile.nameLabel', 'Name *')}</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={t('profile.namePlaceholder', 'Enter name')} style={inputStyle}
                onFocus={e => e.target.style.border = '1px solid rgba(79,142,247,0.5)'}
                onBlur={e => e.target.style.border = '1px solid var(--border, rgba(99,140,255,0.2))'}
              />
            </div>

            {/* 전화번호 */}
            <div>
              <label style={labelStyle}>{t('profile.phoneLabel', 'Phone')}</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" style={inputStyle}
                onFocus={e => e.target.style.border = '1px solid rgba(79,142,247,0.5)'}
                onBlur={e => e.target.style.border = '1px solid var(--border, rgba(99,140,255,0.2))'}
              />
            </div>

            {/* 회사/조직 */}
            <div>
              <label style={labelStyle}>{t('profile.companyLabel', 'Company / Org')}</label>
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder={t('profile.companyPlaceholder', 'Enter company')} style={inputStyle}
                onFocus={e => e.target.style.border = '1px solid rgba(79,142,247,0.5)'}
                onBlur={e => e.target.style.border = '1px solid var(--border, rgba(99,140,255,0.2))'}
              />
            </div>

            {/* 가입일 */}
            {user.created_at && (
              <div style={{ fontSize: 11, color: 'var(--text-3, #94a3b8)', padding: '8px 0', borderTop: '1px solid var(--border, rgba(99,140,255,0.1))' }}>
                📅 {t('profile.joinDate', 'Joined')}: {user.created_at.slice(0, 10)}
                {user.last_login && <> · {t('profile.lastLogin', 'Last login')}: {user.last_login.slice(0, 16).replace('T', ' ')}</>}
              </div>
            )}

            {/* 저장 버튼 */}
            <button onClick={handleSaveProfile} disabled={saving}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', cursor: saving ? 'wait' : 'pointer',
                background: saving ? 'rgba(79,142,247,0.3)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                color: '#fff', fontSize: 14, fontWeight: 800,
                boxShadow: '0 4px 16px rgba(79,142,247,0.3)', transition: 'all 200ms',
              }}
            >{saving ? t('profile.saving', 'Saving...') : t('profile.saveBtn', '💾 Save')}</button>
          </div>
        )}

        {/* 비밀번호 변경 탭 */}
        {tab === 'password' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* 안내 */}
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.1)', fontSize: 12, color: 'var(--text-3, #94a3b8)', lineHeight: 1.7 }}>
              🔐 {t('profile.pwGuide', 'Current password verification is required.')}<br />
              <span dangerouslySetInnerHTML={{ __html: t('profile.pwGuide2', 'New password must be <strong>8+ characters</strong>.') }} />
            </div>

            {/* 현재 비밀번호 */}
            <div>
              <label style={labelStyle}>{t('profile.curPwLabel', 'Current Password *')}</label>
              <div style={{ position: 'relative' }}>
                <input type={showCurPw ? 'text' : 'password'} value={curPw} onChange={e => setCurPw(e.target.value)}
                  placeholder={t('profile.curPwPlaceholder', 'Enter current password')} style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={e => e.target.style.border = '1px solid rgba(79,142,247,0.5)'}
                  onBlur={e => e.target.style.border = '1px solid var(--border, rgba(99,140,255,0.2))'}
                />
                <button onClick={() => setShowCurPw(v => !v)} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, padding: 4, color: 'var(--text-3)',
                }}>{showCurPw ? '🙈' : '👁️'}</button>
              </div>
            </div>

            {/* 새 비밀번호 */}
            <div>
              <label style={labelStyle}>{t('profile.newPwLabel', 'New Password *')}</label>
              <div style={{ position: 'relative' }}>
                <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder={t('profile.newPwPlaceholder', 'New password (8+ chars)')} style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={e => e.target.style.border = '1px solid rgba(79,142,247,0.5)'}
                  onBlur={e => e.target.style.border = '1px solid var(--border, rgba(99,140,255,0.2))'}
                />
                <button onClick={() => setShowNewPw(v => !v)} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, padding: 4, color: 'var(--text-3)',
                }}>{showNewPw ? '🙈' : '👁️'}</button>
              </div>
              {/* 비밀번호 강도 */}
              {newPw && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ width: `${strength.pct}%`, height: '100%', borderRadius: 4, background: strength.color, transition: 'all 300ms' }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: strength.color, whiteSpace: 'nowrap' }}>{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label style={labelStyle}>{t('profile.confirmPwLabel', 'Confirm Password *')}</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                placeholder={t('profile.confirmPwPlaceholder', 'Re-enter password')} style={inputStyle}
                onFocus={e => e.target.style.border = '1px solid rgba(79,142,247,0.5)'}
                onBlur={e => e.target.style.border = '1px solid var(--border, rgba(99,140,255,0.2))'}
              />
              {confirmPw && newPw && (
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: newPw === confirmPw ? '#22c55e' : '#ef4444' }}>
                  {newPw === confirmPw ? `✅ ${t('profile.pwMatch', 'Passwords match')}` : `❌ ${t('profile.pwNoMatch', 'Passwords do not match')}`}
                </div>
              )}
            </div>

            {/* 변경 버튼 */}
            <button onClick={handleChangePassword} disabled={saving || !curPw || newPw.length < 8 || newPw !== confirmPw}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                cursor: (saving || !curPw || newPw.length < 8 || newPw !== confirmPw) ? 'not-allowed' : 'pointer',
                background: (saving || !curPw || newPw.length < 8 || newPw !== confirmPw) ? 'rgba(168,85,247,0.15)' : 'linear-gradient(135deg,#a855f7,#7c3aed)',
                color: (saving || !curPw || newPw.length < 8 || newPw !== confirmPw) ? 'var(--text-3)' : '#fff',
                fontSize: 14, fontWeight: 800,
                boxShadow: (!saving && curPw && newPw.length >= 8 && newPw === confirmPw) ? '0 4px 16px rgba(168,85,247,0.3)' : 'none',
                transition: 'all 200ms',
              }}
            >{saving ? t('profile.changingPw', 'Changing...') : t('profile.changePwBtn', '🔐 Change Password')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ThemeToggle() { return null; }
export function NotificationBell() { return null; }

