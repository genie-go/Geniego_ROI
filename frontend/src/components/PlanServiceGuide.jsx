import React, { useState } from 'react';
import { getPlanGuide, PLAN_LEVEL_META } from '../data/planServiceGuide.js';
import { useT } from '../i18n/index.js'; // 187차: chrome 문구 i18n

/**
 * 186차 — PlanServiceGuide (엔터프라이즈 SaaS급 플랜 제공 서비스 상세 안내)
 * 구버전 PLAN_RECOMMEND_REASON 초고도화. admin · 회원가입 · 회원 요금페이지 공통.
 * props: planId, compact(1열), defaultOpen, collapsible, light(187차: 밝은 테마)
 */
export default function PlanServiceGuide({ planId, compact = false, defaultOpen = true, collapsible = true, light = false }) {
  const t = useT();
  const g = getPlanGuide(planId);
  const [open, setOpen] = useState(defaultOpen);
  if (!g) return null;
  const color = g.color || '#6366f1';
  const showBody = collapsible ? open : true;
  // 187차 — 밝은/다크 테마 토큰. light=true(앱 내부 요금페이지)는 찐한 텍스트.
  const c = light
    ? { head: '#0f172a', tagline: '#475569', collapse: '#475569', sumBg: '#eef2f7', sumText: '#1e293b', secBg: '#ffffff', secBorder: '#e2e8f0', secTitle: '#0f172a', secDesc: '#334155' }
    : { head: '#e2e8f0', tagline: '#94a3b8', collapse: '#94a3b8', sumBg: 'rgba(0,0,0,0.20)', sumText: '#cbd5e1', secBg: 'rgba(255,255,255,0.04)', secBorder: 'rgba(255,255,255,0.07)', secTitle: '#f1f5f9', secDesc: '#94a3b8' };
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', background: light ? `${color}08` : `${color}0A`, border: `1.5px solid ${color}33` }}>
      <button
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        style={{ width: '100%', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 11, background: 'transparent', border: 'none', cursor: collapsible ? 'pointer' : 'default', textAlign: 'left', color: c.head }}
      >
        <span style={{ fontSize: 22 }}>{g.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: light ? '#1e293b' : color }}>
            {g.label} {t('appPricing.guide.cardSuffix', '플랜 — 제공 서비스 상세 안내')}
            {g.recommended && <span data-gp="darkText" style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8, background: 'rgba(168,85,247,0.2)', color: light ? '#7c3aed' : '#d8b4fe' }}>⭐ {t('appPricing.guide.recommended', '추천')}</span>}
          </div>
          <div style={{ fontSize: 11.5, color: c.tagline, marginTop: 2 }}>{g.tagline}</div>
        </div>
        {collapsible && <span style={{ color: c.collapse, fontSize: 12 }}>{open ? `▼ ${t('appPricing.guide.collapse', '접기')}` : `▶ ${t('appPricing.guide.expand', '펼치기')}`}</span>}
      </button>
      {showBody && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontSize: 12.5, fontWeight: light ? 500 : 400, color: c.sumText, lineHeight: 1.7, marginBottom: 14, padding: '11px 13px', borderRadius: 10, background: c.sumBg }}>{g.summary}</div>
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill, minmax(300px,1fr))', gap: 8 }}>
            {g.sections.map((s, i) => {
              const m = PLAN_LEVEL_META[s.level] || PLAN_LEVEL_META.core;
              return (
                <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: c.secBg, border: `1px solid ${c.secBorder}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{s.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: c.secTitle, flex: 1 }}>{s.title}</span>
                    <span data-gp="darkText" style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>{m.label}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: c.secDesc, lineHeight: 1.55 }}>{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
