import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.js';

/*
 * RoleViewBar (231차 OS / 디렉티브 #11) — 역할별 관점(Enterprise Dashboard 통합).
 * 신규 대시보드를 만들지 않고, 각 임원/직무를 '기존' 최적 페이지+섹션으로 큐레이션 진입시킨다.
 * 같은 숫자(순이익 SSOT) 위에서 역할별 관점만 전환 → CEO/CFO/CMO/COO 일관 의사결정.
 */
const ROLES = [
  { id: 'ceo', icon: '👑', ko: 'CEO', to: '/rollup', desc: '전사 롤업·순이익 총괄' },
  { id: 'cfo', icon: '💰', ko: 'CFO', to: '/pnl', desc: '순이익 건강도·워터폴·What-if' },
  { id: 'cmo', icon: '📣', ko: 'CMO', to: '/performance', desc: '마케팅 성과·ROAS·어트리뷰션' },
  { id: 'coo', icon: '⚙️', ko: 'COO', to: '/operations', desc: '운영·재고·반품 현황' },
  { id: 'marketing', icon: '🚀', ko: '마케팅', to: '/auto-marketing', desc: '캠페인 자동화·집행' },
  { id: 'commerce', icon: '🛒', ko: '커머스', to: '/omni-channel', desc: '채널·주문 통합' },
  { id: 'logistics', icon: '🔭', ko: '물류', to: '/supply-chain', desc: '공급망·배송·SLA' },
  { id: 'live', icon: '🎬', ko: '라이브', to: '/live-commerce', desc: '라이브 커머스 성과' },
  { id: 'aiagent', icon: '🤖', ko: 'AI Agent', to: '/ai-insights', desc: 'AI Copilot·근거기반 질의' },
  { id: 'governance', icon: '🛡️', ko: '거버넌스', to: '/data-trust', desc: '데이터 신뢰·감사·품질' },
];

export default function RoleViewBar() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ margin: '0 6px 12px', border: '1px solid rgba(99,140,255,0.18)', borderRadius: 12, background: 'rgba(99,140,255,0.04)', padding: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 12.5, fontWeight: 800 }}>🧭 {t('roleViews.title', '역할별 관점 (Role Views)')}</span>
        <span style={{ fontSize: 10.5, color: 'var(--text-3,#94a3b8)' }}>{t('roleViews.sub', '직무에 맞는 화면으로 바로 이동 — 같은 순이익 데이터, 다른 관점')}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3,#94a3b8)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 7, marginTop: 10 }}>
          {ROLES.map(r => (
            <button key={r.id} onClick={() => navigate(r.to)} title={r.desc}
              style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 9, border: '1px solid var(--border,#e2e8f0)', background: 'var(--card,#fff)', cursor: 'pointer' }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-1,#0f172a)' }}>{r.icon} {t('roleViews.role_' + r.id, r.ko)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3,#94a3b8)', marginTop: 2, lineHeight: 1.35 }}>{t('roleViews.desc_' + r.id, r.desc)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
