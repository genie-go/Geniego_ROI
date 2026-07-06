#!/usr/bin/env node
/**
 * GeniegoROI E2E 스모크 (핵심 플로우 회귀 자동화) — [266차 신설]
 *
 * 목적: 매 변경마다 수동으로 하던 런타임 검증을 자동화해 "배포 후 무음실패/계약불일치" 회귀를 CI/로컬에서 즉시 잡는다.
 *   - 정적 분석이 못 잡는 것(런타임 500·응답 계약키 누락)을 실제 세션으로 실측.
 *   - 비파괴적: 읽기(GET)만 발사 + 응답 키 검증. 운영 DB 무오염·반복 실행 안전.
 *
 * 사용:
 *   E2E_EMAIL=... E2E_PASSWORD=... [E2E_ACCESS_CODE=GENIEGO-ADMIN] [E2E_BASE=https://roi.genie-go.com] \
 *     node tools/e2e/smoke.mjs
 *   또는  npm run e2e  (자격증명 env 필요)
 *
 * ★자격증명은 절대 소스에 하드코딩하지 않는다 — env 로만 주입(로컬 .env·CI Secrets).
 * 종료코드: 0=전부 통과, 1=실패(500 발생 또는 계약키 누락). CI 게이트로 사용.
 */

const BASE = (process.env.E2E_BASE || 'https://roi.genie-go.com').replace(/\/$/, '');
const EMAIL = process.env.E2E_EMAIL || '';
const PASSWORD = process.env.E2E_PASSWORD || '';
const ACCESS_CODE = process.env.E2E_ACCESS_CODE || 'GENIEGO-ADMIN';

const C = { red: '\x1b[31m', grn: '\x1b[32m', yel: '\x1b[33m', dim: '\x1b[2m', rst: '\x1b[0m' };
const ok = (m) => console.log(`${C.grn}✓${C.rst} ${m}`);
const bad = (m) => console.log(`${C.red}✗ ${m}${C.rst}`);
const info = (m) => console.log(`${C.dim}· ${m}${C.rst}`);

let FAIL = 0;

// ── 읽기 엔드포인트(파라미터 없음·비파괴). GET 500=무음실패 회귀 ────────────────
const GET_ENDPOINTS = [
  '/api/ai/settings', '/api/auth/pricing/public-plans', '/api/auth/site/intro',
  '/api/channel-sync/status', '/api/channel-sync/webhook-tokens', '/api/creatives',
  '/api/models', '/api/models/drift-report', '/api/performance/meta-ads',
  '/api/v1/ad-performance/summary', '/api/v422/ai/studio/cockpit', '/api/v422/ai/studio/insights',
  '/api/v423/approvals', '/api/v423/connectors/apply/list', '/api/v423/connectors/freshness',
  '/api/v423/connectors/roas-reconciliation', '/api/v423/influencer/cost-summary',
  '/api/v423/influencer/settlement-records', '/api/v423/member-logs',
  '/api/v424/admin/coupons/list', '/api/v424/admin/coupons/overview', '/api/v424/admin/db/stats',
  '/api/v424/admin/growth/dashboard', '/api/v424/admin/growth/leads', '/api/v424/admin/growth/segments',
  '/api/v424/admin/growth/campaigns', '/api/v424/admin/growth/funnel', '/api/v424/admin/growth/settings',
  '/api/v424/admin/legal', '/api/v424/admin/menu-pricing-sync', '/api/v424/admin/paddle/stats',
  '/api/v424/admin/plan/product-addon-packs', '/api/v424/admin/plans', '/api/v424/admin/plans-menu-access',
  '/api/v424/admin/plans-period-pricing', '/api/v424/admin/security-audit', '/api/v424/admin/site/intro',
  '/api/v424/attribution/blended', '/api/v424/attribution/channels', '/api/v424/attribution/confidence',
  '/api/v424/attribution/experiments', '/api/v424/attribution/geo-map', '/api/v424/attribution/identity-coverage',
  '/api/v424/attribution/incrementality', '/api/v424/attribution/journeys', '/api/v424/attribution/models',
  '/api/v424/attribution/probabilistic', '/api/v424/attribution/shapley', '/api/v424/attribution/time-series',
  '/api/v424/attribution/touches', '/api/v424/compliance/audit-export', '/api/v424/compliance/posture',
  '/api/v424/compliance/siem', '/api/v424/connectors/campaign-funnel', '/api/v424/connectors/keywords',
  '/api/v424/cro/experiments', '/api/v424/geo/lang', '/api/v424/health', '/api/v424/marketing/benchmarks',
  '/api/v424/marketing/channel-effectiveness', '/api/v424/marketing/daily-trends', '/api/v424/mmm/series',
  '/api/v424/orderhub/claims', '/api/v424/orderhub/claims/stats', '/api/v424/orderhub/orders',
  '/api/v424/orderhub/orders/stats', '/api/v424/orderhub/settlements', '/api/v424/orderhub/settlements/stats',
  '/api/v424/plan/product-usage', '/api/v424/rules', '/api/v424/rules/logs', '/api/v424/system/metrics',
  '/api/v424/web-popups', '/api/v424/web-popup-settings', '/api/v424/workspace?key=calendar_events',
  '/api/v425/admin/menu-tree', '/api/v425/menu-tree', '/api/v425/pm/audit', '/api/v425/pm/milestones',
  '/api/v425/pm/portfolios', '/api/v425/pm/projects', '/api/v425/pm/raid', '/api/v425/pm/resources',
  '/api/v425/pm/time', '/api/v426/admin/channels', '/api/v426/analytics/web', '/api/v426/channels',
  '/api/v426/cs/metrics', '/api/v426/esp/metrics', '/api/v426/push/vapid-key', '/api/v426/sns-live/stats',
  '/api/v427/billing/budget-status', '/api/v427/billing/ledger', '/api/v427/billing/methods',
  '/api/v427/logistics/carriers', '/api/v427/logistics/shipments', '/api/v427/pg/providers',
  '/api/v427/pg/reconciliation', '/api/v427/pg/settlements', '/api/v428/reviews', '/api/v428/reviews/badge',
  '/api/v428/reviews/channel-stats', '/api/v428/reviews/neg-keywords', '/api/v428/reviews/requests',
  '/api/v428/reviews/settings', '/api/v429/promotions', '/api/v429/shelf/keywords',
  '/api/instagram/settings', '/api/line/settings', '/api/line/templates', '/api/kakao/settings',
  '/api/whatsapp/settings', '/api/crm/segments', '/api/wms/stock', '/api/demand/summary',
  '/api/reports/saved', '/api/email/campaigns', '/api/email/templates',
];

// ── 계약키 회귀 가드: 이 세션(266차) 수정한 계약불일치가 되돌아오면 잡는다 ──────────
//   { path, arrayKey?(응답 하위 배열), keys[](행/객체에 반드시 있어야 할 키) }
//   데이터 0행이면 skip(구조검증만) — 키 존재는 데이터 있을 때만 강제.
const CONTRACT = [
  { path: '/api/v423/rollup/platform?period=daily&n=14', arrayKey: 'rows', keys: ['share', 'avg_roas', 'total_revenue'] },
  { path: '/api/v423/rollup/summary?period=daily&n=14', arrayKey: 'top_skus', keys: ['roas', 'revenue'] },
  { path: '/api/v423/rollup/summary?period=daily&n=14', nestKey: 'kpi', keys: ['total_revenue', 'avg_roas', 'total_orders'] },
  { path: '/api/performance/meta-ads', arrayKey: 'campaigns', keys: ['team', 'roas'] },
  { path: '/api/line/settings', obj: true, keys: ['monthly_sent'] },
  { path: '/api/line/templates', arrayKey: 'templates', keys: ['content'] },
  { path: '/api/v419/graph/score/creative/__smoke__', obj: true, keys: ['influencers_linked', 'graph_score'] },
  { path: '/api/instagram/settings', nestKey: 'stats', keys: ['keywords'] },
  { path: '/api/v427/pg/settlements', obj: true, keys: ['summary'] },
  { path: '/api/v424/web-popups', arrayKey: 'popups', altArrayKeys: ['rows'], keys: ['type', 'trigger'] },
];

async function main() {
  if (!EMAIL || !PASSWORD) {
    bad('E2E_EMAIL / E2E_PASSWORD 환경변수가 필요합니다(자격증명 하드코딩 금지).');
    process.exit(2);
  }
  info(`BASE=${BASE}`);

  // 1) 로그인
  const lr = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, access_code: ACCESS_CODE }),
  });
  const lj = await lr.json().catch(() => ({}));
  const token = lj.token || lj.access_token || (lj.data && lj.data.token) || '';
  if (lr.status !== 200 || !token) { bad(`로그인 실패 HTTP ${lr.status}`); process.exit(1); }
  ok(`로그인 (tenant=${lj.tenant_id || lj.tenant || '?'}, plan=${(lj.user && lj.user.plan) || lj.plan || '?'})`);
  const H = { 'Authorization': `Bearer ${token}`, 'X-Lang': 'ko' };

  // 2) GET 500 스윕 — ★동시성 제한(nginx api_limit 30r/s 자가 503 회피) + 503 백오프 재시도.
  //   503=인프라(레이트리밋/과부하)라 앱 결함 아님 → 재시도 후에도 503이면 infra 경고(비실패). 500/ERR 만 실패.
  info(`GET 엔드포인트 ${GET_ENDPOINTS.length}개 발사(동시성5·500=무음실패 회귀)…`);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const fireGet = async (p) => {
    for (let a = 0; a < 4; a++) {
      try {
        const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 20000);
        const r = await fetch(`${BASE}${p}`, { headers: H, signal: ctl.signal }); clearTimeout(to);
        if (r.status === 503) { await sleep(500 * (a + 1)); continue; } // 레이트리밋 백오프
        return { p, s: r.status, body: r.status >= 500 ? (await r.text().catch(() => '')).slice(0, 160) : '' };
      } catch (e) { if (a < 3) { await sleep(400); continue; } return { p, s: 'ERR', body: String(e).slice(0, 120) }; }
    }
    return { p, s: 503, body: 'rate-limited(infra·재시도후에도 503)' };
  };
  const pool = async (items, worker, cc = 5) => { const out = []; let i = 0; await Promise.all(Array.from({ length: cc }, async () => { while (i < items.length) { const k = i++; out[k] = await worker(items[k]); } })); return out; };
  const res = await pool(GET_ENDPOINTS, fireGet, 5);
  const dist = {}; res.forEach(r => { dist[r.s] = (dist[r.s] || 0) + 1; });
  const realFail = res.filter(r => r.s === 'ERR' || (typeof r.s === 'number' && r.s >= 500 && r.s !== 503));
  const infra503 = res.filter(r => r.s === 503);
  info(`  상태 분포: ${JSON.stringify(dist)}`);
  if (infra503.length) info(`  ${C.yel}503(인프라·레이트리밋) ${infra503.length}건 — 앱 결함 아님(재시도 후 잔존)${C.rst}`);
  if (realFail.length) { FAIL++; bad(`GET 실제 500/ERR ${realFail.length}건(앱 결함!):`); realFail.forEach(f => bad(`   ${f.s} ${f.p} — ${f.body}`)); }
  else ok(`GET 500 스윕: 실제 앱 500 = 0건(무음실패 없음)`);

  // 3) 계약키 회귀 가드
  info(`계약키 회귀 가드 ${CONTRACT.length}건…`);
  for (const c of CONTRACT) {
    try {
      const r = await fetch(`${BASE}${c.path}`, { headers: H });
      if (r.status >= 500) { FAIL++; bad(`계약 ${c.path} → HTTP ${r.status}`); continue; }
      if (r.status !== 200) { info(`  ${c.path} → HTTP ${r.status}(비200·계약검증 skip)`); continue; }
      const j = await r.json().catch(() => null);
      if (!j) { info(`  ${c.path} → JSON 아님(skip)`); continue; }
      let sample = null;
      if (c.arrayKey) {
        let arr = j[c.arrayKey];
        if (!Array.isArray(arr) && c.altArrayKeys) for (const k of c.altArrayKeys) if (Array.isArray(j[k])) { arr = j[k]; break; }
        if (!Array.isArray(arr) || arr.length === 0) { info(`  ${c.path} → 데이터 0행(구조 OK·키검증 skip)`); continue; }
        sample = arr[0];
      } else if (c.nestKey) {
        sample = j[c.nestKey]; if (!sample) { info(`  ${c.path} → ${c.nestKey} 부재(skip)`); continue; }
      } else { sample = j; }
      const missing = c.keys.filter(k => !(k in sample));
      if (missing.length) { FAIL++; bad(`계약 ${c.path} → 키 누락 [${missing.join(', ')}] (회귀!)`); }
      else ok(`계약 ${c.path} → 키 [${c.keys.join(', ')}] 정합`);
    } catch (e) { FAIL++; bad(`계약 ${c.path} → 예외 ${String(e).slice(0, 100)}`); }
  }

  console.log('');
  if (FAIL) { bad(`E2E 스모크 실패: ${FAIL}개 그룹 문제`); process.exit(1); }
  ok('E2E 스모크 전부 통과 — 런타임 무음실패 0·계약키 정합'); process.exit(0);
}

main().catch(e => { bad(`치명 오류: ${e.stack || e}`); process.exit(1); });
