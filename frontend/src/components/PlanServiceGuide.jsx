import React, { useState } from 'react';
import { getPlanGuide, PLAN_LEVEL_META } from '../data/planServiceGuide.js';

/**
 * 186차 — PlanServiceGuide (엔터프라이즈 SaaS급 플랜 제공 서비스 상세 안내)
 * 구버전 PLAN_RECOMMEND_REASON 초고도화. admin · 회원가입 · 회원 요금페이지 공통.
 * props: planId, compact(1열), defaultOpen, collapsible
 */
export default function PlanServiceGuide({ planId, compact = false, defaultOpen = true, collapsible = true }) {
  const g = getPlanGuide(planId);
  const [open, setOpen] = useState(defaultOpen);
  if (!g) return null;
  const color = g.color || '#6366f1';
  const showBody = collapsible ? open : true;
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', background: `${color}0A`, border: `1.5px solid ${color}33` }}>
      <button
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        style={{ width: '100%', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 11, background: 'transparent', border: 'none', cursor: collapsible ? 'pointer' : 'default', textAlign: 'left', color: '#e2e8f0' }}
      >
        <span style={{ fontSize: 22 }}>{g.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color }}>
            {g.label} 플랜 — 제공 서비스 상세 안내
            {g.recommended && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 8, background: 'rgba(168,85,247,0.2)', color: '#d8b4fe' }}>⭐ 추천</span>}
          </div>
          <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{g.tagline}</div>
        </div>
        {collapsible && <span style={{ color: '#94a3b8', fontSize: 12 }}>{open ? '▼ 접기' : '▶ 펼치기'}</span>}
      </button>
      {showBody && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7, marginBottom: 14, padding: '11px 13px', borderRadius: 10, background: 'rgba(0,0,0,0.20)' }}>{g.summary}</div>
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill, minmax(300px,1fr))', gap: 8 }}>
            {g.sections.map((s, i) => {
              const m = PLAN_LEVEL_META[s.level] || PLAN_LEVEL_META.core;
              return (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15 }}>{s.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', flex: 1 }}>{s.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8, background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>{m.label}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.55 }}>{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
