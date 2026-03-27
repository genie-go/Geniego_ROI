import React, { useMemo, useState, useEffect, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useT } from "../i18n/index.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useMobileSidebar } from "../context/MobileSidebarContext.jsx";

/* ─── 즐겨찾기 훅 ───────────────────────────────────────────────── */
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

/* ─── 최근 방문 훅 ─────────────────────────────────────────────── */
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

// Upgrade 안내 모달 (유료 Plan 전용 메뉴에 접근 시)
function UpgradeModal({ menuLabel, onClose, t }) {
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
        <div style={{ fontWeight: 900, fontSize: 18, color: "#e2e8f0", marginBottom: 8 }}>
          {menuLabel} — {t('gDemo.upgradeModalTitle')}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 24 }}>
          {(t('gDemo.upgradeModalDesc') || '').split('\n').map((line, i) => (
            <React.Fragment key={i}>{line}{i === 0 && <br/>}</React.Fragment>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer",
            }}
          >
            {t('gDemo.upgradeModalClose')}
          </button>
          <button
            onClick={() => { onClose(); window.location.href = "/app-pricing"; }}
            style={{
              padding: "9px 22px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#4f8ef7,#6366f1)",
              color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(79,142,247,0.4)",
            }}
          >
            {t('gDemo.upgradeModalBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Admin 전용 메뉴 키 목록 (데모 User에게만 잠금)
const ADMIN_ONLY_MENU_KEYS = new Set([
  "system||admin",
  "system||user_management",
  "system||db_admin",
  "system||pg_config",
  "system||system_monitor",
]);


/* ─── 회원용 메뉴 (Free/유료 회원 공통) ────────────────────────────────────── */
const MEMBER_MENU = [
  /* ① 홈 */
  {
    key: "home", icon: "⬡", labelKey: "gNav.home",
    items: [
      { to: "/dashboard",  icon: "⬡",   labelKey: "gNav.dashboard",    menuKey: "home||dashboard" },
      { to: "/rollup",     icon: "🗂️",  labelKey: "gNav.rollup",        menuKey: "home||rollup" },
    ],
  },
  /* ② AI 전략 & 캠페인 */
  {
    key: "ai_marketing", icon: "🚀", labelKey: "gNav.aiMarketing",
    items: [
      { to: "/auto-marketing",    icon: "🚀", labelKey: "gNav.autoMarketing",    menuKey: "marketing" },
      { to: "/campaign-manager",  icon: "🎯", labelKey: "gNav.campaignManager",  menuKey: "marketing" },
      { to: "/journey-builder",   icon: "🗺️", labelKey: "gNav.journeyBuilder",   menuKey: "marketing" },
      { to: "/ai-recommend",      icon: "💡", labelKey: "gNav.aiRecommend",      menuKey: "marketing" },
    ],
  },
  /* ③ 광고 성과 분석 */
  {
    key: "ad_analytics", icon: "📣", labelKey: "gNav.adAnalytics",
    items: [
      { to: "/marketing",               icon: "📣", labelKey: "gNav.adPerformance",      menuKey: "marketing" },
      { to: "/budget-tracker", icon: "💰", labelKey: "gNav.budgetTracker", menuKey: "marketing" },
      { to: "/account-performance",      icon: "🏢", labelKey: "gNav.accountPerformance", menuKey: "marketing" },
      { to: "/attribution",              icon: "🔗", labelKey: "gNav.attribution",        menuKey: "marketing" },
      { to: "/channel-kpi",              icon: "📊", labelKey: "gNav.channelKpi",         menuKey: "marketing" },
      { to: "/graph-score",              icon: "🕸️", labelKey: "gNav.graphScore",         menuKey: "marketing" },
    ],
  },
  /* ④ 고객 & 채널 (CRM/UGC 통합) */
  {
    key: "crm", icon: "👤", labelKey: "gNav.crm",
    items: [
      { to: "/crm",            icon: "👥", labelKey: "gNav.crmMain",        menuKey: "marketing" },
      { to: "/kakao-channel",  icon: "💬", labelKey: "gNav.kakaoChannel",   menuKey: "marketing" },
      { to: "/email-marketing",icon: "✉️", labelKey: "gNav.emailMarketing", menuKey: "marketing" },
      { to: "/influencer",     icon: "🤝", labelKey: "gNav.influencer",     menuKey: "marketing" },
      { to: "/reviews-ugc",    icon: "⭐", labelKey: "gNav.reviewsUgc",     menuKey: "marketing" },
      { to: "/web-popup",      icon: "🎯", labelKey: "gNav.webPopup",       menuKey: "marketing" },
    ],
  },
  /* ⑤ 커머스 & 물류 */
  {
    key: "commerce", icon: "🛒", labelKey: "gNav.commerce",
    items: [
      { to: "/omni-channel",    icon: "🌐", labelKey: "gNav.omniChannel",      menuKey: "ops" },
      { to: "/catalog-sync",    icon: "📂", labelKey: "gNav.catalog",          menuKey: "ops" },
      { to: "/order-hub",       icon: "📦", labelKey: "gNav.orderHub",         menuKey: "ops" },
      { to: "/wms-manager",     icon: "🏭", labelKey: "gNav.wms",              menuKey: "ops" },
      { to: "/price-opt",       icon: "💡", labelKey: "gNav.priceOpt",         menuKey: "ops" },
      { to: "/supply-chain",    icon: "🔭", labelKey: "gNav.supplyChain",      menuKey: "ops" },
      { to: "/returns-portal",  icon: "🔄", labelKey: "gNav.returnsPortal",    menuKey: "ops" },
    ],
  },
  /* ⑥ 인사이트 & 리포트 */
  {
    key: "analytics", icon: "📊", labelKey: "gNav.analytics",
    items: [
      { to: "/performance",    icon: "📊", labelKey: "gNav.performanceHub", menuKey: "analytics||performance_hub" },
      { to: "/report-builder", icon: "📋", labelKey: "gNav.reportBuilder", menuKey: "analytics||report_builder" },
      { to: "/pnl",            icon: "🌊", labelKey: "gNav.pnl",           menuKey: "analytics||pnl_analytics" },
      { to: "/ai-insights",    icon: "🤖", labelKey: "gNav.aiInsights",    menuKey: "analytics||ai_insights" },
      { to: "/data-product",   icon: "🗂️", labelKey: "gNav.dataProduct",   menuKey: "analytics||data_product" },
    ],
  },
  /* ⑦ 자동화 시스템 & 알람 (통합) */
  {
    key: "automation", icon: "🤖", labelKey: "gNav.automation",
    items: [
      { to: "/ai-rule-engine",    icon: "🧠", labelKey: "gNav.aiRuleEngine",    menuKey: "automation||ai_rule_engine" },
      { to: "/alert-automation",  icon: "🔔", labelKey: "gNav.alertAutomation", menuKey: "marketing" },
      { to: "/ai-policy",         icon: "🤖", labelKey: "gNav.aiPolicy",        menuKey: "automation||ai_policy" },
      { to: "/approvals",         icon: "✅", labelKey: "gNav.approvals",       menuKey: "automation||approvals" },
      { to: "/writeback",         icon: "↩",  labelKey: "gNav.writeback",       menuKey: "automation||writeback" },
      { to: "/onboarding",        icon: "🗺️", labelKey: "gNav.onboarding",      menuKey: "automation||onboarding" },
    ],
  },
  /* ⑧ 데이터 & 연동 (통합) */
  {
    key: "data", icon: "🔌", labelKey: "gNav.data",
    items: [
      { to: "/integration-hub",  icon: "🔗", labelKey: "gNav.integrationHub", menuKey: "data||integration_hub" },
      { to: "/data-schema",      icon: "📋", labelKey: "gNav.dataSchema",     menuKey: "data||data_schema" },
      { to: "/api-keys",         icon: "🔑", labelKey: "gNav.apiKeys",        menuKey: "data||api_keys" },
      { to: "/pixel-tracking",   icon: "🎯", labelKey: "gNav.pixelTracking",  menuKey: "data||pixel_tracking" },
      { to: "/data-trust",       icon: "🔬", labelKey: "gNav.dataTrust",      menuKey: "data||data_trust" },
      { to: "/mapping-registry", icon: "🗂️", labelKey: "gNav.mappingRegistry",menuKey: "data||mapping_registry" },
    ],
  },
  /* ⑨ 재무 & 정산 */
  {
    key: "finance", icon: "💳", labelKey: "gNav.finance",
    items: [
      { to: "/settlements",    icon: "📋", labelKey: "gNav.settlements",    menuKey: "billing" },
      { to: "/reconciliation", icon: "💰", labelKey: "gNav.reconciliation", menuKey: "billing" },
      { to: "/app-pricing",    icon: "💳", labelKey: "gNav.pricing",        menuKey: "billing" },
      { to: "/audit",          icon: "🧾", labelKey: "gNav.auditLog",       menuKey: "billing" },
    ],
  },
  /* ⑩ 운영 & 헬프 (동일) */
  {
    key: "member_tools", icon: "👥", labelKey: "gNav.memberTools",
    items: [
      { to: "/workspace",       icon: "👥", labelKey: "gNav.workspace",     menuKey: "system||workspace" },
      { to: "/operations",      icon: "⚡", labelKey: "gNav.operations",    menuKey: "system||operations" },
      { to: "/case-study",      icon: "🏆", labelKey: "gNav.caseStudy",     menuKey: "system||case_study" },
      { to: "/help",            icon: "📚", labelKey: "gNav.help",          menuKey: "system||help_center" },
      { to: "/feedback",        icon: "💬", labelKey: "gNav.feedback",      menuKey: "system||feedback" },
      { to: "/developer-hub",   icon: "⚙️",  labelKey: "gNav.developerHub", menuKey: "system||developer_hub" },
    ],
  },
];

/* ─── 플랫폼 Admin 전용 메뉴 (admin 계정만) ───────────────────────────────── */
const ADMIN_MENU = [
  {
    key: "system",
    icon: "⚙",
    label: "시스템 관리자(Admin)",
    items: [
      { to: "/admin",            icon: "⚙",  label: "플랫폼 환경 설정",       menuKey: "system||admin" },
      { to: "/user-management",  icon: "👤", label: "회원 계정 관리",         menuKey: "system||user_management" },
      { to: "/menu-access-manager",  icon: "🔐", label: "메뉴 권한(Rule) 관리",       menuKey: "system" },
      { to: "/db-admin",         icon: "🗄️", label: "DB 스키마 관리",        menuKey: "system||db_admin" },
      { to: "/pg-config",        icon: "💳", label: "결제 및 PG 설정",       menuKey: "system||pg_config" },
      { to: "/system-monitor",   icon: "🖥️", label: "서버/시스템 모니터링",  menuKey: "system||system_monitor" },
    ],
  },
];





/* ─── Section Component with Lock Support ──────────────────────────────────────────── */
function NavSection({ section, t, isOpen, onToggle, hasMenuAccess, isDemo, onLockClick }) {
  const location = useLocation();
  const hasActive = section.items.some(i => location.pathname === i.to);

  const sectionLabel = section.label ?? t(section.labelKey, section.labelKey.split('.')[1]);

  // 접근 권한 체크:
  //  - 데모 User: ADMIN_ONLY_MENU_KEYS에 해당하는 키만 잠금, 나머지 전부 열람 허용
  //  - 유료 User: hasMenuAccess(서버 Save 권한) 기준으로 체크
  const itemHasAccess = (item) => {
    const key = item.menuKey || item.to.replace(/^\//, "");
    // 데모 User는 admin 전용 메뉴만 잠금 (나머지 모두 열람 허용)
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
                  <span className="truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
                  <span style={{
                    marginLeft: "auto", fontSize: 7, padding: "1px 5px", borderRadius: 4,
                    background: "rgba(99,102,241,0.15)", color: "#a5b4fc",
                    border: "1px solid rgba(99,102,241,0.25)", whiteSpace: "nowrap", flexShrink: 0,
                  }}>{t('gDemo.upgradeLabel')}</span>
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

/* ─── 즐겨찾기/최근방문 패널 ───────────────────────────────────── */
function QuickAccessPanel({ favs, recents, allItems, navigate, toggleFav, t }) {
  const [tab, setTab] = useState('favs');
  const hasFavs = favs && favs.size > 0;
  const hasRecents = recents && recents.length > 0;
  if (!hasFavs && !hasRecents) return null;

  const activeTab = tab === 'favs' && !hasFavs ? 'recents' : tab === 'recents' && !hasRecents ? 'favs' : tab;
  const items = activeTab === 'favs'
    ? [...favs].map(path => allItems.find(it => it.to === path) || { to: path, label: path, icon: '📄' })
    : recents;

  return (
    <div style={{ margin: '4px 8px 0', borderRadius: 10, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.1)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {hasFavs && (
          <button onClick={() => setTab('favs')} style={{ flex: 1, padding: '6px 0', fontSize: 9, fontWeight: 700, border: 'none', cursor: 'pointer', background: activeTab === 'favs' ? 'rgba(79,142,247,0.12)' : 'transparent', color: activeTab === 'favs' ? '#4f8ef7' : 'var(--text-3)', transition: 'all 150ms' }}>{t('gDemo.quickFavs')} {favs.size}</button>
        )}
        {hasRecents && (
          <button onClick={() => setTab('recents')} style={{ flex: 1, padding: '6px 0', fontSize: 9, fontWeight: 700, border: 'none', cursor: 'pointer', background: activeTab === 'recents' ? 'rgba(34,197,94,0.1)' : 'transparent', color: activeTab === 'recents' ? '#22c55e' : 'var(--text-3)', transition: 'all 150ms' }}>{t('gDemo.quickRecents')}</button>
        )}
      </div>
      <div style={{ padding: '4px 0' }}>
        {items.slice(0, 5).map((item, i) => (
          <div key={item.to || i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button onClick={() => navigate(item.to)} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, padding: '5px 10px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 120ms', minWidth: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 12, flexShrink: 0 }}>{item.icon || '📄'}</span>
              <span style={{ fontSize: 10, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label || item.to}</span>
            </button>
            {activeTab === 'favs' && toggleFav && (
              <button onClick={() => toggleFav(item.to)} style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#eab308', fontSize: 10, flexShrink: 0, lineHeight: 1 }} title={t('sidebar.removeFav')}>✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Sidebar ──────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const t = useT();
  const { user, logout, isDemo, isPro, isAdmin, hasMenuAccess } = useAuth();
  const [lockModal, setLockModal] = useState(null); // locked menu label
  const { open: mobileOpen, close: mobileClose } = useMobileSidebar();
  const navigate = useNavigate();
  const { unreadAlertCount, activeCampaignCount } = useGlobalData();
  const { favs, toggle: toggleFav } = useFavorites();

  // 모든 메뉴 항목 flat 목록 (최근방문용)
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

  useEffect(() => {
    if (initialActiveSection) setOpenSectionId(initialActiveSection);
  }, [initialActiveSection]);

  // 라우트 변경 시 모바일 드로어 자동 Close
  useEffect(() => { mobileClose(); }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* ── 모바일 오버레이 배경 ── */}
      {mobileOpen && (
        <div
          onClick={mobileClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 299,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
            display: 'none', // CSS 미디어쿼리에서 Active화
          }}
          className="sidebar-overlay"
        />
      )}
    <div className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
      {/* Upgrade 모달 */}
      {lockModal && (
        <UpgradeModal
          menuLabel={lockModal}
          onClose={() => setLockModal(null)}
          t={t}
        />
      )}

      {/* Logo */}
      <div className="sidebar-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
        <div style={{
          width: 54, height: 54, borderRadius: 13, flexShrink: 0,
          background: 'rgba(255,255,255,0.96)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(79,142,247,0.3)',
          overflow: 'hidden',
        }}>
          <img
            src="/logo_v3.png"
            alt="Geniego-ROI"
            style={{ width: 52, height: 52, objectFit: 'contain' }}
          />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-name">Geniego-ROI</div>
          <div className="sidebar-logo-version">v423 · {t("enterprise")}</div>
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
              {(t('gDemo.sidebarCampaignActive') || '🟢 {n} campaigns').replace('{n}', activeCampaignCount)}
            </span>
          )}
          {unreadAlertCount > 0 && (
            <span
              onClick={() => navigate("/alert-policies")}
              style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700, cursor: "pointer" }}
            >
              {(t('gDemo.sidebarAlertCount') || '🚨 {n} alerts').replace('{n}', unreadAlertCount)}
            </span>
          )}
        </div>
      )}

      {/* 즐겨찾기 + 최근방문 패널 */}
      <QuickAccessPanel favs={favs} recents={recents} allItems={allMenuItems} navigate={navigate} toggleFav={toggleFav} t={t} />

      {/* Accordion Nav */}
      <div style={{ display: "grid", gap: 2, padding: "4px 0" }}>
        {/* 플랫폼 Admin: 서비스 메뉴 + Admin 전용 메뉴 All 표시 */}
        {/* 일반 회원(Free/유료): 서비스 메뉴(MEMBER_MENU)만 표시 */}
        {(isAdmin ? [...MEMBER_MENU, ...ADMIN_MENU] : MEMBER_MENU).map((section, i) => (
          <NavSection
            key={section.key}
            section={section}
            t={t}
            isOpen={openSectionId === section.key}
            onToggle={() => setOpenSectionId(prev => prev === section.key ? null : section.key)}
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
          background: "rgba(99,140,255,0.04)", border: "1px solid rgba(99,140,255,0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: isPro ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "linear-gradient(135deg,#eab308,#f59e0b)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 900, color: "#fff",
            }}>{user.name?.[0] || "U"}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontSize: 9, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 8 }}>
            <span style={{
              padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 800,
              background: isPro ? "rgba(79,142,247,0.12)" : "rgba(234,179,8,0.12)",
              color: isPro ? "#4f8ef7" : "#eab308",
              border: `1px solid ${isPro ? "rgba(79,142,247,0.25)" : "rgba(234,179,8,0.25)"}`,
            }}>{isPro ? "💎 PRO" : "🟡 DEMO"}</span>
            {isDemo && (
              <button onClick={() => navigate("/app-pricing")} style={{
                fontSize: 9, padding: "2px 8px", borderRadius: 99, border: "none",
                background: "linear-gradient(135deg,#4f8ef7,#a855f7)",
                color: "#fff", fontWeight: 700, cursor: "pointer",
              }}>{t('gDemo.sidebarUpgrade')}</button>
            )}
          </div>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "5px 0", borderRadius: 7, border: "1px solid rgba(99,140,255,0.15)",
            background: "transparent", color: "var(--text-3)", fontSize: 10, cursor: "pointer",
            fontWeight: 600, transition: "all 150ms",
          }}>{t('gDemo.sidebarLogout')}</button>
        </div>
      )}

      <div className="sidebar-footer">
        Revenue + Risk + Governance<br />Settlement OS · v423.0.0
      </div>
    </div>
    </>
  );
}
