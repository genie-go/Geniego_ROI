// orderStatusCanon.js — [225차 P2-3] 취소/반품 상태 캐논 SSOT
// ─────────────────────────────────────────────────────────────────────────
// 백엔드 OrderHub::CANCEL_TOKENS / RETURN_TOKENS 와 정합하는 프론트 단일 소스.
// 기존엔 GlobalDataContext(_isCancelled/_isReturn)와 dashPeriod(자체 토큰셋)가
// 독립 복사본이라 드리프트했다 — 특히 dashPeriod 가 'refunded'/'refund' 를 취소로 분류해
// 기간필터 매출이 refunded 주문을 제외, 전체 매출(반품=매출포함)과 발산했다.
// 이 모듈 한 곳만 수정하면 전 파생지점이 동일 캐논을 따른다.
//
// 분류 원칙(백엔드 정합):
//   - 취소(CANCEL): 매출에서 제외.
//   - 반품(RETURN): 매출 포함(반품 건수·returnFee 로만 반영). 'refunded'/'환불완료' 는 반품.

export const CANCEL_TOKENS = ['CancelDone', 'Cancel요청', 'cancelled', 'canceled', '취소완료', '취소요청', '취소접수', '취소', '주문취소'];
// 백엔드 RETURN_TOKENS ∪ {'return_requested'}(기존 GDC 커버리지 보존).
export const RETURN_TOKENS = ['returned', 'refunded', 'return', 'return_requested', '반품완료', '반품요청', '반품접수', '반품', '환불완료', '반품Done', '반품입고'];

const _cancelLc = new Set(CANCEL_TOKENS.map(t => t.toLowerCase()));
const _returnLc = new Set(RETURN_TOKENS.map(t => t.toLowerCase()));

/** 취소 판정(대소문자 무시 정확 매칭 — 과거 dashPeriod 의 substring 과매칭 제거). */
export function isCancelledStatus(status) {
  return _cancelLc.has(String(status ?? '').toLowerCase());
}

/** 반품 판정(반품률·returnFee 집계용). 반품은 매출 포함. */
export function isReturnStatus(status) {
  return _returnLc.has(String(status ?? '').toLowerCase());
}
