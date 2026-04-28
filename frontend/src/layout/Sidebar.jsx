import React, { useMemo, useState, useEffect, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useT, useI18n } from "../i18n/index.js";
import SIDEBAR_DICT from './sidebarI18n.js';
import { useAuth } from "../auth/AuthContext.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useMobileSidebar } from "../context/MobileSidebarContext.jsx";

/* 데모 모드 감지 */
const IS_DEMO_MODE = typeof window !== 'undefined'
  ? (window.location.hostname.includes('roidemo') || window.location.hostname.includes('demo') || import.meta.env.VITE_DEMO_MODE === 'true')
  : import.meta.env.VITE_DEMO_MODE === 'true';

/* 즐겨찾기 */
function useFavorites() {
  const [favs, setFavs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('g_sidebar_favs') || '[]')); }
    catch { return new Set(); }
  });
  const toggle = useCallback((path) => {
    setFavs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      try { localStorage.setItem('g_sidebar_favs', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);
  return { favs, toggle };
}

/* 최근 방문 */
function useRecentVisits(allItems, maxItems = 5) {
  const location = useLocation();
  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('g_sidebar_recents') || '[]'); }
    catch { return []; }
  });
  useEffect(() => {
    const matched = allItems.find(it => it.to === location.pathname);
    if (!matched) return;
    setRecents(prev => {
      const filtered = prev.filter(r => r.to !== location.pathname);
      const next = [{ to: matched.to, label: matched.label, icon: matched.icon }, ...filtered].slice(0, maxItems);
      try { localStorage.setItem('g_sidebar_recents', JSON.stringify(next)); } catch {}
      return next;
    });
  }, [location.pathname]);
  return recents;
}

// Upgrade 안내 모달 (유료 Plan 전용 메뉴 접근 시)
function Upgradal({ menuLabel, onClose, t }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(135deg,#0f172a,#1e293b)",
          border: "1px solid rgba(99,102,241,0.4)",
          borderRadius: 20, padding: "32px 28px", maxWidth: 400, width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 900, fontSize: 18, color: "var(--text-1)", marginBottom: 8 }}>
          {menuLabel} — {t('g.upgradalTitle')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 24 }}>
          {(t('g.upgradalDesc') || '').split('\n').map((line, i) => (
            <React.Fragment key={i}>{line}{i === 0 && <br/>}</React.Fragment>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px", borderRadius: 10, border: '1px solid var(--border)',
              background: "transparent", color: 'var(--text-3)', fontSize: 13, cursor: "pointer",
            }}
          >
            {t('g.upgradalClose')}
          </button>
          <button
            onClick={() => { onClose(); window.location.href = "/app-pricing"; }}
            style={{
              padding: "9px 22px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#4f8ef7,#6366f1)",
              color: 'var(--text-1)', fontWeight: 800, fontSize: 13, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(79,142,247,0.4)",
            }}
          >
            {t('g.upgradalBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Admin 전용 메뉴 잠금 목록 (데모 User에게 잠금)
const ADMIN_ONLY_MENU_KEYS = new Set([
  "system||admin",
  "system||user_management",
  "system||db_admin",
  "system||pg_config",
  "system||system_monitor",
]);


/* 일반 회원 메뉴 (Free/유료 회원 공통) */
const MEMBER_MENU = [
  /* 홈 */
  {
    key: "home", icon: "⬡", labelKey: "gNav.home",
    items: [
      { to: "/dashboard",  icon: "⬡", labelKey: "gNav.dashboardLabel",    menuKey: "home||dashboard" },
      { to: "/rollup",     icon: "🗂️", labelKey: "gNav.rollupLabel",        menuKey: "home||rollup" },
    ],
  },
  /* AI 전략 & 캠페인 */
  {
    key: "ai_marketing", icon: "🚀", labelKey: "gNav.aiMarketing",
    items: [
      { to: "/auto-marketing",      icon: "💎", labelKey: "gNav.autoMarketingLabel",      menuKey: "marketing" },
      { to: "/campaign-manager",    icon: "🎯", labelKey: "gNav.campaignManagerLabel",    menuKey: "marketing" },
      { to: "/journey-builder",     icon: "🗺️", labelKey: "gNav.journeyBuilderLabel",     menuKey: "marketing" },
    ],
  },
  /* 광고 성과 분석 */
  {
    key: "ad_analytics", icon: "📣", labelKey: "gNav.adAnalytics",
    items: [
      { to: "/marketing",               icon: "📣", labelKey: "gNav.adPerformanceLabel",      menuKey: "marketing" },
      { to: "/budget-tracker",          icon: "💰", labelKey: "gNav.budgetTrackerLabel",      menuKey: "marketing" },
      { to: "/account-performance",     icon: "🏢", labelKey: "gNav.accountPerformanceLabel", menuKey: "marketing" },
      { to: "/attribution",             icon: "🔗", labelKey: "gNav.attributionLabel",        menuKey: "marketing" },
      { to: "/channel-kpi",             icon: "📊", labelKey: "gNav.channelKpiLabel",         menuKey: "marketing" },
      { to: "/graph-score",             icon: "🕸️", labelKey: "gNav.graphScoreLabel",         menuKey: "marketing" },
    ],
  },
  /* 고객 & 채널 (CRM/UGC 통합) */
  {
    key: "crm", icon: "👤", labelKey: "gNav.crmLabel",
    items: [
      { to: "/crm",             icon: "👥", labelKey: "gNav.crmMainLabel",         menuKey: "marketing" },
      { to: "/kakao-channel",   icon: "💬", labelKey: "gNav.kakaoChannelLabel",    menuKey: "marketing" },
      { to: "/email-marketing", icon: "✉️", labelKey: "gNav.emailMarketingLabel",  menuKey: "marketing" },
      { to: "/sms-marketing",   icon: "📱", labelKey: "gNav.smsMarketingLabel",    menuKey: "marketing" },
      { to: "/influencer",      icon: "🤝", labelKey: "gNav.influencerLabel",      menuKey: "marketing" },
      { to: "/content-calendar",icon: "📅", labelKey: "gNav.contentCalendarLabel", menuKey: "marketing" },
      { to: "/reviews-ugc",     icon: "⭐", labelKey: "gNav.reviewsUgcLabel",      menuKey: "marketing" },
      { to: "/web-popup",       icon: "🎯", labelKey: "gNav.webPopupLabel",        menuKey: "marketing" },
    ],
  },
  /* 커머스 & 물류 */
  {
    key: "commerce", icon: "🛒", labelKey: "gNav.commerceLabel",
    items: [
      { to: "/omni-channel",    icon: "🌐", labelKey: "gNav.omniChannelLabel",      menuKey: "ops" },
      { to: "/catalog-sync",    icon: "📂", labelKey: "gNav.catalogLabel",          menuKey: "ops" },
      { to: "/order-hub",       icon: "📦", labelKey: "gNav.orderHubLabel",         menuKey: "ops" },
      { to: "/wms-manager",     icon: "🏭", labelKey: "gNav.wmsLabel",              menuKey: "ops" },
      { to: "/price-opt",       icon: "💡", labelKey: "gNav.priceOptLabel",         menuKey: "ops" },
      { to: "/supply-chain",    icon: "🔭", labelKey: "gNav.supplyChainLabel",      menuKey: "ops" },
      { to: "/returns-portal",  icon: "🔄", labelKey: "gNav.returnsPortalLabel",    menuKey: "ops" },
    ],
  },
  /* 인사이트 & 리포트 */
  {
    key: "analytics", icon: "📊", labelKey: "gNav.analytics",
    items: [
      { to: "/performance",    icon: "📊", labelKey: "gNav.performanceHubLabel", menuKey: "analytics||performance_hub" },
      { to: "/report-builder", icon: "📋", labelKey: "gNav.reportBuilderLabel", menuKey: "analytics||report_builder" },
      { to: "/pnl",            icon: "🌊", labelKey: "gNav.pnlLabel",           menuKey: "analytics||pnl_analytics" },
      { to: "/ai-insights",    icon: "🤖", labelKey: "gNav.aiInsightsLabel",    menuKey: "analytics||ai_insights" },
      { to: "/data-product",   icon: "🗂️", labelKey: "gNav.dataProductLabel",   menuKey: "analytics||data_product" },
    ],
  },
  /* 자동화 & 알람 (통합) */
  {
    key: "automation", icon: "🤖", labelKey: "gNav.automation",
    items: [
      { to: "/ai-rule-engine",    icon: "🧠", labelKey: "gNav.aiRuleEngineLabel",    menuKey: "automation||ai_rule_engine" },
      { to: "/approvals",         icon: "✅", labelKey: "gNav.approvalsLabel",       menuKey: "automation||approvals" },
      { to: "/writeback",         icon: "↩", labelKey: "gNav.writebackLabel",       menuKey: "automation||writeback" },
      { to: "/onboarding",        icon: "🗺️", labelKey: "gNav.onboardingLabel",      menuKey: "automation||onboarding" },
    ],
  },
  /* 데이터 & 연동 (통합) */
  {
    key: "data", icon: "🔌", labelKey: "gNav.data",
    items: [
      { to: "/integration-hub",  icon: "🔗", labelKey: "gNav.integrationHubLabel", menuKey: "data||integration_hub" },
      { to: "/data-schema",      icon: "📋", labelKey: "gNav.dataSchemaLabel",     menuKey: "data||data_schema" },
      { to: "/data-trust",       icon: "🔬", labelKey: "gNav.dataTrustLabel",      menuKey: "data||data_trust" },
    ],
  },
  /* 재무 & 결산 */
  {
    key: "finance", icon: "💳", labelKey: "gNav.finance",
    items: [
      { to: "/settlements",    icon: "📋", labelKey: "gNav.settlementsLabel",    menuKey: "billing" },
      { to: "/reconciliation", icon: "💰", labelKey: "gNav.reconciliationLabel", menuKey: "billing" },
      { to: "/app-pricing",    icon: "💳", labelKey: "gNav.pricingLabel",        menuKey: "billing" },
      { to: "/audit",          icon: "🧾", labelKey: "gNav.auditLogLabel",       menuKey: "billing" },
    ],
  },
  /* 운영 & 지원 (일반) */
  {
    key: "member_tools", icon: "👥", labelKey: "gNav.memberTools",
    items: [
      { to: "/workspace",       icon: "👥", labelKey: "gNav.workspaceLabel",     menuKey: "system||workspace" },
      { to: "/operations",      icon: "⚡", labelKey: "gNav.operationsLabel",    menuKey: "system||operations" },
      { to: "/case-study",      icon: "🏆", labelKey: "gNav.caseStudyLabel",     menuKey: "system||case_study" },
      { to: "/help",            icon: "📚", labelKey: "gNav.helpLabel",          menuKey: "system||help_center" },
      { to: "/feedback",        icon: "💬", labelKey: "gNav.feedbackLabel",      menuKey: "system||feedback" },
      { to: "/developer-hub",   icon: "⚙️", labelKey: "gNav.developerHubLabel", menuKey: "system||developer_hub" },
    ],
  },
];

/* 플랫폼 Admin 전용 메뉴 (중복 통합 완료) */
const ADMIN_MENU = [
  {
    key: "system",
    icon: "🔧",
    labelKey: "gNav.adminSystem",
    items: [
      { to: "/admin",     icon: "⚙", labelKey: "gNav.platformEnvLabel",  menuKey: "system||admin" },
      { to: "/db-admin",  icon: "🗄️", labelKey: "gNav.dbSchemaLabel",   menuKey: "system||db_admin" },
      { to: "/pg-config", icon: "💳", labelKey: "gNav.paymentPgLabel",  menuKey: "system||pg_config" },
    ],
  },
];


/* Section Component with Lock Support */
function NavSection({ section, t, isOpen, onToggle, hasMenuAccess, isDemo, onLockClick }) {
  const location = useLocation();
  const hasActive = section.items.some(i => location.pathname === i.to);

  const sectionLabel = section.label ?? t(section.labelKey, section.labelKey.split('.')[1]);

  // 접근 권한 체크:
  //  - 데모 User: ADMIN_ONLY_MENU_KEYS에 해당하는 것만 잠금, 나머지 전부 열람 가능
  //  - 유료 User: hasMenuAccess(서버 Save 권한) 기준으로 체크
  const itemHasAccess = (item) => {
    const key = item.menuKey || item.to.replace(/^\//, "");
    // 데모 User는 admin 전용 메뉴만 잠금 (나머지 모두 열람 가능)
    if (isDemo) {
      return !ADMIN_ONLY_MENU_KEYS.has(key);
    }
    // 유료/admin User: hasMenuAccess 서버 권한 체크 (없으면 허용)
    if (!hasMenuAccess) return true;
    return hasMenuAccess(key);
  };

  // Single-item sections render without accordion
  if (section.items.length === 1) {
    const item = section.items[0];
    const label = item.label ?? t(item.labelKey, item.labelKey.split('.')[1]);
    const accessible = itemHasAccess(item);
    if (!accessible) {
      return (
        <div
          onClick={() => onLockClick && onLockClick(label)}
          className="nav-item"
          style={{ cursor: "pointer", opacity: 0.55 }}
        >
          <span className="nav-icon">🔒</span>
          <span className="truncate">{label}</span>
        </div>
      );
    }
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
      >
        <span className="nav-icon">{item.icon}</span>
        <span className="truncate">{label}</span>
      </NavLink>
    );
  }

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={() => onToggle()}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          padding: "7px 12px", border: "none", background: "none", cursor: "pointer",
          borderRadius: 8, color: hasActive ? "var(--text-1)" : "var(--text-2)",
          fontWeight: hasActive ? 700 : 600, fontSize: 12,
          transition: "background 150ms",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(99,140,255,0.07)"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>{section.icon}</span>
        <span style={{ flex: 1, textAlign: "left" }}>{sectionLabel}</span>
        {hasActive && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4f8ef7", flexShrink: 0 }} />}
        <span style={{
          fontSize: 9, color: "var(--text-3)", transition: "transform 200ms",
          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0,
        }}>▶</span>
      </button>

      <div style={{
        overflow: "hidden",
        maxHeight: isOpen ? `${section.items.length * 40}px` : "0px",
        transition: "max-height 220ms cubic-bezier(.4,0,.2,1)",
      }}>
        <div style={{ paddingLeft: 10 }}>
          {section.items.map(item => {
            const label = item.label ?? t(item.labelKey, item.labelKey.split('.')[1]);
            const accessible = itemHasAccess(item);
            if (!accessible) {
              return (
                <div
                  key={item.to}
                  onClick={() => onLockClick && onLockClick(label)}
                  className="nav-item"
                  style={{
                    fontSize: 11, paddingLeft: 24, position: "relative",
                    cursor: "pointer", opacity: 0.5, display: "flex", alignItems: "center",
                  }}
                >
                  <span style={{
                    position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                    width: 6, height: 1, background: "rgba(99,140,255,0.25)",
                  }} />
                  <span className="nav-icon" style={{ fontSize: 12 }}>🔒</span>
                  <span className="truncate" style={{ color: "var(--text-3)" }}>{label}</span>
                  <span style={{
                    marginLeft: "auto", fontSize: 7, padding: "1px 5px", borderRadius: 4,
                    background: "rgba(99,102,241,0.15)", color: "#a5b4fc",
                    border: "1px solid rgba(99,102,241,0.25)", whiteSpace: "nowrap", flexShrink: 0,
                  }}>{t('g.upgradeLabel')}</span>
                </div>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                style={{ fontSize: 11, paddingLeft: 24, position: "relative" }}
              >
                <span style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  width: 6, height: 1, background: "rgba(99,140,255,0.25)",
                }} />
                <span className="nav-icon" style={{ fontSize: 12 }}>{item.icon}</span>
                <span className="truncate">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* 즐겨찾기/최근방문 패널 (아코디언) */
function QuickAccessPanel({ favs, recents, allItems, navigate, toggleFav, t, isExpanded, onToggle }) {
  const [tab, setTab] = useState('recents');
  const hasFavs = favs && favs.size > 0;
  const hasRecents = recents && recents.length > 0;
  if (!hasFavs && !hasRecents) return null;

  const activeTab = tab === 'favs' && !hasFavs ? 'recents' : tab === 'recents' && !hasRecents ? 'favs' : tab;
  const items = activeTab === 'favs'
    ? [...favs].map(path => allItems.find(it => it.to === path) || { to: path, label: path, icon: '📄' })
    : recents;
  const itemCount = activeTab === 'favs' ? favs.size : recents.length;

  return (
    <div style={{ margin: '4px 8px 0', borderRadius: 10, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.1)', overflow: 'hidden' }}>
      {/* 아코디언 헤더 */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px', cursor: 'pointer', userSelect: 'none',
          background: isExpanded ? 'rgba(79,142,247,0.08)' : 'transparent',
          transition: 'background 200ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = isExpanded ? 'rgba(79,142,247,0.08)' : 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, opacity: 0.7 }}>⏱️</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)' }}>{t('root_quickRecents', t('g.quickRecents', 'Recent'))}</span>
          {itemCount > 0 && (
            <span style={{
              fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 8,
              background: 'rgba(79,142,247,0.15)', color: '#4f8ef7',
            }}>{itemCount}</span>
          )}
        </div>
        <span style={{
          fontSize: 10, color: 'var(--text-3)', transition: 'transform 250ms ease',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▶</span>
      </div>

      {/* 아코디언 본문 (열기/접기) */}
      <div style={{
        maxHeight: isExpanded ? '300px' : '0px',
        overflow: 'hidden',
        transition: 'max-height 300ms cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* 탭 전환 */}
        {hasFavs && hasRecents && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <button onClick={(e) => { e.stopPropagation(); setTab('favs'); }} style={{ flex: 1, padding: '5px 0', fontSize: 9, fontWeight: 700, border: 'none', cursor: 'pointer', background: activeTab === 'favs' ? 'rgba(79,142,247,0.12)' : 'transparent', color: activeTab === 'favs' ? '#4f8ef7' : 'var(--text-3)', transition: 'all 150ms' }}>⭐{t('g.quickFavs', 'Favorites')} {favs.size}</button>
            <button onClick={(e) => { e.stopPropagation(); setTab('recents'); }} style={{ flex: 1, padding: '5px 0', fontSize: 9, fontWeight: 700, border: 'none', cursor: 'pointer', background: activeTab === 'recents' ? 'rgba(34,197,94,0.1)' : 'transparent', color: activeTab === 'recents' ? '#22c55e' : 'var(--text-3)', transition: 'all 150ms' }}>🕐 {t('g.quickRecents', 'Recent')}</button>
          </div>
        )}

        {/* 아이템 리스트 */}
        <div style={{ padding: '4px 0' }}>
          {items.slice(0, 5).map((item, i) => (
            <div key={item.to || i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button onClick={() => navigate(item.to)} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, padding: '5px 10px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 120ms', minWidth: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize: 12, flexShrink: 0 }}>{item.icon || '📄'}</span>
                <span style={{ fontSize: 10, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label ? t(item.label) : item.to}</span>
              </button>
              {activeTab === 'favs' && toggleFav && (
                <button onClick={() => toggleFav(item.to)} style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#eab308', fontSize: 10, flexShrink: 0, lineHeight: 1 }} title={t('sidebar.removeFav')}>✕</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Main Sidebar */
export default function Sidebar() {
  const t = useT();
  const { lang } = useI18n();
  /* gNav embedded translator: checks sidebarI18n first, then falls back to t() */
  const navT = useCallback((key, fallback) => {
    if (key && key.startsWith('gNav.')) {
      const k = key.slice(5);
      const loc = SIDEBAR_DICT[lang] || SIDEBAR_DICT.en || {};
      if (loc[k]) return loc[k];
    }
    return t(key, fallback);
  }, [t, lang]);
  const {user, logout, isDemo, isPro, isAdmin, hasMenuAccess} = useAuth();
  const [lockModal, setLockModal] = useState(null); // locked menu label
  const { open: mobileOpen, close: mobileClose } = useMobileSidebar();
  const navigate = useNavigate();
  const { unreadAlertCount, activeCampaignCount } = useGlobalData();
  const { favs, toggle: toggleFav } = useFavorites();

  // 모든 메뉴 아이템 flat 목록 (최근방문용)
  const allMenuItems = React.useMemo(() => {
    const menu = isAdmin ? [...MEMBER_MENU, ...ADMIN_MENU] : MEMBER_MENU;
    return menu.flatMap(s => s.items.map(item => ({
      to: item.to,
      label: item.label ?? item.labelKey ?? item.to,
      icon: item.icon,
    })));
  }, [isAdmin]);
  const recents = useRecentVisits(allMenuItems, 5);

  const location = useLocation();
  
  // Accordion Sidebar Core Logic
  const initialActiveSection = React.useMemo(() => {
    const allSecs = isAdmin ? [...MEMBER_MENU, ...ADMIN_MENU] : MEMBER_MENU;
    for (const sec of allSecs) {
      if (sec.items.some(it => it.to === location.pathname)) return sec.key;
    }
    return null;
  }, [location.pathname, isAdmin]);

  const [openSectionId, setOpenSectionId] = useState(initialActiveSection);
  const [quickExpanded, setQuickExpanded] = useState(false); // 기본 접힘 → 클릭 시에만 펼침

  useEffect(() => {
    if (initialActiveSection) setOpenSectionId(initialActiveSection);
  }, [initialActiveSection]);

  // 라우트 변경 시 최근 방문 패널 자동 접기 + 모바일 사이드바 Close
  useEffect(() => {
    setQuickExpanded(false);
    mobileClose();
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* 모바일 사이드바 배경 오버레이 */}
      {mobileOpen && (
        <div
          onClick={mobileClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 299,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
            display: 'none', // CSS 미디어쿼리에서 Active
          }}
          className="sidebar-overlay"
        />
      )}
    <div className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
      {/* Upgrade 모달 */}
      {lockModal && (
        <Upgradal
          menuLabel={lockModal}
          onClose={() => setLockModal(null)}
          t={t}
        />
      )}

      {/* Logo */}
      <div className="sidebar-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
        <div style={{
          width: 54, height: 54, borderRadius: 13, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(232,229,244,0.95), rgba(221,217,238,0.9))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 16px rgba(79,142,247,0.25), 0 0 0 1px rgba(79,142,247,0.08)',
          overflow: 'hidden',
        }}>
          <img
            src="/logo_v5.png"
            alt="Geniego-ROI"
            style={{ width: 54, height: 54, objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
          />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-name">Geniego-ROI</div>
          <div className="sidebar-logo-version">{IS_DEMO_MODE ? "Demo System" : "Production v423"}</div>
        </div>
      </div>

      {/* 실시간 현황 배지 */}
      {(unreadAlertCount > 0 || activeCampaignCount > 0) && (
        <div style={{
          margin: "4px 8px", padding: "6px 10px", borderRadius: 8,
          background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.12)",
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
        }}>
          {activeCampaignCount > 0 && (
            <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 700 }}>
              {(t('g.sidebarCampaignActive') || '🚀 {n} campaigns').replace('{n}', activeCampaignCount)}
            </span>
          )}
          {unreadAlertCount > 0 && (
            <span
              onClick={() => navigate("/alert-policies")}
              style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700, cursor: "pointer" }}
            >
              {(t('g.sidebarAlertCount') || '🔔 {n} alerts').replace('{n}', unreadAlertCount)}
            </span>
          )}
        </div>
      )}

      {/* 즐겨찾기 + 최근방문 패널 (아코디언) */}
      <QuickAccessPanel
        favs={favs} recents={recents} allItems={allMenuItems}
        navigate={navigate} toggleFav={toggleFav} t={t}
        isExpanded={quickExpanded}
        onToggle={() => setQuickExpanded(prev => !prev)}
      />

      {/* 데모/운영 환경 구분 배너 */}
      <div style={{
        margin: '4px 8px', padding: '8px 10px', borderRadius: 10,
        background: IS_DEMO_MODE
          ? 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(245,158,11,0.1))'
          : 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.05))',
        border: `1px solid ${IS_DEMO_MODE ? 'rgba(251,146,60,0.35)' : 'rgba(79,142,247,0.2)'}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: IS_DEMO_MODE ? '#fb923c' : '#4f8ef7', marginBottom: 2 }}>
          {IS_DEMO_MODE ? t('sidebar.demoMode', '🧪 Demo Mode') : t('sidebar.prodMode', '🏢 Production System')}
        </div>
        <div style={{ fontSize: 8, color: IS_DEMO_MODE ? 'rgba(251,146,60,0.7)' : 'rgba(79,142,247,0.6)', lineHeight: 1.4 }}>
          {IS_DEMO_MODE ? t('sidebar.demoDesc', 'Explore all features with virtual data') : t('sidebar.prodDesc', 'Production Environment')}
        </div>
      </div>

      {/* Accordion Nav */}
      <div style={{ display: "grid", gap: 2, padding: "4px 0" }}>
        {/* 플랫폼 Admin: 일반 메뉴 + Admin 전용 메뉴 All 표시 */}
        {/* 일반 회원(Free/유료): 일반 메뉴(MEMBER_MENU)만 표시 */}
        {(isAdmin ? [...MEMBER_MENU, ...ADMIN_MENU] : MEMBER_MENU).map((section, i) => (
          <NavSection
            key={section.key}
            section={section}
            t={navT}
            isOpen={openSectionId === section.key}
            onToggle={() => {
              setOpenSectionId(prev => prev === section.key ? null : section.key);
              setQuickExpanded(false); // 메뉴 섹션 클릭 시 최근 방문 자동 접기
            }}
            hasMenuAccess={isAdmin ? null : hasMenuAccess}
            isDemo={isDemo}
            onLockClick={(label) => setLockModal(label)}
          />
        ))}
      </div>


      {/* User 패널 */}
      {user && (
        <div style={{
          margin: "8px 8px 0", padding: "10px 12px", borderRadius: 10,
          background: IS_DEMO_MODE ? "rgba(251,146,60,0.04)" : "rgba(99,140,255,0.04)",
          border: `1px solid ${IS_DEMO_MODE ? 'rgba(251,146,60,0.15)' : 'rgba(99,140,255,0.1)'}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: IS_DEMO_MODE
                ? "linear-gradient(135deg,#fb923c,#f59e0b)"
                : (isPro ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "linear-gradient(135deg,#eab308,#f59e0b)"),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 900, color: 'var(--text-1)',
            }}>{user.name?.[0] || "U"}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontSize: 9, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
          </div>
          {/* 회원 유형 배지 */}
          <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 8, flexWrap: 'wrap' }}>
            {IS_DEMO_MODE ? (
              <>
                <span style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 9, fontWeight: 800,
                  background: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(245,158,11,0.15))',
                  color: '#fb923c',
                  border: '1px solid rgba(251,146,60,0.4)',
                  animation: 'demoPulse 2s ease-in-out infinite',
                }}>{t('sidebar.demoBadge', '🧪 Demo Member')}</span>
                <span style={{
                  fontSize: 8, color: 'rgba(251,146,60,0.6)', fontWeight: 600,
                }}>{t('sidebar.demoSysDesc', 'Demo System')}</span>
              </>
            ) : (
              <>
                <span style={{
                  padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 800,
                  background: isPro ? "rgba(79,142,247,0.12)" : "rgba(234,179,8,0.12)",
                  color: isPro ? "#4f8ef7" : "#eab308",
                  border: `1px solid ${isPro ? "rgba(79,142,247,0.25)" : "rgba(234,179,8,0.25)"}`,
                }}>{isPro ? t('sidebar.proBadge', '🚀 PRO') : t('sidebar.freeBadge', '⭐ Free')}</span>
                <span style={{
                  fontSize: 8, color: 'rgba(79,142,247,0.6)', fontWeight: 600,
                }}>{t('sidebar.prodMember', 'Production Member')}</span>
              </>
            )}
          </div>
          {/* 데모 회원: 운영시스템 전환 안내 */}
          {IS_DEMO_MODE && (
            <a href="https://roi.genie-go.com/login" style={{
              display: 'block', width: '100%', padding: '6px 0', borderRadius: 7,
              background: 'linear-gradient(135deg, rgba(79,142,247,0.12), rgba(99,102,241,0.08))',
              border: '1px solid rgba(79,142,247,0.25)',
              color: '#4f8ef7', fontSize: 9, fontWeight: 700,
              textAlign: 'center', textDecoration: 'none',
              marginBottom: 6, transition: 'all 200ms',
            }}>
              {t('sidebar.loginProd', '🏢 Production Login / Sign Up')}
            </a>
          )}
          <button onClick={handleLogout} style={{
            width: "100%", padding: "5px 0", borderRadius: 7, border: "1px solid rgba(99,140,255,0.15)",
            background: "transparent", color: "var(--text-3)", fontSize: 10, cursor: "pointer",
            fontWeight: 600, transition: "all 150ms",
          }}>{t('sidebar.logout', t('root_sidebarLogout', t('g.sidebarLogout', 'Logout')))}</button>
        </div>
      )}

      <div className="sidebar-footer">
        {t('sidebar.footerLine1', 'Revenue + Risk + Governance')}<br />{t('sidebar.footerLine2', 'Settlement OS · v423.0.0')}
      </div>
    </div>
    </>
  );
}
