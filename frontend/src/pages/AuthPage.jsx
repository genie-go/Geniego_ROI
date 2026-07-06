import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useT, useI18n, LANG_OPTIONS } from "../i18n";
import { bt } from "../utils/billingI18n";
import { getJson } from '../services/apiClient.js';
import { IS_DEMO } from '../utils/demoEnv';
import { MENU_KEY_LABEL } from '../layout/sidebarMenuLabels.js'; // 186차: 플랜 제공서비스 상세 설명
import PlanServiceGuide from '../components/PlanServiceGuide.jsx'; // 186차: 플랜 상세 안내(초고도화)

// ★Capacitor 네이티브 로그인 수정: 네이티브 웹뷰(https://localhost·capacitor://localhost)에서 상대경로 API 가
//   깨지므로 VITE_API_BASE(.env.capacitor) 를 접두. 웹/PWA 는 빈 문자열 → 기존 상대경로 유지.
const API_BASE = import.meta.env.VITE_API_BASE || "";

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
    notIncluded: ["Predictive analytics (Churn·LTV)", "Journey Builder", "Rule Engine", "Full Channel API"],
  },
  {
    id: "pro",
    label: "Pro",
    priceFallback: "Checking price",
    desc: "Growth brand · Agency · Full marketing automation",
    color: "#a855f7",
    popular: true,
    badge: "Most Popular",
    tagline: "Maximize marketing efficiency with predictive analytics & automation",
    target: "Brands with monthly revenue $2M–$10M, marketing agencies, data-driven ops teams",
    features: [
      { emoji: "🔮", text: "Predictive analytics: Customer churn · LTV · Purchase probability" },
      { emoji: "🗺", text: "Journey Builder · Trigger settings · Action node management" },
      { emoji: "⚙", text: "Rule Engine · Alert policy evaluation · Writeback" },
      { emoji: "🌐", text: "Full channel integration (LINE/WhatsApp/Instagram DM included)" },
      { emoji: "📈", text: "Attribution · Competitor analysis · Anomaly detection · Auto reports" },
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
            const pricingSection = '   \u2460 \uad6c\ub3c5 \ud50c\ub79c\ubcc4 \uc694\uae08 (\ubaa8\ub4e0 \uae08\uc561 VAT \ubcc4\ub3c4 \ud45c\uc2dc \u00b7 \uacb0\uc81c \uc2dc \ubd80\uac00\uc138 10% \ubcc4\ub3c4 \ubd80\uacfc):\n' + lines.join('\n');
            const ecomBody = `\u300c\uc804\uc790\uc0c1\uac70\ub798 \ub4f1\uc5d0\uc11c\uc758 \uc18c\ube44\uc790\ubcf4\ud638\uc5d0 \uad00\ud55c \ubc95\ub960\u300d\uc5d0 \ub530\ub77c \ub2e4\uc74c\uacfc \uac19\uc774 \uace0\uc9c0\ud569\ub2c8\ub2e4.\n\n1. \uc0ac\uc5c5\uc790 \uc815\ubcf4\n   \uc0c1\ud638: Geniego-ROI (\uc6b4\uc601: \uc8fc\uc2dd\ud68c\uc0ac OCIELL)\n   \ub300\ud45c\uc774\uc0ac: CEO\n   \uc0ac\uc5c5\uc7a5 \uc18c\uc7ac\uc9c0: \ub300\ud55c\ubbfc\uad6d\n   \uc774\uba54\uc77c: geniegoroi@ociell.com\n   \uace0\uac1d\uc13c\ud130: 1:1 \ubb38\uc758(\ud50c\ub7ab\ud3fc \ub0b4)\n\n2. \uc11c\ube44\uc2a4 \uc694\uae08 \ubc0f \uacb0\uc81c\n${pricingSection}\n   \u2461 \uacb0\uc81c \uc218\ub2e8: \uc2e0\uc6a9\uce74\ub4dc, \uccb4\ud06c\uce74\ub4dc, \uac04\ud3b8\uacb0\uc81c (Paddle \uacb0\uc81c \uc2dc\uc2a4\ud15c \uc5f0\ub3d9)\n   \u2462 \uacb0\uc81c \ud1b5\ud654: \uc6d0\ud654(KRW) \uae30\ubcf8, \ud574\uc678 \uacb0\uc81c \uc2dc \ud604\uc9c0 \ud1b5\ud654 \uc9c0\uc6d0\n   \u2463 \uc601\uc218\uc99d: \uacb0\uc81c \uc644\ub8cc \ud6c4 \ub4f1\ub85d\ub41c \uc774\uba54\uc77c\ub85c \uc790\ub3d9 \ubc1c\uc1a1\n   \u2464 \ubd80\uac00\uac00\uce58\uc138(VAT): \ubaa8\ub4e0 \ud45c\uc2dc \uc694\uae08\uc740 VAT \ubcc4\ub3c4\uc774\uba70, \uc2e4\uc81c \uacb0\uc81c \uc2dc \ubd80\uac00\uc138 10%\uac00 \uac00\uc0b0\ub418\uc5b4 \uccad\uad6c\ub429\ub2c8\ub2e4(\uacb0\uc81c\ub300\ud589 Paddle \uc790\ub3d9 \uc0b0\uc815).\n\n3. \uad6c\ub3c5 \uc790\ub3d9 \uac31\uc2e0\n   \u2460 \uad6c\ub3c5\uc740 \uc120\ud0dd\ud55c \uacb0\uc81c \uc8fc\uae30(\uc6d4\uac04/\uc5f0\uac04)\uc5d0 \ub530\ub77c \uc790\ub3d9 \uac31\uc2e0\ub429\ub2c8\ub2e4.\n   \u2461 \uac31\uc2e0\uc77c 7\uc77c \uc804 \uc774\uba54\uc77c\ub85c \uc0ac\uc804 \uace0\uc9c0\ud569\ub2c8\ub2e4.\n   \u2462 \uc790\ub3d9 \uac31\uc2e0 \ud574\uc9c0\ub294 \ub9c8\uc774\ud398\uc774\uc9c0 > \uad6c\ub3c5 \uad00\ub9ac\uc5d0\uc11c \uac00\ub2a5\ud569\ub2c8\ub2e4.\n\n4. \uccad\uc57d \ucca0\ud68c \ubc0f \ud658\ubd88\n   \u2460 \uacb0\uc81c \ud6c4 7\uc77c \uc774\ub0b4 \uccad\uc57d \ucca0\ud68c \uac00\ub2a5 (\uc11c\ube44\uc2a4 \ubbf8\uc0ac\uc6a9 \uc2dc)\n   \u2461 \ub514\uc9c0\ud138 \ucf58\ud150\uce20 \ud2b9\uc131\uc0c1 \uc774\uc6a9 \ud6c4\uc5d0\ub294 \ud658\ubd88\uc774 \uc81c\ud55c\ub429\ub2c8\ub2e4.\n   \u2462 \ubbf8\uc0ac\uc6a9 \uae30\uac04\uc5d0 \ub300\ud55c \uc77c\ud560 \ud658\ubd88\uc774 \uac00\ub2a5\ud569\ub2c8\ub2e4.\n\n5. \uc18c\ube44\uc790 \ud53c\ud574 \ubcf4\uc0c1\n   \u300c\uc804\uc790\uc0c1\uac70\ub798\ubc95\u300d \ubc0f \u300c\uc18c\ube44\uc790\ubd84\uc7c1\ud574\uacb0\uae30\uc900\u300d\uc5d0 \ub530\ub77c \ucc98\ub9ac\ud569\ub2c8\ub2e4.`;
            setContent({ title: '\uc804\uc790\uc0c1\uac70\ub798 \uc774\uc6a9 \ubc0f \uc18c\ube44\uc790\ubcf4\ud638 \uace0\uc9c0', body: ecomBody });
          }
        })
        .catch(() => {});
    }
  }, [open, category]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(15,23,42,0.18)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eef2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>📋 {content.title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, fontSize: 12, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
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
  // 208차: 모바일 가시성 — 고대비(라이트 카드+진한 텍스트)·큰 터치영역(44px)·뚜렷한 [필수] 배지.
  //   기존 11px·저대비(var(--text-2)/#94a3b8)·14px 체크박스가 모바일에서 약관 동의가 안 보여 가입 차단되던 문제 해소.
  return (
    <>
      <TermsModal open={!!modalCat} onClose={() => setModalCat(null)} category={modalCat} />
      <div style={{ display: 'grid', gap: 8, padding: 14, borderRadius: 12, background: '#f8fafc', border: '1px solid #cbd5e1' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 2 }}>📋 {t('auth.termsAgreeTitle', '약관 동의')}</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '11px 10px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', minHeight: 44, boxSizing: 'border-box' }}>
          <input type="checkbox" checked={agreeAll} onChange={e => handleAllToggle(e.target.checked)}
            style={{ accentColor: '#2563eb', width: 20, height: 20, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{t('auth.agreeAllTerms')}</span>
        </label>
        {items.map(({ key, val, set, label, required }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 40 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, padding: '4px 2px', minWidth: 0 }}>
              <input type="checkbox" checked={val} onChange={e => set(e.target.checked)}
                style={{ accentColor: '#2563eb', width: 18, height: 18, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#334155', fontWeight: 600, lineHeight: 1.4 }}>
                <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 6, marginRight: 6, background: required ? '#fee2e2' : '#e2e8f0', color: required ? '#dc2626' : '#64748b' }}>{required ? t('auth.requiredTag') : t('auth.optionalTag')}</span>
                {label}
              </span>
            </label>
            <button type="button" onClick={() => setModalCat(key)} style={{ background: '#fff', border: '1px solid #bfdbfe', color: '#2563eb', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: 8, padding: '7px 11px', flexShrink: 0, minHeight: 36 }}>{t('auth.viewTerms')}</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── Input Field ──────────────────────────────────────────── */
function Field({ label, type = "text", value, onChange, placeholder, required, autoComplete, hint, disabled }) {
  // 207차: 비밀번호 보이기/숨기기 토글 — 자동완성으로 채워진 잘못된 값 확인용(로그인 디버깅).
  const isPw = type === "password";
  const [reveal, setReveal] = useState(false);
  const effType = isPw && reveal ? "text" : type;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <div style={{ position: "relative" }}>
        {/* [현 차수] ★모바일 로그인 실패 근본수정: 자격증명 입력에 자동대문자/자동교정/맞춤법 차단.
            비번 "보이기"(type=text)·이메일 입력 시 모바일 키보드가 첫 글자 대문자화/자동교정 →
            비밀번호 변형으로 "비번틀림" 발생하던 원인. inputMode 로 이메일 키보드 최적화. */}
        <input
          type={effType} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required={required} autoComplete={autoComplete} disabled={disabled}
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          inputMode={type === "email" ? "email" : undefined}
          style={{ padding: isPw ? "10px 44px 10px 14px" : "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)", color: disabled ? '#94a3b8' : '#fff', fontSize: 13, outline: "none", transition: "border-color 150ms", width: "100%", boxSizing: "border-box", cursor: disabled ? "not-allowed" : "text" }}
          onFocus={e => (e.target.style.borderColor = "#4f8ef7")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
        {isPw && !disabled && (
          <button type="button" tabIndex={-1} onClick={() => setReveal(v => !v)}
            title={reveal ? "숨기기" : "보이기"}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontSize: 15, padding: 4, lineHeight: 1, color: "#94a3b8" }}>
            {reveal ? "🙈" : "👁️"}
          </button>
        )}
      </div>
      {hint && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{hint}</div>}
    </div>
  );
}

/* ─── 계정 복구: 아이디(이메일) 찾기 / 비밀번호 찾기·재설정 (188차) ───
   신뢰가능한 이메일 발송 인프라 부재 → 본인확인(이메일+이름+전화) 기반 재설정. */
function AccountRecovery({ t, initial = "findId", resetToken = "", onClose }) {
  const [view, setView] = useState(initial); // 'findId' | 'forgot' | 'reset' | 'sent' | 'done'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fName, setFName] = useState(""); const [fPhone, setFPhone] = useState("");
  const [found, setFound] = useState(null);
  const [gEmail, setGEmail] = useState(""); const [gName, setGName] = useState(""); const [gPhone, setGPhone] = useState("");
  const [rtok, setRtok] = useState(resetToken || ""); // 190차: 이메일 링크(?reset=)로 진입 시 토큰 프리필
  const [np, setNp] = useState(""); const [np2, setNp2] = useState("");

  const post = async (path, body) => {
    try {
      const r = await fetch(API_BASE + "/api/auth" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      return { ok: r.ok && d.ok, d };
    } catch { return { ok: false, d: { error: t("auth.networkError", "네트워크 오류. 다시 시도하세요.") } }; }
  };
  const doFindId = async () => {
    setErr(""); if (!fName.trim() || !fPhone.trim()) { setErr(t("auth.findIdNeed", "이름과 전화번호를 입력하세요.")); return; }
    setBusy(true); const { ok, d } = await post("/find-id", { name: fName.trim(), phone: fPhone.trim() }); setBusy(false);
    if (ok) setFound(d.accounts || []); else setErr(d.error || t("auth.findIdFail", "일치하는 계정을 찾을 수 없습니다."));
  };
  const doForgot = async () => {
    setErr(""); if (!gEmail.trim() || !gName.trim()) { setErr(t("auth.forgotNeed", "이메일과 이름을 입력하세요.")); return; }
    setBusy(true); const { ok, d } = await post("/forgot-password", { email: gEmail.trim(), name: gName.trim(), phone: gPhone.trim() }); setBusy(false);
    // 190차: 이메일 인프라 설정 시 링크 발송(email_sent) → 메일확인 안내. 미설정 시 토큰 인라인 폴백.
    if (ok && d.email_sent) { setView("sent"); }
    else if (ok && d.reset_token) { setRtok(d.reset_token); setView("reset"); }
    else setErr(d.error || t("auth.forgotFail", "본인확인 정보가 일치하지 않습니다."));
  };
  const doReset = async () => {
    setErr(""); if (np.length < 8) { setErr(t("auth.pwMin", "새 비밀번호는 8자 이상이어야 합니다.")); return; }
    if (np !== np2) { setErr(t("auth.pwMismatch", "비밀번호가 일치하지 않습니다.")); return; }
    setBusy(true); const { ok, d } = await post("/reset-password", { reset_token: rtok, new_password: np }); setBusy(false);
    if (ok) setView("done"); else setErr(d.error || t("auth.resetFail", "재설정에 실패했습니다."));
  };

  const tabBtn = (v, label) => (
    <button type="button" onClick={() => { setView(v); setErr(""); setFound(null); }}
      style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800,
        background: view === v ? "rgba(79,142,247,0.18)" : "transparent", color: view === v ? "#4f8ef7" : "#64748b" }}>{label}</button>
  );
  const submitBtn = (onClick, label) => (
    <button type="button" onClick={onClick} disabled={busy}
      style={{ padding: "11px 0", borderRadius: 10, border: "none", background: busy ? "#4f8ef766" : "linear-gradient(135deg,#4f8ef7,#4f8ef7cc)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: busy ? "not-allowed" : "pointer" }}>
      {busy ? "…" : label}</button>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(2,6,23,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 22, boxShadow: "0 24px 70px rgba(15,23,42,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: "#0f172a" }}>🔑 {t("auth.recoveryTitle", "계정 찾기")}</div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {view !== "reset" && view !== "done" && view !== "sent" && (
          <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
            {tabBtn("findId", t("auth.findIdLink", "아이디(이메일) 찾기"))}
            {tabBtn("forgot", t("auth.forgotLink", "비밀번호 찾기"))}
          </div>
        )}
        {err && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11, marginBottom: 12 }}>{err}</div>}

        {view === "findId" && (found === null ? (
          <div style={{ display: "grid", gap: 14 }}>
            <Field label={t("auth.nameLabel", "이름")} value={fName} onChange={setFName} placeholder={t("auth.namePh", "가입 시 이름")} required />
            <Field label={t("auth.phoneLabel", "전화번호")} value={fPhone} onChange={setFPhone} placeholder="010-0000-0000" required />
            <div style={{ fontSize: 10, color: "#64748b" }}>{t("auth.findIdHint", "가입 시 등록한 이름·전화번호로 이메일(아이디)을 찾습니다.")}</div>
            {submitBtn(doFindId, t("auth.findIdBtn", "아이디 찾기"))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {found.length === 0 ? <div style={{ color: "#64748b", fontSize: 12 }}>{t("auth.findIdNone", "일치하는 계정이 없습니다.")}</div> :
              found.map((a, i) => (
                <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#22c55e" }}>{a.email}</div>
                  {a.joined && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{t("auth.joinedAt", "가입일")}: {a.joined}</div>}
                </div>
              ))}
            <button type="button" onClick={() => setFound(null)} style={{ padding: "10px 0", borderRadius: 10, border: "1px solid #cbd5e1", background: "transparent", color: "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{t("auth.back", "← 다시")}</button>
          </div>
        ))}

        {view === "forgot" && (
          <div style={{ display: "grid", gap: 14 }}>
            <Field label={t("auth.emailLabel", "이메일")} type="email" value={gEmail} onChange={setGEmail} placeholder="you@example.com" required />
            <Field label={t("auth.nameLabel", "이름")} value={gName} onChange={setGName} placeholder={t("auth.namePh", "가입 시 이름")} required />
            <Field label={t("auth.phoneLabel", "전화번호")} value={gPhone} onChange={setGPhone} placeholder={t("auth.phoneOptPh", "등록 시 전화번호(있으면)")} />
            <div style={{ fontSize: 10, color: "#64748b" }}>{t("auth.forgotHint", "본인확인 후 새 비밀번호를 바로 설정합니다.")}</div>
            {submitBtn(doForgot, t("auth.forgotBtn", "본인확인"))}
          </div>
        )}

        {view === "reset" && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", fontSize: 11 }}>✅ {t("auth.verifyOk", "본인확인 완료. 새 비밀번호를 설정하세요.")}</div>
            <Field label={t("auth.newPwLabel", "새 비밀번호")} type="password" value={np} onChange={setNp} placeholder="••••••••" required autoComplete="new-password" hint={t("auth.pwMinHint", "8자 이상")} />
            <Field label={t("auth.newPwConfirm", "새 비밀번호 확인")} type="password" value={np2} onChange={setNp2} placeholder="••••••••" required autoComplete="new-password" />
            {submitBtn(doReset, t("auth.resetBtn", "비밀번호 재설정"))}
          </div>
        )}

        {view === "sent" && (
          <div style={{ display: "grid", gap: 16, textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 40 }}>📧</div>
            <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>{t("auth.resetEmailSent", "재설정 링크를 이메일로 보냈습니다.")}</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>{t("auth.resetEmailSentDesc", "메일함(스팸함 포함)을 확인하고 링크를 눌러 새 비밀번호를 설정하세요. 링크는 15분간 유효합니다.")}</div>
            {submitBtn(onClose, t("auth.close", "닫기"))}
          </div>
        )}

        {view === "done" && (
          <div style={{ display: "grid", gap: 16, textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>{t("auth.resetDone", "비밀번호가 재설정되었습니다.")}</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>{t("auth.resetDoneDesc", "새 비밀번호로 로그인하세요.")}</div>
            {submitBtn(onClose, t("auth.goLogin", "로그인하기"))}
          </div>
        )}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, required }) {
  const t = useT(); // 189차+ 크래시 수정: t 범위밖 ReferenceError(회원가입 폼) 해소
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "#ffffff", color: 'var(--text-1)', fontSize: 13, outline: "none", cursor: "pointer", width: "100%", boxSizing: "border-box" }}>
        <option value="">{t('auth.selectOption', '선택')}</option>
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
        <div style={{ flex: 1, height: 1, background: 'rgba(15,23,42,0.1)' }} />
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{t('auth.orContinueWith', 'Or continue with SSO')}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(15,23,42,0.1)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {providers.map(p => (
          <button type="button" key={p.id} onClick={(e) => { e.preventDefault(); alert(t('auth.ssoAdminSetup', '엔터프라이즈 SSO(OIDC/SAML)는 관리자 콘솔에서 조직 IdP를 설정한 뒤 이용할 수 있습니다. (팀·권한 → SSO 설정)')); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', borderRadius: 8, border: '1px solid rgba(15,23,42,0.12)', background: p.bg, cursor: 'pointer', boxShadow: '0 2px 4px rgba(15,23,42,0.08)', transition: 'transform 150ms' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
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
  const [wrongSite, setWrongSite] = useState(null); // [현 차수] 데모↔운영 사이트 혼동 안내({url,site})
  // 190차: 이메일 재설정 링크(/login?reset=<token>)로 진입 시 재설정 모달 자동 오픈
  const resetTokenFromUrl = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("reset") || "") : "";
  const [recovery, setRecovery] = useState(resetTokenFromUrl ? "reset" : null); // 188차: null | 'findId' | 'forgot' | (190차) 'reset'
  const [mfaStep, setMfaStep] = useState(false);   // 189차: 2단계 인증 코드 입력 단계
  const [otp, setOtp] = useState("");
  const [mfaMethod, setMfaMethod] = useState("totp"); // 195차 #3: 인증 방식(email/sms/kakao/totp)
  const [mfaInfo, setMfaInfo] = useState("");          // 195차 #3: 발송형 안내(코드 발송됨 등)
  const [remember, setRemember] = useState(true); // 192차: 기본 영속세션(엔터프라이즈 SaaS) — 공용 PC에서만 체크 해제

  /* 자동 로그아웃으로 리디렉트된 경우 감지 */
  const isIdleLogout = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reason") === "idle";

  const isDemo = loginType === 'demo';
  const envColor = isDemo ? '#fb923c' : '#4f8ef7';
  const envIcon = isDemo ? '🎪' : '🏢';
  const envLabel = isDemo ? t('auth.demoMemberLogin') : t('auth.productionLogin');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setWrongSite(null); setLoading(true);
    // 207차: 자동완성 비동기화 방지 — 제출 시 DOM 실 입력값 우선(state-표시값 불일치 로그인 실패 차단).
    let liveEmail = email, livePw = password;
    try {
      const form = e.currentTarget;
      const ins = [...form.querySelectorAll('input')];
      const emEl = ins.find(i => i.type === 'email') || ins[0];
      const pwEl = ins.find(i => i.type === 'password') || ins.find(i => i.type === 'text');
      if (emEl && emEl.value) liveEmail = emEl.value;
      if (pwEl && pwEl.value) livePw = pwEl.value;
    } catch (_) {}
    try {
      const user = await login(liveEmail.trim(), livePw, loginType, "", otp, remember);
      /* ── admin 계정은 일반 로그인 차단 ── */
      if ((user.plans || user.plan) === 'admin') {
        throw new Error(t('auth.adminBlockedInNormalLogin'));
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err.mfaRequired) {
        // 189차: 비밀번호 통과 → 2단계 인증 코드 입력 단계로 전환
        setMfaStep(true);
        setMfaMethod(err.mfaMethod || "totp");
        // 195차 #3: 발송형(email/sms/kakao)은 코드 발송 안내를 정보로 표시(에러 아님)
        if (!otp) { setMfaInfo(err.mfaMethod && err.mfaMethod !== "totp" ? (err.message || "") : ""); setError(null); }
        else { setError(err.message || t('auth.mfaInvalid', '인증 코드가 올바르지 않습니다.')); }
      } else {
        setError(err.message);
        if (err.wrongSite && err.correctUrl) setWrongSite({ url: err.correctUrl, site: err.correctSite });
      }
    }
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

      <Field label={t("auth.emailLabel")} type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" disabled={mfaStep} />
      <Field label={t("auth.passwordLabel")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="current-password" disabled={mfaStep} />

      {/* 189차 MFA: 2단계 인증 코드 입력 단계 */}
      {mfaStep && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.3)", color: "#4f8ef7", fontSize: 11, fontWeight: 600 }}>
            🔐 {mfaMethod === 'email' ? t('auth.mfaPromptEmail', '이메일로 보낸 6자리 인증 코드(또는 복구 코드)를 입력하세요.')
              : mfaMethod === 'sms' ? t('auth.mfaPromptSms', '문자로 보낸 6자리 인증 코드(또는 복구 코드)를 입력하세요.')
              : mfaMethod === 'kakao' ? t('auth.mfaPromptKakao', '카카오톡으로 보낸 6자리 인증 코드(또는 복구 코드)를 입력하세요.')
              : t('auth.mfaPrompt', '인증 앱의 6자리 코드 또는 복구 코드를 입력하세요.')}
          </div>
          {mfaInfo && <div style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", color: "#16a34a", fontSize: 11 }}>📨 {mfaInfo}</div>}
          <Field label={t('auth.mfaCodeLabel', '인증 코드')} type="text" value={otp} onChange={setOtp} placeholder="000000" autoComplete="one-time-code" />
          {mfaMethod !== 'totp' && (
            <button type="button" onClick={async () => { setOtp(""); setError(null); try { await login(email, password, loginType, "", "", remember); } catch (e2) { if (e2.mfaRequired) { setMfaInfo(e2.message || t('auth.mfaResent', '인증 코드를 다시 보냈습니다.')); } else { setError(e2.message); } } }}
              style={{ justifySelf: "start", background: "none", border: "none", color: "#4f8ef7", fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
              {t('auth.mfaResend', '인증 코드 재발송')}
            </button>
          )}
        </div>
      )}

      {error && !wrongSite && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
      {/* [현 차수] 데모↔운영 사이트 혼동 안내 — 비번 오인 무한 재시도 차단. 올바른 사이트로 즉시 이동. */}
      {wrongSite && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.45)", display: "grid", gap: 9 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", lineHeight: 1.6 }}>ℹ️ {error}</div>
          <a href={wrongSite.url} style={{ display: "block", textAlign: "center", padding: "10px 0", borderRadius: 9, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", fontWeight: 900, fontSize: 12.5, textDecoration: "none" }}>
            {wrongSite.site === 'demo' ? t('auth.goDemoSite', '🎪 데모 체험 사이트로 이동') : t('auth.goProdSite', '🏢 운영 사이트로 이동')} →
          </a>
        </div>
      )}

      {/* 189차 자동 로그인(remember-me) — 체크 시 브라우저 재시작 후에도 로그인 유지 */}
      {!mfaStep && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", fontSize: 12, color: "#94a3b8" }}>
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: envColor, cursor: "pointer" }} />
          <span>{t('auth.rememberMe', '자동 로그인')}</span>
          <span style={{ fontSize: 10, color: "#64748b" }}>· {t('auth.rememberMeHint', '공용 PC에서는 사용하지 마세요')}</span>
        </label>
      )}

      {!mfaStep && <SSOButtonGroup t={t} />}
      <button type="submit" disabled={loading} style={{ padding: "12px 0", borderRadius: 10, border: "none", background: loading ? `${envColor}66` : `linear-gradient(135deg,${envColor},${envColor}cc)`, color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? t("auth.loggingIn") : (mfaStep ? `🔐 ${t('auth.mfaVerify', '인증 후 로그인')}` : `${envIcon} ${envLabel}`)}
      </button>

      {/* 188차: 아이디(이메일) 찾기 / 비밀번호 찾기 */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 2 }}>
        <button type="button" onClick={() => setRecovery("findId")} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 11.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>{t("auth.findIdLink", "아이디(이메일) 찾기")}</button>
        <span style={{ color: "#334155", fontSize: 10 }}>|</span>
        <button type="button" onClick={() => setRecovery("forgot")} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 11.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>{t("auth.forgotLink", "비밀번호 찾기")}</button>
      </div>
      {recovery && <AccountRecovery t={t} initial={recovery} resetToken={resetTokenFromUrl} onClose={() => setRecovery(null)} />}
    </form>
  );
}

/* ─── Plan Selector ────────────────────────────────────────── */
function PlanSelector({ planType, setPlanType, selectedPaid, setSelectedPaid }) {
  const t = useT();
  const { lang: trialLang } = useI18n();
  const [planPrices, setPlanPrices] = useState({});    // { growth: "$120/mo", pro: "$150/mo", ... }
  const [priceLoading, setPriceLoading] = useState(true);

  useEffect(() => {
    // Management자가 Register한 Latest Pricing을 public-plans API에서 실Time 불러오기
    getJson("/api/auth/pricing/public-plans")
      .then(d => {
        if (!d.ok) return;
        const prices = {};
        // [현 차수] publicPlans(AdminPlans::publicPlans) 실응답 형식 사용. 기존엔 미존재 필드
        //   (hasPricing/tiers/cycles)를 기대해 항상 조기 return → admin 가격 미표시·하드코딩 폴백 고정이었음.
        //   실응답은 periods[](base seat '1', period_months 1/3/12) + price_usd(월 환산) 제공.
        (d.plans || []).forEach(p => {
          const periods = Array.isArray(p.periods) ? p.periods : [];
          const monthlyEntry = periods.find(x => Number(x.period_months) === 1);
          const monthly = monthlyEntry?.price_usd ?? p.price_usd;
          if (monthly != null && Number(monthly) > 0) {
            prices[p.id] = "$" + Number(monthly).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + "/mo~";
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
                  {/* [현 차수] 부가세 별도 표기 — 실제 표시 가격일 때만(맞춤견적/미설정 제외) */}
                  {/\d/.test(getDisplayPrice(p.id, p.priceFallback)) && (
                    <div style={{ fontSize: 8, color: "var(--text-3)", marginTop: 1, opacity: 0.85 }}>{t("appPricing.exclVat", "(VAT 별도)")}</div>
                  )}
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

                {/* 20일 무료 체험 안내 — 가입 시 결제 없이 20일 무료 이용 후 결제 */}
                <div style={{ padding: "12px 14px", borderRadius: 10, marginBottom: 10,
                  background: "linear-gradient(135deg,rgba(34,197,94,0.12),rgba(16,185,129,0.06))",
                  border: "1px solid rgba(34,197,94,0.35)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                    <span style={{ fontSize: 15 }}>🎁</span>
                    <span style={{ fontSize: 12.5, fontWeight: 900, color: "#16a34a" }}>{bt("trialTitle", trialLang)}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#16a34a", background: "rgba(34,197,94,0.16)", padding: "2px 7px", borderRadius: 99 }}>{bt("trialBadge", trialLang)}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: "#cbd5e1", lineHeight: 1.6 }}>{bt("trialDesc", trialLang)}</div>
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
  // [현 차수] ★회원가입 시 회사정보 필수 — 이후 API 키 발급신청 등에서 재사용(중복입력 제거).
  const [company, setCompany] = useState("");
  const [ceoName, setCeoName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [phone, setPhone] = useState("");
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
    // [현 차수] ★회사정보 필수 검증 — 누락 시 가입 불가.
    if (!company.trim() || !ceoName.trim() || !businessNumber.trim() || !phone.trim()) {
      setError(t('auth.companyInfoRequired', '회사명·대표자명·사업자등록번호·연락처를 모두 입력해 주세요.')); return;
    }
    if (!agreeTerms || !agreePrivacy || !agreeEcommerce) { setError(t('auth.agreeTermsRequired')); return; }
    setLoading(true);
    try {
      const result = await register(email, password, name, company.trim(), {
        plan: "",
        company: company.trim(), ceo_name: ceoName.trim(), business_number: businessNumber.trim(), phone: phone.trim(),
      });
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

      <Field label={t("auth.nameLabel")} value={name} onChange={setName} placeholder={t('auth.namePh', '홍길동')} required autoComplete="name" />
      <Field label={t("auth.emailLabel")} type="email" value={email} onChange={setEmail} placeholder="you@example.com" required autoComplete="email" />
      <div>
        <Field label={t("auth.passwordHint")} type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="new-password" />
        <PasswordStrengthMeter password={password} />
      </div>
      <Field label={t("auth.passwordConfirm")} type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" required autoComplete="new-password" />

      {/* [현 차수] ★회사정보(필수) — 가입 시 1회 등록 → 이후 API 키 발급신청 등에서 자동 재사용 */}
      <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.18)", fontSize: 10.5, color: "var(--text-2)", fontWeight: 700 }}>
        🏢 {t('auth.companyInfoNote', '회사 정보를 등록하면 이후 API 키 발급신청·연동에서 자동으로 불러와 중복 입력이 필요 없습니다.')}
      </div>
      <Field label={t("auth.companyLabel", '회사명')} value={company} onChange={setCompany} placeholder={t('auth.companyPh', '(주)회사명')} required autoComplete="organization" />
      <Field label={t("auth.ceoNameLabel", '대표자명')} value={ceoName} onChange={setCeoName} placeholder={t('auth.ceoNamePh', '홍길동')} required />
      <Field label={t("auth.bizNumberLabel", '사업자등록번호')} value={businessNumber} onChange={setBusinessNumber} placeholder="000-00-00000" required />
      <Field label={t("auth.phoneLabel", '연락처')} type="tel" value={phone} onChange={setPhone} placeholder="02-0000-0000" required autoComplete="tel" />

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
function PaidRegisterForm({ selectedPlan, onBack, onSwitch, prefill = {} }) {
  const t = useT();
  const { register } = useAuth();
  const navigate = useNavigate();
  const isConvert = !!prefill.convert; // [245차] 데모→운영 전환(프로필 prefill, 체험 데이터 미이관)
  const [step, setStep] = useState(1); // 1: account, 2: business, 3: channels

  /* Step 1 - Account — [245차] 전환 시 데모 프로필 prefill(이메일/이름). 비밀번호는 보안상 운영에서 신규 설정. */
  const [name, setName] = useState(prefill.name || "");
  const [email, setEmail] = useState(prefill.email || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  /* Step 2 - Business Info — [245차] 전환 시 데모에서 받은 회사정보 prefill. */
  const [company, setCompany] = useState(prefill.company || "");
  const [ceoName, setCeoName] = useState(prefill.ceoName || "");
  const [businessType, setBusinessType] = useState("");
  const [businessNumber, setBusinessNumber] = useState(prefill.businessNumber || ""); // 사업자번호
  const [country, setCountry] = useState("대한민국");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [phone, setPhone] = useState(prefill.phone || "");
  const [website, setWebsite] = useState("");

  /* Step 3 - Channels */
  const [salesChannels, setSalesChannels] = useState([]);
  const [adChannels, setAdChannels] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeEcommerce, setAgreeEcommerce] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  // 172차 P0-B — 구독 cycle 선택 (1/3/6/12개월). 1 = 월간 default.
  const [cycleMonths, setCycleMonths] = useState(1);
  // 186차 — 계정수(seat) 선택 (1/10/무제한 등, admin 설정). 같은 플랜이라도 계정수별 요금.
  const [seatTier, setSeatTier] = useState('1');
  const [seatTiers, setSeatTiers] = useState([]);     // [{key,label,count,unlimited}]
  const [seatPricing, setSeatPricing] = useState({}); // { seat_tier: [periods] }
  const [basePeriods, setBasePeriods] = useState(null); // null=로딩, []=없음, [...]=있음
  // 186차: 구버전 상세 설명서 — 이 플랜이 제공하는 서비스(menuAccess) + 기능목록
  const [planMenuAccess, setPlanMenuAccess] = useState([]);
  const [planFeatures, setPlanFeatures] = useState([]);
  const [planDesc, setPlanDesc] = useState('');

  useEffect(() => {
    fetch(API_BASE + '/auth/pricing/public-plans')
      .then(r => r.json())
      .then(d => {
        if (!d?.ok) return;
        const p = (d.plans || []).find(x => x.id === selectedPlan);
        setBasePeriods(Array.isArray(p?.periods) ? p.periods : []);
        setSeatPricing(p?.seatPricing && typeof p.seatPricing === 'object' ? p.seatPricing : {});
        setSeatTiers(Array.isArray(p?.seatTiers) ? p.seatTiers : []);
        setPlanMenuAccess(Array.isArray(p?.menuAccess) ? p.menuAccess : []);
        setPlanFeatures(Array.isArray(p?.features) ? p.features : []);
        setPlanDesc(p?.description || '');
      })
      .catch(() => { setBasePeriods([]); });
  }, [selectedPlan]);

  // 186차: 선택 계정수의 기간 가격 → CycleSelectorSection 으로 전달. 없으면 base(1계정) periods.
  // [시장진입] 종량 추가seat: seatTier='custom:N'(2~9) 이면 base(1계정) + (N−1)×addon 단가로 기간별 계산(절벽 제거).
  const planPeriods = (() => {
    if (typeof seatTier === 'string' && seatTier.startsWith('custom:')) {
      const n = Math.max(2, Math.min(9, parseInt(seatTier.split(':')[1], 10) || 2));
      const base = (seatPricing['1'] && seatPricing['1'].length) ? seatPricing['1'] : basePeriods;
      const addon = seatPricing['addon'] || [];
      if (Array.isArray(base) && base.length) {
        return base.map((bp, i) => {
          const ap = addon.find(a => Number(a.period_months) === Number(bp.period_months)) || addon[i] || {};
          const price = Math.round((Number(bp.price_usd) || 0) + (n - 1) * (Number(ap.price_usd) || 0));
          return { ...bp, price_usd: price, total_charge: Math.round(price * (Number(bp.period_months) || 1)) };
        });
      }
    }
    return (seatPricing[seatTier] && seatPricing[seatTier].length) ? seatPricing[seatTier] : basePeriods;
  })();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const PLAN_CFG = PAID_PLANS.find(p => p.id === selectedPlan) || PAID_PLANS[1];

  const toggleChannel = (arr, setArr, key) =>
    setArr(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  // 운영 구독 가입 — 비밀번호 정책: 영문 대문자·소문자·숫자·특수문자 모두 포함 + 6자 이상 (은행·공공기관급)
  const validateStep1 = () => {
    if (!name.trim()) return t("auth.nameRequired");
    if (!email.trim()) return t("auth.emailRequired");
    if (password.length < 8) return t("auth.passwordTooShort", "비밀번호는 8자 이상이어야 합니다."); // 189차 정책 강화
    const hasUpper = /[A-Z]/.test(password), hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password), hasSpecial = /[^A-Za-z0-9]/.test(password);
    const classes = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
    if (classes < 3) {
      return t("auth.passwordPolicy", "비밀번호는 8자 이상이며 영문 대문자·소문자·숫자·특수문자 중 3종류 이상을 포함해야 합니다.");
    }
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
      // 172차 P0-C.3 — coupon code (선택, DOM 에서 직접 추출 — 자식 컴포넌트 state 캡슐화 유지)
      const couponInput = document.getElementById('coupon_code');
      const couponCode = (couponInput?.value || '').trim().toUpperCase();
      const extraData = {
        plan: selectedPlan,
        company, ceo_name: ceoName, business_type: businessType,
        business_number: businessNumber, country, zip_code: zipCode,
        address: `${address} ${addressDetail}`.trim(), phone, website,
        sales_channels: salesChannels, ad_channels: adChannels,
        monthly_revenue: monthlyRevenue, agree_marketing: agreeMarketing,
        // 172차 P0-B — 구독 cycle 정보 (backend app_user.subscription_cycle 저장 → 가입 후 Paddle Checkout)
        subscription_cycle: cycleMonths === 1 ? 'monthly' : cycleMonths === 12 ? 'annual' : `${cycleMonths}m`,
        cycle_months: cycleMonths,
        // 186차 — 선택 계정수(seat) 티어
        seat_tier: seatTier,
      };
      const result = await register(email, password, name, company, extraData);
      // 172차 P0-C.3 — 회원가입 후 즉시 쿠폰 redeem (token 발급된 상태)
      let manualCoupon = null;
      if (couponCode && /^GENIE-[A-Z0-9]{8,16}$/.test(couponCode)) {
        try {
          const tok = localStorage.getItem('genie_token');
          const r = await fetch(API_BASE + '/auth/coupon/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
            body: JSON.stringify({ code: couponCode }),
          });
          manualCoupon = await r.json();
        } catch (ce) { console.warn('coupon redeem fail:', ce?.message); }
      }
      // [현 차수] 20일 무료 체험: 가입 즉시 결제 강제(autoCheckout) 제거 — 선택 플랜을 20일간 무료로
      //   이용한 뒤 결제하면 계속 이용. 체험 시작과 함께 대시보드로 진입(결제는 체험 중/종료 후 [요금제]).
      navigate("/dashboard", {
        replace: true,
        state: {
          trialStarted: { planId: selectedPlan, days: 20 },
          couponAlert: manualCoupon?.ok ? manualCoupon : (result?.coupon || null),
        },
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
      {/* [245차] 데모→운영 전환 배너 — 데모 가입정보만 prefill, 체험 가상데이터는 이관되지 않음(데이터 격리 원칙) */}
      {isConvert && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <span style={{ fontSize: 20 }}>🚀</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 12.5, color: "#16a34a" }}>{t("auth.convertTitle", "데모 체험 정보로 운영(유료) 회원 전환")}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 3, lineHeight: 1.6 }}>{t("auth.convertNote", "데모에서 입력한 가입 정보만 자동으로 채웠습니다. 플랜·주소·새 비밀번호 등 나머지 필수 정보만 입력하면 즉시 운영 회원으로 전환됩니다. ※ 데모의 체험용 가상 데이터는 운영 계정으로 이관되지 않습니다.")}</div>
          </div>
        </div>
      )}
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
          <Field label={t("auth.nameLabel")} value={name} onChange={setName} placeholder={t('auth.namePh', '홍길동')} required autoComplete="name" />
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
            <Field label={t("auth.ceoNameLabel")} value={ceoName} onChange={setCeoName} placeholder={t('auth.namePh', '홍길동')} required />
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

          {/* 186차 — 플랜 상세 안내서(초고도화, 구버전 기반) + 실제 제공 서비스(admin 설정 반영) */}
          <PlanServiceGuide planId={selectedPlan} defaultOpen={true} light={true} />
          <PlanServiceDetail planCfg={PLAN_CFG} menuAccess={planMenuAccess} features={planFeatures} description={planDesc} />

          {/* 186차 — 계정수 선택 (같은 플랜, 계정수별 요금) */}
          {seatTiers.length > 1 && (
            <SeatSelectorSection
              planCfg={PLAN_CFG}
              seatTiers={seatTiers}
              seatTier={seatTier}
              setSeatTier={setSeatTier}
              seatPricing={seatPricing}
            />
          )}

          {/* 172차 P0-B — 구독 cycle 선택 (가입 후 Paddle Checkout 가격 결정) */}
          <CycleSelectorSection
            planCfg={PLAN_CFG}
            planPeriods={planPeriods}
            cycleMonths={cycleMonths}
            setCycleMonths={setCycleMonths}
          />

          {/* 172차 P0-C.3 — 쿠폰 코드 입력 (선택) */}
          <CouponCodeInput planCfg={PLAN_CFG} onApplied={(info) => { /* 토큰 발급 후 적용되도록 register 응답 분기 */ }} />

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

/**
 * 172차 P0-B — CycleSelectorSection
 * 회원가입 마지막 step 에서 구독 cycle (1/3/6/12개월) 선택.
 * backend plan_period_pricing 데이터 우선, fallback 으로 기본 4-tier 단순 산출.
 * total payment + savings 표시.
 */
function CycleSelectorSection({ planCfg, planPeriods, cycleMonths, setCycleMonths }) {
  const t = useT(); // [245차] 누락된 useT() — 't is not defined' 크래시 수정(유료가입 step3)
  // periods 가 backend 에서 도착하면 그 데이터, 아니면 기본값 산출.
  // backend periods 의 1m row 우선 → planCfg fallback (PAID_PLANS 의 priceFallback 또는 priceMonthly)
  const periodOne = Array.isArray(planPeriods) ? planPeriods.find(p => p.period_months === 1) : null;
  const monthlyBase = Number(periodOne?.price_usd)
    || Number(planCfg?.priceMonthly)
    || Number((planCfg?.priceFallback || '').replace(/[^0-9.]/g, ''))
    || 0;
  const DEFAULT_DISCOUNTS = { 1: 0, 3: 5, 6: 10, 12: 20 };
  const cycles = (planPeriods && planPeriods.length > 0)
    ? planPeriods.map(p => ({
        months: p.period_months,
        priceUsd: Number(p.price_usd) || 0,
        discountPct: Number(p.discount_pct) || 0,
        totalCharge: Number(p.total_charge) || 0,
      })).sort((a, b) => a.months - b.months)
    : [1, 3, 6, 12].map(m => ({
        months: m,
        priceUsd: +(monthlyBase * (1 - (DEFAULT_DISCOUNTS[m] || 0) / 100)).toFixed(2),
        discountPct: DEFAULT_DISCOUNTS[m] || 0,
        totalCharge: +(monthlyBase * m * (1 - (DEFAULT_DISCOUNTS[m] || 0) / 100)).toFixed(2),
      }));

  const namedPeriod = (m) => ({ 1: t('appPricing.cycle.monthly','월간'), 3: t('appPricing.cycle.quarterly','분기'), 6: t('appPricing.cycle.semiAnnual','반기'), 12: t('appPricing.cycle.annual','연간'), 24: t('auth.cycle2y','2년'), 36: t('auth.cycle3y','3년') })[m] || t('appPricing.nMonths','{{n}}개월',{ n: m });

  if (!monthlyBase || monthlyBase <= 0) {
    return (
      <div style={{
        padding: 12, borderRadius: 10,
        background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.25)',
        fontSize: 11, color: '#d97706',
      }}>
        ⚠ {t('auth.monthlyPriceNotSet','{{plan}} 의 월 요금이 아직 설정되지 않았습니다. 관리자에게 문의 또는 가입 후 별도 결제.',{ plan: planCfg?.label || t('auth.thisPlan','본 플랜') })}
      </div>
    );
  }

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12,
      background: `${planCfg?.color || '#6366f1'}0D`,
      border: `1.5px solid ${planCfg?.color || '#6366f1'}33`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: planCfg?.color || '#6366f1' }}>📅 {t('auth.cycleSelectTitle','구독 기간 선택')}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('auth.cycleSelectDesc','가입 후 결제할 주기를 선택하세요. 연간 결제 시 최대 20% 할인.')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {cycles.map(c => {
          const sel = cycleMonths === c.months;
          return (
            <button
              key={c.months}
              type="button"
              onClick={() => setCycleMonths(c.months)}
              style={{
                padding: '12px 10px', borderRadius: 10,
                background: sel ? '#1e3a8a' : 'rgba(15,23,42,0.03)',
                color: sel ? '#fde047' : 'var(--text-2)',
                border: sel ? '2px solid #fde047' : '1.5px solid rgba(99,102,241,0.18)',
                cursor: 'pointer', textAlign: 'center', fontWeight: sel ? 900 : 600,
                transition: 'all 150ms',
              }}
            >
              <div style={{ fontSize: 12, marginBottom: 4 }}>{namedPeriod(c.months)}</div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>${c.totalCharge.toFixed(c.totalCharge >= 100 ? 0 : 2)}</div>
              <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>${c.priceUsd}/월</div>
              {c.discountPct > 0 && (
                <div style={{
                  marginTop: 4, padding: '1px 6px', borderRadius: 8,
                  background: sel ? 'rgba(253,224,71,0.18)' : 'rgba(34,197,94,0.12)',
                  color: sel ? '#fde047' : '#16a34a', fontSize: 9, fontWeight: 800, display: 'inline-block',
                }}>−{c.discountPct}%</div>
              )}
            </button>
          );
        })}
      </div>
      <div style={{
        marginTop: 10, padding: '8px 12px', borderRadius: 8,
        background: 'rgba(0,0,0,0.05)', fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6,
      }}>
        {t('auth.payImmediate','💡 가입 즉시 결제가 진행됩니다. 카드 결제 (Paddle MoR) — VAT/GST 자동 처리. 30일 환불 보장.')}
      </div>
    </div>
  );
}

/**
 * 186차 — SeatSelectorSection
 * 회원가입 시 계정수(seat) 선택. 같은 플랜이라도 계정수(1/10/무제한 등)별 요금이 다름.
 * 선택 시 PaidRegisterForm 의 planPeriods 가 해당 계정수 가격으로 갱신 → 기간 가격 실시간 반영.
 */
function SeatSelectorSection({ planCfg, seatTiers, seatTier, setSeatTier, seatPricing }) {
  const t = useT(); // [245차] 누락된 useT() — 't is not defined' 크래시 수정
  const color = planCfg?.color || '#6366f1';
  // [시장진입] 'addon'(종량 추가seat)은 번들 버튼에서 제외 — 별도 스테퍼로 노출.
  const bundles = (seatTiers || []).filter(tt => !tt.addon && tt.key !== 'addon');
  const addonRows = (seatPricing && seatPricing.addon) || [];
  const addonMonthly = Number((addonRows.find(a => Number(a.period_months) === 1) || addonRows[0] || {}).price_usd) || 0;
  const hasAddon = addonRows.length > 0 && addonMonthly > 0;
  const isCustom = typeof seatTier === 'string' && seatTier.startsWith('custom:');
  const customN = isCustom ? Math.max(2, Math.min(9, parseInt(seatTier.split(':')[1], 10) || 2)) : 0;
  const stepBtn = { width: 28, height: 28, borderRadius: 8, border: '1.5px solid rgba(99,102,241,0.3)', background: 'rgba(255,255,255,0.9)', color: '#1e3a8a', fontWeight: 900, fontSize: 16, cursor: 'pointer', lineHeight: 1 };
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12,
      background: `${color}0D`, border: `1.5px solid ${color}33`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color }}>👥 {t('auth.seatSelectTitle','계정수 선택')}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('auth.seatSelectDesc','이용할 계정(좌석) 수를 선택하세요. 계정수에 따라 요금이 달라집니다.')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(bundles.length, 4)}, 1fr)`, gap: 8 }}>
        {bundles.map(tier => {
          const sel = tier.key === seatTier && !isCustom;
          return (
            <button
              key={tier.key}
              type="button"
              onClick={() => setSeatTier(tier.key)}
              style={{
                padding: '12px 10px', borderRadius: 10,
                background: sel ? '#1e3a8a' : 'rgba(15,23,42,0.03)',
                color: sel ? '#fde047' : 'var(--text-2)',
                border: sel ? '2px solid #fde047' : '1.5px solid rgba(99,102,241,0.18)',
                cursor: 'pointer', textAlign: 'center', fontWeight: sel ? 900 : 600,
                transition: 'all 150ms',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 2 }}>{tier.unlimited ? '♾' : '👤'}</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{tier.unlimited ? t('auth.seatUnlimited','무제한') : t('auth.seatNAccounts','{{n}}계정',{ n: tier.count })}</div>
            </button>
          );
        })}
      </div>
      {hasAddon && (
        <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10,
          background: isCustom ? '#1e3a8a' : 'rgba(15,23,42,0.03)',
          border: isCustom ? '2px solid #fde047' : '1.5px solid rgba(99,102,241,0.18)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: isCustom ? '#fde047' : 'var(--text-2)' }}>
              {t('auth.seatCustom','정확한 계정수 (2~9)')} · +${addonMonthly}/{t('auth.seatPerMonth','계정·월')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" style={stepBtn} onClick={() => setSeatTier(isCustom && customN > 2 ? `custom:${customN - 1}` : '1')}>−</button>
              <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 900, fontSize: 15, color: isCustom ? '#fde047' : 'var(--text-3)' }}>{isCustom ? customN : '—'}</span>
              <button type="button" style={stepBtn} onClick={() => setSeatTier(`custom:${isCustom ? Math.min(9, customN + 1) : 2}`)}>+</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 186차 — PlanServiceDetail
 * 구버전 참고: 구독 회원이 해당 플랜으로 어떤 서비스를 제공받는지 상세 안내.
 * admin 이 설정한 menuAccess(제공 서비스) + features(기능) 를 상세 설명과 함께 표시 → 구독 판단 자료.
 */
function PlanServiceDetail({ planCfg, menuAccess = [], features = [], description = '' }) {
  const t = useT(); // [245차] 누락된 useT() — 't is not defined' 크래시 수정
  const color = planCfg?.color || '#6366f1';
  // menuAccess(menu_key) → { title, desc } (MENU_KEY_LABEL). 의미있는(설명 있는) 메뉴만, 중복 제거.
  const services = [];
  const seen = new Set();
  for (const k of menuAccess) {
    const lbl = MENU_KEY_LABEL[k];
    if (lbl && lbl.title && !seen.has(lbl.title)) { seen.add(lbl.title); services.push(lbl); }
  }
  const featList = (features || []).map(f => (typeof f === 'string' ? f : (f?.text || ''))).filter(Boolean);
  return (
    <div style={{ padding: '16px 18px', borderRadius: 12, background: `${color}0A`, border: `1.5px solid ${color}33` }}>
      <div style={{ fontSize: 14, fontWeight: 800, color, marginBottom: 6 }}>📖 {t('auth.planDetailTitle','{{plan}} 상세 안내 — 제공 서비스',{ plan: planCfg?.label || t('auth.plan','플랜') })}</div>
      {description && <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>{description}</div>}
      {featList.length > 0 && (
        <div style={{ marginBottom: services.length ? 12 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5 }}>✨ {t('auth.keyBenefits','핵심 혜택')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
            {featList.map((f, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text-1)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ color: '#22c55e' }}>✓</span><span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {services.length > 0 ? (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 5 }}>🧩 {t('auth.availableServices','이용 가능 서비스 ({{n}})',{ n: services.length })}</div>
          <div style={{ display: 'grid', gap: 7, maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
            {services.map((s, i) => (
              <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(15,23,42,0.03)', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{s.title}</div>
                {s.desc && <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5, marginTop: 2 }}>{s.desc}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>{t('auth.serviceDetailPending','제공 서비스 상세는 관리자 설정 후 표시됩니다.')}</div>
      )}
    </div>
  );
}

/**
 * 172차 P0-C.3 — CouponCodeInput
 * 회원가입 / 마이페이지에서 쿠폰 코드 입력. 검증은 GET /auth/coupon/preview (인증 필요).
 * 가입 흐름에서는 register 후 token 받은 다음 자동으로 redeem (extraData.coupon_code 동봉).
 */
function CouponCodeInput({ planCfg, onApplied }) {
  const t = useT(); // [254차] 쿠폰 입력 라벨 i18n
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: 'rgba(168,85,247,0.05)', border: '1.5px dashed rgba(168,85,247,0.25)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: planCfg?.color || '#a855f7', marginBottom: 4 }}>
        🎟️ {t('auth.couponTitle','쿠폰 코드 (선택)')}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
        {t('auth.couponDesc','가입 시 보유 중인 쿠폰 코드를 입력하시면 무료 기간이 자동 적용됩니다 (예: GENIE-XXXXXXXXXX)')}
      </div>
      <input
        type="text" name="coupon_code" id="coupon_code"
        value={code}
        onChange={(e) => { setCode(e.target.value.toUpperCase()); setTouched(true); }}
        placeholder={t('auth.couponPh','GENIE-XXXXXXXXXX (선택사항)')}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 7,
          border: '1px solid rgba(168,85,247,0.25)', background: '#ffffff',
          color: 'var(--text-1)', fontSize: 13, fontFamily: 'monospace', letterSpacing: 0.5,
        }}
      />
      {touched && code && (
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
          {t('auth.couponNote','가입 완료 후 자동 적용됩니다. 코드가 잘못된 경우 가입 자체는 정상 진행되며 쿠폰만 미적용.')}
        </div>
      )}
    </div>
  );
}

/* ─── Admin Login Form (한국어 전용) ────────────────────────── */
function AdminLoginForm({ onBack }) {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // [현 차수] admin 자동로그인 — 체크 시 세션 영속(remember). 다음 접속에서 접속코드 인증만 하면
  //   유효한 admin 세션을 재사용해 이메일/비밀번호 단계를 건너뛴다(비밀번호 미저장 = 보안).
  const [adminRemember, setAdminRemember] = useState(() => { try { return localStorage.getItem('genie_admin_autologin') === '1'; } catch { return false; } });
  const ADMIN_GATE = "GENIEGO-ADMIN";

  // [225차] 관리 대상 시스템(운영/데모) 선택 — 데모/운영은 별도 빌드·백엔드(도메인 분리)이므로
  //   다른 시스템 선택 시 해당 도메인 관리자 로그인으로 전환(매칭된 빌드+백엔드에서 인증). ?mode=admin 로
  //   대상 도메인의 관리자 패널이 자동 오픈된다. 같은 시스템이면 그대로 진행.
  const _host = typeof window !== 'undefined' ? window.location.hostname : '';
  const _isLocal = _host === 'localhost' || _host === '127.0.0.1';
  const curEnv = IS_DEMO ? 'demo' : 'ops';
  const switchEnv = (env) => {
    if (env === curEnv) return;
    const toDemo = (h) => h.startsWith('roidemo') ? h : h.replace(/^roi(?=\.)/, 'roidemo');
    const toOps  = (h) => h.startsWith('roidemo') ? h.replace(/^roidemo/, 'roi') : h;
    const target = env === 'demo' ? toDemo(_host) : toOps(_host);
    if (!target || target === _host) return; // 로컬/미인식 도메인 → 전환 불가(no-op)
    window.location.href = `${window.location.protocol}//${target}${window.location.pathname}?mode=admin`;
  };

  const verifyKey = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      // 188차: 서버 저장 접속키 검증(회전 가능). 미회전 시 기본 'GENIEGO-ADMIN'.
      const r = await fetch(API_BASE + "/api/auth/admin/verify-access-key", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_key: adminKey.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { if (tryAutoLogin()) return; setStep(2); }
      else setError(d.error || "접속 코드가 올바르지 않습니다.");
    } catch {
      // 서버 미응답(오프라인) — 하위호환 기본 게이트로 폴백
      if (adminKey.trim().toUpperCase() === ADMIN_GATE) { if (tryAutoLogin()) return; setStep(2); }
      else setError("접속 코드 확인에 실패했습니다. 다시 시도하세요.");
    }
    setLoading(false);
  };

  // 접속코드 인증 후, 자동로그인 켜져 있고 유효한 admin 세션이 살아있으면 비번 단계 건너뛰고 바로 진입.
  const tryAutoLogin = () => {
    try {
      if (localStorage.getItem('genie_admin_autologin') === '1' && user && (user.plans || user.plan) === 'admin') {
        navigate("/admin", { replace: true });
        return true;
      }
    } catch {}
    return false;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true);
    // 207차 핵심수정: 브라우저 자동완성이 input.value 만 채우고 React onChange 미발화 시
    //   state(email/password)가 화면 표시값과 달라 로그인 실패하던 버그 → 제출 시 DOM 실값을 우선 사용.
    let liveEmail = email, livePw = password;
    try {
      const form = e.currentTarget;
      const ins = [...form.querySelectorAll('input')];
      const emEl = ins.find(i => i.type === 'email') || ins[0];
      const pwEl = ins.find(i => i.type === 'password') || ins.find(i => i.type === 'text') || ins[ins.length - 1];
      if (emEl && emEl.value) liveEmail = emEl.value;
      if (pwEl && pwEl.value) livePw = pwEl.value;
    } catch (_) {}
    try {
      // [현 차수] adminRemember=true → login 의 remember 인자(6번째)로 세션 영속 + 자동로그인 플래그 저장.
      const u = await login(liveEmail.trim(), livePw, "admin", adminKey.trim(), "", adminRemember);
      if ((u.plans || u.plan) !== "admin") throw new Error("관리자 계정이 아닙니다. 관리자 전용 계정으로 로그인하세요.");
      try { if (adminRemember) localStorage.setItem('genie_admin_autologin', '1'); else localStorage.removeItem('genie_admin_autologin'); } catch {}
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

      {/* [225차] 관리 대상 시스템 선택(운영/데모) — 선택 시 해당 시스템 도메인 관리자 로그인으로 전환 */}
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>관리 대상 시스템 선택</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { k: "ops",  icon: "🏢", label: "운영 시스템",  c: "#4f8ef7" },
            { k: "demo", icon: "🎪", label: "데모 시스템",  c: "#fb923c" },
          ].map(o => {
            const on = curEnv === o.k;
            return (
              <button key={o.k} type="button" onClick={() => switchEnv(o.k)} disabled={on || _isLocal}
                title={on ? "현재 접속 중인 시스템" : `${o.label}으로 전환`}
                style={{ flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center",
                  cursor: (on || _isLocal) ? "default" : "pointer",
                  border: `1px solid ${on ? o.c : "#e2e8f0"}`, background: on ? `${o.c}14` : "#fff",
                  color: on ? o.c : "#64748b", fontWeight: on ? 800 : 600, fontSize: 12,
                  opacity: (_isLocal && !on) ? 0.5 : 1, transition: "all 0.15s" }}>
                <div>{o.icon} {o.label}</div>
                <div style={{ fontSize: 9, marginTop: 2, opacity: 0.85 }}>
                  {on ? "현재 접속 중" : "선택 시 전환"}
                </div>
              </button>
            );
          })}
        </div>
        {_isLocal && <div style={{ fontSize: 10, color: "#94a3b8" }}>로컬 개발 환경에서는 시스템 전환이 비활성화됩니다.</div>}
      </div>

      {step === 1 ? (
        <form onSubmit={verifyKey} style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 5 }}>접속 코드</label>
            {/* 207차 로그인 버그 수정: type=password 면 브라우저 비밀번호 관리자가 저장된 사이트
                비밀번호를 이 '접속 코드' 칸에 자동완성 → 접속키 검증 실패(로그인 차단)의 원인.
                type=text + autoComplete=off 로 자동완성을 차단하고, 마스킹은 CSS(WebkitTextSecurity)로 유지. */}
            <input type="text" name="genie_admin_gate" value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder="관리자 접속 코드를 입력하세요" required
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-lpignore="true" data-form-type="other"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.04)", color: "#1e293b", fontSize: 13, outline: "none", WebkitTextSecurity: "disc", textSecurity: "disc" }} />
          </div>
          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11 }}>{error}</div>}
          <button type="submit" style={{ padding: "12px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>접속 코드 확인</button>
        </form>
      ) : (
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
          <div style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11, color: "#22c55e" }}>✅ 접속 코드 인증 완료</div>
          {/* 207차: 옛 admin 비밀번호가 자동완성으로 채워져 로그인 실패하던 문제 — 자동완성 차단(new-password/off).
              데모 로그인 폼은 무영향. 👁️ 보이기 버튼으로 실제 입력값 확인 가능. */}
          <Field label="관리자 이메일" type="email" value={email} onChange={setEmail} placeholder="admin@example.com" required autoComplete="off" />
          <Field label="비밀번호" type="password" value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="new-password" />
          {/* [현 차수] admin 자동로그인 — 체크 시 다음 접속에서 접속코드만 인증하면 이메일/비번 없이 자동 진입(세션 재사용·비번 미저장) */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#475569", cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={adminRemember} onChange={e => setAdminRemember(e.target.checked)} style={{ width: 15, height: 15, accentColor: "#ef4444", cursor: "pointer" }} />
            <span>자동 로그인</span>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>· 다음 접속 시 접속코드만 입력하면 자동 로그인 (공용 PC 사용 금지)</span>
          </label>
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
      <button type="button" onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, background: "rgba(15,23,42,0.08)", border: "1px solid rgba(99,140,255,0.35)", color: '#1e293b', fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 200ms", backdropFilter: "blur(12px)" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,140,255,0.15)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(15,23,42,0.08)"; }}
      >
        <span style={{ fontSize: 16 }}>{current.flag}</span>
        <span>{current.label}</span>
        <span style={{ fontSize: 10, opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>▼</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 220, maxHeight: 400, overflowY: "auto", zIndex: 1000, background: "#ffffff", backdropFilter: "blur(20px)", border: "1px solid #e2e8f0", borderRadius: 14, padding: 6, boxShadow: "0 16px 48px rgba(15,23,42,0.18)" }}>
            <div style={{ padding: "6px 10px 8px", fontSize: 10, fontWeight: 700, color: "var(--text-3)", borderBottom: "1px solid rgba(99,140,255,0.08)", marginBottom: 4 }}>
              🌐 {t('auth.langSelectTitle', 'Language')}
            </div>
            {LANG_OPTIONS.map(opt => (
              <button key={opt.code} onClick={() => { setLang(opt.code); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer", background: lang === opt.code ? "rgba(79,142,247,0.12)" : "transparent", transition: "background 120ms" }}
                onMouseEnter={e => { if (lang !== opt.code) e.currentTarget.style.background = "rgba(15,23,42,0.04)"; }}
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
  const isDemoDomain = IS_DEMO; // 180차: broad includes('demo') 제거 → demoEnv 정본 격리
  const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasRedirectedRef = React.useRef(false);

  // Read mode from URL parameters if provided (e.g. ?mode=free)
  const queryParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const rawMode = queryParams.get('mode') || "login";
  // [245차] 데모→운영 전환 — ?convert=1 진입 시 유료가입 폼 + 데모 프로필 prefill(체험 데이터 미이관).
  const isConvert = queryParams.get('convert') === '1';
  const convertPrefill = isConvert ? {
    convert: true,
    email: queryParams.get('email') || '',
    name: queryParams.get('name') || '',
    company: queryParams.get('company') || '',
    ceoName: queryParams.get('ceo') || '',
    businessNumber: queryParams.get('bizno') || '',
    phone: queryParams.get('phone') || '',
  } : {};
  // On demo domain, ?mode=free from URL means demo registration (redirected from production)
  const initialMode = isConvert ? 'paid' : ((rawMode === 'free' && isDemoDomain) ? 'demo_free' : rawMode);

  const [mode, setMode] = useState(initialMode); // login | register | free | demo_free | paid | admin
  const [planType, setPlanType] = useState("free");
  const [selectedPaid, setSelectedPaid] = useState(isConvert ? (queryParams.get('plan') || 'pro') : "pro");
  // 190차: 비번재설정 이메일 링크(?reset=)로 진입 시 로그인폼(STEP2)을 즉시 마운트 → 재설정 모달 자동 오픈
  const hasResetParam = !!queryParams.get('reset');
  const [loginType, setLoginType] = useState(hasResetParam ? (isDemoDomain ? 'demo' : 'production') : null);

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
      else { window.location.href = "https://demo.genieroi.com/login?mode=free"; }
      return;
    }
    // 2. 운영시스템 회원가입 (Production Registration) → 바로 가입폼으로 이동
    if (target === "prod_register") {
      if (!isDemoDomain || isLocalhost) { setMode("free"); }
      else { window.location.href = "https://www.genieroi.com/login?mode=free"; }
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
    <div className="auth-shell" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #E3E0F2 0%, #DDDAED 25%, #DDDAED 50%, #E0DDF0 75%, #E5E2F4 100%)", padding: "24px 16px", direction: isRTL ? 'rtl' : 'ltr' }}>
      <style>{floatKeyframes}</style>
      {/* 208차: 모바일 로그인 버튼이 폴드 밖으로 밀려 가입/로그인 불가하던 문제 — 상단정렬+로고축소로 화면 내 진입 */}
      <style>{`@media (max-width:560px),(max-height:820px){.auth-shell{align-items:flex-start!important;padding-top:14px!important;padding-bottom:14px!important}.auth-logo{max-height:104px!important;width:130px!important}.auth-card{max-height:none!important}}`}</style>
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
            <img className="auth-logo" src="/logo_v5.png" alt="Geniego-ROI" style={{ width: 280, height: 'auto', maxHeight: 260, objectFit: "contain", display: "block", margin: "0 auto", borderRadius: 32, filter: "drop-shadow(0 8px 24px rgba(79,142,247,0.18))" }} />
          </div>
          <div style={{ marginTop: 12, fontWeight: 900, fontSize: 18, letterSpacing: "1.5px", background: "linear-gradient(135deg, #4f8ef7 0%, #6366f1 30%, #a855f7 60%, #f59e0b 100%)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 4s linear infinite", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", textTransform: "uppercase" }}>
            {t('auth.platformSlogan')}
          </div>
          <div style={{ fontSize: 11, color: "#8B87A0", marginTop: 6, fontWeight: 700 }}>
            {isDemoDomain ? `🎪 ${t('auth.demoEnvBanner')}` : `🏢 ${t('auth.prodEnvBanner')}`}
          </div>
        </div>

        <div className="auth-card" style={{ padding: "24px", borderRadius: 20, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", border: "1px solid rgba(99,140,255,0.15)", boxShadow: "0 24px 64px rgba(0,0,0,0.08)", maxHeight: "80vh", overflowY: "auto", color: "#1e293b" }}>

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
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#22c55e" }}>{t('auth.freeBadge', '무료')}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>{t('auth.prodFreeTrial')}</div>
                </button>
                <button onClick={() => { setPlanType("paid"); setMode("paid"); }} style={{ padding: "18px 12px", borderRadius: 14, border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.06)", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>💎</div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#a855f7" }}>{t('auth.paidBadge', '유료')}</div>
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
              <a href="https://www.genieroi.com/login?mode=register" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>{t('auth.goToProduction')}</a>
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
            <PaidRegisterForm selectedPlan={selectedPaid} prefill={convertPrefill} onSwitch={handleSwitch} onBack={() => setMode("register")} />
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 10, color: "#8B87A0", lineHeight: 1.6 }}>
          v423.0.0 · © 2001. 09. 11. Ociell Co., Ltd. All rights reserved.<br />
          <span style={{ opacity: 0.7, fontWeight: 600, letterSpacing: '0.5px' }}>{t('auth.footerTagline', '격리된 엔터프라이즈 플로우')}</span>
        </div>
      </div>
    </div>
  );
}
