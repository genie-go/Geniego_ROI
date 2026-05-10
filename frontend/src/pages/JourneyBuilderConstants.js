/* ── Enterprise Demo Isolation Guard ─────────────────────── */
export const _isDemo = (() => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'demo.genie-go.com' || h === 'demo.geniego.com' || h.startsWith('demo');
})();

/* ── Enterprise Dynamic Locale Map ────────────────────── */
export const LANG_LOCALE_MAP = {
    ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', 'zh-TW': 'zh-TW',
    de: 'de-DE', es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', ru: 'ru-RU',
    ar: 'ar-SA', hi: 'hi-IN', th: 'th-TH', vi: 'vi-VN', id: 'id-ID'
};

/* ── i18n key registry + fallback ─────────────────────── */
export const K = {
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
export const FB = {
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
export const STS = {
    draft: { color: '#64748b', bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.25)', icon: '📝' },
    active: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)', icon: '🟢' },
    paused: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', icon: '⏸' },
    completed: { color: '#06b6d4', bg: 'rgba(6,182,212,0.10)', border: 'rgba(6,182,212,0.25)', icon: '✅' },
};
export const TRIGGER_CFG = {
    signup: { icon: '👤', color: '#4f8ef7' },
    purchase: { icon: '🛍️', color: '#22c55e' },
    abandon: { icon: '🛒', color: '#f59e0b' },
    churn: { icon: '⚠️', color: '#ef4444' },
    segment: { icon: '👥', color: '#a855f7' },
    manual: { icon: '✋', color: '#64748b' },
};
export const CH_COLORS = { email: '#4f8ef7', kakao: '#fbbf24', sms: '#22c55e', push: '#f97316', line: '#06d6a0' };
export const fmt = v => { if (v >= 1e8) return (v / 1e8).toFixed(1) + '억'; if (v >= 1e4) return (v / 1e4).toFixed(0) + '만'; return v?.toLocaleString?.() || '0'; };
export const fmtW = v => new Intl.NumberFormat(navigator.language || 'ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(v || 0);

/* ── Shared styles ───────────────────────────────────── */
export const CARD = {
    background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 16, padding: '20px 24px', backdropFilter: 'blur(12px)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};
export const INP = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 13, color: '#1e293b', outline: 'none' };
export const SEL = { ...INP, cursor: 'pointer' };
export const LBL = { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block' };
export const CONTENT_MIN = 'calc(100vh - 145px)';
