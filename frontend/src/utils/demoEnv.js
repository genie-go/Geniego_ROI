/**
 * 데모 환경 단일 판별 (은행·공공기관급 격리 — 운영 데이터 오염 방지)
 * ──────────────────────────────────────────────────────────────────────────
 * ★ 절대 원칙: 운영(roi.genie-go.com / roi.geniego.com)에서는 어떤 경우에도 false.
 *   데모 가상데이터가 운영에 단 한 건도 유입되면 안 됨(데이터 오염 = 신뢰 붕괴).
 *
 * 3중 격리 보장:
 *   1) build-time: 데모 빌드(`vite build --mode demo`)에서만 .env.demo 의
 *      VITE_DEMO_MODE=true 가 번들에 박힘. 운영 빌드(`vite build`)는 미정의 → false.
 *   2) run-time: 데모 호스트(roidemo.*)만 엄격 allowlist 매칭.
 *      ⚠ broad `includes('demo')` 금지 — 운영 인접 호스트 오판 위험 제거.
 *   3) data-layer backstop: GlobalDataContext.loadDemoState/saveDemoState 가
 *      !IS_DEMO 일 때 빈 값 반환/no-op → 페이지 판별이 만에 하나 틀려도
 *      공유 상태에는 시드가 들어가지 않음.
 *
 * 시드를 직접 import 하는 페이지(GraphScore/WebPopup/KakaoChannel 등)는
 *   반드시 이 IS_DEMO 만 사용할 것 — 자체 host 체크 정의 금지.
 */
export const IS_DEMO = (() => {
  try {
    // 1) build-time 플래그 (데모 빌드에서만 true)
    const envFlag = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEMO_MODE === 'true');
    if (envFlag) return true;
    // 2) run-time 데모 호스트 엄격 allowlist
    const host = (typeof window !== 'undefined' && window.location && window.location.hostname)
      ? window.location.hostname.toLowerCase() : '';
    if (!host) return false;
    return (
      /^roidemo\./.test(host) ||       // roidemo.genie-go.com / roidemo.geniego.com
      host === 'demo.genie-go.com' ||
      host === 'demo.geniego.com'
    );
  } catch {
    return false; // 판별 실패 시 안전측(운영)으로 폴백
  }
})();

export default IS_DEMO;
