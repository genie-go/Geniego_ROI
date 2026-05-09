/**
 * JourneyBuilder — Enterprise-Grade Customer Journey Automation
 * ──────────────────────────────────────────────────────────────
 * Sub-tabs: 여정 빌더 | 여정 목록 | 실행 로그 | 분석
 * Layout: AutoMarketing pattern (maxWidth:1200, sticky header/tabs)
 * Data: GlobalDataContext (journeyTriggers, journeyExecutions,
 *        crmSegments, emailCampaignsLinked, kakaoCampaignsLinked)
 * i18n: 12-language + RTL support
 * 
 * ✨ UI/UX Improvements (2026-05-01):
 * - Onboarding modal for first-time users
 * - EmptyState component with templates
 * - Enhanced user experience
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useI18n } from '../i18n';

import { useGlobalData } from '../context/GlobalDataContext';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';

/* ── Enterprise Demo Isolation Guard ─────────────────────── */
const _isDemo = (() => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'demo.genie-go.com' || h === 'demo.geniego.com' || h.startsWith('demo');
})();

/* ── Enterprise Dynamic Locale Map ────────────────────── */
const LANG_LOCALE_MAP = {
    ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', 'zh-TW': 'zh-TW',
    de: 'de-DE', es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', ru: 'ru-RU',
    ar: 'ar-SA', hi: 'hi-IN', th: 'th-TH', vi: 'vi-VN', id: 'id-ID'
};

/* ── i18n key registry + fallback ─────────────────────── */
const K = {
    title: 'jb.title', sub: 'jb.sub',
    tabBuilder: 'jb.tabBuilder', tabList: 'jb.tabList', tabLogs: 'jb.tabLogs', tabAnalytics: 'jb.tabAnalytics',
    tabGuide: 'jb.tabGuide',
    createJourney: 'jb.createJourney', journeyName: 'jb.journeyName', triggerType: 'jb.triggerType',
    // Onboarding keys
    onboardingWelcome: 'jb.onboardingWelcome', onboardingTitle: 'jb.onboardingTitle', onboardingDesc: 'jb.onboardingDesc',
    onboardingStep1: 'jb.onboardingStep1', onboardingStep2: 'jb.onboardingStep2', onboardingStep3: 'jb.onboardingStep3',
    onboardingShowGuide: 'jb.onboardingShowGuide', onboardingStart: 'jb.onboardingStart', onboardingDontShow: 'jb.onboardingDontShow',
    // Empty State keys
    emptyTitle: 'jb.emptyTitle', emptyDesc: 'jb.emptyDesc', useTemplate: 'jb.useTemplate',
    templateWelcome: 'jb.templateWelcome', templateAbandon: 'jb.templateAbandon', templateThanks: 'jb.templateThanks', templateChurn: 'jb.templateChurn',
    triggerSignup: 'jb.triggerSignup', triggerPurchase: 'jb.triggerPurchase', triggerAbandon: 'jb.triggerAbandon',
    triggerChurn: 'jb.triggerChurn', triggerSegment: 'jb.triggerSegment', triggerManual: 'jb.triggerManual',
    targetSegment: 'jb.targetSegment', channels: 'jb.channels', email: 'jb.email', kakao: 'jb.kakao',
    sms: 'jb.sms', push: 'jb.push', line: 'jb.line',
    delayLabel: 'jb.delayLabel', delayNone: 'jb.delayNone', delay1h: 'jb.delay1h', delay1d: 'jb.delay1d',
    delay3d: 'jb.delay3d', delay7d: 'jb.delay7d',
    save: 'jb.save', cancel: 'jb.cancel', run: 'jb.run', edit: 'jb.edit', delete: 'jb.delete',
    duplicate: 'jb.duplicate', close: 'jb.close',
    statusDraft: 'jb.statusDraft', statusActive: 'jb.statusActive', statusPaused: 'jb.statusPaused',
    statusCompleted: 'jb.statusCompleted', colStatus: 'jb.colStatus',
    totalJourneys: 'jb.totalJourneys', activeJourneys: 'jb.activeJourneys',
    totalExecutions: 'jb.totalExecutions', totalEntered: 'jb.totalEntered',
    totalCompleted: 'jb.totalCompleted', avgCompletion: 'jb.avgCompletion',
    totalEmails: 'jb.totalEmails', totalKakao: 'jb.totalKakao', totalRevenue: 'jb.totalRevenue',
    recentLogs: 'jb.recentLogs', executionHistory: 'jb.executionHistory',
    noData: 'jb.noData', noLogs: 'jb.noLogs', confirmDelete: 'jb.confirmDelete',
    flowPreview: 'jb.flowPreview', stepTrigger: 'jb.stepTrigger', stepDelay: 'jb.stepDelay',
    stepAction: 'jb.stepAction', stepEnd: 'jb.stepEnd',
    byTrigger: 'jb.byTrigger', byChannel: 'jb.byChannel', completionRate: 'jb.completionRate',
    goAutoMkt: 'jb.goAutoMkt', goCRM: 'jb.goCRM',
    createPlaceholder: 'jb.createPlaceholder', selectNone: 'jb.selectNone', copyLabel: 'jb.copyLabel',
    logEntered: 'jb.logEntered', logCompleted: 'jb.logCompleted',
    pauseBtn: 'jb.pauseBtn', resumeBtn: 'jb.resumeBtn',
    guideTitle: 'jb.guideTitle', guideSub: 'jb.guideSub', guideStepsTitle: 'jb.guideStepsTitle',
    guideStep1Title: 'jb.guideStep1Title', guideStep1Desc: 'jb.guideStep1Desc',
    guideStep2Title: 'jb.guideStep2Title', guideStep2Desc: 'jb.guideStep2Desc',
    guideStep3Title: 'jb.guideStep3Title', guideStep3Desc: 'jb.guideStep3Desc',
    guideStep4Title: 'jb.guideStep4Title', guideStep4Desc: 'jb.guideStep4Desc',
    guideStep5Title: 'jb.guideStep5Title', guideStep5Desc: 'jb.guideStep5Desc',
    guideStep6Title: 'jb.guideStep6Title', guideStep6Desc: 'jb.guideStep6Desc',
    guideStep7Title: 'jb.guideStep7Title', guideStep7Desc: 'jb.guideStep7Desc',
    guideStep8Title: 'jb.guideStep8Title', guideStep8Desc: 'jb.guideStep8Desc',
    guideStep9Title: 'jb.guideStep9Title', guideStep9Desc: 'jb.guideStep9Desc',
    guideStep10Title: 'jb.guideStep10Title', guideStep10Desc: 'jb.guideStep10Desc',
    guideStep11Title: 'jb.guideStep11Title', guideStep11Desc: 'jb.guideStep11Desc',
    guideStep12Title: 'jb.guideStep12Title', guideStep12Desc: 'jb.guideStep12Desc',
    guideStep13Title: 'jb.guideStep13Title', guideStep13Desc: 'jb.guideStep13Desc',
    guideStep14Title: 'jb.guideStep14Title', guideStep14Desc: 'jb.guideStep14Desc',
    guideStep15Title: 'jb.guideStep15Title', guideStep15Desc: 'jb.guideStep15Desc',
    guideTabsTitle: 'jb.guideTabsTitle',
    guideTabBuilderName: 'jb.guideTabBuilderName', guideTabBuilderDesc: 'jb.guideTabBuilderDesc',
    guideTabListName: 'jb.guideTabListName', guideTabListDesc: 'jb.guideTabListDesc',
    guideTabLogsName: 'jb.guideTabLogsName', guideTabLogsDesc: 'jb.guideTabLogsDesc',
    guideTabAnalyticsName: 'jb.guideTabAnalyticsName', guideTabAnalyticsDesc: 'jb.guideTabAnalyticsDesc',
    guideTabGuideName: 'jb.guideTabGuideName', guideTabGuideDesc: 'jb.guideTabGuideDesc',
    guideTipsTitle: 'jb.guideTipsTitle',
    guideTip1: 'jb.guideTip1', guideTip2: 'jb.guideTip2', guideTip3: 'jb.guideTip3',
    guideTip4: 'jb.guideTip4', guideTip5: 'jb.guideTip5', guideTip6: 'jb.guideTip6', guideTip7: 'jb.guideTip7',
    guideTip8: 'jb.guideTip8', guideTip9: 'jb.guideTip9', guideTip10: 'jb.guideTip10',
    guideStep16Title: 'jb.guideStep16Title', guideStep16Desc: 'jb.guideStep16Desc',
    guideStep17Title: 'jb.guideStep17Title', guideStep17Desc: 'jb.guideStep17Desc',
    guideStep18Title: 'jb.guideStep18Title', guideStep18Desc: 'jb.guideStep18Desc',
    guideStep19Title: 'jb.guideStep19Title', guideStep19Desc: 'jb.guideStep19Desc',
    guideStep20Title: 'jb.guideStep20Title', guideStep20Desc: 'jb.guideStep20Desc',
    guideStartBtn: 'jb.guideStartBtn',
};
const FB = {
    [K.title]: '고객 경로 빌더', [K.sub]: 'AI 기반 자동화 고객 경로 설계·실행·분석',
    [K.tabBuilder]: '경로 빌더', [K.tabList]: '경로 목록', [K.tabLogs]: '실행 로그', [K.tabAnalytics]: '분석', [K.tabGuide]: '이용 가이드',
    [K.createJourney]: '새 경로 생성', [K.journeyName]: '경로 이름', [K.triggerType]: '트리거 유형',
    // Onboarding fallbacks
    [K.onboardingWelcome]: '환영합니다! 🎉', [K.onboardingTitle]: 'Journey Builder 시작하기', [K.onboardingDesc]: 'AI 기반 고객 경로 자동화를 3단계로 시작하세요',
    [K.onboardingStep1]: '1. 트리거 선택 (회원가입, 구매 등)', [K.onboardingStep2]: '2. 채널 설정 (이메일, 카카오, SMS)', [K.onboardingStep3]: '3. 여정 실행 및 분석',
    [K.onboardingShowGuide]: '상세 가이드 보기', [K.onboardingStart]: '바로 시작하기', [K.onboardingDontShow]: '다시 보지 않기',
    // Empty State fallbacks
    [K.emptyTitle]: '아직 경로가 없습니다', [K.emptyDesc]: '첫 번째 고객 경로를 만들어보세요', [K.useTemplate]: '템플릿 사용하기',
    [K.templateWelcome]: '회원가입 환영 경로', [K.templateAbandon]: '장바구니 이탈 리마인더', [K.templateThanks]: '구매 감사 메시지', [K.templateChurn]: '이탈 방지 캠페인',
    [K.triggerSignup]: '회원가입', [K.triggerPurchase]: '구매 완료', [K.triggerAbandon]: '장바구니 이탈',
    [K.triggerChurn]: '이탈 위험', [K.triggerSegment]: '세그먼트 진입', [K.triggerManual]: '수동 실행',
    [K.targetSegment]: '대상 세그먼트', [K.channels]: '채널', [K.email]: '이메일', [K.kakao]: '카카오',
    [K.sms]: 'SMS', [K.push]: '푸시', [K.line]: 'LINE',
    [K.delayLabel]: '대기 시간', [K.delayNone]: '즉시', [K.delay1h]: '1시간', [K.delay1d]: '1일', [K.delay3d]: '3일', [K.delay7d]: '7일',
    [K.save]: '저장', [K.cancel]: '취소', [K.run]: '실행', [K.edit]: '편집', [K.delete]: '삭제', [K.duplicate]: '복제', [K.close]: '닫기',
    [K.statusDraft]: '초안', [K.statusActive]: '활성', [K.statusPaused]: '일시 중지', [K.statusCompleted]: '완료', [K.colStatus]: '상태',
    [K.totalJourneys]: '전체 경로', [K.activeJourneys]: '활성 경로', [K.totalExecutions]: '총 실행', [K.totalEntered]: '총 진입',
    [K.totalCompleted]: '총 완료', [K.avgCompletion]: '평균 완료율',
    [K.totalEmails]: '이메일 발송', [K.totalKakao]: '카카오 발송', [K.totalRevenue]: '총 매출',
    [K.recentLogs]: '최근 트리거 로그', [K.executionHistory]: '경로 실행 이력',
    [K.noData]: '등록된 경로가 없습니다.', [K.noLogs]: '실행 로그가 없습니다.',
    [K.confirmDelete]: '이 경로를 영구 삭제하시겠습니까?',
    [K.flowPreview]: '흐름 미리보기', [K.stepTrigger]: '트리거', [K.stepDelay]: '대기', [K.stepAction]: '동작', [K.stepEnd]: '종료',
    [K.byTrigger]: '트리거별 분포', [K.byChannel]: '채널별 분포', [K.completionRate]: '완료율 추이',
    [K.goAutoMkt]: 'AI 오토마케팅', [K.goCRM]: 'CRM',
    [K.createPlaceholder]: '예: 신규가입 환영 시퀀스', [K.selectNone]: '-- 선택 --', [K.copyLabel]: '(사본)',
    [K.logEntered]: '진입', [K.logCompleted]: '완료', [K.pauseBtn]: '⏸ 일시 중지', [K.resumeBtn]: '▶ 재개',
    [K.guideTitle]: '📋 경로 빌더 완전 가이드', [K.guideSub]: '고객 경로 자동화의 시작부터 분석 마무리까지 단계별로 안내합니다.',
    [K.guideStepsTitle]: '시작부터 마무리까지 — 15과정 완전 가이드',
    [K.guideStep1Title]: '로그인 & 메뉴 진입', [K.guideStep1Desc]: '플랫폼에 로그인한 후 좌측 사이드바에서 "AI 마케팅 → 경로 빌더"를 클릭합니다.',
    [K.guideStep2Title]: '대시보드 현황 파악', [K.guideStep2Desc]: '전체 경로 수, 활성 경로, 총 실행 횟수, 평균 완료율 KPI를 확인합니다.',
    [K.guideStep3Title]: '새 경로 생성', [K.guideStep3Desc]: '"새 경로 생성" 버튼을 클릭하여 경로 이름을 입력합니다.',
    [K.guideStep4Title]: '트리거 유형 선택', [K.guideStep4Desc]: '회원가입, 구매 완료, 장바구니 이탈 등 경로 시작 트리거를 선택합니다.',
    [K.guideStep5Title]: 'CRM 세그먼트 연결', [K.guideStep5Desc]: 'CRM에 등록된 고객 세그먼트를 선택하여 타겟 오디언스를 지정합니다.',
    [K.guideStep6Title]: '채널 선택', [K.guideStep6Desc]: '이메일, 카카오, SMS, 푸시, LINE 중 발송 채널을 선택합니다.',
    [K.guideStep7Title]: '대기 시간 설정', [K.guideStep7Desc]: '트리거 발동 후 메시지 발송까지의 대기 시간을 설정합니다.',
    [K.guideStep8Title]: '경로 저장', [K.guideStep8Desc]: '"저장" 클릭 시 경로 "초안" 상태로 저장됩니다.',
    [K.guideStep9Title]: '흐름 미리보기', [K.guideStep9Desc]: '경로 카드 클릭 시 트리거→대기→동작→종료 흐름도를 확인합니다.',
    [K.guideStep10Title]: '경로 실행', [K.guideStep10Desc]: '"실행" 버튼으로 경로를 활성화하고 자동 메시지를 발송합니다.',
    [K.guideStep11Title]: '실행 상태 관리', [K.guideStep11Desc]: '활성 경로의 "일시 중지" 또는 "재개"로 상태를 제어합니다.',
    [K.guideStep12Title]: '실행 로그 확인', [K.guideStep12Desc]: '진입/완료 수, 발송 건수, 매출 기여도를 실시간 확인합니다.',
    [K.guideStep13Title]: '분석 대시보드', [K.guideStep13Desc]: '트리거별/채널별 분포, 완료율 추이 차트를 분석합니다.',
    [K.guideStep14Title]: '경로 복제 & 수정', [K.guideStep14Desc]: '성과 좋은 경로를 복제하거나 트리거/채널을 수정합니다.',
    [K.guideStep15Title]: '반복 최적화', [K.guideStep15Desc]: '분석 결과를 바탕으로 지속적으로 개선합니다.',
    [K.guideTabsTitle]: '탭별 기능 안내',
    [K.guideTabBuilderName]: '경로 빌더', [K.guideTabBuilderDesc]: '새 경로를 생성하고 KPI와 최근 경로 흐름을 확인합니다.',
    [K.guideTabListName]: '경로 목록', [K.guideTabListDesc]: '모든 경로의 상태와 통계를 테이블로 관리합니다.',
    [K.guideTabLogsName]: '실행 로그', [K.guideTabLogsDesc]: '경로 실행 이력과 트리거 로그를 확인합니다.',
    [K.guideTabAnalyticsName]: '분석', [K.guideTabAnalyticsDesc]: '차트와 성과 비교를 시각화합니다.',
    [K.guideTabGuideName]: '이용 가이드', [K.guideTabGuideDesc]: '전체 워크플로우를 단계별로 안내합니다.',
    [K.guideTipsTitle]: '💡 운영 팁',
    [K.guideTip1]: '트리거별로 대기 시간을 다르게 설정하면 반응률이 높아집니다.',
    [K.guideTip2]: '이메일+카카오 조합은 전환율이 평균 2.3배 높습니다.',
    [K.guideTip3]: '장바구니 이탈 경로는 1시간 이내 발송 시 복구율이 최고입니다.',
    [K.guideTip4]: '주간 단위로 완료율 추이를 확인하고 채널을 조정하세요.',
    [K.guideTip5]: '세그먼트 트리거로 VIP 고객에게 프리미엄 오퍼를 제공하세요.',
    [K.guideTip6]: '경로 복제로 A/B 테스트를 쉽게 실행할 수 있습니다.',
    [K.guideTip7]: '매출 기여도를 확인하여 ROI가 높은 경로에 집중하세요.',
    [K.guideTip8]: '성과가 낮은 경로는 정기적으로 정리하고 자원을 재배분하세요.',
    [K.guideTip9]: '즉시 발송(대기 0) 설정은 긴급 프로모션에 가장 효과적입니다.',
    [K.guideTip10]: '경로 분석 데이터를 팀과 공유하여 마케팅 전략을 함께 수립하세요.',
    [K.guideStep16Title]: 'A/B 테스트 실행',
    [K.guideStep16Desc]: '동일 경로를 복제하여 트리거·채널·대기 시간을 변경한 후 성과를 비교합니다.',
    [K.guideStep17Title]: '다채널 캐스케이딩',
    [K.guideStep17Desc]: '이메일 미오픈 시 카카오→SMS 순으로 자동 전환되는 멀티채널 전략을 구성합니다.',
    [K.guideStep18Title]: '매출 기여도 분석',
    [K.guideStep18Desc]: 'Attribution 연동으로 각 경로의 실제 매출 기여도와 ROI를 확인합니다.',
    [K.guideStep19Title]: '세그먼트별 성과 비교',
    [K.guideStep19Desc]: '동일 경로를 다른 CRM 세그먼트에 적용하여 타겟별 효과를 비교 분석합니다.',
    [K.guideStep20Title]: '팀 협업 & 보고서',
    [K.guideStep20Desc]: '경로 성과 데이터를 팀과 공유하고 주간·월간 보고서에 활용합니다.',
    [K.guideStartBtn]: '경로 빌더 시작하기',
};

/* ── Status Config ───────────────────────────────────── */
const STS = {
    draft: { color: '#64748b', bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.25)', icon: '📝' },
    active: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)', icon: '🟢' },
    paused: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', icon: '⏸' },
    completed: { color: '#06b6d4', bg: 'rgba(6,182,212,0.10)', border: 'rgba(6,182,212,0.25)', icon: '✅' },
};
const TRIGGER_CFG = {
    signup: { icon: '👤', color: '#4f8ef7' },
    purchase: { icon: '🛍️', color: '#22c55e' },
    abandon: { icon: '🛒', color: '#f59e0b' },
    churn: { icon: '⚠️', color: '#ef4444' },
    segment: { icon: '👥', color: '#a855f7' },
    manual: { icon: '✋', color: '#64748b' },
};
const CH_COLORS = { email: '#4f8ef7', kakao: '#fbbf24', sms: '#22c55e', push: '#f97316', line: '#06d6a0' };
const fmt = v => { if (v >= 1e8) return (v / 1e8).toFixed(1) + '억'; if (v >= 1e4) return (v / 1e4).toFixed(0) + '만'; return v?.toLocaleString?.() || '0'; };
const fmtW = v => new Intl.NumberFormat(navigator.language || 'ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(v || 0);

/* ── Shared styles ───────────────────────────────────── */
const CARD = {
    background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 16, padding: '20px 24px', backdropFilter: 'blur(12px)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};
const INP = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 13, color: '#1e293b', outline: 'none' };
const SEL = { ...INP, cursor: 'pointer' };
const LBL = { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block' };
const CONTENT_MIN = 'calc(100vh - 145px)';

/* ── SVG Mini-Charts ─────────────────────────────────── */
function DonutChart({ data, size = 150, thickness = 22, centerLabel, centerValue }) {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const r = (size - thickness) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
    let offset = 0;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
            {data.map((d, i) => { const p = d.value / total; const da = p * circ; const g = circ - da; const o = offset; offset += p; return (<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={`${da} ${g}`} strokeDashoffset={-o * circ} transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)' }} />); })}
            <text x={cx} y={cy - 6} textAnchor="middle" fill="#334155" fontSize="20" fontWeight="900">{centerValue}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">{centerLabel}</text>
        </svg>
    );
}
function HBarChart({ items, maxValue }) {
    const mv = maxValue || Math.max(...items.map(i => i.value), 1);
    return (
        <div style={{ display: 'grid', gap: 10 }}>
            {items.map((item, i) => {
                const pct = Math.min(Math.round((item.value / mv) * 100), 100);
                return (
                    <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12, fontWeight: 700, color: '#334155' }}>
                            <span style={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                            <span style={{ fontWeight: 800, color: item.color || '#4f8ef7' }}>{item.displayValue || item.value}</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden' }}>
                            <div style={{ width: pct + '%', height: '100%', borderRadius: 6, background: `linear-gradient(90deg,${item.color || '#4f8ef7'},${item.colorEnd || item.color || '#6366f1'})`, transition: 'width 0.8s' }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── Modal ────────────────────────────────────────────── */
const Backdrop = ({ children, onClose }) => (
    <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', zIndex: 400 }} />
        <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(94vw,680px)', maxHeight: '88vh', overflowY: 'auto', borderRadius: 20, border: '1px solid rgba(255,255,255,0.18)', padding: 32, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', background: 'linear-gradient(180deg,#ffffff,#f8faff)', zIndex: 401 }}>
            {children}
        </div>
    </>
);

/* ── Flow Preview Component ──────────────────────────── */
function FlowPreview({ journey, tr }) {
    const steps = [
        { type: 'trigger', icon: TRIGGER_CFG[journey.trigger_type]?.icon || '⚡', label: tr(K.stepTrigger), detail: journey.trigger_label, color: TRIGGER_CFG[journey.trigger_type]?.color || '#4f8ef7' },
    ];
    if (journey.delay && journey.delay !== 'none') {
        steps.push({ type: 'delay', icon: '⏳', label: tr(K.stepDelay), detail: journey.delay_label, color: '#f59e0b' });
    }
    (journey.channels || []).forEach(ch => {
        steps.push({ type: 'action', icon: ch === 'email' ? '📧' : ch === 'kakao' ? '💬' : ch === 'sms' ? '📱' : ch === 'push' ? '🔔' : '💚', label: ch.toUpperCase(), detail: tr(K.stepAction), color: CH_COLORS[ch] || '#64748b' });
    });
    steps.push({ type: 'end', icon: '🏁', label: tr(K.stepEnd), detail: '', color: '#22c55e' });
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '8px 0' }}>
            {steps.map((s, i) => (
                <React.Fragment key={i}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80, flexShrink: 0, padding: '8px 4px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: `${s.color}12`, border: `2px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: s.color, textAlign: 'center' }}>{s.label}</div>
                        {s.detail && <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 2 }}>{s.detail}</div>}
                    </div>
                    {i < steps.length - 1 && <div style={{ width: 32, height: 2, background: `linear-gradient(90deg, ${s.color}40, ${steps[i + 1].color}40)`, flexShrink: 0, borderRadius: 1 }} />}
                </React.Fragment>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function JourneyBuilder() {
    const { t, lang } = useI18n();
    const navigate = useNavigate();
    const {
        journeyTriggers = [], triggerJourneyAction,
        journeyExecutions = [], recordJourneyExecution,
        crmSegments = [], emailCampaignsLinked = [], kakaoCampaignsLinked = [],
    } = useGlobalData?.() || {};

    const [tab, setTab] = useState('builder');
    const [journeys, setJourneys] = useState(() => {
        try { const saved = localStorage.getItem('jb_journeys'); return saved ? JSON.parse(saved) : []; } catch { return []; }
    });
    const [showCreate, setShowCreate] = useState(false);
    const [editId, setEditId] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [detailId, setDetailId] = useState(null);
    const [form, setForm] = useState({ name: '', trigger_type: 'signup', segment: '', channels: ['email'], delay: 'none' });

    const tr = useCallback(key => { const v = t(key); return v === key ? (FB[key] || key) : v; }, [t]);
    const stsLabel = s => ({ draft: tr(K.statusDraft), active: tr(K.statusActive), paused: tr(K.statusPaused), completed: tr(K.statusCompleted) }[s] || s);
    const trigLabel = s => ({ signup: tr(K.triggerSignup), purchase: tr(K.triggerPurchase), abandon: tr(K.triggerAbandon), churn: tr(K.triggerChurn), segment: tr(K.triggerSegment), manual: tr(K.triggerManual) }[s] || s);
    const delayLabel = s => ({ none: tr(K.delayNone), '1h': tr(K.delay1h), '1d': tr(K.delay1d), '3d': tr(K.delay3d), '7d': tr(K.delay7d) }[s] || s);

    const persist = useCallback(list => { try { localStorage.setItem('jb_journeys', JSON.stringify(list)); } catch { } }, []);

    const TRIGGERS = [{ id: 'signup', label: tr(K.triggerSignup) }, { id: 'purchase', label: tr(K.triggerPurchase) }, { id: 'abandon', label: tr(K.triggerAbandon) }, { id: 'churn', label: tr(K.triggerChurn) }, { id: 'segment', label: tr(K.triggerSegment) }, { id: 'manual', label: tr(K.triggerManual) }];
    const CHANNELS = [{ id: 'email', label: tr(K.email), icon: '📧' }, { id: 'kakao', label: tr(K.kakao), icon: '💬' }, { id: 'sms', label: tr(K.sms), icon: '📱' }, { id: 'push', label: tr(K.push), icon: '🔔' }, { id: 'line', label: tr(K.line), icon: '💚' }];
    const DELAYS = [{ id: 'none', label: tr(K.delayNone) }, { id: '1h', label: tr(K.delay1h) }, { id: '1d', label: tr(K.delay1d) }, { id: '3d', label: tr(K.delay3d) }, { id: '7d', label: tr(K.delay7d) }];

    const TABS = [{ id: 'builder', label: tr(K.tabBuilder), icon: '🗺️' }, { id: 'list', label: tr(K.tabList), icon: '📋' }, { id: 'logs', label: tr(K.tabLogs), icon: '📜' }, { id: 'analytics', label: tr(K.tabAnalytics), icon: '📈' }, { id: 'guide', label: tr(K.tabGuide), icon: '📖' }];
    const TAB_CLR = { builder: '#4f8ef7', list: '#a855f7', logs: '#f97316', analytics: '#22c55e', guide: '#06b6d4' };

    /* ── Actions ──────────────────────────────────────── */
    const handleSave = () => {
        if (!form.name.trim()) return;
        const journey = {
            id: editId || `JRN-${Date.now()}`,
            name: form.name,
            trigger_type: form.trigger_type,
            trigger_label: trigLabel(form.trigger_type),
            segment: form.segment,
            channels: form.channels,
            delay: form.delay,
            delay_label: delayLabel(form.delay),
            status: 'draft',
            createdAt: editId ? (journeys.find(j => j.id === editId)?.createdAt || new Date().toLocaleDateString(LANG_LOCALE_MAP[lang] || 'ko-KR')) : new Date().toLocaleDateString(LANG_LOCALE_MAP[lang] || 'ko-KR'),
            executions: editId ? (journeys.find(j => j.id === editId)?.executions || 0) : 0,
            entered: editId ? (journeys.find(j => j.id === editId)?.entered || 0) : 0,
            completed: editId ? (journeys.find(j => j.id === editId)?.completed || 0) : 0,
        };
        const next = editId ? journeys.map(j => j.id === editId ? journey : j) : [journey, ...journeys];
        setJourneys(next);
        persist(next);
        setShowCreate(false);
        setEditId(null);
        setForm({ name: '', trigger_type: 'signup', segment: '', channels: ['email'], delay: 'none' });
    };

    const openEdit = j => {
        setEditId(j.id);
        setForm({ name: j.name, trigger_type: j.trigger_type, segment: j.segment || '', channels: j.channels || ['email'], delay: j.delay || 'none' });
        setShowCreate(true);
    };

    const handleDelete = id => {
        const next = journeys.filter(j => j.id !== id);
        setJourneys(next);
        persist(next);
        setDeleteId(null);
        setDetailId(null);
    };

    const handleDuplicate = j => {
        const copy = { ...j, id: `JRN-${Date.now()}`, name: `${j.name} ${tr(K.copyLabel)}`, status: 'draft', executions: 0, entered: 0, completed: 0, createdAt: new Date().toLocaleDateString(LANG_LOCALE_MAP[lang] || 'ko-KR') };
        const next = [copy, ...journeys];
        setJourneys(next);
        persist(next);
    };

    const handleRun = j => {
        const entered = Math.floor(Math.random() * 500) + 50;
        const completed = Math.floor(entered * (0.4 + Math.random() * 0.5));
        const emailsSent = j.channels.includes('email') ? Math.floor(entered * 0.9) : 0;
        const kakaoSent = j.channels.includes('kakao') ? Math.floor(entered * 0.85) : 0;
        const revenue = Math.floor(completed * (8000 + Math.random() * 30000));
        if (recordJourneyExecution) {
            recordJourneyExecution(j, { entered, completed, emailsSent, kakaoSent, revenue });
        }
        j.channels.forEach(ch => {
            if (triggerJourneyAction) {
                if (ch === 'email') triggerJourneyAction('email_send', { campaignId: `EC-JB-${Date.now()}`, count: emailsSent });
                if (ch === 'kakao') triggerJourneyAction('kakao_send', { campaignId: `KC-JB-${Date.now()}`, count: kakaoSent });
                if (ch === 'line') triggerJourneyAction('line_send', { count: Math.floor(entered * 0.7) });
            }
        });
        const next = journeys.map(x => x.id === j.id ? { ...x, status: 'active', executions: (x.executions || 0) + 1, entered: (x.entered || 0) + entered, completed: (x.completed || 0) + completed } : x);
        setJourneys(next);
        persist(next);
        setDetailId(null);
    };

    const toggleStatus = j => {
        const nextStatus = j.status === 'active' ? 'paused' : j.status === 'paused' ? 'active' : j.status;
        const next = journeys.map(x => x.id === j.id ? { ...x, status: nextStatus } : x);
        setJourneys(next);
        persist(next);
    };

    /* ── Stats ────────────────────────────────────────── */
    const stats = useMemo(() => {
        const active = journeys.filter(j => j.status === 'active').length;
        const totalExec = journeyExecutions.length;
        const totalEntered = journeyExecutions.reduce((s, e) => s + (e.entered || 0), 0);
        const totalDone = journeyExecutions.reduce((s, e) => s + (e.completed || 0), 0);
        const avgRate = totalEntered > 0 ? Math.round((totalDone / totalEntered) * 100) : 0;
        const totalEmails = journeyExecutions.reduce((s, e) => s + (e.emailsSent || 0), 0);
        const totalKakao = journeyExecutions.reduce((s, e) => s + (e.kakaoSent || 0), 0);
        const totalRevenue = journeyExecutions.reduce((s, e) => s + (e.revenue || 0), 0);
        const byTrigger = {};
        journeys.forEach(j => { byTrigger[j.trigger_type] = (byTrigger[j.trigger_type] || 0) + 1; });
        const byChannel = {};
        journeys.forEach(j => { (j.channels || []).forEach(ch => { byChannel[ch] = (byChannel[ch] || 0) + 1; }); });
        const byStatus = {};
        journeys.forEach(j => { byStatus[j.status] = (byStatus[j.status] || 0) + 1; });
        return { total: journeys.length, active, totalExec, totalEntered, totalDone, avgRate, totalEmails, totalKakao, totalRevenue, byTrigger, byChannel, byStatus };
    }, [journeys, journeyExecutions]);

    const detail = useMemo(() => detailId ? journeys.find(j => j.id === detailId) : null, [detailId, journeys]);

    const ActBtn = ({ icon, label, color, onClick, small }) => (<button onClick={e => { e.stopPropagation(); onClick?.(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: small ? '4px 8px' : '6px 12px', borderRadius: 8, border: `1px solid ${color}30`, cursor: 'pointer', background: `${color}08`, color, fontSize: small ? 10 : 11, fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap' }} onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; }} onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; }}>{icon} {label}</button>);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1200, margin: '0 auto', width: '100%', flex: 1, minHeight: 0, color: '#1e293b', background: 'transparent' }}>

            {/* ══════ FIXED HEADER AREA (Hero + Sub-tabs) ══════ */}
            <div style={{ flexShrink: 0 }}>
                {/* ── Hero Header ── */}
                <div className="hero" style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 300px' }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #4f8ef7, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 14px rgba(79,142,247,0.3)', flexShrink: 0 }}>🗺️</div>
                            <div style={{ minWidth: 0 }}>
                                <div className="hero-title" style={{ fontSize: 19, fontWeight: 900, color: '#4f8ef7', letterSpacing: '-0.3px', lineHeight: 1.3 }}>{tr(K.title)}</div>
                                <div className="hero-desc" style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr(K.sub)}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <button onClick={() => navigate('/auto-marketing')} style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.25)', cursor: 'pointer', background: 'rgba(168,85,247,0.06)', color: '#a855f7', fontSize: 11, fontWeight: 700 }}>🚀 {tr(K.goAutoMkt)}</button>
                            <button onClick={() => navigate('/crm')} style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(79,142,247,0.25)', cursor: 'pointer', background: 'rgba(79,142,247,0.06)', color: '#4f8ef7', fontSize: 11, fontWeight: 700 }}>👥 {tr(K.goCRM)}</button>
                        </div>
                    </div>
                </div>

                {/* ── Sub-Tab Navigation (fixed, always visible) ── */}
                <div className="sub-tab-nav" style={{ padding: '8px 14px', background: 'rgba(245,247,250,0.97)', borderBottom: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(12px)' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: 'rgba(241,245,249,0.7)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: '6px 8px' }}>
                        {TABS.map(tb => {
                            const active = tab === tb.id;
                            const c = TAB_CLR[tb.id];
                            return (
                                <button key={tb.id} onClick={() => setTab(tb.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s cubic-bezier(.4,0,.2,1)', background: active ? c : 'transparent', color: active ? '#ffffff' : '#64748b', boxShadow: active ? `0 3px 14px ${c}40` : 'none', transform: active ? 'translateY(-1px)' : 'none' }}>{tb.icon} {tb.label}</button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ══════ SCROLLABLE CONTENT AREA ══════ */}
            <div className="fade-up" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 8px 28px' }}>

                {/* ══════ BUILDER ═══════════════════════════════ */}
                {tab === 'builder' && (
                    <div style={{ display: 'grid', gap: 14, minHeight: CONTENT_MIN, alignContent: 'start' }}>
                        {/* KPI Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                            {[
                                { label: tr(K.totalJourneys), value: stats.total, icon: '🗺️', color: '#4f8ef7' },
                                { label: tr(K.activeJourneys), value: stats.active, icon: '🟢', color: '#22c55e' },
                                { label: tr(K.totalExecutions), value: stats.totalExec, icon: '🚀', color: '#a855f7' },
                                { label: tr(K.avgCompletion), value: stats.avgRate + '%', icon: '📈', color: '#f97316' }
                            ].map(({ label, value, icon, color }) => (
                                <div key={label} className="kpi-card" style={{ '--accent': color }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div className="kpi-label">{label}</div>
                                        {icon && <span style={{ fontSize: 22, opacity: 0.85, lineHeight: 1 }}>{icon}</span>}
                                    </div>
                                    <div className="kpi-value" style={{ color, fontSize: 26, fontWeight: 900, marginTop: 2 }}>{value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Create Button */}
                        <div style={CARD}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div><div style={{ fontWeight: 800, fontSize: 15, color: '#334155' }}>🗺️ {tr(K.tabBuilder)}</div><div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{tr(K.sub)}</div></div>
                                <button onClick={() => { setEditId(null); setForm({ name: '', trigger_type: 'signup', segment: '', channels: ['email'], delay: 'none' }); setShowCreate(true); }} style={{ padding: '10px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#06b6d4)', color: '#fff', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 16px rgba(79,142,247,0.3)' }}>+ {tr(K.createJourney)}</button>
                            </div>
                        </div>

                        {/* Recent Journeys Preview */}
                        {journeys.slice(0, 3).map(j => {
                            const cfg = STS[j.status] || STS.draft;
                            return (
                                <div key={j.id} style={{ ...CARD, cursor: 'pointer' }} onClick={() => setDetailId(j.id)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ fontSize: 20 }}>{TRIGGER_CFG[j.trigger_type]?.icon || '⚡'}</div>
                                            <div><div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{j.name}</div><div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{trigLabel(j.trigger_type)} → {(j.channels || []).map(c => c.toUpperCase()).join(', ')}</div></div>
                                        </div>
                                        <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>{cfg.icon} {stsLabel(j.status)}</span>
                                    </div>
                                    <FlowPreview journey={j} tr={tr} />
                                </div>
                            );
                        })}
                        {journeys.length === 0 && (
                            <EmptyState
                                onCreateClick={() => {
                                    setEditId(null);
                                    setForm({ name: '', trigger_type: 'signup', segment: '', channels: ['email'], delay: 'none' });
                                    setShowCreate(true);
                                }}
                                onTemplateClick={(template) => {
                                    if (template) {
                                        setEditId(null);
                                        setForm({
                                            name: tr(template.nameKey),
                                            trigger_type: template.trigger,
                                            segment: '',
                                            channels: template.channels,
                                            delay: template.delay
                                        });
                                        setShowCreate(true);
                                    } else {
                                        setShowCreate(true);
                                    }
                                }}
                            />
                        )}
                    </div>
                )}

                {/* ══════ LIST ══════════════════════════════════ */}
                {tab === 'list' && (
                    <div style={{ display: 'grid', gap: 14, minHeight: CONTENT_MIN, alignContent: 'start' }}>
                        <div style={{ ...CARD, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: '#334155' }}>📋 {tr(K.tabList)} ({journeys.length})</div>
                            <button onClick={() => { setEditId(null); setForm({ name: '', trigger_type: 'signup', segment: '', channels: ['email'], delay: 'none' }); setShowCreate(true); }} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#06b6d4)', color: '#fff', fontWeight: 700, fontSize: 12 }}>+ {tr(K.createJourney)}</button>
                        </div>
                        {journeys.length === 0 ? (
                            <div style={{ ...CARD, textAlign: 'center', padding: '60px 20px', fontSize: 14, marginBottom: 12, color: '#94a3b8' }} ><div>📭</div><div>{tr(K.noData)}</div></div>
                        ) : (
                            <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 90px 100px 80px 80px 80px 140px', gap: 6, padding: '14px 20px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                                    <span>{tr(K.journeyName)}</span><span>{tr(K.colStatus) || '상태'}</span><span>{tr(K.triggerType)}</span><span style={{ textAlign: 'right' }} >{tr(K.totalExecutions)}</span><span style={{ textAlign: 'right' }}>{tr(K.totalEntered)}</span><span style={{ textAlign: 'right' }}>{tr(K.totalCompleted)}</span><span style={{ textAlign: 'center' }}>{tr(K.edit)}</span>
                                </div>
                                {journeys.map(j => {
                                    const cfg = STS[j.status] || STS.draft;
                                    const tCfg = TRIGGER_CFG[j.trigger_type] || TRIGGER_CFG.manual;
                                    return (
                                        <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '2fr 90px 100px 80px 80px 80px 140px', gap: 6, padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.03)', alignItems: 'center', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <div onClick={() => setDetailId(j.id)} style={{ cursor: 'pointer' }}><div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{j.name}</div><div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{j.createdAt}</div></div>
                                            <div><span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>{cfg.icon} {stsLabel(j.status)}</span></div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#334155', fontWeight: 600 }} ><span>{tCfg.icon}</span><span>{trigLabel(j.trigger_type)}</span></div>
                                            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#4f8ef7' }}>{j.executions || 0}</div>
                                            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#a855f7' }}>{(j.entered || 0).toLocaleString()}</div>
                                            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#22c55e' }}>{(j.completed || 0).toLocaleString()}</div>
                                            <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                                                <ActBtn icon="▶" label={tr(K.run)} color="#22c55e" onClick={() => handleRun(j)} small />
                                                <ActBtn icon="✏️" label={tr(K.edit)} color="#4f8ef7" onClick={() => openEdit(j)} small />
                                                <ActBtn icon="🗑️" label={tr(K.delete)} color="#ef4444" onClick={() => setDeleteId(j.id)} small />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════ LOGS ═════════════════════════════════ */}
                {tab === 'logs' && (
                    <div style={{ display: 'grid', gap: 14, minHeight: CONTENT_MIN, alignContent: 'start' }}>
                        {/* Execution History */}
                        <div style={CARD}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: '#334155', marginBottom: 14 }}>🚀 {tr(K.executionHistory)} ({journeyExecutions.length})</div>
                            {journeyExecutions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, marginBottom: 8, color: '#94a3b8' }} ><div>📜</div><div>{tr(K.noLogs)}</div></div>
                            ) : (
                                <div style={{ display: 'grid', gap: 8 }}>{journeyExecutions.slice(0, 10).map(e => (
                                    <div key={e.id} style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>🗺️ {e.journeyName}</div>
                                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{e.executedAt}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 11, color: '#4f8ef7', fontWeight: 600 }}>{tr(K.logEntered)} {e.entered?.toLocaleString() || 0}</span>
                                            <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>{tr(K.logCompleted)} {e.completed?.toLocaleString() || 0}</span>
                                            {e.emailsSent > 0 && <span style={{ fontSize: 11, color: '#a855f7', fontWeight: 600 }}>📧 {e.emailsSent?.toLocaleString()}</span>}
                                            {e.kakaoSent > 0 && <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>💬 {e.kakaoSent?.toLocaleString()}</span>}
                                            {e.revenue > 0 && <span style={{ fontSize: 11, color: '#f97316', fontWeight: 800 }}>{fmtW(e.revenue)}</span>}
                                        </div>
                                    </div>
                                ))}</div>
                            )}
                        </div>
                        {/* Trigger Logs */}
                        <div style={CARD}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: '#334155', marginBottom: 14 }}>⚡ {tr(K.recentLogs)} ({journeyTriggers.length})</div>
                            {journeyTriggers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, marginBottom: 8, color: '#94a3b8' }} ><div>📝</div><div>{tr(K.noLogs)}</div></div>
                            ) : (
                                <div style={{ display: 'grid', gap: 6 }}>{journeyTriggers.slice(0, 15).map(log => (
                                    <div key={log.id} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 14 }}>{log.type === 'email_send' ? '📧' : log.type === 'kakao_send' ? '💬' : log.type === 'line_send' ? '💚' : '⚡'}</span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{log.type}</span>
                                        </div>
                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(log.at).toLocaleString(LANG_LOCALE_MAP[lang] || 'ko-KR', { hour12: false })}</span>
                                    </div>
                                ))}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════ ANALYTICS ═════════════════════════════ */}
                {tab === 'analytics' && (
                    <div style={{ display: 'grid', gap: 14, minHeight: CONTENT_MIN, alignContent: 'start' }}>
                        {/* KPI Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                            {[{ label: tr(K.totalEntered), value: stats.totalEntered.toLocaleString(), icon: '👣', color: '#4f8ef7' }, { label: tr(K.totalCompleted), value: stats.totalDone.toLocaleString(), icon: '✅', color: '#22c55e' }, { label: tr(K.totalEmails), value: stats.totalEmails.toLocaleString(), icon: '📧', color: '#a855f7' }, { label: tr(K.totalRevenue), value: fmt(stats.totalRevenue), icon: '💰', color: '#f97316' }].map(({ label, value, icon, color }) => (
                                <div key={label} style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
                                    <div><div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.03em' }}>{label}</div><div style={{ fontSize: 24, fontWeight: 900, color, marginTop: 2 }}>{value}</div></div>
                                </div>
                            ))}
                        </div>
                        {/* Charts */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14, alignSelf: 'flex-start' }}>⚡ {tr(K.byTrigger)}</div>
                                <DonutChart data={Object.entries(stats.byTrigger).map(([k, v]) => ({ value: v, color: TRIGGER_CFG[k]?.color || '#94a3b8' })).length > 0 ? Object.entries(stats.byTrigger).map(([k, v]) => ({ value: v, color: TRIGGER_CFG[k]?.color || '#94a3b8' })) : [{ value: 1, color: '#e2e8f0' }]} centerLabel={tr(K.totalJourneys)} centerValue={stats.total} />
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, justifyContent: 'center' }}>{Object.entries(stats.byTrigger).map(([tk, tv]) => (<div key={tk} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b', fontWeight: 600 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: TRIGGER_CFG[tk]?.color || '#94a3b8' }} /><span>{trigLabel(tk)} ({tv})</span></div>))}</div>
                            </div>
                            <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14, alignSelf: 'flex-start' }}>📡 {tr(K.byChannel)}</div>
                                <DonutChart data={Object.entries(stats.byChannel).map(([k, v]) => ({ value: v, color: CH_COLORS[k] || '#94a3b8' })).length > 0 ? Object.entries(stats.byChannel).map(([k, v]) => ({ value: v, color: CH_COLORS[k] || '#94a3b8' })) : [{ value: 1, color: '#e2e8f0' }]} centerLabel={tr(K.channels)} centerValue={Object.keys(stats.byChannel).length} />
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, justifyContent: 'center' }}>{Object.entries(stats.byChannel).map(([ck, cv]) => (<div key={ck} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b', fontWeight: 600 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: CH_COLORS[ck] || '#94a3b8' }} /><span>{ck.toUpperCase()} ({cv})</span></div>))}</div>
                            </div>
                            <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14, alignSelf: 'flex-start' }}>📊 {tr(K.completionRate)}</div>
                                <DonutChart data={stats.totalEntered > 0 ? [{ value: stats.totalDone, color: '#22c55e' }, { value: stats.totalEntered - stats.totalDone, color: '#e2e8f0' }] : [{ value: 1, color: '#e2e8f0' }]} centerLabel={tr(K.avgCompletion)} centerValue={stats.avgRate + '%'} />
                            </div>
                        </div>
                        {/* Performance Bars */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={CARD}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14 }}>🏅 {tr(K.completionRate)}</div>
                                {journeys.filter(j => j.entered > 0).length > 0 ? (
                                    <HBarChart items={journeys.filter(j => j.entered > 0).sort((a, b) => ((b.completed || 0) / b.entered) - ((a.completed || 0) / a.entered)).slice(0, 8).map(j => { const rate = Math.round(((j.completed || 0) / j.entered) * 100); return { label: j.name, value: rate, displayValue: rate + '%', color: rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444', colorEnd: rate >= 70 ? '#14d9b0' : rate >= 40 ? '#fbbf24' : '#f97316' }; })} maxValue={100} />
                                ) : <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 30 }}>{tr(K.noData)}</div>}
                            </div>
                            <div style={CARD}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14 }}>📧 {tr(K.totalEmails)} + 💬 {tr(K.totalKakao)}</div>
                                {journeyExecutions.length > 0 ? (
                                    <HBarChart items={journeyExecutions.slice(0, 8).map(e => ({ label: e.journeyName, value: (e.emailsSent || 0) + (e.kakaoSent || 0), displayValue: `${e.emailsSent || 0} + ${e.kakaoSent || 0}`, color: '#a855f7', colorEnd: '#4f8ef7' }))} />
                                ) : <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 30 }}>{tr(K.noLogs)}</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ TAB: GUIDE ════════════════════════════════════════ */}
                {tab === 'guide' && (
                    <div className="guide-section" style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: CONTENT_MIN, alignContent: 'start', color: '#1e293b' }}>
                        <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(6,182,212,0.08))', border: '1px solid rgba(79,142,247,0.3)', textAlign: 'center', padding: 32, color: '#1e293b' }}>
                            <div style={{ fontSize: 44 }}>🗺️</div>
                            <div style={{ fontWeight: 900, fontSize: 22, color: '#1e293b', marginTop: 8 }}>{tr(K.guideTitle)}</div>
                            <div className="guide-sub" style={{ fontSize: 13, color: '#475569', marginTop: 6, maxWidth: 560, margin: '6px auto 0', lineHeight: 1.7 }}>{tr(K.guideSub)}</div>
                            <button className="guide-cta" onClick={() => setTab('builder')} style={{ marginTop: 16, padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#06b6d4)', color: '#fff', fontWeight: 800, fontSize: 14 }}>{tr(K.guideStartBtn)}</button>
                        </div>
                        <div style={{ ...CARD, color: '#1e293b' }}>
                            <div style={{ fontWeight: 800, fontSize: 17, color: '#1e293b', marginBottom: 16 }}>📚 {tr(K.guideStepsTitle)}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                                {[{ n: '1', k: 'guideStep1', c: '#4f8ef7' }, { n: '2', k: 'guideStep2', c: '#22c55e' }, { n: '3', k: 'guideStep3', c: '#a855f7' }, { n: '4', k: 'guideStep4', c: '#f59e0b' }, { n: '5', k: 'guideStep5', c: '#f97316' }, { n: '6', k: 'guideStep6', c: '#06b6d4' }, { n: '7', k: 'guideStep7', c: '#4f8ef7' }, { n: '8', k: 'guideStep8', c: '#22c55e' }, { n: '9', k: 'guideStep9', c: '#a855f7' }, { n: '10', k: 'guideStep10', c: '#f59e0b' }, { n: '11', k: 'guideStep11', c: '#f97316' }, { n: '12', k: 'guideStep12', c: '#06b6d4' }, { n: '13', k: 'guideStep13', c: '#4f8ef7' }, { n: '14', k: 'guideStep14', c: '#22c55e' }, { n: '15', k: 'guideStep15', c: '#a855f7' }, { n: '16', k: 'guideStep16', c: '#f59e0b' }, { n: '17', k: 'guideStep17', c: '#f97316' }, { n: '18', k: 'guideStep18', c: '#06b6d4' }, { n: '19', k: 'guideStep19', c: '#4f8ef7' }, { n: '20', k: 'guideStep20', c: '#22c55e' }].map((s, i) => (
                                    <div key={i} style={{ background: s.c + '0a', border: `1px solid ${s.c}25`, borderRadius: 12, padding: 16, color: '#1e293b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                            <span style={{ width: 28, height: 28, borderRadius: 8, background: s.c, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{s.n}</span>
                                            <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{tr(K[s.k + 'Title'])}</span>
                                        </div>
                                        <div className="guide-desc" style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>{tr(K[s.k + 'Desc'])}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ ...CARD, color: '#1e293b' }}>
                            <div style={{ fontWeight: 800, fontSize: 17, color: '#1e293b', marginBottom: 16 }}>{tr(K.guideTabsTitle)}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
                                {[{ icon: '🗺️', k: 'guideTabBuilder', c: '#4f8ef7' }, { icon: '📋', k: 'guideTabList', c: '#a855f7' }, { icon: '📜', k: 'guideTabLogs', c: '#f97316' }, { icon: '📈', k: 'guideTabAnalytics', c: '#22c55e' }, { icon: '📖', k: 'guideTabGuide', c: '#06b6d4' }].map((tb, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: 'rgba(255,255,255,0.6)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', color: '#1e293b' }}>
                                        <span style={{ fontSize: 22, flexShrink: 0 }}>{tb.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: tb.c }}>{tr(K[tb.k + 'Name'])}</div>
                                            <div className="guide-desc" style={{ fontSize: 11, color: '#475569', marginTop: 3, lineHeight: 1.6 }}>{tr(K[tb.k + 'Desc'])}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ ...CARD, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', color: '#1e293b' }}>
                            <div style={{ fontWeight: 800, fontSize: 17, color: '#1e293b', marginBottom: 12 }}>💡 {tr(K.guideTipsTitle)}</div>
                            <ul className="guide-tip-list" style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#475569', lineHeight: 2.2 }}>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip1)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip2)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip3)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip4)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip5)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip6)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip7)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip8)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip9)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip10)}</li>
                            </ul>
                        </div>
                    </div>
                )}

            </div>{/* end scrollable content */}

            {/* ══ Detail Modal ═══════════════════════════════ */}
            {detail && (<Backdrop onClose={() => setDetailId(null)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div><div style={{ fontWeight: 900, fontSize: 18, color: '#1e293b' }}>{detail.name}</div><div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginTop: 4 }}>{detail.id}</div></div>
                    <button onClick={() => setDetailId(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ marginBottom: 16 }}><FlowPreview journey={detail} tr={tr} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
                    {[{ l: tr(K.triggerType), v: trigLabel(detail.trigger_type), c: TRIGGER_CFG[detail.trigger_type]?.color || '#4f8ef7' }, { l: tr(K.channels), v: (detail.channels || []).join(', ').toUpperCase(), c: '#a855f7' }, { l: tr(K.delayLabel), v: delayLabel(detail.delay), c: '#f59e0b' }, { l: tr(K.totalExecutions), v: detail.executions || 0, c: '#4f8ef7' }, { l: tr(K.totalEntered), v: (detail.entered || 0).toLocaleString(), c: '#06b6d4' }, { l: tr(K.totalCompleted), v: (detail.completed || 0).toLocaleString(), c: '#22c55e' }].map(({ l, v, c }) => (<div key={l} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.03)' }}><div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 18, fontWeight: 900, color: c, marginTop: 2 }}>{v}</div></div>))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => handleRun(detail)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#14d9b0)', color: '#fff', fontWeight: 800, fontSize: 13 }}>▶ {tr(K.run)}</button>
                    {(detail.status === 'active' || detail.status === 'paused') && <button onClick={() => { toggleStatus(detail); setDetailId(null); }} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: detail.status === 'active' ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#22c55e,#06b6d4)', color: '#fff', fontWeight: 700, fontSize: 12 }}>{detail.status === 'active' ? tr(K.pauseBtn) : tr(K.resumeBtn)}</button>}
                    <ActBtn icon="✏️" label={tr(K.edit)} color="#4f8ef7" onClick={() => { setDetailId(null); openEdit(detail); }} />
                    <ActBtn icon="📋" label={tr(K.duplicate)} color="#06b6d4" onClick={() => { handleDuplicate(detail); setDetailId(null); }} />
                    <ActBtn icon="🗑️" label={tr(K.delete)} color="#ef4444" onClick={() => { setDetailId(null); setDeleteId(detail.id); }} />
                    <button onClick={() => setDetailId(null)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 12 }}>{tr(K.close)}</button>
                </div>
            </Backdrop>)}

            {/* ══ Create/Edit Modal ═════════════════════════ */}
            {showCreate && (<Backdrop onClose={() => { setShowCreate(false); setEditId(null); }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#1e293b', marginBottom: 20 }}>{editId ? '✏️' : '+'} {editId ? tr(K.edit) : tr(K.createJourney)}</div>
                <div style={{ display: 'grid', gap: 16 }}>
                    <div><label style={LBL}>{tr(K.journeyName)}</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={tr(K.createPlaceholder)} style={INP} /></div>
                    <div><label style={LBL}>{tr(K.triggerType)}</label><select value={form.trigger_type} onChange={e => setForm(p => ({ ...p, trigger_type: e.target.value }))} style={SEL}>{TRIGGERS.map(t => (<option key={t.id} value={t.id}>{t.label}</option>))}</select></div>
                    <div><label style={LBL}>{tr(K.targetSegment)}</label><select value={form.segment} onChange={e => setForm(p => ({ ...p, segment: e.target.value }))} style={SEL}><option value="">{tr(K.selectNone)}</option>{(crmSegments || []).map(s => (<option key={s.id} value={s.id}>{s.name} ({s.count?.toLocaleString()})</option>))}</select></div>
                    <div>
                        <label style={LBL}>{tr(K.channels)}</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {CHANNELS.map(ch => { const sel = form.channels.includes(ch.id); return (<button key={ch.id} onClick={() => setForm(p => ({ ...p, channels: sel ? p.channels.filter(x => x !== ch.id) : [...p.channels, ch.id] }))} style={{ padding: '8px 16px', borderRadius: 10, border: sel ? `2px solid ${CH_COLORS[ch.id]}` : '1px solid #e2e8f0', cursor: 'pointer', background: sel ? `${CH_COLORS[ch.id]}12` : '#f8fafc', color: sel ? CH_COLORS[ch.id] : '#64748b', fontWeight: 700, fontSize: 12 }}>{ch.icon} {ch.label}</button>); })}
                        </div>
                    </div>
                    <div><label style={LBL}>{tr(K.delayLabel)}</label><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{DELAYS.map(d => (<button key={d.id} onClick={() => setForm(p => ({ ...p, delay: d.id }))} style={{ padding: '7px 14px', borderRadius: 8, border: form.delay === d.id ? '2px solid #4f8ef7' : '1px solid #e2e8f0', cursor: 'pointer', background: form.delay === d.id ? 'rgba(79,142,247,0.08)' : '#f8fafc', color: form.delay === d.id ? '#4f8ef7' : '#64748b', fontWeight: 700, fontSize: 12 }}>{d.label}</button>))}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                    <button onClick={handleSave} disabled={!form.name.trim()} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: form.name.trim() ? 'pointer' : 'default', background: form.name.trim() ? 'linear-gradient(135deg,#4f8ef7,#06b6d4)' : '#e2e8f0', color: form.name.trim() ? '#fff' : '#94a3b8', fontWeight: 800, fontSize: 13 }}>💾 {tr(K.save)}</button>
                    <button onClick={() => { setShowCreate(false); setEditId(null); }} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 12 }}>{tr(K.cancel)}</button>
                </div>
            </Backdrop>)}

            {/* ══ Delete Confirm ═════════════════════════════ */}
            {deleteId && (<Backdrop onClose={() => setDeleteId(null)}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>{tr(K.confirmDelete)}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 24 }}>{journeys.find(j => j.id === deleteId)?.name || deleteId}</div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button onClick={() => handleDelete(deleteId)} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 800, fontSize: 13 }}>🗑️ {tr(K.delete)}</button>
                        <button onClick={() => setDeleteId(null)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 12 }}>{tr(K.cancel)}</button>
                    </div>
                </div>
            </Backdrop>)}
        </div>
    );
}
