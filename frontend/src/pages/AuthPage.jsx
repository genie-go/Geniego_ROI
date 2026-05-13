import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useT, useI18n, LANG_OPTIONS } from "../i18n";
import { getJson } from '../services/apiClient.js';

/* ── Enterprise Dynamic Locale Map ────────────────────── */
const LANG_LOCALE_MAP = {
  ko:'ko-KR', en:'en-US', ja:'ja-JP', zh:'zh-CN', 'zh-TW':'zh-TW',
  de:'de-DE', es:'es-ES', fr:'fr-FR', pt:'pt-BR', ru:'ru-RU',
  ar:'ar-SA', hi:'hi-IN', th:'th-TH', vi:'vi-VN', id:'id-ID'
};

/* ─── CONSTANTS ────────────────────────────────────────────── */
const COUNTRIES = [
  "South Korea", "USA", "Japan", "China", "Singapore", "UK", "Germany", "France",
  "Australia", "Canada", "Vietnam", "Thailand", "Indonesia", "Malaysia", "Philippines",
  "India", "Brazil", "Mexico", "UAE", "Saudi Arabia", "Other",
];

const BUSINESS_TYPES = [
  "E-Commerce", "Brand Manufacturer", "Distribution & Wholesale", "Online Marketing Agency",
  "IT & Software", "Fashion & Beauty", "Food & Beverage", "Electronics", "Health & Medical",
  "Travel & Accommodation", "Education & Content", "Finance & Fintech", "Other",
];

const SALES_CHANNELS = [
  { key: "naver", label: "Naver SmartStore", icon: "🟢" },
  { key: "coupang", label: "Coupang", icon: "🟡" },
  { key: "kakao", label: "KakaoShopping", icon: "💛" },
  { key: "gmarket", label: "Gmarket · Auction", icon: "🔵" },
  { key: "11st", label: "11Street", icon: "🔴" },
  { key: "shopify", label: "Shopify", icon: "🛍" },
  { key: "amazon", label: "Amazon", icon: "📦" },
  { key: "rakuten", label: "Rakuten", icon: "🏪" },
  { key: "lazada", label: "Lazada", icon: "🌏" },
  { key: "tiktok_shop", label: "TikTok Shop", icon: "🎵" },
  { key: "own_mall", label: "Own Mall", icon: "🏠" },
  { key: "other_global", label: "Other Global", icon: "🌐" },
];

const AD_CHANNELS = [
  { key: "meta", label: "Meta (Facebook/Instagram)" },
  { key: "google", label: "Google Ads" },
  { key: "tiktok", label: "TikTok Ads" },
  { key: "naver_ads", label: "Naver Search Ads (SA)" },
  { key: "kakao_moment", label: "Kakao Moment" },
  { key: "youtube", label: "YouTube Ads" },
  { key: "twitter", label: "Twitter/X Ads" },
  { key: "line", label: "LINE Ads" },
];

const PAID_PLANS = [
  {
    id: "growth",
    label: "Growth",
    priceFallback: "Checking price",
    desc: "Growing brand · Core features to start",
    color: "#4f8ef7",
    badge: "Starter Pick",
    tagline: "Grow revenue with core marketing, commerce & CRM features",
    target: "Growing brands with monthly revenue $100K–$2M, small team sellers",
    features: [
      { emoji: "📣", text: "Major ad channel integration (Meta/Google/TikTok/Naver/Kakao/Coupang)" },
      { emoji: "📧", text: "Email · Kakao · SMS campaign sends" },
      { emoji: "🛒", text: "Product catalog sync · Order Hub · Basic WMS" },
      { emoji: "📊", text: "Performance Hub · P&L overview · Custom reports · Excel export" },
      { emoji: "👤", text: "Customer CRM · RFM segments · Basic automation" },
      { emoji: "🔒", text: "License management · Onboarding guide" },
    ],
    notIncluded: ["AI Prediction (Churn·LTV)", "Journey Builder", "AI Rule Engine", "Full Channel API"],
  },
  {
    id: "pro",
    label: "Pro",
    priceFallback: "Checking price",
    desc: "Growth brand · Agency · Full AI automation",
    color: "#a855f7",
    popular: true,
    badge: "Most Popular",
    tagline: "Maximize marketing efficiency with AI prediction & automation",
    target: "Brands with monthly revenue $2M–$10M, marketing agencies, data-driven ops teams",
    features: [
      { emoji: "🤖", text: "AI Prediction: Customer churn · LTV · Purchase probability" },
      { emoji: "🗺", text: "Journey Builder · Trigger settings · Action node management" },
      { emoji: "⚙", text: "AI Rule Engine · Alert policy evaluation · Writeback" },
      { emoji: "🌐", text: "Full channel integration (LINE/WhatsApp/Instagram DM included)" },
      { emoji: "📈", text: "Attribution · Competitor AI analysis · Anomaly detection · Auto reports" },
      { emoji: "💳", text: "Invoice · Payment approval · Monthly channel/product P&L analysis" },
      { emoji: "🔌", text: "Event collection · Data schema · API key mgmt · 1st-Party pixel" },
      { emoji: "📣", text: "All Growth features included" },
    ],
    notIncluded: ["Instant Rollback (wb_rollback)", "Dedicated Support"],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    priceFallback: "Contact Us",
    desc: "Large brands · Agencies · Multi-entity",
    color: "#f59e0b",
    badge: "Custom Design",
    tagline: "Enterprise-grade operations with unlimited features + dedicated support",
    target: "Large brands with monthly revenue $10M+, multi-entity corporations, large agencies",
    features: [
      { emoji: "✅", text: "All Pro features included" },
      { emoji: "🔄", text: "Writeback instant rollback (wb_rollback) — immediate recovery from large-scale mistakes" },
      { emoji: "👥", text: "Unlimited accounts · Multi-brand unified management" },
      { emoji: "🛡", text: "Dedicated CS & Tech support team" },
      { emoji: "📄", text: "Custom contracts · SLA guarantee · Dedicated infrastructure" },
      { emoji: "🏢", text: "ERP integration · Multi-country · Multi-entity financial settlement" },
    ],
    notIncluded: [],
  },
];

/* ─── Terms Modal ──────────────────────────────────────────── */
function TermsModal({ open, onClose, category }) {
  const [content, setContent] = React.useState({ title: '', body: '' });
  React.useEffect(() => {
    if (!open || !category) return;

    /* 기본 약관 내용 세팅 함수 */
    const loadBase = () => {
      /* 1st: localStorage (admin에서 저장된 약관) */
      try {
        const stored = JSON.parse(localStorage.getItem('geniego_terms_data') || '{}');
        const items = stored[category];
        if (items && items.length > 0 && items[0].content && items[0].content.length > 100) {
          return { title: items[0].title, body: items[0].content };
        }
      } catch {}
      /* 2nd: 내장 핵심 약관 (엔터프라이즈급) */
      const BUILTIN = {
        terms: { title: 'Geniego-ROI 서비스 이용약관', body: `제1조 (목적)\n본 약관은 주식회사 OCIELL(이하 "회사")이 운영하는 Geniego-ROI AI 마케팅 ROI 분석 플랫폼(이하 "서비스")의 이용 조건 및 절차, 회사와 회원 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.\n\n제2조 (정의)\n① "서비스"란 회사가 제공하는 AI 기반 마케팅 ROI 분석, 광고 성과 예측, 옴니채널 데이터 통합, CRM, 자동화 등 관련 제반 서비스를 의미합니다.\n② "회원"이란 본 약관에 동의하고 회원가입을 완료한 자를 말합니다.\n③ "구독"이란 회원이 서비스의 유료 기능을 이용하기 위해 정기적으로 요금을 지불하는 것을 의미합니다.\n\n제3조 (약관의 효력 및 변경)\n① 본 약관은 서비스 화면 또는 기타 방법으로 공지함으로써 효력이 발생합니다.\n② 회사는 관련 법령을 위배하지 않는 범위 내에서 약관을 변경할 수 있으며, 변경 시 최소 7일 전(회원에게 불리한 변경의 경우 30일 전) 서비스 내 공지합니다.\n\n제4조 (서비스의 제공)\n① 회사는 연중무휴 24시간 서비스를 제공하는 것을 원칙으로 합니다.\n② 시스템 점검, 교체, 고장, 통신 두절 등의 사유 발생 시 서비스 제공을 일시적으로 중단할 수 있습니다.\n③ 서비스 수준 목표(SLA): 연간 99.5% 이상 가용성을 보장합니다.\n\n제5조~제25조: 전체 약관 25개 조항이 포함되어 있습니다.\n\n자세한 전체 약관은 관리자 설정에서 확인하실 수 있습니다.\n\n부칙\n본 약관은 2026년 1월 1일부터 시행합니다.\n최종 개정일: 2026년 4월 12일` },
        privacy: { title: 'Geniego-ROI 개인정보처리방침', body: `주식회사 OCIELL(이하 "회사")은 「개인정보 보호법」 제30조에 따라 개인정보 처리방침을 수립·공개합니다.\n\n제1조 (수집하는 개인정보)\n필수: 이름, 이메일, 비밀번호(암호화), 회사명\n선택: 사업자등록번호, 전화번호, 주소, 웹사이트, 마케팅 동의 여부\n\n제2조 (개인정보의 이용 목적)\n서비스 제공, 회원관리, 마케팅 분석, 고객 지원\n\n제3조 (개인정보의 보유 기간)\n원칙: 회원 탈퇴 시 즉시 파기\n법령 보존: 전자상거래법(5년), 통신비밀보호법(3개월)\n\n제4조~제16조: 전체 16개 조항이 포함되어 있습니다.\n\n자세한 전체 방침은 관리자 설정에서 확인하실 수 있습니다.\n\n부칙\n본 방침은 2026년 1월 1일부터 시행합니다.\n최종 개정일: 2026년 4월 12일` },
        marketing: { title: '마케팅 정보 수신 및 활용 동의', body: `주식회사 OCIELL(이하 "회사")은 「정보통신망법」 제50조에 따라 마케팅 정보 수신 동의를 받고 있습니다.\n\n1. 수집 목적: 신규 기능 안내, 프로모션, 이벤트 공지\n2. 수신 채널: 이메일, 앱 내 알림\n3. 동의 철회: 서비스 내 설정에서 언제든 철회 가능\n4. 본 동의는 선택사항이며, 동의하지 않아도 서비스 이용에 제한이 없습니다.` },
        ecommerce: { title: '전자상거래 이용 및 소비자보호 고지', body: '' },
      };
      return BUILTIN[category] || BUILTIN.terms;
    };

    const base = loadBase();
    setContent(base);

    /* 전자상거래 고지 — 구독요금제 API에서 실시간 요금 동기화 */
    if (category === 'ecommerce') {
      getJson('/api/auth/pricing/public-plans')
        .then(d => {
          if (!d.ok || !d.plans) return;
          const lines = [];
          d.plans.forEach(p => {
            if (!p.hasPricing || !p.tiers || !p.tiers.length) return;
            const t1 = p.tiers.find(t => t.acct === '1') || p.tiers[0];
            const mBase = Number(t1?.cycles?.monthly?.base_price || 0);
            const mMonthly = Number(t1?.cycles?.monthly?.monthly_price || 0);
            const yTotalPrice = Number(t1?.cycles?.yearly?.total_price || 0);
            const monthlyDisplay = mBase > 0 ? mBase : mMonthly;
            if (monthlyDisplay > 0) {
              const mFmt = '\u20a9' + monthlyDisplay.toLocaleString(LANG_LOCALE_MAP[lang] || 'ko-KR');
              let yearlyFinal = yTotalPrice > 0 ? yTotalPrice : monthlyDisplay * 12;
              const yFmt = '\u20a9' + yearlyFinal.toLocaleString(LANG_LOCALE_MAP[lang] || 'ko-KR');
              lines.push(`      - ${p.label || p.id}: \uc6d4 ${mFmt} / \uc5f0 ${yFmt}`);
            } else if (p.id === 'enterprise') {
              lines.push('      - Enterprise: \ubcc4\ub3c4 \ud611\uc758');
            }
          });
          if (lines.length > 0) {
            const pricingSection = '   \u2460 \uad6c\ub3c5 \ud50c\ub79c\ubcc4 \uc694\uae08:\n' + lines.join('\n');
            const ecomBody = `\u300c\uc804\uc790\uc0c1\uac70\ub798 \ub4f1\uc5d0\uc11c\uc758 \uc18c\ube44\uc790\ubcf4\ud638\uc5d0 \uad00\ud55c \ubc95\ub960\u300d\uc5d0 \ub530\ub77c \ub2e4\uc74c\uacfc \uac19\uc774 \uace0\uc9c0\ud569\ub2c8\ub2e4.\n\n1. \uc0ac\uc5c5\uc790 \uc815\ubcf4\n   \uc0c1\ud638: Geniego-ROI (\uc6b4\uc601: \uc8fc\uc2dd\ud68c\uc0ac OCIELL)\n   \ub300\ud45c\uc774\uc0ac: CEO\n   \uc0ac\uc5c5\uc7a5 \uc18c\uc7ac\uc9c0: \ub300\ud55c\ubbfc\uad6d\n   \uc774\uba54\uc77c: support@geniego.com\n   \uace0\uac1d\uc13c\ud130: 1:1 \ubb38\uc758(\ud50c\ub7ab\ud3fc \ub0b4)\n\n2. \uc11c\ube44\uc2a4 \uc694\uae08 \ubc0f \uacb0\uc81c\n${pricingSection}\n   \u2461 \uacb0\uc81c \uc218\ub2e8: \uc2e0\uc6a9\uce74\ub4dc, \uccb4\ud06c\uce74\ub4dc, \uac04\ud3b8\uacb0\uc81c (Paddle \uacb0\uc81c \uc2dc\uc2a4\ud15c \uc5f0\ub3d9)\n   \u2462 \uacb0\uc81c \ud1b5\ud654: \uc6d0\ud654(KRW) \uae30\ubcf8, \ud574\uc678 \uacb0\uc81c \uc2dc \ud604\uc9c0 \ud1b5\ud654 \uc9c0\uc6d0\n   \u2463 \uc601\uc218\uc99d: \uacb0\uc81c \uc644\ub8cc \ud6c4 \ub4f1\ub85d\ub41c \uc774\uba54\uc77c\ub85c \uc790\ub3d9 \ubc1c\uc1a1\n\n3. \uad6c\ub3c5 \uc790\ub3d9 \uac31\uc2e0\n   \u2460 \uad6c\ub3c5\uc740 \uc120\ud0dd\ud55c \uacb0\uc81c \uc8fc\uae30(\uc6d4\uac04/\uc5f0\uac04)\uc5d0 \ub530\ub77c \uc790\ub3d9 \uac31\uc2e0\ub429\ub2c8\ub2e4.\n   \u2461 \uac31\uc2e0\uc77c 7\uc77c \uc804 \uc774\uba54\uc77c\ub85c \uc0ac\uc804 \uace0\uc9c0\ud569\ub2c8\ub2e4.\n   \u2462 \uc790\ub3d9 \uac31\uc2e0 \ud574\uc9c0\ub294 \ub9c8\uc774\ud398\uc774\uc9c0 > \uad6c\ub3c5 \uad00\ub9ac\uc5d0\uc11c \uac00\ub2a5\ud569\ub2c8\ub2e4.\n\n4. \uccad\uc57d \ucca0\ud68c \ubc0f \ud658\ubd88\n   \u2460 \uacb0\uc81c \ud6c4 7\uc77c \uc774\ub0b4 \uccad\uc57d \ucca0\ud68c \uac00\ub2a5 (\uc11c\ube44\uc2a4 \ubbf8\uc0ac\uc6a9 \uc2dc)\n   \u2461 \ub514\uc9c0\ud138 \ucf58\ud150\uce20 \ud2b9\uc131\uc0c1 \uc774\uc6a9 \ud6c4\uc5d0\ub294 \ud658\ubd88\uc774 \uc81c\ud55c\ub429\ub2c8\ub2e4.\n   \u2462 \ubbf8\uc0ac\uc6a9 \uae30\uac04\uc5d0 \ub300\ud55c \uc77c\ud560 \ud658\ubd88\uc774 \uac00\ub2a5\ud569\ub2c8\ub2e4.\n\n5. \uc18c\ube44\uc790 \ud53c\ud574 \ubcf4\uc0c1\n   \u300c\uc804\uc790\uc0c1\uac70\ub798\ubc95\u300d \ubc0f \u300c\uc18c\ube44\uc790\ubd84\uc7c1\ud574\uacb0\uae30\uc900\u300d\uc5d0 \ub530\ub77c \ucc98\ub9ac\ud569\ub2c8\ub2e4.`;
            setContent({ title: '\uc804\uc790\uc0c1\uac70\ub798 \uc774\uc6a9 \ubc0f \uc18c\ube44\uc790\ubcf4\ud638 \uace0\uc9c0', body: ecomBody });
          }
        })
        .catch(() => {});
    }
  }, [open, category]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-2, #1a1f36)', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(99,140,255,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(99,140,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>📋 {content.title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, fontSize: 12, color: '#cbd5e1', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {content.body}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(99,140,255,0.1)', textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>확인</button>
        </div>
      </div>
    </div>
  );
}


/* ─── Terms Agreement Section ──────────────────────────────── */
function TermsAgreementSection({ agreeTerms, setAgreeTerms, agreePrivacy, setAgreePrivacy, agreeMarketing, setAgreeMarketing, agreeEcommerce, setAgreeEcommerce, compact }) {
  const t = useT();
  const [modalCat, setModalCat] = React.useState(null);
  const [agreeAll, setAgreeAll] = React.useState(false);
  React.useEffect(() => {
    setAgreeAll(agreeTerms && agreePrivacy && agreeEcommerce && agreeMarketing);
  }, [agreeTerms, agreePrivacy, agreeEcommerce, agreeMarketing]);
  const handleAllToggle = (v) => { setAgreeTerms(v); setAgreePrivacy(v); setAgreeMarketing(v); setAgreeEcommerce(v); };
  const items = [
    { key: 'terms', val: agreeTerms, set: setAgreeTerms, label: t('auth.termsOfService'), required: true },
    { key: 'privacy', val: agreePrivacy, set: setAgreePrivacy, label: t('auth.privacyPolicy'), required: true },
    { key: 'ecommerce', val: agreeEcommerce, set: setAgreeEcommerce, label: t('auth.ecommerceProtection'), required: true },
    { key: 'marketing', val: agreeMarketing, set: setAgreeMarketing, label: t('auth.marketingConsent'), required: false },
  ];
  return (
    <>
      <TermsModal open={!!modalCat} onClose={() => setModalCat(null)} category={modalCat} />
      <div style={{ display: 'grid', gap: compact ? 6 : 8, padding: compact ? '10px 12px' : '12px 14px', borderRadius: 10, background: 'rgba(99,140,255,0.04)', border: '1px solid rgba(99,140,255,0.12)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingBottom: 8, borderBottom: '1px solid rgba(99,140,255,0.1)' }}>
          <input type="checkbox" checked={agreeAll} onChange={e => handleAllToggle(e.target.checked)}
            style={{ accentColor: '#4f8ef7', width: 15, height: 15, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{t('auth.agreeAllTerms')}</span>
        </label>
        {items.map(({ key, val, set, label, required }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
              <input type="checkbox" checked={val} onChange={e => set(e.target.checked)}
                style={{ accentColor: '#4f8ef7', width: 14, height: 14, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                {required ? <span style={{ color: '#94a3b8', fontSize: 10, marginRight: 3 }} >[{t('auth.requiredTag')}]</span> : <span>[{t('auth.optionalTag')}]</span>}
                {label}
              </span>
            </label>
            <button type="button" onClick={() => setModalCat(key)} style={{ background: 'none', border: 'none', color: '#4f8ef7', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'underline' }}>{t('auth.viewTerms')}</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── Input Field ──────────────────────────────────────────── */
function Field({ label, type = "text", value, onChange, placeholder, required, autoComplete, hint }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} autoComplete={autoComplete}
        style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "rgba(255,255,255,0.04)", color: '#fff', fontSize: 13, outline: "none", transition: "border-color 150ms", width: "100%", boxSizing: "border-box" }}
        onFocus={e => (e.target.style.borderColor = "#4f8ef7")}
        onBlur={e => (e.target.style.borderColor = "var(--border)")}
      />
      {hint && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{hint}</div>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, required }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "rgba(20,30,50,0.9)", color: '#fff', fontSize: 13, outline: "none", cursor: "pointer", width: "100%", boxSizing: "border-box" }}>
        <option value="">Select</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ─── Advanced Auth Features ──────────────────────────────── */
function PasswordStrengthMeter({ password }) {
  const t = useT();
  const getStrength = (pw) => {
    let score = 0;
    if (!pw) return { score, color: 'transparent', text: '' };
    if (pw.length > 5) score += 1;
    if (pw.match(/[a-z]/) && pw.match(/[A-Z]/)) score += 1;
    if (pw.match(/\d/)) score += 1;
    if (pw.match(/[^a-zA-Z\d]/)) score += 1;
    if (pw.length > 11) score += 1;
    
    if (score <= 1) return { score, color: '#ef4444', text: t('auth.pwWeak') };
    if (score === 2) return { score, color: '#f59e0b', text: t('auth.pwModerate') };
    if (score === 3) return { score, color: '#22c55e', text: t('auth.pwStrong') };
    return { score, color: '#10b981', text: t('auth.pwVeryStrong') };
  };
  const { score, color, text } = getStrength(password);
  
  return (
    <div style={{ marginTop: 3 }}>
      <div style={{ display: 'flex', gap: 4, height: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map(level => (
          <div key={level} style={{ flex: 1, borderRadius: 2, background: score >= level ? color : 'rgba(255,255,255,0.1)', transition: 'background-color 300ms' }} />
        ))}
      </div>
      <div style={{ fontSize: 10, color: text ? color : 'transparent', textAlign: 'right', fontWeight: 600, minHeight: 15 }}>{text || ' '}</div>
    </div>
  );
}

function SSOButtonGroup({ t }) {
  const providers = [
    { id: 'google', bg: '#fff', color: '#333', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg' },
    { id: 'microsoft', bg: '#fff', color: '#333', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' },
    { id: 'apple', bg: '#000', color: '#fff', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', filter: 'invert(1)' }
  ];
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{t('auth.orContinueWith') || 'Or continue with SSO'}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {providers.map(p => (
          <button type="button" key={p.id} onClick={(e) => { e.preventDefault(); alert("Enterprise SSO Integration Ready! 🚀 (Demo)"); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: p.bg, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'transform 150ms' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <img src={p.icon} alt={p.id} style={{ width: 18, height: 18, filter: p.filter || 'none' }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Login Form ─────────────────────────────────────────── */
function LoginForm({ onSwitch, loginType = "production" }) {
  const t = useT();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* 자동 로그아웃으로 리디렉트된 경우 감지 */
  const isIdleLogout = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reason") === "idle";

  const isDemo = loginType === 'demo';
  const envColor = isDemo ? '#fb923c' : '#4f8ef7';
  const envIcon = isDemo ? '🎪' : '🏢';
  const envLabel = isDemo ? t('auth.demoMemberLogin') : t('auth.productionLogin');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const user = await login(email, password, loginType);
      /* ── admin 계정은 일반 로그인 차단 ── */
      if ((user.plans || user.plan) === 'admin') {
        throw new Error(t('auth.adminBlockedInNormalLogin'));
      }
      navigate("/dashboard", { replace: true });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
      {/* 현재 로그인 환경 배지 */}
      <div style={{ padding: '10px 14px', borderRadius: 10, background: `${envColor}0D`, border: `1px solid ${envColor}33`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{envIcon}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 12, color: envColor }}>{envLabel}</div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{t('auth.loginEnvDesc')}</div>
        </div>
      </div>

      {/* 자동 로그아웃 알림 */}
      {isIdleLogout && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)", color: "#eab308", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>⏰</span>
          <span>{t('auth.idleLogoutMsg')}</span>
        </div>
      )}

      <Field label={t("auth.emailLabel")} type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" />
      <Field label={t("auth.passwordLabel")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="current-password" />
      {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}

      <SSOButtonGroup t={t} />
      <button type="submit" disabled={loading} style={{ padding: "12px 0", borderRadius: 10, border: "none", background: loading ? `${envColor}66` : `linear-gradient(135deg,${envColor},${envColor}cc)`, color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? t("auth.loggingIn") : `${envIcon} ${envLabel}`}
      </button>
    </form>
  );
}

/* ─── Plan Selector ────────────────────────────────────────── */
function PlanSelector({ planType, setPlanType, selectedPaid, setSelectedPaid }) {
  const t = useT();
  const [planPrices, setPlanPrices] = useState({});    // { growth: "$120/mo", pro: "$150/mo", ... }
  const [priceLoading, setPriceLoading] = useState(true);

  useEffect(() => {
    // Management자가 Register한 Latest Pricing을 public-plans API에서 실Time 불러오기
    getJson("/api/auth/pricing/public-plans")
      .then(d => {
        if (!d.ok) return;
        const prices = {};
        (d.plans || []).forEach(p => {
          if (!p.hasPricing || !p.tiers || p.tiers.length === 0) return;
          // 1Account(acct==='1') 기준 Monthly Min Pricing 사용 — tiers[0]이 아닌 acct==='1'을 명시적으로 찾음
          const firstTier = p.tiers.find(t => t.acct === "1") || p.tiers[0];
          const monthly = firstTier?.cycles?.monthly;
          if (monthly?.monthly_price > 0) {
            prices[p.id] = "$" + Number(monthly.monthly_price).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + "/mo~";
          } else if (p.id === "enterprise") {
            prices[p.id] = "Contact Us";
          }
        });
        // enterprise는 per도 표기
        if (!prices["enterprise"]) prices["enterprise"] = "Contact Us";
        setPlanPrices(prices);
      })
      .catch(() => {})
      .finally(() => setPriceLoading(false));
  }, []);

  // Actual display price: API data first, fallback if not available
  const getDisplayPrice = (planId, fallback) => {
    if (priceLoading) return t("auth.loadingPrice");
    return planPrices[planId] || fallback || t("auth.priceNotSet");
  };

  const selectedPlanCfg = PAID_PLANS.find(p => p.id === selectedPaid);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', textAlign: "center" }}>
        {t("auth.planTypeTitle")}
      </div>

      {/* Free tier */}
      <button type="button" onClick={() => setPlanType("free")} style={{
        padding: "14px 16px", borderRadius: 12, cursor: "pointer", textAlign: "left",
        background: planType === "free" ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.02)",
        border: `2px solid ${planType === "free" ? "#22c55e" : "rgba(99,140,255,0.12)"}`,
        transition: "all 150ms" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🌱</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#22c55e" }}>{t("auth.freePlan")}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t("auth.freePlanDesc")}</div>
          </div>
          <div style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 10, fontWeight: 800 }}>{t("auth.freeBadge")}</div>
        </div>
      </button>

      {/* Paid tier */}
      <div style={{
        borderRadius: 12,
        border: `2px solid ${planType === "paid" ? "#a855f7" : "rgba(99,140,255,0.12)"}`,
        background: planType === "paid" ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.02)",
        overflow: "hidden", transition: "all 150ms" }}>
        <button type="button" onClick={() => setPlanType("paid")} style={{ width: "100%", padding: "14px 16px", cursor: "pointer", textAlign: "left", background: "transparent", border: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>💎</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#a855f7" }}>{t("auth.paidPlan")}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t("auth.paidPlanDesc")}</div>
            </div>
            <div style={{ padding: "3px 10px", borderRadius: 99, background: "rgba(168,85,247,0.15)", color: "#a855f7", fontSize: 10, fontWeight: 800 }}>{t("auth.paidBadge")}</div>
          </div>
        </button>

        {/* Plan options shown only when paid is selected */}
        {planType === "paid" && (
          <div style={{ padding: "0 14px 14px" }}>
            {/* Plan cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {PAID_PLANS.map(p => (
                <button key={p.id} type="button" onClick={() => setSelectedPaid(p.id)} style={{
                  padding: "12px 10px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                  background: selectedPaid === p.id ? `${p.color}1A` : "rgba(255,255,255,0.02)",
                  border: `1.5px solid ${selectedPaid === p.id ? p.color : "rgba(99,140,255,0.15)"}`,
                  position: "relative", transition: "all 150ms" }}>
                  {p.popular && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: p.color, color: "#fff", fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 99 }}>POPULAR</div>}
                  {p.badge && !p.popular && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: p.color, color: "#fff", fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 99 }}>{p.badge}</div>}
                  <div style={{ fontWeight: 800, fontSize: 12, color: p.color }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: '#fff', marginTop: 2, fontWeight: 700 }}>
                    {getDisplayPrice(p.id, p.priceFallback)}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 1 }}>{p.desc}</div>
                  {selectedPaid === p.id && <div style={{ fontSize: 14, color: p.color, marginTop: 4 }}>✓</div>}
                </button>
              ))}
            </div>

            {/* Selected plan detail card */}
            {selectedPlanCfg && (
              <div style={{
                padding: "16px", borderRadius: 12,
                background: `${selectedPlanCfg.color}08`,
                border: `1px solid ${selectedPlanCfg.color}33` }}>
                {/* Header */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: selectedPlanCfg.color, marginBottom: 4 }}>
                    {t("auth.planQuestion", { plan: selectedPlanCfg.label })}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", lineHeight: 1.6 }}>
                    {selectedPlanCfg.tagline}
                  </div>
                </div>

                {/* Target */}
                <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: "#7c8fa8", fontWeight: 700, marginBottom: 2 }}>{t("auth.recommendedFor")}</div>
                  <div style={{ fontSize: 10, color: "#cbd5e1", lineHeight: 1.5 }}>{selectedPlanCfg.target}</div>
                </div>

                {/* Features */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: "#7c8fa8", fontWeight: 700, marginBottom: 6 }}>{t("auth.includedFeatures")}</div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {selectedPlanCfg.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 10, color: "#cbd5e1", lineHeight: 1.5 }}>
                        <span style={{ fontSize: 12, flexShrink: 0, marginTop: -1 }}>{f.emoji}</span>
                        <span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Not included */}
                {selectedPlanCfg.notIncluded && selectedPlanCfg.notIncluded.length > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: "#7c8fa8", fontWeight: 700, marginBottom: 4 }}>{t("auth.premiumOnly")}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {selectedPlanCfg.notIncluded.map((item, i) => (
                        <span key={i} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, background: "rgba(99,140,255,0.06)", border: "1px solid rgba(99,140,255,0.12)", color: "#475569" }}>{item}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Free Register Form ─────────────────────────────────────── */
function FreeRegisterForm({ onSwitch, onBack, variant = "demo" }) {
  const t = useT();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [agreeEcommerce, setAgreeEcommerce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isProd = variant === "production";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError(t("auth.passwordMismatch")); return; }
    if (!agreeTerms || !agreePrivacy || !agreeEcommerce) { setError(t('auth.agreeTermsRequired')); return; }
    setLoading(true);
    try {
      const result = await register(email, password, name, "", { plan: "" });
      navigate("/dashboard", {
        replace: true,
        state: result?.coupon ? { couponAlert: result.coupon } : undefined,
      });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      {/* Header — variant-specific */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: isProd ? "rgba(79,142,247,0.06)" : "rgba(34,197,94,0.06)", border: isProd ? "1px solid rgba(79,142,247,0.2)" : "1px solid rgba(34,197,94,0.2)" }}>
        <span style={{ fontSize: 18 }}>{isProd ? "🏢" : "🌱"}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 12, color: isProd ? "#4f8ef7" : "#22c55e" }}>
            {isProd ? t('auth.prodRegisterTitle') : t("auth.freeTrialTitle")}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>
            {isProd ? t('auth.prodRegisterDesc') : t("auth.freeTrialDesc")}
          </div>
        </div>
        <button type="button" onClick={onBack} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 18 }}>←</button>
      </div>

      <Field label={t("auth.nameLabel")} value={name} onChange={setName} placeholder="John Doe" required autoComplete="name" />
      <Field label={t("auth.emailLabel")} type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" />
      <div>
        <Field label={t("auth.passwordHint")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="new-password" />
        <PasswordStrengthMeter password={password} />
      </div>
      <Field label={t("auth.passwordConfirm")} type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" required autoComplete="new-password" />

      {/* Terms — 4개 개별 동의 + 전체동의 + 모달 보기 */}
      <TermsAgreementSection
        agreeTerms={agreeTerms} setAgreeTerms={setAgreeTerms}
        agreePrivacy={agreePrivacy} setAgreePrivacy={setAgreePrivacy}
        agreeMarketing={agreeMarketing} setAgreeMarketing={setAgreeMarketing}
        agreeEcommerce={agreeEcommerce} setAgreeEcommerce={setAgreeEcommerce}
        compact
      />

      {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}

      <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)", fontSize: 10, color: "#4f8ef7" }}>
        {t("auth.PlanNote")}
      </div>

      <button type="submit" disabled={loading} style={{ padding: "13px 0", borderRadius: 10, border: "none", background: loading
          ? (isProd ? "rgba(79,142,247,0.4)" : "rgba(34,197,94,0.4)")
          : (isProd ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "linear-gradient(135deg,#22c55e,#16a34a)"), color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? t("auth.registering") : (isProd ? `🏢 ${t('auth.registerBtn')}` : t("auth.startFree"))}
      </button>

      <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)" }}>
        {t("auth.alreadyHaveAccount")}{" "}
        <button type="button" onClick={() => onSwitch("login")} style={{ background: "none", border: "none", color: "#4f8ef7", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>{t("auth.loginLink")}</button>
      </div>
    </form>
  );
}

/* ─── Paid Register Form ────────────────────────────────────── */
function PaidRegisterForm({ selectedPlan, onBack, onSwitch }) {
  const t = useT();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: account, 2: business, 3: channels

  /* Step 1 - Account */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  /* Step 2 - Business Info */
  const [company, setCompany] = useState("");
  const [ceoName, setCeoName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessNumber, setBusinessNumber] = useState(""); // 사업자번호
  const [country, setCountry] = useState("대한민국");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  /* Step 3 - Channels */
  const [salesChannels, setSalesChannels] = useState([]);
  const [adChannels, setAdChannels] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeEcommerce, setAgreeEcommerce] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const PLAN_CFG = PAID_PLANS.find(p => p.id === selectedPlan) || PAID_PLANS[1];

  const toggleChannel = (arr, setArr, key) =>
    setArr(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const validateStep1 = () => {
    if (!name.trim()) return t("auth.nameRequired");
    if (!email.trim()) return t("auth.emailRequired");
    if (password.length < 6) return t("auth.passwordTooShort");
    if (password !== confirm) return t("auth.passwordMismatch");
    return null;
  };

  const validateStep2 = () => {
    if (!company.trim()) return t("auth.companyRequired");
    if (!ceoName.trim()) return t("auth.ceoRequired");
    if (!businessType) return t("auth.businessTypeRequired");
    if (!businessNumber.trim()) return t("auth.businessNumberRequired");
    if (!country) return t("auth.countryRequired");
    if (!address.trim()) return t("auth.addressRequired");
    if (!phone.trim()) return t("auth.phoneRequired");
    return null;
  };

  const validateStep3 = () => {
    if (salesChannels.length === 0) return t("auth.salesChannelRequired");
    if (!agreeTerms || !agreePrivacy || !agreeEcommerce) return t('auth.agreeTermsRequired');
    return null;
  };

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep3();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      const extraData = {
        plan: selectedPlan,
        company, ceo_name: ceoName, business_type: businessType,
        business_number: businessNumber, country, zip_code: zipCode,
        address: `${address} ${addressDetail}`.trim(), phone, website,
        sales_channels: salesChannels, ad_channels: adChannels,
        monthly_revenue: monthlyRevenue, agree_marketing: agreeMarketing,
      };
      const result = await register(email, password, name, company, extraData);
      navigate("/dashboard", {
        replace: true,
        state: result?.coupon ? { couponAlert: result.coupon } : undefined,
      });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const StepIndicator = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
      {[1, 2, 3].map(s => (
        <React.Fragment key={s}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, flexShrink: 0,
            background: step >= s ? PLAN_CFG.color : "rgba(99,140,255,0.1)",
            color: step >= s ? "#fff" : "var(--text-3)",
            boxShadow: step === s ? `0 0 0 3px ${PLAN_CFG.color}33` : "none" }}>{s}</div>
          {s < 3 && <div style={{ flex: 1, height: 2, background: step > s ? PLAN_CFG.color : "rgba(99,140,255,0.1)", borderRadius: 1 }} />}
        </React.Fragment>
      ))}
      <div style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 6, whiteSpace: "nowrap" }}>
        {step === 1 ? t("auth.step1Account") : step === 2 ? t("auth.step2Business") : t("auth.step3Channels")}
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: `${PLAN_CFG.color}0D`, border: `1px solid ${PLAN_CFG.color}33` }}>
        <span style={{ fontSize: 20 }}>💎</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: PLAN_CFG.color }}>{PLAN_CFG.label} {t("auth.paidPlanTitle", { plan: "" })}</div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{t("auth.paidPlanNote")}</div>
        </div>
        <button type="button" onClick={step === 1 ? onBack : () => setStep(s => s - 1)}
          style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 18 }}>←</button>
      </div>

      <StepIndicator />

      {/* ─── STEP 1: Account ─── */}
      {step === 1 && (
        <div style={{ display: "grid", gap: 12 }}>
          <Field label={t("auth.nameLabel")} value={name} onChange={setName} placeholder="John Doe" required autoComplete="name" />
          <Field label={t("auth.emailLabel")} type="email" value={email} onChange={setEmail} placeholder="business@company.com" required autoComplete="email" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label={t("auth.passwordHint")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="new-password" />
              <PasswordStrengthMeter password={password} />
            </div>
            <Field label={t("auth.passwordConfirm")} type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" required autoComplete="new-password" />
          </div>
          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
          <button type="button" onClick={nextStep} style={{
            padding: "12px 0", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg,${PLAN_CFG.color},${PLAN_CFG.color}cc)`,
            color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>{t("auth.nextBusiness")}</button>
        </div>
      )}

      {/* ─── STEP 2: Business Info ─── */}
      {step === 2 && (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", fontSize: 10, color: "#eab308" }}>
            {t("auth.businessWarning")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label={t("auth.companyLabel")} value={company} onChange={setCompany} placeholder="Geniego Inc." required />
            <Field label={t("auth.ceoNameLabel")} value={ceoName} onChange={setCeoName} placeholder="John Smith" required />
          </div>
          <SelectField label={t("auth.businessTypeLabel")} value={businessType} onChange={setBusinessType} options={BUSINESS_TYPES} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label={t("auth.businessNumberLabel")} value={businessNumber} onChange={setBusinessNumber} placeholder="000-00-00000" required hint={t("auth.businessNumberHint")} />
            <Field label={t("auth.phoneLabel")} type="tel" value={phone} onChange={setPhone} placeholder="010-0000-0000" required autoComplete="tel" />
          </div>
          <SelectField label={t("auth.countryLabel")} value={country} onChange={setCountry} options={COUNTRIES} required />
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
            <Field label={t("auth.zipCodeLabel")} value={zipCode} onChange={setZipCode} placeholder="12345" autoComplete="postal-code" />
            <Field label={t("auth.addressLabel")} value={address} onChange={setAddress} placeholder="123 Main St" required autoComplete="street-address" />
          </div>
          <Field label={t("auth.addressDetailLabel")} value={addressDetail} onChange={setAddressDetail} placeholder="Suite 500" autoComplete="address-line2" />
          <Field label={t("auth.websiteLabel")} value={website} onChange={setWebsite} placeholder="https://www.myshop.com" type="url" />
          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
          <button type="button" onClick={nextStep} style={{
            padding: "12px 0", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg,${PLAN_CFG.color},${PLAN_CFG.color}cc)`,
            color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>{t("auth.nextChannels")}</button>
        </div>
      )}

      {/* ─── STEP 3: Channels & Agree ─── */}
      {step === 3 && (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-2)", marginBottom: 8 }}>
              {t("auth.salesChannelTitle")} <span style={{ color: "#ef4444" }}>*</span>{" "}
              <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 400 }}>{t("auth.salesChannelNote")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {SALES_CHANNELS.map(ch => (
                <button key={ch.key} type="button" onClick={() => toggleChannel(salesChannels, setSalesChannels, ch.key)} style={{
                  padding: "8px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                  background: salesChannels.includes(ch.key) ? "rgba(79,142,247,0.12)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${salesChannels.includes(ch.key) ? "#4f8ef7" : "rgba(99,140,255,0.12)"}`,
                  display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13 }}>{ch.icon}</span>
                  <span style={{ fontSize: 11, color: salesChannels.includes(ch.key) ? "#4f8ef7" : "var(--text-2)", fontWeight: salesChannels.includes(ch.key) ? 700 : 400 }}>{ch.label}</span>
                  {salesChannels.includes(ch.key) && <span style={{ marginLeft: "auto", color: "#4f8ef7", fontSize: 12 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-2)", marginBottom: 8 }}>
              {t("auth.adChannelTitle")}{" "}
              <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 400 }}>{t("auth.adChannelNote")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {AD_CHANNELS.map(ch => (
                <label key={ch.key} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "6px 8px", borderRadius: 7, background: adChannels.includes(ch.key) ? "rgba(168,85,247,0.08)" : "transparent", border: `1px solid ${adChannels.includes(ch.key) ? "rgba(168,85,247,0.3)" : "transparent"}` }}>
                  <input type="checkbox" checked={adChannels.includes(ch.key)}
                    onChange={() => toggleChannel(adChannels, setAdChannels, ch.key)}
                    style={{ accentColor: "#a855f7", width: 13, height: 13, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: adChannels.includes(ch.key) ? "#a855f7" : "var(--text-3)" }}>{ch.label}</span>
                </label>
              ))}
            </div>
          </div>
          <SelectField label={t("auth.monthlyRevenueLabel")} value={monthlyRevenue} onChange={setMonthlyRevenue}
            options={["Under 100M", "100M-500M", "500M-2B", "2B-10B", "Over 10B"]} />
          <TermsAgreementSection
            agreeTerms={agreeTerms} setAgreeTerms={setAgreeTerms}
            agreePrivacy={agreePrivacy} setAgreePrivacy={setAgreePrivacy}
            agreeMarketing={agreeMarketing} setAgreeMarketing={setAgreeMarketing}
            agreeEcommerce={agreeEcommerce} setAgreeEcommerce={setAgreeEcommerce}
          />
          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            padding: "14px 0", borderRadius: 10, border: "none",
            background: loading ? `${PLAN_CFG.color}66` : `linear-gradient(135deg,${PLAN_CFG.color},${PLAN_CFG.color}cc)`,
            color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? t("auth.processingRegister") : `🚀 ${PLAN_CFG.label} Plan`}
          </button>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)" }}>
            {t("auth.alreadyHaveAccount")}{" "}
            <button type="button" onClick={() => onSwitch("login")} style={{ background: "none", border: "none", color: "#4f8ef7", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>{t("auth.loginLink")}</button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ─── Admin Login Form (한국어 전용) ────────────────────────── */
function AdminLoginForm({ onBack }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const ADMIN_GATE = "GENIEGO-ADMIN";

  const verifyKey = (e) => {
    e.preventDefault();
    if (adminKey.trim().toUpperCase() !== ADMIN_GATE) { setError("접속 코드가 올바르지 않습니다."); return; }
    setError(null); setStep(2);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const user = await login(email, password, "admin");
      if ((user.plans || user.plan) !== "admin") throw new Error("관리자 계정이 아닙니다. 관리자 전용 계정으로 로그인하세요.");
      navigate("/admin", { replace: true });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <span style={{ fontSize: 20 }}>🔐</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 12, color: "#ef4444" }}>플랫폼 관리자 로그인</div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>접속 코드 인증 후 관리자 계정으로 로그인합니다</div>
        </div>
      </div>
      {step === 1 ? (
        <form onSubmit={verifyKey} style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 5 }}>접속 코드</label>
            <input type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder="관리자 접속 코드를 입력하세요" required
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.04)", color: "#1e293b", fontSize: 13, outline: "none" }} />
          </div>
          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
          <button type="submit" style={{ padding: "12px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>접속 코드 확인</button>
        </form>
      ) : (
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11, color: "#22c55e" }}>✅ 접속 코드 인증 완료</div>
          <Field label="관리자 이메일" type="email" value={email} onChange={setEmail} placeholder="admin@example.com" required autoComplete="email" />
          <Field label="비밀번호" type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="current-password" />
          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ padding: "12px 0", borderRadius: 10, border: "none", background: loading ? "rgba(239,68,68,0.4)" : "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "로그인 중..." : "🔐 관리자 로그인"}
          </button>
          <button type="button" onClick={() => { setStep(1); setError(null); setAdminKey(""); }} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>접속 코드 재입력</button>
        </form>
      )}
      {/* 일반 로그인으로 돌아가기 */}
      <button type="button" onClick={() => onBack && onBack()}
        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', marginTop: 4, textAlign: 'center', width: '100%' }}>
        ← 돌아가기
      </button>
    </div>
  );
}

/* ─── Language Selector for Auth ──────────────────────────── */
function AuthLanguageSelector() {
  const { lang, setLang } = useI18n();
  const t = useT();
  const [open, setOpen] = useState(false);
  const current = LANG_OPTIONS.find(l => l.code === lang) || LANG_OPTIONS[0];

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,140,255,0.15)", color: '#fff', fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 200ms", backdropFilter: "blur(12px)" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,140,255,0.08)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      >
        <span style={{ fontSize: 16 }}>{current.flag}</span>
        <span>{current.label}</span>
        <span style={{ fontSize: 10, opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>▼</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 220, maxHeight: 400, overflowY: "auto", zIndex: 1000, background: "rgba(15,20,35,0.97)", backdropFilter: "blur(20px)", border: "1px solid rgba(99,140,255,0.15)", borderRadius: 14, padding: 6, boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "6px 10px 8px", fontSize: 10, fontWeight: 700, color: "var(--text-3)", borderBottom: "1px solid rgba(99,140,255,0.08)", marginBottom: 4 }}>
              🌐 {t('auth.langSelectTitle') || 'Language'}
            </div>
            {LANG_OPTIONS.map(opt => (
              <button key={opt.code} onClick={() => { setLang(opt.code); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer", background: lang === opt.code ? "rgba(79,142,247,0.12)" : "transparent", transition: "background 120ms" }}
                onMouseEnter={e => { if (lang !== opt.code) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (lang !== opt.code) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{opt.flag}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: lang === opt.code ? 700 : 500, color: lang === opt.code ? "#4f8ef7" : "var(--text-1)" }}>{opt.label}</div>
                  <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 1 }}>{opt.name}</div>
                </div>
                {lang === opt.code && <span style={{ color: "#4f8ef7", fontSize: 14, fontWeight: 800 }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


/* ─── MAIN ──────────────────────────────────────────────────── */
export default function AuthPage() {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDemoDomain = currentHost.includes('roidemo') || currentHost.includes('demo') || import.meta.env.VITE_DEMO_MODE === 'true';
  const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasRedirectedRef = React.useRef(false);

  // Read mode from URL parameters if provided (e.g. ?mode=free)
  const queryParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const rawMode = queryParams.get('mode') || "login";
  // On demo domain, ?mode=free from URL means demo registration (redirected from production)
  const initialMode = (rawMode === 'free' && isDemoDomain) ? 'demo_free' : rawMode;

  const [mode, setMode] = useState(initialMode); // login | register | free | demo_free | paid | admin
  const [planType, setPlanType] = useState("free");
  const [selectedPaid, setSelectedPaid] = useState("pro");
  const [loginType, setLoginType] = useState(null);

  /* ─── AUTO-REDIRECT GUARD ───
   * Only redirect to dashboard if:
   * 1) User is authenticated
   * 2) Haven't already redirected this mount
   * 3) User is NOT explicitly on a registration/signup page
   */
  useEffect(() => {
      if (user && !hasRedirectedRef.current) {
          const isRegistrationMode = initialMode === 'free' || initialMode === 'demo_free' || initialMode === 'register' || initialMode === 'paid';
          if (isRegistrationMode) return;
          
          hasRedirectedRef.current = true;
          navigate("/dashboard", { replace: true });
      }
  }, [user, navigate, initialMode]);

  const t = useT();

  // ─── STRICT ENVIRONMENT ROUTING ───
  const handleSwitch = (target) => {
    // 1. 데모 회원가입 (Demo Registration) → uses "demo_free" mode
    if (target === "demo_register") {
      if (isDemoDomain || isLocalhost) { setMode("demo_free"); }
      else { window.location.href = "https://roidemo.genie-go.com/login?mode=free"; }
      return;
    }
    // 2. 운영시스템 회원가입 (Production Registration) → 바로 가입폼으로 이동
    if (target === "prod_register") {
      if (!isDemoDomain || isLocalhost) { setMode("free"); }
      else { window.location.href = "https://roi.genie-go.com/login?mode=free"; }
      return;
    }
    // 3. 데모 로그인 (Demo Login) — 도메인 리다이렉트 없이 로컬 전환
    if (target === "demo_login") {
      if (mode !== "login") setMode("login");
      setLoginType("demo");
      return;
    }
    // 4. 운영시스템 로그인 (Production Login) — 도메인 리다이렉트 없이 로컬 전환
    if (target === "prod_login") {
      if (mode !== "login") setMode("login");
      setLoginType("production");
      return;
    }
    // Generic mode switch (login, admin, etc.)
    if (mode !== target) setMode(target);
  };

  /* Floating animation keyframes */
  const floatKeyframes = `
    @keyframes genieLevitate {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-12px); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes softPulse {
      0%, 100% { box-shadow: 0 8px 40px rgba(79,142,247,0.15), 0 0 0 0 rgba(79,142,247,0); }
      50% { box-shadow: 0 12px 50px rgba(79,142,247,0.25), 0 0 40px 8px rgba(79,142,247,0.06); }
    }
  `;

  const { lang: currentLang } = useI18n();
  const isRTL = currentLang === 'ar';

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #E3E0F2 0%, #DDDAED 25%, #DDDAED 50%, #E0DDF0 75%, #E5E2F4 100%)", padding: "24px 16px", direction: isRTL ? 'rtl' : 'ltr' }}>
      <style>{floatKeyframes}</style>
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-15%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(79,142,247,0.08) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-15%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(168,85,247,0.06) 0%,transparent 70%)" }} />
      </div>

      <div style={{ width: "100%", maxWidth: mode === "paid" ? 520 : 440, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <AuthLanguageSelector />
        </div>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div onClick={() => setMode("admin")} style={{ display: "inline-block", cursor: "pointer", animation: "genieLevitate 4s ease-in-out infinite", position: "relative", borderRadius: 32, overflow: "hidden" }}>
            <img src="/logo_v5.png" alt="Geniego-ROI" style={{ width: 280, height: 'auto', maxHeight: 260, objectFit: "contain", display: "block", margin: "0 auto", borderRadius: 32, filter: "drop-shadow(0 8px 24px rgba(79,142,247,0.18))" }} />
          </div>
          <div style={{ marginTop: 12, fontWeight: 900, fontSize: 18, letterSpacing: "1.5px", background: "linear-gradient(135deg, #4f8ef7 0%, #6366f1 30%, #a855f7 60%, #f59e0b 100%)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 4s linear infinite", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", textTransform: "uppercase" }}>
            {t('auth.platformSlogan')}
          </div>
          <div style={{ fontSize: 11, color: "#8B87A0", marginTop: 6, fontWeight: 700 }}>
            {isDemoDomain ? `🎪 ${t('auth.demoEnvBanner')}` : `🏢 ${t('auth.prodEnvBanner')}`}
          </div>
        </div>

        <div style={{ padding: "24px", borderRadius: 20, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(99,140,255,0.15)", boxShadow: "0 24px 64px rgba(0,0,0,0.08)", maxHeight: "80vh", overflowY: "auto", color: "#1e293b" }}>

          {/* ─── STEP 1: 환경 선택 (loginType이 null일 때) ─── */}
          {mode === "login" && !loginType && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{t('auth.selectLoginType')}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{t('auth.selectLoginTypeDesc')}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button type="button" onClick={() => handleSwitch('demo_login')}
                  style={{ padding: '24px 16px', borderRadius: 16, border: '2px solid rgba(251,146,60,0.3)', background: 'rgba(251,146,60,0.04)', cursor: 'pointer', transition: 'all 200ms', textAlign: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#fb923c'; e.currentTarget.style.background = 'rgba(251,146,60,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(251,146,60,0.3)'; e.currentTarget.style.background = 'rgba(251,146,60,0.04)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🎪</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#fb923c' }}>{t('auth.demoMemberLogin')}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{t('auth.demoEnvBanner')}</div>
                </button>
                <button type="button" onClick={() => handleSwitch('prod_login')}
                  style={{ padding: '24px 16px', borderRadius: 16, border: '2px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.04)', cursor: 'pointer', transition: 'all 200ms', textAlign: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f8ef7'; e.currentTarget.style.background = 'rgba(79,142,247,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(79,142,247,0.3)'; e.currentTarget.style.background = 'rgba(79,142,247,0.04)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🏢</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#4f8ef7' }}>{t('auth.productionLogin')}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{t('auth.prodEnvBanner')}</div>
                </button>
              </div>
              <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(99,140,255,0.15)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', fontWeight: 700 }}>{t('auth.noAccountYet')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button type="button" onClick={() => handleSwitch('demo_register')} style={{ padding: '10px', borderRadius: 10, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)', color: '#fb923c', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>
                    {t('auth.demoRegister')}
                  </button>
                  <button type="button" onClick={() => handleSwitch('prod_register')} style={{ padding: '10px', borderRadius: 10, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.3)', color: '#4f8ef7', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>
                    {t('auth.prodRegister')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: 로그인 폼 (loginType 선택 후) ─── */}
          {mode === "login" && loginType && (
            <>
              {/* 환경 전환 탭 (소형) */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button type="button" onClick={() => setLoginType('demo')}
                  style={{ flex: 1, padding: '8px', borderRadius: 10, border: loginType === 'demo' ? '2px solid #fb923c' : '1px solid rgba(251,146,60,0.2)', background: loginType === 'demo' ? 'rgba(251,146,60,0.1)' : 'transparent', cursor: 'pointer', transition: 'all 200ms', textAlign: 'center' }}>
                  <span style={{ fontSize: 14 }}>🎪</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: loginType === 'demo' ? '#fb923c' : '#94a3b8', marginLeft: 6 }}>{t('auth.demoMemberLogin')}</span>
                </button>
                <button type="button" onClick={() => setLoginType('production')}
                  style={{ flex: 1, padding: '8px', borderRadius: 10, border: loginType === 'production' ? '2px solid #4f8ef7' : '1px solid rgba(79,142,247,0.2)', background: loginType === 'production' ? 'rgba(79,142,247,0.1)' : 'transparent', cursor: 'pointer', transition: 'all 200ms', textAlign: 'center' }}>
                  <span style={{ fontSize: 14 }}>🏢</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: loginType === 'production' ? '#4f8ef7' : '#94a3b8', marginLeft: 6 }}>{t('auth.productionLogin')}</span>
                </button>
              </div>

              <LoginForm onSwitch={handleSwitch} loginType={loginType} />
              
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(99,140,255,0.15)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', fontWeight: 700 }}>{t('auth.noAccountYet')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button type="button" onClick={() => handleSwitch('demo_register')} style={{ padding: '10px', borderRadius: 10, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)', color: '#fb923c', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>
                    {t('auth.demoRegister')}
                  </button>
                  <button type="button" onClick={() => handleSwitch('prod_register')} style={{ padding: '10px', borderRadius: 10, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.3)', color: '#4f8ef7', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>
                    {t('auth.prodRegister')}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Route: Admin — 완전 격리, 데모/운영 선택 불가 */}
          {mode === "admin" && <AdminLoginForm onBack={() => { setMode('login'); setLoginType(null); }} />}

          {/* Route: Register (prod only) */}
          {mode === "register" && !isDemoDomain && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)" }}>
                <span style={{ fontSize: 18 }}>🏢</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: "#4f8ef7" }}>{t('auth.prodRegisterTitle')}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{t('auth.prodRegisterSelectPlan')}</div>
                </div>
                <button type="button" onClick={() => handleSwitch('login')} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => { setPlanType("free"); setMode("free"); }} style={{ padding: "18px 12px", borderRadius: 14, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.06)", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🆓</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#22c55e" }}>Free</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>{t('auth.prodFreeTrial')}</div>
                </button>
                <button onClick={() => { setPlanType("paid"); setMode("paid"); }} style={{ padding: "18px 12px", borderRadius: 14, border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.06)", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>💎</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#a855f7" }}>Paid</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>{t('auth.prodSubscription')}</div>
                </button>
              </div>
            </div>
          )}

          {/* Route: Demo registration (demo_free mode) */}
          {mode === "demo_free" && (
            <FreeRegisterForm variant="demo" onSwitch={handleSwitch} onBack={() => handleSwitch('login')} />
          )}

          {/* Route: Production registration chooser — 데모 도메인에서 운영 사이트 안내 */}
          {mode === "register" && isDemoDomain && !isLocalhost && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#4f8ef7', marginBottom: 12 }}>🏢 {t('auth.prodRegister')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 16 }}>{t('auth.prodRegisterRedirect')}</div>
              <a href="https://roi.genie-go.com/login?mode=register" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>{t('auth.goToProduction')}</a>
              <div style={{ marginTop: 12 }}>
                <button type="button" onClick={() => handleSwitch('login')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 11 }}>← {t('auth.goBack')}</button>
              </div>
            </div>
          )}
          
          {/* Route: Production free registration (free mode) */}
          {mode === "free" && (
            <FreeRegisterForm variant="production" onSwitch={handleSwitch} onBack={() => setMode('register')} />
          )}

          {/* Route: Paid registration */}
          {mode === "paid" && (
            <PaidRegisterForm selectedPlan={selectedPaid} onSwitch={handleSwitch} onBack={() => setMode("register")} />
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 10, color: "#8B87A0", lineHeight: 1.6 }}>
          v423.0.0 · © 2026 Geniego-ROI. All rights reserved.<br />
          <span style={{ opacity: 0.7, fontWeight: 600, letterSpacing: '0.5px' }}>Strict Isolated Enterprise Flow</span>
        </div>
      </div>
    </div>
  );
}
