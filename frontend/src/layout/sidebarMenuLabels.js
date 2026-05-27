/**
 * sidebarMenuLabels — 172차 PHASE 2-D 분리.
 *
 * menuKey → 한글 라벨/설명 매핑 + 페이지별 서브탭 정의.
 * PlanPricing (메뉴 접근 권한) + AdminMenuManager (메뉴 가시성) 양쪽에서 SSOT 로 사용.
 */

/** menuKey → { title, desc } 한글 매핑 (대메뉴 + 중메뉴) */
export const MENU_KEY_LABEL = {
  // 홈
  'home||dashboard':              { title: '홈 - 대시보드',        desc: 'KPI 요약 + 채널별 실시간 매출/광고비/ROAS' },
  'home||rollup':                 { title: '홈 - 롤업 뷰',          desc: '판매·광고·재고 통합 실시간 모니터링' },
  // 통합 그룹 (다수 페이지 함께 제어)
  'marketing':                    { title: '마케팅 / 광고 / CRM 통합', desc: '자동마케팅·캠페인·여정·광고분석·CRM·카카오·이메일·SMS·인플루언서·UGC 등 17개 페이지 함께 제어' },
  'ops':                          { title: '커머스 / 물류 통합',     desc: '옴니채널·카탈로그·주문허브·WMS·가격최적화·공급망·반품 등 7개 페이지 함께 제어' },
  'billing':                      { title: '재무 / 결산 통합',       desc: '정산·대사·요금제·감사로그 등 4개 페이지 함께 제어' },
  // 인사이트
  'analytics||performance_hub':   { title: '인사이트 - 성과 허브',   desc: '광고 성과 8차원 분석 + 채널/캠페인 비교' },
  'analytics||report_builder':    { title: '인사이트 - 리포트 빌더', desc: '커스텀 리포트 + 자동 발송 스케줄' },
  'analytics||pnl_analytics':     { title: '인사이트 - 통합 손익(P&L)', desc: 'SKU·채널·캠페인·크리에이터별 실시간 손익 + 이상 감지' },
  'analytics||ai_insights':       { title: '인사이트 - AI 인사이트', desc: 'GPT 기반 자동 인사이트 + 액션 추천' },
  'analytics||data_product':      { title: '인사이트 - 데이터 프로덕트', desc: '데이터 마트 + 쿼리 워크스페이스' },
  // 자동화
  'automation||ai_rule_engine':   { title: '자동화 - AI 룰 엔진',    desc: '임계값 기반 자동 액션 + GPT 제안' },
  'automation||approvals':        { title: '자동화 - 승인 큐',       desc: 'AI 제안 검토 + 원클릭 승인/반려' },
  'automation||writeback':        { title: '자동화 - 채널 라이트백', desc: '룰 결과를 광고 플랫폼에 자동 반영' },
  'automation||onboarding':       { title: '자동화 - 온보딩',        desc: '신규 고객 가이드 + 초기 설정 자동화' },
  // 데이터
  'data||integration_hub':        { title: '데이터 - 연동 허브',     desc: 'OAuth 커넥터 + 30+ 채널 API 관리' },
  'data||data_schema':            { title: '데이터 - 데이터 스키마', desc: '표준 이벤트 매핑 + 스키마 거버넌스' },
  'data||data_trust':             { title: '데이터 - 데이터 신뢰',   desc: '품질 검증 + 변화 감지 + 리니지' },
  // 운영 & 지원
  'system||workspace':            { title: '시스템 - 워크스페이스',  desc: '팀 멤버 / 권한 / 알림 설정' },
  'system||operations':           { title: '시스템 - 오퍼레이션',    desc: '백그라운드 작업 / 실패 큐 모니터링' },
  'system||case_study':           { title: '시스템 - 케이스 스터디', desc: '벤치마크 + 베스트 프랙티스 라이브러리' },
  'system||help_center':          { title: '시스템 - 도움말 센터',   desc: 'FAQ + 가이드 + 영상 튜토리얼' },
  'system||feedback':             { title: '시스템 - 피드백',        desc: '버그 신고 + 기능 제안' },
  'system||developer_hub':        { title: '시스템 - 개발자 허브',   desc: 'API 키 + 웹훅 + Webhook 로그' },
  // 관리자 전용
  'system||admin':                { title: '관리자 - 플랫폼 환경',   desc: '운영 환경 / 시스템 설정 (admin 전용)' },
  'system||plan_pricing':         { title: '관리자 - 플랜·요금',     desc: '구독 플랜 / 기간별 가격 / 메뉴 권한 관리' },
  'system||menu_tree':            { title: '관리자 - 메뉴 트리',     desc: 'sidebar 메뉴 정의 / 가시성 / 권한 매핑' },
  'system||db_admin':             { title: '관리자 - DB 스키마',     desc: '테이블 / 마이그레이션 / 통계' },
  'system||pg_config':            { title: '관리자 - 결제 PG',       desc: 'Paddle 환경설정 / 구독 통계' },
};

/** 페이지별 서브탭 정의 (route → [{ id, label }]) */
export const SUB_TABS_BY_PATH = {
  '/admin/plan-pricing': [
    { id: 'plan',        label: '플랜 & 요금' },
    { id: 'permissions', label: '메뉴 접근 권한' },
    { id: 'coupons',     label: '쿠폰 관리' },
  ],
  '/db-admin': [
    { id: 'overview', label: '데이터베이스 현황' },
    { id: 'tables',   label: '테이블 관리' },
    { id: 'query',    label: '쿼리 실행기' },
    { id: 'backup',   label: '백업/복구' },
  ],
  '/performance': [
    { id: 'overview',  label: '개요' },
    { id: 'channels',  label: '채널별' },
    { id: 'campaigns', label: '캠페인별' },
    { id: 'funnel',    label: '퍼널' },
  ],
  '/pnl': [
    { id: 'overall',     label: '전체 손익' },
    { id: 'by_sku',      label: 'SKU별' },
    { id: 'by_channel',  label: '채널별' },
    { id: 'by_campaign', label: '캠페인별' },
  ],
  '/integration-hub': [
    { id: 'connectors', label: '커넥터' },
    { id: 'mapping',    label: '매핑' },
    { id: 'logs',       label: '실행 로그' },
  ],
  '/ai-rule-engine': [
    { id: 'rules',   label: '룰 목록' },
    { id: 'builder', label: '룰 빌더' },
    { id: 'history', label: '실행 이력' },
  ],
  '/developer-hub': [
    { id: 'api_keys', label: 'API 키' },
    { id: 'webhooks', label: '웹훅' },
    { id: 'logs',     label: '웹훅 로그' },
  ],
  '/audit': [
    { id: 'recent', label: '최근 활동' },
    { id: 'admin',  label: '관리자 행동' },
    { id: 'system', label: '시스템 이벤트' },
  ],
  '/crm': [
    { id: 'segments', label: '세그먼트' },
    { id: 'cohort',   label: '코호트' },
    { id: 'journeys', label: '여정' },
    { id: 'churn',    label: '이탈 예측' },
  ],
  '/auto-marketing': [
    { id: 'overview', label: '개요' },
    { id: 'rules',    label: '자동화 룰' },
    { id: 'history',  label: '실행 이력' },
  ],
  '/campaign-manager': [
    { id: 'active',    label: '진행중' },
    { id: 'paused',    label: '일시중지' },
    { id: 'completed', label: '완료' },
  ],
  '/wms-manager': [
    { id: 'inventory',  label: '재고 현황' },
    { id: 'warehouses', label: '창고 관리' },
    { id: 'transfers',  label: '이동/조정' },
  ],
  '/order-hub': [
    { id: 'pending',   label: '신규/대기' },
    { id: 'shipping',  label: '배송중' },
    { id: 'completed', label: '완료' },
    { id: 'returns',   label: '반품' },
  ],
  '/admin': [
    { id: 'environment', label: '환경 설정' },
    { id: 'accounts',    label: '계정 관리' },
    { id: 'audit',       label: '감사 로그' },
    { id: 'maintenance', label: '유지보수' },
  ],
};
