/**
 * planLimit.js — 212차 #3 플랜 한도 초과 처리(업그레이드 유도)
 *
 * 백엔드는 한도 초과 시 402 + { error: 'plan_limit_reached'|'channel_limit_reached', message, limit, current } 반환.
 * apiClient.postJson 은 비2xx 에서 `HTTP 402 {json}` 형태로 throw 하므로, 그 메시지에서 페이로드를 파싱한다.
 */

/** throw 된 에러(또는 응답 객체)에서 플랜 한도 페이로드를 추출. 아니면 null. */
export function parsePlanLimit(errOrData) {
  if (errOrData && typeof errOrData === 'object' && (errOrData.error === 'plan_limit_reached' || errOrData.error === 'channel_limit_reached')) {
    return errOrData; // 이미 파싱된 응답 본문
  }
  const s = String(errOrData?.message || errOrData || '');
  const m = s.match(/HTTP 402\s+(\{[\s\S]*\})/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    if (data && (data.error === 'plan_limit_reached' || data.error === 'channel_limit_reached')) return data;
  } catch (e) { /* 파싱 불가 */ }
  return null;
}

/**
 * 한도 초과면 사용자에게 업그레이드 안내 후 동의 시 /app-pricing 으로 이동. 처리했으면 true.
 * 호출측 catch 에서: `if (handlePlanLimit(e)) return; ...기존 에러처리`
 */
export function handlePlanLimit(errOrData) {
  const data = parsePlanLimit(errOrData);
  if (!data) return false;
  const msg = data.message || '현재 플랜 한도에 도달했습니다. 더 추가하려면 플랜을 업그레이드하세요.';
  if (typeof window !== 'undefined' && window.confirm(`${msg}\n\n플랜 업그레이드 페이지로 이동하시겠습니까?`)) {
    window.location.href = '/app-pricing';
  }
  return true;
}
