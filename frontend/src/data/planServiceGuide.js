/**
 * planServiceGuide.js — 186차 초고도화 (구버전 PLAN_RECOMMEND_REASON / PLAN_SUMMARY 정제·고도화)
 *
 * 각 구독 플랜이 "어떤 서비스를 제공하는지" 엔터프라이즈 SaaS급 상세 설명서.
 * admin(플랜 미리보기) · 회원가입 · 회원 요금 페이지(/pricing) 3곳에서 공통 사용.
 *
 * level: 제공 수준 라벨 (전체 제공 / 핵심 제공 / 기본 제공 / 미포함)
 *  - 'full'  : 전체 제공 (해당 영역 모든 기능)
 *  - 'core'  : 핵심 제공 (대표 기능, 일부 고급은 상위 플랜)
 *  - 'basic' : 기본 제공 (입문 기능)
 *  - 'none'  : 미포함 (상위 플랜에서 제공)
 */

export const PLAN_LEVEL_META = {
  full:  { label: '전체 제공', color: '#22c55e', bg: 'rgba(34,197,94,0.14)' },
  core:  { label: '핵심 제공', color: '#38bdf8', bg: 'rgba(56,189,248,0.14)' },
  basic: { label: '기본 제공', color: '#fbbf24', bg: 'rgba(251,191,36,0.14)' },
  none:  { label: '미포함',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
};

export const PLAN_SERVICE_GUIDE = {
  starter: {
    label: 'Starter', emoji: '🌱', color: '#38bdf8',
    tagline: '성장 단계 브랜드를 위한 국내 마케팅·커머스·CRM 올인원 핵심',
    summary: 'Starter는 성장 단계 브랜드를 위한 올인원 핵심 플랜입니다. 국내 주요 마케팅 채널(메타·구글·네이버·카카오·쿠팡)과 이메일/카카오/SMS 캠페인, 무제한 판매채널·무제한 창고(WMS), 채널 KPI, 커스텀 리포트로 매출 확대를 지원합니다. 글로벌 채널·AI 예측·여정 빌더 등 고급 자동화는 Pro 이상에서 제공합니다.',
    sections: [
      { icon: '🏠', title: '홈 대시보드', level: 'full',  desc: '종합 대시보드·KPI 위젯·빠른 링크와 채널별 실시간 매출/광고비/ROAS 모니터링을 제공합니다. (고급 알림 피드는 Pro 이상)' },
      { icon: '🚀', title: 'AI 마케팅 자동화', level: 'core', desc: '캠페인 설정·관리, AI 광고 소재 생성, 콘텐츠 캘린더, 예산 관리 등 핵심 마케팅 기능. 고객 여정 빌더·AI 예측(이탈/LTV)은 Pro.' },
      { icon: '📣', title: '광고·채널 분석', level: 'core', desc: '채널 KPI, ROAS 분석 등 핵심 광고 성과 지표. 어트리뷰션 기여도·마케팅 인텔리전스·경쟁사 분석은 Pro 이상.' },
      { icon: '👤', title: '고객·CRM', level: 'core', desc: '고객 리스트·RFM 세그먼트·이메일/카카오 기본 캠페인. VIP·AI 세그먼트·LINE/WhatsApp/Instagram DM은 Pro 이상.' },
      { icon: '🛒', title: '커머스·물류', level: 'core', desc: '무제한 판매채널·카탈로그 동기화·주문 허브·재고 관리·무제한 창고(WMS). 가격 최적화·Shopify/Amazon 연동은 Pro 이상.' },
      { icon: '📊', title: '성과·분석', level: 'core', desc: '퍼포먼스 허브·P&L 손익·인사이트·커스텀 리포트·엑셀 내보내기. AI 이상감지·자동 리포트·API 내보내기는 Pro 이상.' },
      { icon: '💳', title: '재무·정산', level: 'core', desc: '결제 내역·정산 내역·월별 정산 등 기본 재무. 세금계산서 발행·결제 승인·채널/상품별 손익은 Pro 이상.' },
      { icon: '🤖', title: '자동화·AI 규칙', level: 'basic', desc: '온보딩·알림·결재 센터 등 기본 자동화. AI 룰 엔진·데이터 라이트백·고급 알림 정책은 Pro 이상.' },
      { icon: '🔌', title: '데이터·연동', level: 'core', desc: '메타/구글/틱톡/네이버/카카오/쿠팡 등 주요 채널 연동·라이선스 관리. 데이터 스키마·API 키·픽셀은 Pro 이상.' },
      { icon: '👥', title: '팀·지원', level: 'basic', desc: '팀 멤버 리스트·초대·활동 내역·플랫폼 가이드·이메일 지원. 역할 기반 권한 분리는 Pro 이상.' },
    ],
  },
  pro: {
    label: 'Pro', emoji: '🚀', color: '#a855f7', recommended: true,
    tagline: '빠르게 성장하는 브랜드를 위한 AI 자동화·글로벌·고급 분석 풀세트',
    summary: 'Pro는 데이터 기반 자동화와 고급 마케팅 전략을 실행하는 브랜드를 위한 플랜입니다. Starter 전 기능 + AI 예측·룰 엔진·고급 분석·전 채널(글로벌 포함) 연동·고객 여정 빌더를 포함하여, AI가 최적의 마케팅 액션을 추천하고 자동 집행합니다.',
    sections: [
      { icon: '🏠', title: '홈 대시보드', level: 'full', desc: '모든 대시보드 기능·실시간 모니터링·고급 알림 피드까지 전체 제공. 경영진 레벨의 통합 현황 파악이 가능합니다.' },
      { icon: '🚀', title: 'AI 마케팅 자동화', level: 'full', desc: '고객 여정 빌더·AI 예측(이탈/LTV/구매확률)·그래프 스코어·AI 광고 인사이트 전체. AI가 최적 액션을 추천·자동 집행합니다.' },
      { icon: '📣', title: '광고·채널 분석', level: 'full', desc: '어트리뷰션 분석(멀티터치)·마케팅 인텔리전스·경쟁사 분석·디지털 셸프까지 모든 광고 분석. Amazon 리스크 관리 포함.' },
      { icon: '👤', title: '고객·CRM', level: 'full', desc: 'VIP·AI 세그먼트·클러스터 분석·LINE/WhatsApp/Instagram DM 캠페인 전체. 멀티채널 고객 여정을 완전 자동화합니다.' },
      { icon: '🛒', title: '커머스·물류', level: 'full', desc: '가격 최적화·Shopify/Amazon/디지털 셸프 연동 전체. 글로벌 채널 확장과 지능형 가격 전략을 실행합니다.' },
      { icon: '📊', title: '성과·분석', level: 'full', desc: 'AI 이상감지·자동 리포트·경쟁사 AI 분석·API 데이터 내보내기·대시보드 공유 전체. 전사적 데이터 기반 의사결정.' },
      { icon: '💳', title: '재무·정산', level: 'full', desc: '세금계산서 발행·결제 승인·월별 채널/상품 손익 분석 전체. 멀티채널 재무 관리와 전자 정산이 가능합니다.' },
      { icon: '🤖', title: '자동화·AI 규칙', level: 'full', desc: 'AI 룰 엔진·알림 정책·액션 프리셋·데이터 라이트백·로그 전체. 운영 자동화 핵심 인프라를 완전 활용합니다.' },
      { icon: '🔌', title: '데이터·연동', level: 'full', desc: '이벤트 수집·정규화·데이터 스키마·매핑·API 키·웹훅·1st-party 픽셀 전체. 완전한 데이터 파이프라인을 구성합니다.' },
      { icon: '👥', title: '팀·지원', level: 'full', desc: '팀 멤버·역할 설정·활동 내역 전체와 우선 지원. 역할 기반 접근 제어를 완전 지원합니다.' },
    ],
  },
  enterprise: {
    label: 'Enterprise', emoji: '🌐', color: '#f59e0b',
    tagline: '대형 브랜드·복수 법인 운영을 위한 무제한 + 전담 지원 최상위',
    summary: 'Enterprise는 대형 브랜드·복수 법인 운영 기업을 위한 최상위 플랜입니다. Pro 전 기능 + 데이터 라이트백 즉시 롤백·무제한 계정·전담 계정 매니저·99.9% SLA·맞춤 통합/웹훅·온프레미스 옵션을 제공하며, 맞춤 견적·커스텀 계약이 가능합니다.',
    sections: [
      { icon: '🏠', title: '홈 대시보드', level: 'full', desc: 'Pro 전체 + 다수 브랜드/계정을 통합 대시보드로 관리. 멀티 엔티티 통합 현황을 한눈에 봅니다.' },
      { icon: '🚀', title: 'AI 마케팅 자동화', level: 'full', desc: 'Pro 전체 + 여러 브랜드 계정의 AI 마케팅 전략을 통합 운용. 맞춤 AI 모델 학습 옵션 제공.' },
      { icon: '📣', title: '광고·채널 분석', level: 'full', desc: 'Pro 전체 + 다수 계정·다채널 광고 성과를 통합 분석하는 엔터프라이즈 시나리오 최적화.' },
      { icon: '👤', title: '고객·CRM', level: 'full', desc: 'Pro 전체 + 대규모 고객 DB와 복수 브랜드 CRM을 통합 운영.' },
      { icon: '🛒', title: '커머스·물류', level: 'full', desc: 'Pro 전체 + 글로벌 멀티채널 커머스·물류 통합 운영을 지원.' },
      { icon: '📊', title: '성과·분석', level: 'full', desc: 'Pro 전체 + 기업 전체 KPI 통합 리포팅과 이사회 수준 인사이트.' },
      { icon: '💳', title: '재무·정산', level: 'full', desc: 'Pro 전체 + 멀티 법인·멀티 채널 재무 통합 정산과 ERP 연동.' },
      { icon: '🤖', title: '자동화·AI 규칙', level: 'full', desc: 'Pro 전체 + 데이터 라이트백 즉시 롤백까지. 대규모 운영에서 실수를 즉시 복구하는 안전망을 제공합니다.' },
      { icon: '🔌', title: '데이터·연동', level: 'full', desc: 'Pro 전체 + 기업 규모 데이터 거버넌스와 완전한 API 생태계·맞춤 통합/웹훅.' },
      { icon: '👥', title: '팀·지원', level: 'full', desc: 'Pro 전체 + 무제한 계정·복수 법인 세분화 역할 관리·전담 계정 매니저·99.9% SLA.' },
    ],
  },
};

/** plan_id 정규화 — growth(구버전)·starter 동일 취급, 그 외는 그대로 */
export function normalizePlanId(planId) {
  const id = String(planId || '').toLowerCase();
  if (id === 'growth' || id === 'starter') return 'starter';
  if (id === 'pro') return 'pro';
  if (id === 'enterprise' || id === 'ent') return 'enterprise';
  return id;
}

export function getPlanGuide(planId) {
  return PLAN_SERVICE_GUIDE[normalizePlanId(planId)] || null;
}
