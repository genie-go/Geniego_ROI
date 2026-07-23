/**
 * [CWIS Part004-03] Unified Sidebar — Menu Registry 결과만 렌더한다.
 *
 * ★원칙(명세 §41): 프론트가 메뉴 권한을 **자체적으로 재구성하지 않는다**. 서버 Resolver 가 이미
 *   Principal/Platform/Capability/FeatureFlag/Permission/Context/Visibility 를 통과시킨 트리만 온다.
 *   여기서는 그리기만 한다 — 권한 조건문이 한 줄도 없다.
 *
 * ★접근성: <nav> 랜드마크 · aria-expanded/aria-controls/aria-current · 색상 외 표식(●/취소선) ·
 *   키보드(Enter/Space/Escape/↑↓/Home/End) · 모바일 오버레이 Focus Trap + Escape + Focus 복원.
 *   (Part004-01 이 레거시 사이드바에서 지적한 <nav> 랜드마크 부재를 신규 셸에서 해소한다.)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useT } from '../../i18n/index.js';
import { useCollaborationContext } from '../../context/CollaborationContextProvider.jsx';
import ContextSwitcher from '../context/ContextSwitcher.jsx';

/** 표준 아이콘 키 → 글리프. 레지스트리가 emoji_glyph 도 함께 주므로 그것을 우선한다. */
const ICON_GLYPH = {
  home: '⬡', grid: '▦', rocket: '🚀', megaphone: '📣', users: '👥', cart: '🛒', chart: '📊',
  robot: '🤖', folder: '🗂️', plug: '🔌', card: '💳', shield: '🛡️', settings: '⚙️', search: '🔭',
  calendar: '📅', 'message-circle': '💬', sparkles: '💎', database: '🗃️', box: '📦', factory: '🏭',
  refresh: '🔄', flask: '🧪', link: '🔗', target: '🎯', file: '📄',
};

function iconOf(node) {
  return node.emoji || ICON_GLYPH[node.icon] || '·';
}

/* ── 개별 항목 ────────────────────────────────────────────────────────────── */
function SidebarItem({ node, activeMenu, collapsed, t }) {
  const isActive = activeMenu === node.menu_key;
  const disabled = node.state === 'DISABLED';
  const label = node.label_key ? t(node.label_key, node.label || node.menu_key) : (node.label || node.menu_key);
  const to = node.target?.route_name;

  const common = {
    style: {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: collapsed ? '9px 0' : '8px 12px 8px 24px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      fontSize: 12, borderRadius: 8, textDecoration: 'none',
      minHeight: 44,  // 모바일 터치 타깃
      opacity: disabled ? 0.45 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
    title: collapsed ? label : undefined,
  };

  if (disabled || !to) {
    return (
      <span
        {...common}
        aria-disabled="true"
        style={{ ...common.style, textDecoration: disabled ? 'line-through' : 'none' }}
      >
        <span aria-hidden="true">{iconOf(node)}</span>
        {!collapsed && <span className="truncate">{label}</span>}
        {/* 색상만으로 상태를 표현하지 않는다 */}
        {!collapsed && disabled && <span style={{ marginLeft: 'auto', fontSize: 10 }}>{t('nav.disabled', '비활성')}</span>}
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={({ isActive: rrActive }) => `nav-item ${rrActive || isActive ? 'active' : ''}`}
      {...common}
    >
      {/* 활성 표식은 색상 외에 기호로도 제공(WCAG 1.4.1) */}
      <span aria-hidden="true" style={{ width: 6, fontWeight: 900 }}>{isActive ? '●' : ''}</span>
      <span aria-hidden="true">{iconOf(node)}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

/* ── 섹션(접기/펼치기) ────────────────────────────────────────────────────── */
function SidebarSection({ node, activeMenu, activeAncestors, collapsed, t }) {
  const ancestorActive = activeAncestors.includes(node.menu_key);
  const [open, setOpen] = useState(ancestorActive);
  // 중첩 라우트에서도 상위 메뉴가 자동 확장된다(명세 §24)
  useEffect(() => { if (ancestorActive) setOpen(true); }, [ancestorActive]);

  const panelId = `unav-sec-${node.menu_key.replace(/[^\w-]/g, '_')}`;
  const label = node.label_key ? t(node.label_key, node.label || node.menu_key) : (node.label || node.menu_key);
  const children = node.children || [];

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setOpen(true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setOpen(false); }
  };

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        type="button"
        className="nav-section-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
        onKeyDown={onKeyDown}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 44,
          padding: collapsed ? '10px 0' : '10px 12px', justifyContent: collapsed ? 'center' : 'flex-start',
          background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
          textAlign: 'left', color: 'inherit',
        }}
        title={collapsed ? label : undefined}
      >
        <span aria-hidden="true">{iconOf(node)}</span>
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && (
          <span aria-hidden="true" style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
        )}
        {ancestorActive && <span className="sr-only">{t('nav.containsActive', '현재 위치 포함')}</span>}
      </button>
      <div id={panelId} role="region" aria-label={label} hidden={!open}>
        {open && children.map(c => (
          c.type === 'SECTION' || c.type === 'GROUP'
            ? <SidebarSection key={c.menu_key} node={c} activeMenu={activeMenu} activeAncestors={activeAncestors} collapsed={collapsed} t={t} />
            : <SidebarItem key={c.menu_key} node={c} activeMenu={activeMenu} collapsed={collapsed} t={t} />
        ))}
      </div>
    </div>
  );
}

/* ── 메인 ─────────────────────────────────────────────────────────────────── */
export default function UnifiedSidebar({ mobileOpen = false, onMobileClose }) {
  const t = useT();
  const { pathname } = useLocation();
  const { sections, activeMenu, activeAncestors, loading, error, uiState, setSidebarState, context, registryVersion } =
    useCollaborationContext();
  const collapsed = !!uiState.collapsed;
  const overlayRef = useRef(null);
  const lastFocused = useRef(null);

  /* 모바일 오버레이 — Focus Trap + Escape + Focus 복원(명세 §23·§42) */
  useEffect(() => {
    if (!mobileOpen) return undefined;
    lastFocused.current = document.activeElement;
    const el = overlayRef.current;
    const focusables = () => Array.from(el?.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])') || []);
    focusables()[0]?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onMobileClose?.(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';   // 배경 스크롤 잠금
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      try { lastFocused.current?.focus?.(); } catch { /* 복원 실패 무시 */ }
    };
  }, [mobileOpen, onMobileClose]);

  // 라우트 변경 시 모바일 오버레이 자동 닫기
  useEffect(() => { if (mobileOpen) onMobileClose?.(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pathname]);

  const body = useMemo(() => {
    if (loading && sections.length === 0) {
      return (
        <div aria-busy="true" style={{ padding: 12 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 32, marginBottom: 8, borderRadius: 8, background: 'rgba(148,163,184,0.12)' }} />
          ))}
          <span className="sr-only">{t('nav.loading', '메뉴를 불러오는 중')}</span>
        </div>
      );
    }
    if (error && sections.length === 0) {
      return (
        <div role="alert" style={{ padding: 12, fontSize: 12, color: '#b45309' }}>
          {t('nav.loadError', '메뉴를 불러오지 못했습니다')} — <code>{error}</code>
        </div>
      );
    }
    if (sections.length === 0) {
      return (
        <div style={{ padding: 12, fontSize: 12, color: '#64748b' }}>
          {t('nav.empty', '표시할 메뉴가 없습니다')}
        </div>
      );
    }
    return sections.map(s => (
      s.type === 'SECTION' || s.type === 'GROUP'
        ? <SidebarSection key={s.menu_key} node={s} activeMenu={activeMenu} activeAncestors={activeAncestors} collapsed={collapsed} t={t} />
        : <SidebarItem key={s.menu_key} node={s} activeMenu={activeMenu} collapsed={collapsed} t={t} />
    ));
  }, [sections, activeMenu, activeAncestors, collapsed, loading, error, t]);

  const inner = (
    <nav
      role="navigation"
      aria-label={t('nav.mainLabel', '주 메뉴')}
      style={{
        width: collapsed ? 64 : 240, minWidth: collapsed ? 64 : 240,
        height: '100vh', overflowY: 'auto', overflowX: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 6px',
        borderRight: '1px solid var(--border, rgba(148,163,184,0.2))',
      }}
    >
      {/* Skip Link — 키보드 사용자가 메뉴 전체를 Tab 으로 통과하지 않아도 되게 한다(WCAG 2.4.1) */}
      <a
        href="#main-content"
        style={{
          position: 'absolute', left: -9999, top: 8, zIndex: 100,
          padding: '8px 12px', borderRadius: 8, background: '#1e293b', color: '#fff', fontSize: 12,
        }}
        onFocus={e => { e.currentTarget.style.left = '8px'; }}
        onBlur={e => { e.currentTarget.style.left = '-9999px'; }}
      >
        {t('nav.skipToContent', '본문 바로가기')}
      </a>

      {!collapsed && <ContextSwitcher />}

      <div style={{ flex: 1 }}>{body}</div>

      <button
        type="button"
        onClick={() => setSidebarState({ collapsed: !collapsed })}
        aria-label={collapsed ? t('nav.expand', '사이드바 펼치기') : t('nav.collapse', '사이드바 접기')}
        style={{
          minHeight: 44, border: 'none', background: 'transparent', cursor: 'pointer',
          fontSize: 12, color: 'var(--text-3, #64748b)',
        }}
      >
        {collapsed ? '»' : '« ' + t('nav.collapse', '접기')}
      </button>

      {registryVersion && !collapsed && (
        <div style={{ fontSize: 9, color: 'var(--text-4, #94a3b8)', textAlign: 'center', paddingBottom: 4 }}>
          rev {String(registryVersion).slice(0, 14)}{context?.project_id ? ' · prj' : ''}
        </div>
      )}
    </nav>
  );

  if (!mobileOpen) return inner;

  return (
    <>
      <div
        onClick={onMobileClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998 }}
        aria-hidden="true"
      />
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.mainLabel', '주 메뉴')}
        style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 9999, background: 'var(--surface-1, #0b1220)' }}
      >
        {inner}
      </div>
    </>
  );
}
