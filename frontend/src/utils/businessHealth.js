/**
 * [289차 후속 / MEA 065 GAP-1] Business Health — 기업 건강 상태 합성 뷰
 * ─────────────────────────────────────────────────────────────────────────────
 * 065 판정: `healthScore`·`health_score`·`businessHealth` grep 0 = 개념 부재.
 * 단 **구성요소는 전부 실재**(손익·ROAS·원가·반품·알림)하므로 ADR D-5 는
 * **"신규 엔진이 아니라 기존 지표의 합성 뷰"** 로 못 박았다.
 *
 * ★★설계에서 가장 중요한 제약 — **임의 가중치 금지**
 *   흔한 health score 는 "ROAS 30% + 마진 30% + …" 식 가중합인데, 그 가중치에는
 *   **근거가 없다**. 근거 없는 숫자를 만들면 [[feedback_real_value_autoderive]] 위반이고,
 *   사용자는 그걸 측정된 사실로 오독한다.
 *   → **0~100 점수를 만들지 않는다.** 대신 **수학적으로 자명한 임계값**으로만 각 지표를
 *     신호등 판정하고, "판정 가능 N개 중 정상 M개 · 최악 등급"으로 요약한다.
 *
 * ★자명한 임계값만 사용(임의 컷오프 도입 금지)
 *   · 영업이익 < 0      → 적자(정의상 자명)
 *   · 매출총이익 < 0    → 원가가 매출 초과(자명)
 *   · ROAS < 1          → 광고비가 광고매출 초과(자명). ★"2 미만은 주의" 같은 컷오프는 임의라 쓰지 않는다
 *   · 원가 미입력 수량 > 0 → 손익 산출 신뢰도 저하(자명한 데이터 품질 신호)
 *   · 미처리 반품 > 0   → 처리 대기 존재(사실 진술이지 임의 임계 아님)
 *
 * ★미산출 정직 표기(057 null · 058 optimized:false · 059 null/422 · 063 noData 승계)
 *   데이터가 없으면 **양호(100)도 위험(0)도 아니다**. 해당 체크는 'unmeasurable' 이고,
 *   전부 미산출이면 `measurable:false` + `reason` 을 반환한다. **0 은 "정상"으로 오독된다.**
 */

export const LEVEL = { OK: 'ok', WARN: 'warn', CRITICAL: 'critical', NA: 'unmeasurable' };

const RANK = { [LEVEL.OK]: 0, [LEVEL.WARN]: 1, [LEVEL.CRITICAL]: 2 };
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);

/**
 * @param {object} src
 *   pnl    — /api/v424/pnl 응답(GlobalDataContext.pnlStats). revenue/adSpend/grossProfit/operatingProfit/cogsUncostedUnits
 *   claims — 반품 클레임 통계(claimStatsServer). pending
 *   alerts — 운영 알림 배열(심각 알림 존재 판정용)
 * @returns {{measurable:boolean, reason:?string, checks:Array, okCount:number, measuredCount:number, worst:?string}}
 */
export function computeBusinessHealth(src = {}) {
  const { pnl = null, claims = null, alerts = null } = src;
  const checks = [];
  const add = (id, level, detail, basis) => checks.push({ id, level, detail, basis });

  // ── 손익 축 ─────────────────────────────────────────────────────────────
  const op = num(pnl?.operatingProfit);
  if (op === null) add('operatingProfit', LEVEL.NA, null, 'pnl_absent');
  else add('operatingProfit', op < 0 ? LEVEL.CRITICAL : LEVEL.OK, op, 'op<0=적자(정의상 자명)');

  const gp = num(pnl?.grossProfit);
  if (gp === null) add('grossProfit', LEVEL.NA, null, 'pnl_absent');
  else add('grossProfit', gp < 0 ? LEVEL.CRITICAL : LEVEL.OK, gp, 'gp<0=원가가 매출 초과(자명)');

  // ROAS — 광고비가 0이면 "광고를 안 한 것"이지 나쁜 게 아니다 → 판정 대상 제외(NA 아님, 생략)
  const rev = num(pnl?.revenue), ad = num(pnl?.adSpend);
  if (rev === null || ad === null) add('roas', LEVEL.NA, null, 'pnl_absent');
  else if (ad > 0) {
    const roas = rev / ad;
    add('roas', roas < 1 ? LEVEL.CRITICAL : LEVEL.OK, Math.round(roas * 100) / 100, 'roas<1=광고비가 매출 초과(자명)');
  } else add('roas', LEVEL.NA, null, 'ad_spend_zero');   // 광고 미집행 — 판정 근거 없음

  // 데이터 품질 — 원가 미입력분이 있으면 위 손익 판정 자체의 신뢰도가 떨어진다(정직 병기)
  const unc = num(pnl?.cogsUncostedUnits);
  if (unc === null) add('cogsUncosted', LEVEL.NA, null, 'pnl_absent');
  else add('cogsUncosted', unc > 0 ? LEVEL.WARN : LEVEL.OK, unc, 'uncosted>0=손익 신뢰도 저하');

  // ── 운영 축 ─────────────────────────────────────────────────────────────
  const pending = num(claims?.pending);
  if (pending === null) add('returnsPending', LEVEL.NA, null, 'claims_absent');
  else add('returnsPending', pending > 0 ? LEVEL.WARN : LEVEL.OK, pending, 'pending>0=미처리 반품 존재');

  const sev = Array.isArray(alerts)
    ? alerts.filter(a => /critical|high|위험|심각/i.test(String(a?.level ?? a?.severity ?? ''))).length
    : null;
  if (sev === null) add('alerts', LEVEL.NA, null, 'alerts_absent');
  else add('alerts', sev > 0 ? LEVEL.WARN : LEVEL.OK, sev, 'severe>0=심각 알림 발생');

  // ── 요약 ────────────────────────────────────────────────────────────────
  const measured = checks.filter(c => c.level !== LEVEL.NA);
  if (!measured.length) {
    // ★전부 미산출 — 점수를 만들지 않는다(0 은 "정상"으로 오독된다)
    return { measurable: false, reason: 'no_measurable_metric', checks, okCount: 0, measuredCount: 0, worst: null };
  }
  const worst = measured.reduce((w, c) => (RANK[c.level] > RANK[w] ? c.level : w), LEVEL.OK);
  return {
    measurable: true,
    reason: null,
    checks,
    okCount: measured.filter(c => c.level === LEVEL.OK).length,
    measuredCount: measured.length,
    worst,
  };
}
