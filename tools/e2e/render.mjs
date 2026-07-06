#!/usr/bin/env node
/**
 * GeniegoROI E2E 렌더 크래시 스윕 — [266차 신설]
 *
 * 목적: 모든 페이지(메뉴)를 실제 브라우저에서 admin 세션으로 렌더해 마운트 시점 React 크래시
 *   (undefined 식별자·Rules-of-Hooks·정의 안 된 컴포넌트 등)를 잡는다. 정적/API 검사가 못 잡는 클래스.
 *   (예: fmt 미정의·blockRO 스코프·ResultSection ChannelResultCard 소실 크래시)
 *
 * 의존: Playwright(opt-in). 미설치 시 안내 후 skip(코어 smoke 는 무의존).
 *   설치:  npm i -D playwright && npx playwright install chromium
 *
 * 사용:  E2E_EMAIL=... E2E_PASSWORD=... node tools/e2e/render.mjs
 *   또는  npm run e2e:render
 *
 * 한계(정직 고지): 마운트 렌더만 커버. 클릭/폼 제출·데이터 채워진 상태의 상호작용 유발 크래시는 미커버.
 * 종료코드: 0=크래시 0, 1=크래시 발견, 3=Playwright 미설치(skip).
 */

const BASE = (process.env.E2E_BASE || 'https://www.genieroi.com').replace(/\/$/, '');
const EMAIL = process.env.E2E_EMAIL || '';
const PASSWORD = process.env.E2E_PASSWORD || '';
const ACCESS_CODE = process.env.E2E_ACCESS_CODE || 'GENIEGO-ADMIN';

const ROUTES = [
  '/dashboard', '/pnl', '/rollup', '/settlements', '/reconciliation', '/order-hub', '/price-opt',
  '/channel-kpi', '/account-performance', '/performance', '/attribution', '/marketing', '/marketing-mix',
  '/ai-insights', '/ai-recommend', '/ai-rule-engine', '/graph-score', '/budget-tracker', '/campaign-manager',
  '/auto-marketing', '/catalog-sync', '/digital-shelf', '/writeback', '/commerce', '/demand-forecast',
  '/supply-chain', '/wms-manager', '/returns-portal', '/amazon-risk', '/live-commerce', '/kr-channel',
  '/crm', '/journey-builder', '/email-marketing', '/sms-marketing', '/kakao-channel', '/line-channel',
  '/whatsapp', '/instagram-dm', '/omni-channel', '/reviews-ugc', '/influencer-ugc', '/onsite-cro',
  '/web-popup', '/my-coupons', '/content-calendar', '/feedback', '/api-keys', '/connectors', '/pixel-tracking',
  '/admin', '/admin/growth', '/admin/plan-pricing', '/admin/menu-tree', '/admin/sub-admins', '/menu-access-manager',
  '/user-management', '/team-members', '/team', '/db-admin', '/pg-config', '/audit', '/system-monitor',
  '/data-product', '/data-schema', '/data-trust', '/report-builder', '/reports', '/developer-hub',
  '/pm', '/pm/portfolio', '/pm/resources', '/workspace', '/rules-editor-v2', '/payment-methods',
];

const CRASH_SIG = /is not defined|Cannot read propert|is not a function|Minified React error|Rendered (more|fewer) hooks|undefined is not|Objects are not valid as a React child|Maximum update depth|Cannot access .* before initialization/i;

async function main() {
  if (!EMAIL || !PASSWORD) { console.error('E2E_EMAIL / E2E_PASSWORD 필요(하드코딩 금지).'); process.exit(2); }
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { console.log('· Playwright 미설치 → 렌더 스윕 skip. 설치: npm i -D playwright && npx playwright install chromium'); process.exit(3); }

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // 로그인 → 토큰 localStorage 주입
  await page.goto(`${BASE}/`);
  const auth = await page.evaluate(async ({ BASE, EMAIL, PASSWORD, ACCESS_CODE }) => {
    const r = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD, access_code: ACCESS_CODE }) });
    const j = await r.json().catch(() => ({}));
    const token = j.token || j.access_token || (j.data && j.data.token) || '';
    if (token) { localStorage.setItem('genie_token', token); localStorage.setItem('genie_roi_lang', 'ko'); if (j.tenant_id || j.tenant) localStorage.setItem('tenantId', j.tenant_id || j.tenant); }
    return { ok: !!token };
  }, { BASE, EMAIL, PASSWORD, ACCESS_CODE });
  if (!auth.ok) { console.error('로그인 실패'); await browser.close(); process.exit(1); }
  console.log(`· 로그인 OK · ${ROUTES.length} 라우트 렌더 검사`);

  await page.goto(`${BASE}/dashboard`);
  const crashed = [];
  for (const route of ROUTES) {
    const errs = [];
    const onmsg = (m) => { if (m.type() === 'error') errs.push(m.text()); };
    const onerr = (e) => errs.push('PAGEERR:' + (e.message || String(e)));
    page.on('console', onmsg); page.on('pageerror', onerr);
    try {
      await page.evaluate((r) => { window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')); }, route);
      await page.waitForTimeout(600);
    } catch (e) { errs.push('NAV:' + e.message); }
    page.off('console', onmsg); page.off('pageerror', onerr);
    const rootLen = await page.evaluate(() => (document.querySelector('#root')?.innerText || '').length).catch(() => 0);
    const hits = errs.filter(e => CRASH_SIG.test(e));
    if (hits.length || rootLen < 40) crashed.push({ route, rootLen, hits: hits.slice(0, 2) });
  }
  await browser.close();

  if (crashed.length) {
    console.log(`\x1b[31m✗ 렌더 크래시 ${crashed.length}건:\x1b[0m`);
    crashed.forEach(c => console.log(`  ${c.route} (rootLen=${c.rootLen}) ${c.hits.join(' | ')}`));
    process.exit(1);
  }
  console.log(`\x1b[32m✓ ${ROUTES.length} 라우트 렌더 크래시 0건\x1b[0m`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
