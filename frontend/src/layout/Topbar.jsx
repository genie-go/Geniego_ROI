// ─────────────────────────────────────────────────────────────────────
//  Geniego-ROI  |  Enterprise Topbar (초고도화 v2)
//  글로벌 검색 · 알림 · 테마 전환 · 통화 · 환경 배지 · 시계
// ─────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useI18n } from "../i18n/index.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useCurrency } from "../contexts/CurrencyContext.jsx";
import { useMobileSidebar } from "../context/MobileSidebarContext.jsx";
import { sanitizeHtml } from "../utils/xssSanitizer.js";

/* 데모 모드 감지 — 정본(demoEnv) 단일 소스 (운영 오염 방지 엄격 격리) */
import { IS_DEMO } from "../utils/demoEnv.js";

/* 테마 목록 */
const THEMES = [
  { id: 'arctic_white', label: '☀️ Arctic White', color: '#f8fafc', light: true },
  { id: 'deep_space', label: 'Deep Space', color: '#4f8ef7' },
  { id: 'aurora', label: 'Aurora', color: '#14d9b0' },
  { id: 'midnight_gold', label: 'Midnight Gold', color: '#eab308' },
  { id: 'ocean_depth', label: 'Ocean Depth', color: '#0ea5e9' },
  { id: 'crimson_nexus', label: 'Crimson Nexus', color: '#ec4899' },
];

/* 다국어 옵션 (i18n LANG_OPTIONS 미러) */
const LANG_OPTIONS_TOPBAR = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'th', label: 'ภาษาไทย', flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
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
const NotificationDropdown = memo(function NotificationDropdown({ alerts, onDismiss, onMarkRead, onMarkAllRead, onClose, t }) {
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
});


export default function Topbar() {
  const { t, lang, setLang } = useI18n();
  const { user, logout, token, isAdmin } = useAuth();
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
    try { localStorage.setItem('geniego_theme', themeId); } catch { }
    setShowTheme(false);
  }, []);

  // 초기 테마 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem('geniego_theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    } catch { }
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

        {/* 환경 배지 — 데모: 클릭 시 체험 데이터 초기화 (누적 유지가 기본, 명시적 초기화 제공) */}
        {IS_DEMO && (
          <button
            onClick={() => {
              if (!window.confirm('체험 중 만든 데이터(여정·캠페인·팝업 등)를 모두 초기화하고 기본 데모 상태로 되돌릴까요?\n\n구독 회원으로 전환하면 작업한 데이터가 영구 저장됩니다.')) return;
              // 데모 누적 콘텐츠 키 제거 (인증·언어·테마는 보존 → 로그인 상태 유지)
              // geniego_demo_* = GlobalDataContext 데모 상태, jb_journeys = 여정, genie_channel_creds = 데모 채널 creds
              const CONTENT_RE = /^(geniego_demo_|jb_journeys|genie_channel_creds)/;
              try {
                Object.keys(localStorage).forEach(k => { if (CONTENT_RE.test(k)) localStorage.removeItem(k); });
                localStorage.setItem('geniego_tour_completed', 'true');
              } catch {}
              window.location.reload();
            }}
            title="🔄 체험 데이터 초기화 · 구독 시 작업 데이터 영구 저장"
            style={{
              padding: '2px 10px', borderRadius: 99, fontSize: 9, fontWeight: 800,
              background: 'rgba(251,146,60,0.12)', color: '#fb923c',
              border: '1px solid rgba(251,146,60,0.3)', cursor: 'pointer',
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,146,60,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,146,60,0.12)'}
          >🔄 DEMO</button>
        )}

        {/* 207차: 관리자 전용 환경 전환 — 운영/데모는 별도 시스템(별도 DB). 어느 페이지에서나 전환 가능.
            admin 계정만 노출(데모/운영 회원은 isAdmin=false 라 미표시). */}
        {isAdmin && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 9, fontWeight: 800,
              background: IS_DEMO ? 'rgba(251,146,60,0.15)' : 'rgba(34,197,94,0.15)',
              color: IS_DEMO ? '#fb923c' : '#22c55e',
              border: `1px solid ${IS_DEMO ? 'rgba(251,146,60,0.35)' : 'rgba(34,197,94,0.35)'}`,
            }}>{IS_DEMO ? '🎪 데모 환경' : '🏢 운영 환경'}</span>
            <a
              href={IS_DEMO ? 'https://roi.genie-go.com/admin' : 'https://roidemo.genie-go.com/admin'}
              title={IS_DEMO ? '운영 시스템(실데이터) 관리로 전환' : '데모(체험) 환경 관리로 전환'}
              style={{
                padding: '2px 10px', borderRadius: 99, fontSize: 9, fontWeight: 800, textDecoration: 'none',
                background: IS_DEMO ? 'rgba(34,197,94,0.12)' : 'rgba(251,146,60,0.12)',
                color: IS_DEMO ? '#22c55e' : '#fb923c',
                border: `1px solid ${IS_DEMO ? 'rgba(34,197,94,0.35)' : 'rgba(251,146,60,0.35)'}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >{IS_DEMO ? '🏢 운영 전환 →' : '🎪 데모 전환 →'}</a>
          </div>
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
            { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', 'zh-TW': 'zh-TW', de: 'de-DE', th: 'th-TH', vi: 'vi-VN', id: 'id-ID', es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', ru: 'ru-RU', ar: 'ar-SA', hi: 'hi-IN' }[lang] || 'en-US',
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
            <div className="topbar-dropdown-panel" style={{
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
            <div className="topbar-dropdown-panel" style={{
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
const ProfileDropdown = memo(function ProfileDropdown({ user, navigate, logout, token, t }) {
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
              {user.plan === 'admin' && (
                <button onClick={() => { setShowProfile(false); setTab('security'); setShowEditModal(true); }}
                  style={menuBtnStyle}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                ><span style={{ fontSize: 14 }}>🤖</span> {t('topbar.aiKeySettings', 'AI 엔진 / 이메일 설정')}</button>
              )}
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
});

/* ─── 회원정보 수정 + 비밀번호 변경 모달 ────────────────────────────── */
const ProfileEditModal = memo(function ProfileEditModal({ user, token, onClose }) {
  const { t } = useI18n();
  const [tab, setTab] = useState('info'); // 'info' | 'password'
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || (user.profile && user.profile.phone) || '');
  const [company, setCompany] = useState(user.company || (user.profile && user.profile.company) || '');
  // [현 차수] ★회사 상세정보 — API 키 발급신청 등에서 '회사 정보 가져오기'로 재사용(중복입력 제거). user.profile에서 초기화.
  const _pf = user.profile || {};
  const [bizNumber, setBizNumber] = useState(_pf.business_number || '');
  const [ceoName, setCeoName]     = useState(_pf.ceo_name || '');
  const [bizType, setBizType]     = useState(_pf.business_type || '');
  const [country, setCountry]     = useState(_pf.country || '');
  const [zipCode, setZipCode]     = useState(_pf.zip_code || '');
  const [address, setAddress]     = useState(_pf.address || '');
  const [website, setWebsite]     = useState(_pf.website || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // 비밀번호 변경
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // 188차 관리자 보안: 접속키 변경 (admin 전용)
  const [akCurPw, setAkCurPw] = useState('');
  const [akNew, setAkNew] = useState('');
  const [akNew2, setAkNew2] = useState('');

  // 196차 #3 SMTP 설정 (admin 전용) — 이메일 OTP·비번재설정 발송 인프라
  const [smtp, setSmtp] = useState({ host: '', port: 587, user: '', pass: '', pass_set: false, from: 'geniegoroi@ociell.com', from_name: 'Geniego-ROI', secure: 'tls' });
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [smtpLoaded, setSmtpLoaded] = useState(false);
  const [smtpTestTo, setSmtpTestTo] = useState('');
  // 208차 #2 OAuth 앱 설정 (admin) — 각 사 client_id/secret 등록 시 OAuth 인가 연결 활성화
  const OAUTH_PROVIDERS = [
    { id: 'google', label: 'Google Ads', console: 'https://console.cloud.google.com/projectselector2/apis/credentials' }, // [229차] 프로젝트 선택기 강제(임의 프로젝트 자동선택 방지)
    { id: 'meta', label: 'Meta (Facebook/IG)', console: 'https://developers.facebook.com/apps' },
    { id: 'tiktok', label: 'TikTok', console: 'https://business-api.tiktok.com/portal' },
    { id: 'kakao', label: 'Kakao', console: 'https://developers.kakao.com/console/app' },
    { id: 'naver', label: 'Naver', console: 'https://developers.naver.com/apps/#/list' },
  ];
  const [oauthStatus, setOauthStatus] = useState({});
  const [oauthForm, setOauthForm] = useState({});
  const [oauthBusy, setOauthBusy] = useState('');
  // 196차 AI(Claude) API 키 설정 (admin) — 실 AI 디자인·분석 활성화
  const [aiKey, setAiKey] = useState('');
  const [aiKeySet, setAiKeySet] = useState(false);

  // 189차 MFA/2FA (TOTP) — admin 제외(관리자는 별도 접속키 흐름)
  const [mfaEnabled, setMfaEnabled] = useState(null);   // null=미조회, true/false
  const [mfaRemaining, setMfaRemaining] = useState(0);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaOtpauth, setMfaOtpauth] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRecovery, setMfaRecovery] = useState(null); // null | string[]
  const [mfaDisPw, setMfaDisPw] = useState('');

  // 189차+ 세션/기기 관리
  const [sessions, setSessions] = useState(null); // null=미조회 | array
  const [sessLoading, setSessLoading] = useState(false);

  const showMsg = (text, type = 'ok') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 5000); };

  // 189차 비밀번호 정책: 8자 이상 + 영문 대/소문자·숫자·특수문자 중 3종 이상
  const pwPolicyOk = (pw) => {
    let c = 0;
    if (/[a-z]/.test(pw)) c++;
    if (/[A-Z]/.test(pw)) c++;
    if (/[0-9]/.test(pw)) c++;
    if (/[^A-Za-z0-9]/.test(pw)) c++;
    return pw.length >= 8 && c >= 3;
  };

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

    // 177차 §4.E TOP 2 강화 + U-177-A 정합:
    // - 운영 모드: 서버 응답에 따라 명확히 분기 (silent localStorage update 제거 — 데이터 불일치 위험)
    // - 데모 모드: 기존대로 localStorage 만 update (backend 가 demo tenant 변경 거부할 수 있음)
    const KEY_PREFIX = IS_DEMO ? 'demo_genie_' : 'genie_';
    const updateLocalCache = (serverUser = null) => {
      try {
        const cached = JSON.parse(localStorage.getItem(KEY_PREFIX + 'user') || '{}');
        const updated = serverUser
          ? { ...cached, ...serverUser }
          : { ...cached, name: name.trim(), phone: phone.trim(), company: company.trim() };
        localStorage.setItem(KEY_PREFIX + 'user', JSON.stringify(updated));
      } catch { /* localStorage 불가 — 무시 */ }
    };

    try {
      const r = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), company: company.trim(),
          business_number: bizNumber.trim(), ceo_name: ceoName.trim(), business_type: bizType.trim(),
          country: country.trim(), zip_code: zipCode.trim(), address: address.trim(), website: website.trim() }),
      });
      const d = await r.json().catch(() => null);

      if (r.ok && d?.ok) {
        updateLocalCache(d.user);
        showMsg(t('profile.saved', 'Profile updated.'), 'ok');
        setTimeout(() => window.location.reload(), 1200);
        return;
      }

      // 401/403 — 세션 만료 (운영/데모 동일)
      if (r.status === 401 || r.status === 403) {
        showMsg(t('profileExt.sessionExpired', 'Session expired. Please log in again.'), 'err');
        return;
      }

      // 422 — 검증 실패 (서버 메시지 표시)
      if (r.status === 422) {
        showMsg(d?.error || t('profileExt.invalidInput', 'Invalid input.'), 'err');
        return;
      }

      // 그 외 — 운영/데모 분기
      if (IS_DEMO) {
        updateLocalCache();
        showMsg(t('profileExt.savedLocalDemo', 'Profile saved locally (demo mode).'), 'warn');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        showMsg((d?.error || t('profileExt.saveFail', 'Failed to save profile.')) + ' (HTTP ' + r.status + ')', 'err');
      }
    } catch (e) {
      // 네트워크 실패 — 운영/데모 분기
      if (IS_DEMO) {
        updateLocalCache();
        showMsg(t('profileExt.savedLocalOffline', 'Profile saved locally (offline).'), 'warn');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        showMsg(t('profileExt.networkError', 'Network error. Please try again.'), 'err');
      }
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!curPw) { showMsg(t('profile.pwCurRequired', 'Please enter current password.'), 'err'); return; }
    if (newPw.length < 8) { showMsg(t('profile.pwMinLength', 'Password must be 8+ chars.'), 'err'); return; }
    if (!pwPolicyOk(newPw)) { showMsg(t('profile.pwPolicy', '비밀번호는 8자 이상이며 영문 대/소문자·숫자·특수문자 중 3종 이상을 포함해야 합니다.'), 'err'); return; }
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

  // 188차 관리자 보안: 접속키(access key) 변경 — 현재 비밀번호 검증 필요
  const handleChangeAccessKey = async () => {
    if (!akCurPw) { showMsg(t('profile.akCurPwRequired', '현재 비밀번호를 입력하세요.'), 'err'); return; }
    if (akNew.trim().length < 6) { showMsg(t('profile.akMinLength', '접속키는 6자 이상이어야 합니다.'), 'err'); return; }
    if (akNew !== akNew2) { showMsg(t('profile.akMismatch', '접속키가 일치하지 않습니다.'), 'err'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/auth/admin/access-key', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: akCurPw, new_access_key: akNew.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { showMsg(t('profile.akChanged', '관리자 접속키가 변경되었습니다. 다음 로그인부터 적용됩니다.'), 'ok'); setAkCurPw(''); setAkNew(''); setAkNew2(''); }
      else showMsg(d.error || t('profile.akChangeFail', '접속키 변경에 실패했습니다.'), 'err');
    } catch { showMsg(t('profile.serverError', 'Server error. Try again.'), 'err'); }
    finally { setSaving(false); }
  };

  // 196차 #3 SMTP 설정 핸들러 ──────────────────────────────────
  const loadSmtp = async () => {
    try {
      const r = await fetch('/api/auth/admin/smtp', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok && d.smtp) { setSmtp(s => ({ ...s, ...d.smtp, pass: '' })); setSmtpConfigured(!!d.configured); }
    } catch {}
    finally { setSmtpLoaded(true); }
  };
  const handleSaveSmtp = async () => {
    if (!smtp.host.trim()) { showMsg(t('profile.smtpHostRequired', 'SMTP 호스트를 입력하세요.'), 'err'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/auth/admin/smtp', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ host: smtp.host.trim(), port: Number(smtp.port) || 587, user: smtp.user.trim(), pass: smtp.pass, from: smtp.from.trim(), from_name: smtp.from_name.trim(), secure: smtp.secure }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { showMsg(d.message || t('profile.smtpSaved', 'SMTP 설정이 저장되었습니다.'), 'ok'); setSmtp(s => ({ ...s, pass: '', pass_set: s.pass ? true : s.pass_set })); setSmtpConfigured(!!d.configured); }
      else showMsg(d.error || t('profile.smtpSaveFail', 'SMTP 설정 저장에 실패했습니다.'), 'err');
    } catch { showMsg(t('profile.serverError', 'Server error. Try again.'), 'err'); }
    finally { setSaving(false); }
  };
  const handleTestSmtp = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/auth/admin/smtp/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: smtpTestTo.trim() || (user.email || '') }),
      });
      const d = await r.json().catch(() => ({}));
      showMsg(d.ok ? (d.message || t('profile.smtpTestSent', '테스트 메일을 보냈습니다.')) : (d.error || t('profile.smtpTestFail', '테스트 메일 발송에 실패했습니다.')), d.ok ? 'ok' : 'err');
    } catch { showMsg(t('profile.serverError', 'Server error. Try again.'), 'err'); }
    finally { setSaving(false); }
  };
  const loadAiKey = async () => {
    try {
      const r = await fetch('/api/auth/admin/ai-key', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) setAiKeySet(!!d.key_set || !!d.configured);
    } catch {}
  };
  const handleSaveAiKey = async () => {
    if (!aiKey.trim()) { showMsg(t('profile.aiKeyRequired', 'Anthropic API 키(sk-ant-...)를 입력하세요.'), 'err'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/auth/admin/ai-key', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ api_key: aiKey.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { showMsg(d.message || t('profile.aiKeySaved', 'AI API 키가 저장되었습니다.'), 'ok'); setAiKey(''); setAiKeySet(true); }
      else showMsg(d.error || t('profile.aiKeySaveFail', 'AI 키 저장에 실패했습니다.'), 'err');
    } catch { showMsg(t('profile.serverError', 'Server error. Try again.'), 'err'); }
    finally { setSaving(false); }
  };
  // 208차 #2 OAuth 핸들러 ──────────────────────────────────
  const loadOAuthStatus = async () => {
    try {
      const r = await fetch('/api/v425/oauth/status', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) setOauthStatus(d.providers || {});
    } catch {}
  };
  const saveOAuthConfig = async (provider) => {
    const f = oauthForm[provider] || {};
    if (!(f.client_id || '').trim()) { showMsg(t('profile.oauthIdRequired', 'Client ID를 입력하세요.'), 'err'); return; }
    setOauthBusy(provider);
    try {
      const r = await fetch(`/api/v425/admin/oauth/${provider}/config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ client_id: (f.client_id || '').trim(), client_secret: (f.client_secret || '').trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { showMsg(t('profile.oauthSaved', 'OAuth 앱 설정이 저장되었습니다.'), 'ok'); setOauthForm(p => ({ ...p, [provider]: {} })); loadOAuthStatus(); }
      else showMsg(d.error || t('profile.oauthSaveFail', 'OAuth 설정 저장에 실패했습니다.'), 'err');
    } catch { showMsg(t('profile.serverError', 'Server error. Try again.'), 'err'); }
    finally { setOauthBusy(''); }
  };
  const connectOAuth = async (provider) => {
    try {
      const r = await fetch(`/api/v425/oauth/${provider}/authorize`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json().catch(() => ({}));
      if (d.ok && d.authorize_url) window.location.href = d.authorize_url;
      else showMsg(d.error || t('profile.oauthNotConfigured', '먼저 Client ID/Secret을 등록하세요.'), 'err');
    } catch { showMsg(t('profile.serverError', 'Server error. Try again.'), 'err'); }
  };
  // [현 차수] OAuth access token 수동 갱신(만료 전 재발급). 자동 갱신 cron 과 별개의 즉시 갱신.
  const refreshOAuthToken = async (provider) => {
    setOauthBusy(provider);
    try {
      const r = await fetch(`/api/v425/oauth/${provider}/refresh`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { showMsg(t('profile.oauthRefreshed', '토큰이 갱신되었습니다.'), 'ok'); loadOAuthStatus(); }
      else if (d.error === 'no_refresh_token') showMsg(t('profile.oauthNoRefresh', '먼저 [연결]로 OAuth 인가를 완료하세요.'), 'err');
      else if (d.error === 'not_configured') showMsg(t('profile.oauthNotConfigured', '먼저 Client ID/Secret을 등록하세요.'), 'err');
      else showMsg(d.error || t('profile.oauthRefreshFail', '토큰 갱신에 실패했습니다.'), 'err');
    } catch { showMsg(t('profile.serverError', 'Server error. Try again.'), 'err'); }
    finally { setOauthBusy(''); }
  };
  // [현 차수] redirect URI 복사(매체 콘솔 화이트리스트 등록용 — redirect_uri_mismatch 방지).
  const copyOAuthText = (txt) => {
    try { navigator.clipboard?.writeText(String(txt)); showMsg(t('profile.copied', '복사되었습니다.'), 'ok'); }
    catch { showMsg(t('profile.copyFail', '복사 실패 — 직접 선택해 복사하세요.'), 'err'); }
  };
  useEffect(() => { if (tab === 'security' && user?.plan === 'admin' && !smtpLoaded) { loadSmtp(); loadAiKey(); loadOAuthStatus(); } }, [tab]); // eslint-disable-line

  // 189차 MFA/2FA (TOTP) 핸들러 ──────────────────────────────────
  const mfaAuthHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const refreshMfaStatus = async () => {
    try {
      const r = await fetch('/api/auth/mfa/status', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setMfaEnabled(!!d.enabled); setMfaRemaining(d.recovery_remaining || 0); }
      else setMfaEnabled(false);
    } catch { setMfaEnabled(false); }
  };

  const handleMfaSetup = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/auth/mfa/setup', { method: 'POST', headers: mfaAuthHeaders, body: '{}' });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setMfaSecret(d.secret || ''); setMfaOtpauth(d.otpauth_uri || ''); setMfaRecovery(null); setMfaCode(''); }
      else showMsg(d.error || t('profile.mfaSetupFail', '2단계 인증 설정에 실패했습니다.'), 'err');
    } catch { showMsg(t('profile.serverError', 'Server error. Try again.'), 'err'); }
    finally { setSaving(false); }
  };

  const handleMfaEnable = async () => {
    if (!/^\d{6}$/.test(mfaCode.trim())) { showMsg(t('profile.mfaCodeInvalid', '6자리 인증 코드를 입력하세요.'), 'err'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/auth/mfa/enable', { method: 'POST', headers: mfaAuthHeaders, body: JSON.stringify({ code: mfaCode.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setMfaRecovery(d.recovery_codes || []); setMfaSecret(''); setMfaOtpauth(''); setMfaCode('');
        showMsg(t('profile.mfaEnabled', '2단계 인증이 활성화되었습니다.'), 'ok');
        refreshMfaStatus();
      } else showMsg(d.error || t('profile.mfaEnableFail', '인증 코드가 올바르지 않습니다.'), 'err');
    } catch { showMsg(t('profile.serverError', 'Server error. Try again.'), 'err'); }
    finally { setSaving(false); }
  };

  const handleMfaDisable = async () => {
    if (!mfaDisPw) { showMsg(t('profile.pwCurRequired', 'Please enter current password.'), 'err'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/auth/mfa/disable', { method: 'POST', headers: mfaAuthHeaders, body: JSON.stringify({ current_password: mfaDisPw }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setMfaDisPw(''); setMfaRecovery(null);
        showMsg(t('profile.mfaDisabled', '2단계 인증이 해제되었습니다.'), 'ok');
        refreshMfaStatus();
      } else showMsg(d.error || t('profile.mfaDisableFail', '해제에 실패했습니다.'), 'err');
    } catch { showMsg(t('profile.serverError', 'Server error. Try again.'), 'err'); }
    finally { setSaving(false); }
  };

  // MFA 탭 진입 시 상태 1회 조회
  useEffect(() => {
    if (tab === 'mfa' && mfaEnabled === null) refreshMfaStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // 189차+ 세션/기기 관리 핸들러
  const fetchSessions = async () => {
    setSessLoading(true);
    try {
      const r = await fetch('/api/auth/sessions', { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json().catch(() => ({}));
      setSessions(r.ok && d.ok ? (d.sessions || []) : []);
    } catch { setSessions([]); }
    finally { setSessLoading(false); }
  };

  const handleRevokeOthers = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/auth/sessions/revoke-others', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}' });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { showMsg(d.message || t('profile.sessRevoked', '다른 기기에서 로그아웃되었습니다.'), 'ok'); fetchSessions(); }
      else showMsg(d.error || t('profile.sessRevokeFail', '로그아웃에 실패했습니다.'), 'err');
    } catch { showMsg(t('profile.serverError', 'Server error. Try again.'), 'err'); }
    finally { setSaving(false); }
  };

  // 세션 탭 진입 시 1회 조회
  useEffect(() => {
    if (tab === 'sessions' && sessions === null) fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
    border: '1px solid var(--border, rgba(99,140,255,0.2))',
    background: 'var(--bg, rgba(15,23,42,0.6))', color: 'var(--text-1, #e2e8f0)',
    outline: 'none', boxSizing: 'border-box', transition: 'border 200ms',
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text-3, #94a3b8)', marginBottom: 4, display: 'block' };
  const strength = pwStrength(newPw);

  // [현 차수] .topbar 의 transform:translateZ(0)(GPU 레이어)이 fixed 자손의 containing block 을
  //   생성 → 모달이 헤더(~54px) 기준으로 배치돼 상단이 화면 위로 잘렸다. document.body 로 포털해
  //   viewport 기준 fixed 복구(+overlay 스크롤로 긴 내용도 전체 노출).
  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: '4vh 12px',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '92%', maxWidth: 480, margin: 'auto', // 짧으면 중앙, 길면 상단정렬+overlay 스크롤(전체 노출)
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
            ...(user.plan === 'admin'
              ? [{ id: 'security', label: t('profile.tabAccessKey', '🛡️ 접속키'), icon: '' }]
              : [{ id: 'mfa', label: t('profile.tabMfa', '🔒 2단계 인증'), icon: '' }]),
            { id: 'sessions', label: t('profile.tabSessions', '💻 세션/기기'), icon: '' },
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

            {/* [현 차수] ★회사 상세정보 — API 키 발급신청 등에서 [회사 정보 가져오기]로 재사용(중복입력 제거) */}
            <div style={{ borderTop: '1px solid var(--border, rgba(99,140,255,0.1))', paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2,#475569)', marginBottom: 4 }}>🏢 {t('profile.companyDetailTitle', '회사 상세정보')}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3,#94a3b8)', marginBottom: 10, lineHeight: 1.5 }}>{t('profile.companyDetailHint', '여기 등록해두면 API 키 발급신청 등에서 [내 정보 불러오기]로 자동 입력됩니다 (중복 입력 불필요).')}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>{t('profile.bizNumberLabel', '사업자등록번호')}</label>
                <input value={bizNumber} onChange={e => setBizNumber(e.target.value)} placeholder="000-00-00000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('profile.ceoNameLabel', '대표자명')}</label>
                <input value={ceoName} onChange={e => setCeoName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('profile.bizTypeLabel', '업종 / 사업 유형')}</label>
                <input value={bizType} onChange={e => setBizType(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('profile.countryLabel', '국가')}</label>
                <input value={country} onChange={e => setCountry(e.target.value)} placeholder="KR" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('profile.zipLabel', '우편번호')}</label>
                <input value={zipCode} onChange={e => setZipCode(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('profile.websiteLabel', '웹사이트')}</label>
                <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>{t('profile.addressLabel', '주소')}</label>
              <input value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} />
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
              <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(t('profile.pwGuide2', 'New password must be <strong>8+ characters</strong> with 3 of: upper/lower/number/symbol.')) }} />
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
            {(() => {
              const pwBad = saving || !curPw || !pwPolicyOk(newPw) || newPw !== confirmPw;
              return (
            <button onClick={handleChangePassword} disabled={pwBad}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                cursor: pwBad ? 'not-allowed' : 'pointer',
                background: pwBad ? 'rgba(168,85,247,0.15)' : 'linear-gradient(135deg,#a855f7,#7c3aed)',
                color: pwBad ? 'var(--text-3)' : '#fff',
                fontSize: 14, fontWeight: 800,
                boxShadow: !pwBad ? '0 4px 16px rgba(168,85,247,0.3)' : 'none',
                transition: 'all 200ms',
              }}
            >{saving ? t('profile.changingPw', 'Changing...') : t('profile.changePwBtn', '🔐 Change Password')}</button>
              );
            })()}
          </div>
        )}

        {/* 188차 관리자 접속키 변경 탭 (admin 전용) */}
        {tab === 'security' && user.plan === 'admin' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* 196차 #AI — 플랫폼 AI(Claude) API 키 설정 (최상단·강조) : 실시간 AI 광고 디자인·분석 활성화 */}
            <div style={{ padding: '16px', borderRadius: 14, background: aiKeySet ? 'rgba(34,197,94,0.06)' : 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(79,142,247,0.06))', border: `1.5px solid ${aiKeySet ? 'rgba(34,197,94,0.3)' : 'rgba(168,85,247,0.3)'}` }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-1, #0f172a)', marginBottom: 6 }}>🤖 {t('profile.aiKeyTitle', 'AI 엔진(Claude) API 키')}</div>
              <div style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 12, color: 'var(--text-2, #475569)' }}>
                {aiKeySet ? `✅ ${t('profile.aiKeyOn', 'AI 엔진이 활성화되어 실시간 AI 광고 디자인·분석을 사용합니다.')}`
                  : `⚠️ ${t('profile.aiKeyOff', 'AI 키 미설정 — 현재는 내장 템플릿으로 동작합니다. Anthropic API 키(sk-ant-...)를 입력하면 실시간 AI 디자인이 활성화됩니다.')}`}
              </div>
              <input type="password" value={aiKey} onChange={e => setAiKey(e.target.value)}
                placeholder={aiKeySet ? t('profile.aiKeyKeep', 'sk-ant-... (변경 시에만 입력)') : 'sk-ant-api03-...'} style={inputStyle} autoComplete="new-password" />
              <button onClick={handleSaveAiKey} disabled={saving || !aiKey.trim()}
                style={{ width: '100%', marginTop: 12, padding: '12px 0', borderRadius: 12, border: 'none',
                  cursor: (saving || !aiKey.trim()) ? 'not-allowed' : 'pointer',
                  background: (saving || !aiKey.trim()) ? 'rgba(168,85,247,0.15)' : 'linear-gradient(135deg,#a855f7,#4f8ef7)',
                  color: (saving || !aiKey.trim()) ? 'var(--text-3)' : '#fff', fontSize: 14, fontWeight: 800 }}
              >{saving ? t('profile.saving', '저장 중...') : `🤖 ${t('profile.aiKeySaveBtn', 'AI 키 저장')}`}</button>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', fontSize: 12, color: 'var(--text-3, #94a3b8)', lineHeight: 1.7 }}>
              🛡️ {t('profile.akGuide', '관리자 로그인 접속키를 변경합니다. 아이디(이메일)는 변경할 수 없습니다.')}<br />
              <span style={{ fontSize: 11 }}>{t('profile.akGuide2', '변경 시 현재 비밀번호 확인이 필요하며, 다음 관리자 로그인부터 새 접속키가 적용됩니다.')}</span>
            </div>
            <div>
              <label style={labelStyle}>{t('profile.emailLabel', 'Email (read-only)')}</label>
              <input value={user.email || ''} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <div>
              <label style={labelStyle}>{t('profile.curPwLabel', 'Current Password *')}</label>
              <input type="password" value={akCurPw} onChange={e => setAkCurPw(e.target.value)}
                placeholder={t('profile.curPwPlaceholder', 'Enter current password')} style={inputStyle} autoComplete="current-password" />
            </div>
            <div>
              <label style={labelStyle}>{t('profile.akNewLabel', '새 접속키 *')}</label>
              <input type="password" value={akNew} onChange={e => setAkNew(e.target.value)}
                placeholder={t('profile.akNewPh', '새 접속키 (6자 이상)')} style={inputStyle} autoComplete="new-password" />
            </div>
            <div>
              <label style={labelStyle}>{t('profile.akConfirmLabel', '새 접속키 확인 *')}</label>
              <input type="password" value={akNew2} onChange={e => setAkNew2(e.target.value)}
                placeholder={t('profile.akConfirmPh', '새 접속키 재입력')} style={inputStyle} autoComplete="new-password" />
              {akNew2 && akNew && (
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: akNew === akNew2 ? '#22c55e' : '#ef4444' }}>
                  {akNew === akNew2 ? `✅ ${t('profile.akMatch', '접속키가 일치합니다')}` : `❌ ${t('profile.akNoMatch', '접속키가 일치하지 않습니다')}`}
                </div>
              )}
            </div>
            <button onClick={handleChangeAccessKey} disabled={saving || !akCurPw || akNew.trim().length < 6 || akNew !== akNew2}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                cursor: (saving || !akCurPw || akNew.trim().length < 6 || akNew !== akNew2) ? 'not-allowed' : 'pointer',
                background: (saving || !akCurPw || akNew.trim().length < 6 || akNew !== akNew2) ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                color: (saving || !akCurPw || akNew.trim().length < 6 || akNew !== akNew2) ? 'var(--text-3)' : '#fff',
                fontSize: 14, fontWeight: 800, transition: 'all 200ms',
              }}
            >{saving ? t('profile.changingPw', 'Changing...') : t('profile.changeAkBtn', '🛡️ 접속키 변경')}</button>

            {/* 196차 #3 — 이메일 발송(SMTP) 설정 : 2FA OTP·비번재설정 메일 인프라 */}
            <div style={{ marginTop: 8, paddingTop: 18, borderTop: '1px solid var(--border, #e2e8f0)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1, #0f172a)', marginBottom: 6 }}>📧 {t('profile.smtpTitle', '이메일 발송(SMTP) 설정')}</div>
              <div style={{ padding: '10px 13px', borderRadius: 10, marginBottom: 14, fontSize: 12, lineHeight: 1.7,
                background: smtpConfigured ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.06)',
                border: `1px solid ${smtpConfigured ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`, color: 'var(--text-3, #94a3b8)' }}>
                {smtpConfigured ? `✅ ${t('profile.smtpOn', 'SMTP가 설정되어 이메일 발송이 가능합니다. 이메일 2단계 인증·비밀번호 재설정 메일이 발송됩니다.')}`
                  : `⚠️ ${t('profile.smtpOff', 'SMTP 미설정 — 이메일 2단계 인증이 비활성입니다. SMTP 정보를 입력해 발송을 활성화하세요.')}`}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
                <div>
                  <label style={labelStyle}>{t('profile.smtpHost', 'SMTP 호스트')}</label>
                  <input value={smtp.host} onChange={e => setSmtp(s => ({ ...s, host: e.target.value }))} placeholder="smtp.gmail.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{t('profile.smtpPort', '포트')}</label>
                  <input value={smtp.port} onChange={e => setSmtp(s => ({ ...s, port: e.target.value.replace(/\D/g, '') }))} placeholder="587" style={inputStyle} inputMode="numeric" />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle}>{t('profile.smtpUser', 'SMTP 사용자(계정)')}</label>
                <input value={smtp.user} onChange={e => setSmtp(s => ({ ...s, user: e.target.value }))} placeholder="geniegoroi@ociell.com" style={inputStyle} autoComplete="off" />
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle}>{t('profile.smtpPass', 'SMTP 비밀번호(앱 비밀번호)')}</label>
                <input type="password" value={smtp.pass} onChange={e => setSmtp(s => ({ ...s, pass: e.target.value }))}
                  placeholder={smtp.pass_set ? t('profile.smtpPassKeep', '●●●● (변경 시에만 입력)') : t('profile.smtpPassPh', 'SMTP/앱 비밀번호')} style={inputStyle} autoComplete="new-password" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 10, marginTop: 10 }}>
                <div>
                  <label style={labelStyle}>{t('profile.smtpFrom', '발신 이메일')}</label>
                  <input value={smtp.from} onChange={e => setSmtp(s => ({ ...s, from: e.target.value }))} placeholder="geniegoroi@ociell.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{t('profile.smtpSecure', '보안')}</label>
                  <select value={smtp.secure} onChange={e => setSmtp(s => ({ ...s, secure: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="tls">STARTTLS</option>
                    <option value="ssl">SSL</option>
                    <option value="none">{t('profile.smtpNone', '없음')}</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={labelStyle}>{t('profile.smtpFromName', '발신자 이름')}</label>
                <input value={smtp.from_name} onChange={e => setSmtp(s => ({ ...s, from_name: e.target.value }))} placeholder="Geniego-ROI" style={inputStyle} />
              </div>
              <button onClick={handleSaveSmtp} disabled={saving || !smtp.host.trim() || !smtp.from.trim()}
                style={{ width: '100%', marginTop: 14, padding: '12px 0', borderRadius: 12, border: 'none',
                  cursor: (saving || !smtp.host.trim() || !smtp.from.trim()) ? 'not-allowed' : 'pointer',
                  background: (saving || !smtp.host.trim() || !smtp.from.trim()) ? 'rgba(79,142,247,0.15)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                  color: (saving || !smtp.host.trim() || !smtp.from.trim()) ? 'var(--text-3)' : '#fff', fontSize: 14, fontWeight: 800 }}
              >{saving ? t('profile.saving', '저장 중...') : `📧 ${t('profile.smtpSaveBtn', 'SMTP 설정 저장')}`}</button>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{t('profile.smtpTestTo', '테스트 수신 이메일')}</label>
                  <input value={smtpTestTo} onChange={e => setSmtpTestTo(e.target.value)} placeholder={user.email || 'you@example.com'} style={inputStyle} />
                </div>
                <button onClick={handleTestSmtp} disabled={saving || !smtpConfigured}
                  style={{ padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.06)', color: smtpConfigured ? '#4f8ef7' : 'var(--text-3)', fontWeight: 700, fontSize: 12.5, cursor: (saving || !smtpConfigured) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >✉️ {t('profile.smtpTestBtn', '테스트 발송')}</button>
              </div>
            </div>

            {/* 208차 #2 OAuth 앱 연동 설정 (admin) */}
            <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>🔗 {t('profile.oauthTitle', 'OAuth 앱 연동 설정')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.6 }}>{t('profile.oauthDesc', '각 플랫폼 개발자 콘솔에서 발급한 Client ID/Secret을 등록하면 OAuth 인가 연결이 활성화됩니다.')}</div>
              {OAUTH_PROVIDERS.map(p => {
                const st = oauthStatus[p.id] || {};
                const f = oauthForm[p.id] || {};
                return (
                  <div key={p.id} style={{ marginBottom: 10, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(99,102,241,0.12)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 12.5 }}>{p.label}</span>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: st.configured ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)', color: st.configured ? '#16a34a' : '#94a3b8' }}>{st.configured ? t('profile.oauthConfigured', '설정됨') : t('profile.oauthUnset', '미설정')}</span>
                      {st.connected && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(79,142,247,0.15)', color: '#4f8ef7' }}>{t('profile.oauthConnected', '연결됨')}</span>}
                    </div>
                    {/* [현 차수] 매체 콘솔에 등록할 Redirect URI(복사) + 개발자 콘솔 링크 — redirect_uri_mismatch 방지 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{t('profile.oauthRedirectUri', 'Redirect URI')}:</span>
                      <code style={{ flex: '1 1 200px', fontSize: 10.5, fontFamily: 'monospace', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 6, padding: '4px 7px', color: 'var(--text-2)', wordBreak: 'break-all' }}>{`${window.location.origin}/api/v425/oauth/${p.id}/callback`}</code>
                      <button onClick={() => copyOAuthText(`${window.location.origin}/api/v425/oauth/${p.id}/callback`)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(255,255,255,0.6)', color: '#6366f1', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('profile.copyBtn', '복사')}</button>
                      {p.console && <a href={p.console} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: '#4f8ef7', textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('profile.oauthConsole', '개발자 콘솔 ↗')}</a>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <input value={f.client_id || ''} onChange={e => setOauthForm(o => ({ ...o, [p.id]: { ...o[p.id], client_id: e.target.value } }))} placeholder={st.configured ? '••• Client ID (변경 시 재입력)' : 'Client ID'} style={{ flex: '1 1 150px', padding: '7px 9px', borderRadius: 7, border: '1px solid rgba(99,102,241,0.2)', fontSize: 11.5 }} />
                      <input type="password" value={f.client_secret || ''} onChange={e => setOauthForm(o => ({ ...o, [p.id]: { ...o[p.id], client_secret: e.target.value } }))} placeholder="Client Secret" style={{ flex: '1 1 150px', padding: '7px 9px', borderRadius: 7, border: '1px solid rgba(99,102,241,0.2)', fontSize: 11.5 }} />
                      <button onClick={() => saveOAuthConfig(p.id)} disabled={oauthBusy === p.id} style={{ padding: '7px 12px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f8ef7)', color: '#fff', fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}>{oauthBusy === p.id ? '...' : t('profile.oauthSaveBtn', '저장')}</button>
                      {st.configured && <button onClick={() => connectOAuth(p.id)} style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.06)', color: '#4f8ef7', fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}>{t('profile.oauthConnectBtn', '연결')}</button>}
                      {st.connected && <button onClick={() => refreshOAuthToken(p.id)} disabled={oauthBusy === p.id} style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)', color: '#16a34a', fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}>{t('profile.oauthRefreshBtn', '토큰 갱신')}</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 189차 2단계 인증(MFA/TOTP) 탭 (일반/데모 회원) */}
        {tab === 'mfa' && user.plan !== 'admin' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(20,217,176,0.06)', border: '1px solid rgba(20,217,176,0.18)', fontSize: 12, color: 'var(--text-3, #94a3b8)', lineHeight: 1.7 }}>
              🔒 {t('profile.mfaGuide', '인증 앱(Google Authenticator, Authy 등)으로 6자리 코드를 생성해 로그인 시 추가 인증합니다.')}<br />
              <span style={{ fontSize: 11 }}>{t('profile.mfaGuide2', '활성화하면 다음 로그인부터 비밀번호와 함께 인증 코드를 입력해야 합니다.')}</span>
            </div>

            {/* 상태 표시 */}
            {mfaEnabled === null && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: 8 }}>{t('profile.mfaLoading', '상태 확인 중...')}</div>
            )}

            {/* 활성화 상태 */}
            {mfaEnabled === true && (
              <>
                <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#22c55e' }}>{t('profile.mfaOn', '2단계 인증 활성화됨')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t('profile.mfaRecoveryLeft', '남은 복구 코드')}: {mfaRemaining}</div>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t('profile.curPwLabel', 'Current Password *')}</label>
                  <input type="password" value={mfaDisPw} onChange={e => setMfaDisPw(e.target.value)}
                    placeholder={t('profile.mfaDisablePh', '해제하려면 현재 비밀번호 입력')} style={inputStyle} autoComplete="current-password" />
                </div>
                <button onClick={handleMfaDisable} disabled={saving || !mfaDisPw}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', cursor: (saving || !mfaDisPw) ? 'not-allowed' : 'pointer', background: (saving || !mfaDisPw) ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: (saving || !mfaDisPw) ? 'var(--text-3)' : '#fff', fontSize: 14, fontWeight: 800 }}
                >{saving ? t('profile.processing', '처리 중...') : t('profile.mfaDisableBtn', '🔓 2단계 인증 해제')}</button>
              </>
            )}

            {/* 비활성화 상태 — 설정 시작 */}
            {mfaEnabled === false && !mfaSecret && !mfaRecovery && (
              <button onClick={handleMfaSetup} disabled={saving}
                style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', cursor: saving ? 'wait' : 'pointer', background: saving ? 'rgba(20,217,176,0.3)' : 'linear-gradient(135deg,#14d9b0,#0ea5a3)', color: '#fff', fontSize: 14, fontWeight: 800 }}
              >{saving ? t('profile.processing', '처리 중...') : t('profile.mfaSetupBtn', '🔒 2단계 인증 설정 시작')}</button>
            )}

            {/* setup 진행 — 시크릿 표시 + 코드 확인 */}
            {mfaSecret && (
              <>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.12)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
                  {t('profile.mfaStep1', '① 인증 앱에서 아래 키를 수동으로 추가하세요(또는 setup URI 사용).')}
                </div>
                <div>
                  <label style={labelStyle}>{t('profile.mfaSecretLabel', '설정 키 (Setup Key)')}</label>
                  <input value={mfaSecret} readOnly onFocus={e => e.target.select()} style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 1 }} />
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, wordBreak: 'break-all' }}>{mfaOtpauth}</div>
                </div>
                <div>
                  <label style={labelStyle}>{t('profile.mfaStep2', '② 인증 앱에 표시된 6자리 코드 입력 *')}</label>
                  <input value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000" inputMode="numeric" style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: 4, fontSize: 18, textAlign: 'center' }} autoComplete="one-time-code" />
                </div>
                <button onClick={handleMfaEnable} disabled={saving || !/^\d{6}$/.test(mfaCode)}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', cursor: (saving || !/^\d{6}$/.test(mfaCode)) ? 'not-allowed' : 'pointer', background: (saving || !/^\d{6}$/.test(mfaCode)) ? 'rgba(20,217,176,0.15)' : 'linear-gradient(135deg,#14d9b0,#0ea5a3)', color: (saving || !/^\d{6}$/.test(mfaCode)) ? 'var(--text-3)' : '#fff', fontSize: 14, fontWeight: 800 }}
                >{saving ? t('profile.processing', '처리 중...') : t('profile.mfaEnableBtn', '✅ 활성화')}</button>
              </>
            )}

            {/* 복구 코드 표시(1회) */}
            {Array.isArray(mfaRecovery) && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', fontSize: 12, color: '#fbbf24', lineHeight: 1.6 }}>
                  ⚠️ {t('profile.mfaRecoveryWarn', '아래 복구 코드를 안전한 곳에 보관하세요. 인증 앱을 사용할 수 없을 때 1회씩 로그인에 사용할 수 있으며, 이 화면을 벗어나면 다시 표시되지 않습니다.')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {mfaRecovery.map((c, i) => (
                    <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, rgba(99,140,255,0.15))', fontFamily: 'monospace', fontSize: 13, letterSpacing: 1, color: 'var(--text-1, #e2e8f0)', textAlign: 'center' }}>{c}</div>
                  ))}
                </div>
                <button onClick={() => { try { navigator.clipboard.writeText(mfaRecovery.join('\n')); showMsg(t('profile.copied', '복사되었습니다.'), 'ok'); } catch {} }}
                  style={{ padding: '10px 0', borderRadius: 10, border: '1px solid var(--border, rgba(99,140,255,0.2))', background: 'transparent', color: 'var(--text-2, #cbd5e1)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >📋 {t('profile.mfaCopyCodes', '복구 코드 복사')}</button>
              </div>
            )}
          </div>
        )}

        {/* 189차+ 세션/기기 관리 탭 */}
        {tab === 'sessions' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.12)', fontSize: 12, color: 'var(--text-3, #94a3b8)', lineHeight: 1.7 }}>
              💻 {t('profile.sessGuide', '현재 로그인된 기기·세션 목록입니다. 본인이 아닌 세션이 있으면 즉시 로그아웃하세요.')}
            </div>

            {sessLoading && <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: 8 }}>{t('profile.sessLoading', '불러오는 중...')}</div>}

            {Array.isArray(sessions) && sessions.length === 0 && !sessLoading && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: 8 }}>{t('profile.sessNone', '활성 세션이 없습니다.')}</div>
            )}

            {Array.isArray(sessions) && sessions.map((s) => (
              <div key={s.id} style={{ padding: '12px 14px', borderRadius: 12, background: s.current ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${s.current ? 'rgba(34,197,94,0.25)' : 'var(--border, rgba(99,140,255,0.15))'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15 }}>{/Mobile|Android|iPhone|iPad/i.test(s.ua || '') ? '📱' : '🖥️'}</span>
                  <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-1, #e2e8f0)' }}>
                    {(s.ua || '').replace(/\(.*?\)/g, '').split(' ').slice(0, 3).join(' ') || t('profile.sessUnknownDevice', '알 수 없는 기기')}
                  </span>
                  {s.current && <span style={{ padding: '1px 8px', borderRadius: 99, fontSize: 9, fontWeight: 800, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>{t('profile.sessCurrent', '현재 기기')}</span>}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3, #94a3b8)' }}>
                  IP: {s.ip || '-'} · {t('profile.sessSince', '로그인')}: {(s.created_at || '').slice(0, 16).replace('T', ' ')}
                </div>
              </div>
            ))}

            {Array.isArray(sessions) && sessions.filter(s => !s.current).length > 0 && (
              <button onClick={handleRevokeOthers} disabled={saving}
                style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', cursor: saving ? 'wait' : 'pointer', background: saving ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontSize: 14, fontWeight: 800 }}
              >{saving ? t('profile.processing', '처리 중...') : `🚪 ${t('profile.sessRevokeOthers', '다른 모든 기기에서 로그아웃')}`}</button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});

export function ThemeToggle() { return null; }
export function NotificationBell() { return null; }

