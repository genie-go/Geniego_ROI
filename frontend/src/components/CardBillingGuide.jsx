import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.js';
import { bt } from '../utils/billingI18n';

/**
 * CardBillingGuide — 이용가이드 내 "광고비 결제카드 등록" 항상 표시 설명 섹션.
 * 광고 실집행(유료) 메뉴의 GuideTab 에 삽입. 카드 등록 여부와 무관하게 문서로서 노출되며
 * [결제카드 등록하기] 바로가기를 제공한다. 15개국 현지 자연어(billingI18n 단일 소스).
 */
export default function CardBillingGuide() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const tr = (k) => bt(k, lang);
  return (
    <div style={{
      borderRadius: 16, padding: '22px 22px', marginTop: 14,
      background: 'linear-gradient(135deg,#eef2ff,#faf5ff)', border: '1px solid #ddd6fe'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>💳</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: '#4338ca' }}>{tr('pageTitle')}</span>
      </div>
      <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: '0 0 14px' }}>{tr('pageDesc')}</p>
      <div style={{ display: 'grid', gap: 9, marginBottom: 16 }}>
        {['how1', 'how2', 'how3', 'how4'].map((k, i) => (
          <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
            <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: '#c7d2fe', color: '#4338ca', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
            {tr(k)}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/payment-methods')} style={{
          padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 13,
          boxShadow: '0 6px 18px rgba(79,70,229,0.26)'
        }}>💳 {tr('bannerBtn')}</button>
        <span style={{ fontSize: 11.5, color: '#94a3b8' }}>🔒 {tr('secureNote')}</span>
      </div>
    </div>
  );
}
