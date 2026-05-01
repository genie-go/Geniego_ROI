import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/index.js';

/* ── 모바일 환경 감지 (개선) ───────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(
    () => {
      if (typeof window === 'undefined') return false;
      return window.innerWidth <= 768 ||
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
    }
  );

  React.useEffect(() => {
    let timeoutId = null;
    const check = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(
          window.innerWidth <= 768 ||
          window.matchMedia('(display-mode: standalone)').matches ||
          window.navigator.standalone === true
        );
      }, 150); // 디바운스로 성능 개선
    };

    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return isMobile;
}

/* ── 탭 정의 ─────────────────────────────────────────────── */
const TAB_DEFS = [
  {
    labelKey: 'mobileNav.home',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f8ef7' : 'rgba(255,255,255,0.42)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    to: '/dashboard',
  },
  {
    labelKey: 'mobileNav.analytics',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f8ef7' : 'rgba(255,255,255,0.42)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    to: '/performance',
    match: ['/performance', '/attribution', '/pnl', '/ai-insights', '/rollup', '/report-builder', '/data-product', '/graph-score', '/channel-kpi', '/marketing-intelligence'],
  },
  {
    labelKey: 'mobileNav.marketing',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f8ef7' : 'rgba(255,255,255,0.42)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    to: '/auto-marketing',
    match: ['/auto-marketing', '/campaign-manager', '/marketing', '/channel-kpi', '/email-marketing', '/crm', '/kakao-channel', '/instagram-dm', '/whatsapp', '/sms-marketing', '/web-popup', '/journey-builder', '/ai-prediction', '/content-calendar', '/budget-planner', '/line-channel', '/reviews-ugc', '/influencer', '/ai-marketing-hub', '/ai-recommend', '/digital-shelf', '/amazon-risk', '/attribution', '/marketing-intelligence', '/graph-score'],
  },
  {
    labelKey: 'mobileNav.commerce',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f8ef7' : 'rgba(255,255,255,0.42)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 001.97 1.61h9.72a2 2 0 001.97-1.61L23 6H6" />
      </svg>
    ),
    to: '/order-hub',
    match: ['/order-hub', '/wms-manager', '/commerce', '/omni-channel', '/kr-channel', '/catalog-sync', '/price-opt', '/returns-portal', '/supply-chain', '/supplier-portal', '/demand-forecast', '/asia-logistics'],
  },
  {
    labelKey: 'mobileNav.more',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f8ef7' : 'rgba(255,255,255,0.42)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
      </svg>
    ),
    to: '/connectors',
    match: ['/connectors', '/api-keys', '/admin', '/settlements', '/reconciliation', '/audit', '/help', '/workspace', '/feedback', '/developer-hub', '/system-monitor', '/operations', '/data-schema', '/event-norm', '/pixel-tracking', '/data-trust', '/smart-connect', '/ai-rule-engine', '/alert-policies', '/ai-policy', '/approvals', '/writeback', '/onboarding', '/mapping-registry', '/my-coupons', '/license', '/app-pricing', '/pg-config', '/db-admin'],
  },
];

/* ── 탭 아이템 컴포넌트 (개선) ──────────────────────────────── */
function TabItem({ tab, active }) {
  const [pressed, setPressed] = useState(false);
  const [ripple, setRipple] = useState(null);

  const handlePointerDown = (e) => {
    setPressed(true);
    // 리플 효과 추가
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipple({ x, y, timestamp: Date.now() });
    setTimeout(() => setRipple(null), 600);
  };

  return (
    <NavLink
      to={tab.to}
      onPointerDown={handlePointerDown}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        flex: 1,
        minHeight: 50,
        paddingTop: 6,
        paddingBottom: 4,
        textDecoration: 'none',
        color: active ? '#4f8ef7' : 'rgba(255,255,255,0.38)',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        position: 'relative',
        transform: pressed ? 'scale(0.92)' : active ? 'scale(1.05)' : 'scale(1)',
        overflow: 'hidden',
      }}
    >
      {/* 리플 효과 */}
      {ripple && (
        <span style={{
          position: 'absolute',
          left: ripple.x,
          top: ripple.y,
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: 'rgba(79,142,247,0.4)',
          transform: 'translate(-50%, -50%) scale(0)',
          animation: 'ripple-expand 0.6s ease-out',
          pointerEvents: 'none',
        }} />
      )}
      {/* Active 탭 배경 글로우 (개선) */}
      {active && (
        <span style={{
          position: 'absolute',
          top: 4,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 44,
          height: 32,
          borderRadius: 12,
          background: 'radial-gradient(circle, rgba(79,142,247,0.18) 0%, rgba(79,142,247,0.08) 100%)',
          zIndex: 0,
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '0 0 12px rgba(79,142,247,0.25)',
        }} />
      )}

      {/* 아이콘 (개선) */}
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
        filter: active ? 'drop-shadow(0 0 6px rgba(79,142,247,0.6))' : 'none',
        transition: 'filter 0.2s, transform 0.2s',
        transform: active ? 'translateY(-1px)' : 'translateY(0)',
      }}>
        {tab.icon(active)}
      </span>

      {/* 탭 레이블 (개선) */}
      <span style={{
        fontSize: 10,
        fontWeight: active ? 800 : 500,
        letterSpacing: active ? '-0.4px' : '-0.3px',
        lineHeight: 1,
        color: active ? '#4f8ef7' : 'rgba(255,255,255,0.38)',
        zIndex: 1,
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        textShadow: active ? '0 0 8px rgba(79,142,247,0.3)' : 'none',
      }}>
        {tab.label}
      </span>

      {/* Active 인디케이터 (상단 라인 개선) */}
      {active && (
        <span style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 32,
          height: 3,
          borderRadius: '0 0 4px 4px',
          background: 'linear-gradient(90deg, #4f8ef7 0%, #6366f1 50%, #a855f7 100%)',
          boxShadow: '0 2px 12px rgba(79,142,247,0.7), 0 0 20px rgba(79,142,247,0.4)',
          animation: 'pulse-glow 2s ease-in-out infinite',
        }} />
      )}
    </NavLink>
  );
}

/* ── 메인 컴포넌트 ──────────────────────────────────── */
export default function MobileBottomNav() {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const { t } = useI18n();

  if (!isMobile) return null;

  // locale 기반 탭 목록 생성
  const TABS = TAB_DEFS.map(tab => ({ ...tab, label: t(tab.labelKey) }));

  const isActive = (tab) => {
    if (tab.to === pathname) return true;
    if (tab.match) return tab.match.some(p => pathname.startsWith(p));
    return false;
  };

  return (
    <>
      <style>{`
        @keyframes ripple-expand {
          to {
            transform: translate(-50%, -50%) scale(20);
            opacity: 0;
          }
        }
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 2px 12px rgba(79,142,247,0.7), 0 0 20px rgba(79,142,247,0.4);
          }
          50% {
            opacity: 0.85;
            box-shadow: 0 2px 16px rgba(79,142,247,0.9), 0 0 28px rgba(79,142,247,0.6);
          }
        }
      `}</style>
      <nav
        aria-label={t('mobileNav.ariaLabel')}
        role="navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'rgba(6, 12, 22, 0.97)',
          backdropFilter: 'blur(32px) saturate(1.9)',
          WebkitBackdropFilter: 'blur(32px) saturate(1.9)',
          borderTop: '1px solid rgba(79, 130, 255, 0.15)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-around',
          zIndex: 9998,
          boxShadow: '0 -1px 0 rgba(255,255,255,0.05), 0 -8px 40px rgba(0,0,0,0.65), 0 -2px 16px rgba(79,142,247,0.08)',
          willChange: 'transform',
          transform: 'translateZ(0)', // GPU 가속
        }}
      >
        {TABS.map((tab) => (
          <TabItem key={tab.to} tab={tab} active={isActive(tab)} />
        ))}
      </nav>
    </>
  );
}
