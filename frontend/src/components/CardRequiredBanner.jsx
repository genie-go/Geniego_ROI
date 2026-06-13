import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.js';
import { IS_DEMO } from '../utils/demoEnv';
import { bt } from '../utils/billingI18n';

/**
 * CardRequiredBanner — 유료(광고비 실집행) 메뉴 공통 안내.
 * 광고비 결제카드(빌링키)가 미등록이면 안내 + [결제카드 등록하기] 바로가기를 노출.
 * 등록돼 있으면(또는 데모) 아무것도 렌더하지 않음(무중단). budget-status 로 has_method 판정.
 *
 * props: { compact?:bool }  — compact 시 여백 축소(섹션 내부 삽입용).
 */
export default function CardRequiredBanner({ compact = false }) {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [state, setState] = useState({ loaded: false, hasMethod: true, demo: IS_DEMO });

  useEffect(() => {
    let alive = true;
    if (IS_DEMO) { setState({ loaded: true, hasMethod: true, demo: true }); return; }
    const tok = localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
    fetch('/api/v427/billing/budget-status', { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.json())
      .then(d => { if (alive && d && d.ok) setState({ loaded: true, hasMethod: !!d.has_method, demo: !!d.demo }); })
      .catch(() => { if (alive) setState({ loaded: true, hasMethod: true, demo: false }); });
    return () => { alive = false; };
  }, []);

  // 데모/미등록 아님/로딩 전 → 노출 안 함
  if (!state.loaded || state.demo || state.hasMethod) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      padding: compact ? '12px 16px' : '16px 20px', borderRadius: 14, marginBottom: compact ? 12 : 18,
      background: 'linear-gradient(135deg,#fff7ed,#fef2f2)', border: '1px solid #fed7aa',
      boxShadow: '0 4px 16px rgba(234,88,12,0.08)'
    }}>
      <div style={{ fontSize: 22, lineHeight: 1 }}>💳</div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#9a3412', marginBottom: 4 }}>{bt('bannerTitle', lang)}</div>
        <div style={{ fontSize: 12.5, color: '#7c2d12', lineHeight: 1.6 }}>{bt('bannerDesc', lang)}</div>
      </div>
      <button onClick={() => navigate('/payment-methods')} style={{
        padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
        background: 'linear-gradient(135deg,#ea580c,#dc2626)', color: '#fff', fontWeight: 800, fontSize: 13,
        boxShadow: '0 6px 18px rgba(234,88,12,0.28)'
      }}>💳 {bt('bannerBtn', lang)}</button>
    </div>
  );
}
