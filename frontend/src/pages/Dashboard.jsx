import { useAuth } from '../auth/AuthContext';

// ─────────────────────────────────────────────────────────────────────────
//  Geniego-ROI  |  메인 Dashboard (Enterprise Light-Theme Edition)
//  8개 Tab: Unified현황 / MarketingPerformance / ChannelKPI / 커머스정산 / Revenue현황 / AI인플루언서 / 시스템현황 / 이용가이드
//  ✅ Sticky Hero + Sub-Tab / ✅ Period Selector (필요 탭만)
// ─────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/index.js';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import DashOverview from '../components/dashboards/DashOverview.jsx';
import DashMarketing from '../components/dashboards/DashMarketing.jsx';
import DashChannelKPI from '../components/dashboards/DashChannelKPI.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useSecurityGuard, getSecurityAlerts, clearSecurityAlerts } from '../security/SecurityGuard.js';
import DashCommerce from '../components/dashboards/DashCommerce.jsx';
import DashInfluencer from '../components/dashboards/DashInfluencer.jsx';
import DashSystem from '../components/dashboards/DashSystem.jsx';
import DashSalesGlobal from '../components/dashboards/DashSalesGlobal.jsx';
import DashGuide from '../components/dashboards/DashGuide.jsx';
import DashPeriodSelector, { getDefaultPeriod } from '../components/dashboards/DashPeriodSelector.jsx';

/* ── Tab 정의 ─────────────────────────────────────────────────────────── */
const DASHBOARD_DEFS = [
  { id: 'overview', icon: '🏠', color: '#4f8ef7', component: DashOverview },
  { id: 'marketing', icon: '📈', color: '#ec4899', component: DashMarketing },
  { id: 'channel', icon: '📡', color: '#22c55e', component: DashChannelKPI },
  { id: 'commerce', icon: '🛒', color: '#f97316', component: DashCommerce },
  { id: 'sales', icon: '🌍', color: '#14d9b0', component: DashSalesGlobal },
  { id: 'influencer', icon: '🤝', color: '#a855f7', component: DashInfluencer },
  { id: 'system', icon: '🖥️', color: '#14d9b0', component: DashSystem },
  { id: 'guide', icon: '📖', color: '#6366f1', component: DashGuide },
];

/* ── 기간선택이 필요한 탭 ID 목록 ─────────────────────────────────────── */
const PERIOD_TABS = new Set(['overview', 'marketing', 'channel', 'commerce', 'sales', 'influencer']);

/* ── Tab Selector (Light Theme) ──────────────────────────────────────── */
function DashSelector({ active, onSelect, dashboards }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: 'var(--surface, rgba(255,255,255,0.95))', border: '1px solid var(--border, #e5e7eb)', borderRadius: 14, padding: '8px 10px' }}>
      {dashboards.map(d => {
        const isActive = active === d.id;
        return (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            title={d.desc}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
              background: isActive ? d.color : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-2, #4b5563)',
              boxShadow: isActive ? `0 4px 20px ${d.color}40` : 'none',
              transform: isActive ? 'translateY(-1px)' : 'none' }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = `${d.color}10`; e.currentTarget.style.color = 'var(--text-1, #111827)'; } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2, #4b5563)'; } }}
          >
            <span style={{ fontSize: 15 }}>{d.icon}</span>
            {d.label}
          </button>
        );
      })}
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────────────
   메인 Dashboard Component (Enterprise Light Edition)
   ───────────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const { addAlert } = useGlobalData();

  // Initialize Enterprise Security Guard
  useSecurityGuard({ addAlert: (al) => {
    if (addAlert) addAlert({ type: al.type, msg: al.msg });
  }});

  // i18n 동적 Tab 정의
  const DASHBOARDS = useMemo(() => DASHBOARD_DEFS.map(d => ({
    ...d,
    label: t(`dashTabs.${d.id}`, t(`tabs.${d.id}`, d.id)),
    desc: t(`dashTabs.${d.id}Desc`, t(`tabs.${d.id}Desc`, '')),
  })), [t]);

  const navigate = useNavigate();
  const location = useLocation();
  const [activeDash, setActiveDash] = useState(() => {
    const urlView = searchParams.get('view');
    if (urlView && DASHBOARD_DEFS.find(d => d.id === urlView)) return urlView;
    try { return localStorage.getItem('dashboard_view') || 'overview'; } catch { return 'overview'; }
  });
  const [ticker, setTicker] = useState(0);
  const [now, setNow] = useState(new Date());

  // ── 기간선택 상태 (기간이 필요한 탭에서 공유) ────────────────────────
  const [period, setPeriod] = useState(() => getDefaultPeriod('14d'));

  // ── Dashboard 자체 스크롤 관리: 부모 스크롤 비활성화 ────────────────
  const dashRootRef = React.useRef(null);
  useEffect(() => {
    const el = dashRootRef.current;
    if (!el) return;

    // DOM 트리를 올라가며 실제 스크롤 가능한 부모 컨테이너를 찾음
    let scrollParent = null;
    let node = el.parentElement;
    while (node && node !== document.body) {
      const cs = getComputedStyle(node);
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
        scrollParent = node;
        break;
      }
      node = node.parentElement;
    }

    if (!scrollParent) return;

    // 스크롤 부모 → overflow 비활성화 (Dashboard가 자체 스크롤 관리)
    const origSP = {
      overflowY: scrollParent.style.overflowY,
      display: scrollParent.style.display,
      flexDirection: scrollParent.style.flexDirection,
    };
    scrollParent.style.overflowY = 'hidden';
    scrollParent.style.display = 'flex';
    scrollParent.style.flexDirection = 'column';

    // app-content-area (Dashboard의 직접 부모) → flex 확장
    const contentArea = el.parentElement;
    const origCA = contentArea ? {
      flex: contentArea.style.flex,
      minHeight: contentArea.style.minHeight,
      overflow: contentArea.style.overflow,
      display: contentArea.style.display,
      flexDirection: contentArea.style.flexDirection,
    } : null;
    if (contentArea) {
      contentArea.style.flex = '1';
      contentArea.style.minHeight = '0';
      contentArea.style.overflow = 'hidden';
      contentArea.style.display = 'flex';
      contentArea.style.flexDirection = 'column';
    }

    return () => {
      scrollParent.style.overflowY = origSP.overflowY;
      scrollParent.style.display = origSP.display;
      scrollParent.style.flexDirection = origSP.flexDirection;
      if (contentArea && origCA) {
        contentArea.style.flex = origCA.flex || '';
        contentArea.style.minHeight = origCA.minHeight || '';
        contentArea.style.overflow = origCA.overflow || '';
        contentArea.style.display = origCA.display || '';
        contentArea.style.flexDirection = origCA.flexDirection || '';
      }
    };
  }, []);

  // 신규가입 Coupon 토스트
  const [couponToast, setCouponToast] = useState(() => location.state?.couponAlert || null);
  
  // Enterprise Security Toast State
  const [securityToast, setSecurityToast] = useState(null);

  useEffect(() => {
    if (couponToast) {
      const timer = setTimeout(() => setCouponToast(null), 8000);
      window.history.replaceState({}, '', location.pathname);
      return () => clearTimeout(timer);
    }
  }, [couponToast, location.pathname]);

  // Security Alert Polling (Real-time sync check)
  useEffect(() => {
    const checkSecurity = () => {
      const alerts = getSecurityAlerts();
      if (alerts && alerts.length > 0) {
        const latest = alerts[0];
        if (!latest.read) {
          setSecurityToast(latest);
        }
      } else {
        setSecurityToast(null);
      }
    };
    checkSecurity();
    const id = setInterval(() => { 
        setTicker(t => t + 1); 
        setNow(new Date()); 
        checkSecurity();
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const dismissSecurity = useCallback(() => {
    clearSecurityAlerts();
    setSecurityToast(null);
  }, []);

  const handleSelect = useCallback((id) => {
    setActiveDash(id);
    try { localStorage.setItem('dashboard_view', id); } catch { }
  }, []);

  const currentDash = DASHBOARDS.find(d => d.id === activeDash);
  const DashComp = currentDash?.component;
  const showPeriod = PERIOD_TABS.has(activeDash);

  return (
    <div ref={dashRootRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>

      {/* ═══ FIXED ZONE: Toasts + Hero + SubTabs ═══════════════════════ */}
      <div style={{ flexShrink: 0 }}>

        {/* ── Coupon 토스트 Banner ──────────────────────────────────── */}
        {couponToast && (
          <div style={{ padding: '16px 20px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.04))', border: '1.5px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', animation: 'fadeIn 0.4s ease', boxShadow: '0 4px 16px rgba(34,197,94,0.08)', margin: '4px' }}>
            <span style={{ fontSize: 28 }}>🎁</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 14, color: '#16a34a', marginBottom: 3 }}>
                {t('dash.couponIssued', '쿠폰이 발급되었습니다!')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2, #4b5563)' }}>
                {couponToast.message || `🎉 ${couponToast.plan} ${t('dash.couponApplied', '플랜 이용권이 적용되었습니다!')}`}
              </div>
              {couponToast.code && (
                <div style={{ fontSize: 11, color: '#d97706', fontFamily: 'monospace', marginTop: 4 }}>
                  Coupon: <strong>{couponToast.code}</strong>
                  {couponToast.expires_at && ` · ${new Date(couponToast.expires_at).toLocaleDateString('ko-KR')}`}
                </div>
              )}
            </div>
            <button onClick={() => setCouponToast(null)} style={{ background: 'none', border: '1px solid var(--border, #e5e7eb)', borderRadius: 7, color: 'var(--text-3, #9ca3af)', cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}>✕</button>
          </div>
        )}

        {/* ── Enterprise Security Alert Banner ──────────────────────── */}
        {securityToast && (
          <div style={{ padding: '16px 20px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(153,27,27,0.06))', border: '1.5px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', animation: 'pulseScale 2s infinite alternate', boxShadow: '0 4px 16px rgba(239,68,68,0.12)', margin: '4px' }}>
            <span style={{ fontSize: 32, filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.5))' }}>🚨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: '#dc2626', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('dash.threatDetected', '엔터프라이즈 보안 위협 감지')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-1, #111827)', fontWeight: 600 }}>
                {securityToast.message}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3, #9ca3af)', marginTop: 4, fontFamily: 'monospace' }}>
                Detected at: {new Date(securityToast.timestamp).toLocaleString()} | ID: {securityToast.id}
              </div>
            </div>
            <button onClick={dismissSecurity} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, color: '#dc2626', cursor: 'pointer', padding: '8px 16px', fontSize: 13, fontWeight: 700, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}>
              {t('dash.dismiss', '차단 및 무시')}
            </button>
          </div>
        )}

        {/* ── Hero Header (fixed, light theme) ──────────────────────── */}
        <div className="fade-up" style={{ padding: '18px 22px', background: 'var(--bg, #ffffff)', borderBottom: '1px solid var(--border, #e5e7eb)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: `linear-gradient(135deg, ${currentDash?.color ?? '#4f8ef7'}18, ${currentDash?.color ?? '#4f8ef7'}08)`,
                border: `1px solid ${currentDash?.color ?? '#4f8ef7'}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                {currentDash?.icon}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: currentDash?.color ?? '#4f8ef7', letterSpacing: '-0.3px' }}>
                  {currentDash?.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3, #9ca3af)', marginTop: 2 }}>
                  {currentDash?.desc}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* ── 기간선택 (해당 탭만 표시) ───────────────── */}
              {showPeriod && (
                <DashPeriodSelector value={period} onChange={setPeriod} compact />
              )}
              <span style={{ fontSize: 10, color: 'var(--text-3, #9ca3af)', fontFamily: 'monospace' }}>
                {now.toLocaleTimeString()} · {ticker > 0 ? `${ticker * 5}s ago` : 'Live'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '4px 10px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
                <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>LIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Selector (fixed below hero) ───────────────────────── */}
        <div style={{ background: 'var(--bg, #ffffff)', padding: '4px 4px 0', borderBottom: '1px solid var(--border, #e5e7eb)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <DashSelector active={activeDash} onSelect={handleSelect} dashboards={DASHBOARDS} />
        </div>

      </div>{/* /FIXED ZONE */}

      {/* ═══ SCROLL ZONE: Dashboard Content ════════════════════════════ */}
      <div className="fade-up" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '12px 4px 24px' }}>
        {DashComp && <DashComp ticker={ticker} period={showPeriod ? period : undefined} />}
      </div>
    </div>
  );
}
