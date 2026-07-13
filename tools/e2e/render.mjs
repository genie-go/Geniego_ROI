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

import fs from 'node:fs';

const BASE = (process.env.E2E_BASE || 'https://www.genieroi.com').replace(/\/$/, '');
const EMAIL = process.env.E2E_EMAIL || '';
const PASSWORD = process.env.E2E_PASSWORD || '';
const ACCESS_CODE = process.env.E2E_ACCESS_CODE || 'GENIEGO-ADMIN';
const OTP = process.env.E2E_OTP || '';   // [280차] 2FA. 데모는 응답의 otp_dev 로 자동 통과.

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

/* [280차] 라우트를 App.jsx 에서 자동 도출 — 종전 하드코딩 목록은 75개뿐이라 실제 라우트(134개) 중
 *   59개가 **한 번도 렌더 검증된 적 없었다**. 새 페이지를 추가해도 목록에 손으로 넣지 않으면 영원히 미검사.
 *   이제 라우트가 늘면 자동으로 검사 범위에 든다(빠지는 메뉴 0). 실패 시 하드코딩 목록으로 폴백. */
function deriveRoutes() {
  try {
    // ★ESM(.mjs)에는 require 가 없다 — 여기서 require 를 쓰면 예외 → catch → 하드코딩 폴백(75개)으로
    //   조용히 떨어져 44개 라우트가 미검사로 남는다(이 함수 자체가 "겉보기 정상·실제 사망"이 될 뻔했다).
    const src = fs.readFileSync(new URL('../../frontend/src/App.jsx', import.meta.url), 'utf8');
    const found = [...src.matchAll(/path="([^"]+)"/g)].map(m => m[1])
      .filter(p => p.startsWith('/'))          // 절대경로만
      .filter(p => !p.includes(':') && !p.includes('*'))  // 파라미터/와일드카드 라우트 제외(고정 URL 아님)
      .filter(p => p !== '/');
    const uniq = [...new Set(found)];
    return uniq.length >= ROUTES.length ? uniq : ROUTES;
  } catch { return ROUTES; }
}

async function main() {
  if (!EMAIL || !PASSWORD) { console.error('E2E_EMAIL / E2E_PASSWORD 필요(하드코딩 금지).'); process.exit(2); }
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { console.log('· Playwright 미설치 → 렌더 스윕 skip. 설치: npm i -D playwright && npx playwright install chromium'); process.exit(3); }

  const TARGETS = deriveRoutes();
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // 로그인 → 토큰 localStorage 주입.
  // [280차] 2FA 대응 — 273차 전계정 2단계 인증 이후 이 하네스는 로그인 단계에서 항상 죽어 있었다
  //   (smoke.mjs 와 동일 부류). 서버는 같은 /auth/login 에 otp 를 동봉하는 2단계 방식이고,
  //   데모만 응답에 otp_dev 를 실어줘 무인 통과가 가능하다(운영은 E2E_OTP 주입 필요).
  await page.goto(`${BASE}/`);
  const auth = await page.evaluate(async ({ BASE, EMAIL, PASSWORD, ACCESS_CODE, OTP }) => {
    const call = async (otp) => {
      const r = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD, access_code: ACCESS_CODE, otp }),
      });
      return r.json().catch(() => ({}));
    };
    let j = await call('');
    if (j.mfa_required) {
      const code = String(j.otp_dev || OTP || '').trim();
      if (!code) return { ok: false, reason: '2FA 코드 없음(데모는 otp_dev 자동·운영은 E2E_OTP 필요)' };
      j = await call(code);
    }
    const token = j.token || j.access_token || (j.data && j.data.token) || '';
    if (token) { localStorage.setItem('genie_token', token); localStorage.setItem('genie_roi_lang', 'ko'); if (j.tenant_id || j.tenant) localStorage.setItem('tenantId', j.tenant_id || j.tenant); }
    return { ok: !!token, reason: token ? '' : (j.error || '토큰 없음') };
  }, { BASE, EMAIL, PASSWORD, ACCESS_CODE, OTP });
  if (!auth.ok) { console.error('로그인 실패: ' + (auth.reason || '')); await browser.close(); process.exit(1); }
  console.log(`· 로그인 OK · ${TARGETS.length} 라우트 검사(App.jsx 자동도출)`);

  await page.goto(`${BASE}/dashboard`);
  const crashed = [];
  const silent = [];   // [280차] 무음 사망: XHR 이 JSON 대신 SPA HTML 을 받음 / 4xx·5xx

  for (const route of TARGETS) {
    const errs = [];
    const netBad = [];
    const onmsg = (m) => { if (m.type() === 'error') errs.push(m.text()); };
    const onerr = (e) => errs.push('PAGEERR:' + (e.message || String(e)));
    // ★"겉보기 정상·실제 사망" 탐지기: 프론트가 /api 접두 없이 호출하면 nginx 가 SPA index.html 을
    //   200 text/html 로 돌려주고, 프론트의 JSON 파싱 예외는 catch 에 삼켜져 화면은 멀쩡해 보인다.
    //   XHR/fetch 응답의 Content-Type 이 text/html 이면 그게 바로 그 사망 시그니처다.
    const onres = async (res) => {
      try {
        const req = res.request();
        const type = req.resourceType();
        if (type !== 'xhr' && type !== 'fetch') return;
        const url = res.url();
        if (!url.includes(BASE)) return;
        // versionWatch(services/versionWatch.js)는 새 배포 감지용으로 `/?_vw=<ts>` 를 의도적으로 fetch 해
        // index.html 을 받는다 → HTML 이 정상. 탐지 대상에서 제외(오탐 방지).
        if (/[?&]_vw=/.test(url)) return;
        const status = res.status();
        const ct = (res.headers()['content-type'] || '');
        if (ct.includes('text/html')) netBad.push(`SPA-HTML(무음사망) ${status} ${url.replace(BASE, '')}`);
        else if (status >= 500) netBad.push(`HTTP${status} ${url.replace(BASE, '')}`);
        else if (status === 404) netBad.push(`HTTP404 ${url.replace(BASE, '')}`);
      } catch { /* ignore */ }
    };
    page.on('console', onmsg); page.on('pageerror', onerr); page.on('response', onres);
    try {
      await page.evaluate((r) => { window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')); }, route);
      await page.waitForTimeout(1200);   // 데이터 로딩 XHR 이 나갈 시간
    } catch (e) { errs.push('NAV:' + e.message); }
    page.off('console', onmsg); page.off('pageerror', onerr); page.off('response', onres);

    const rootLen = await page.evaluate(() => (document.querySelector('#root')?.innerText || '').length).catch(() => 0);
    const hits = errs.filter(e => CRASH_SIG.test(e));
    if (hits.length || rootLen < 40) crashed.push({ route, rootLen, hits: hits.slice(0, 2) });
    if (netBad.length) silent.push({ route, netBad: [...new Set(netBad)].slice(0, 6) });
  }
  await browser.close();

  let fail = 0;
  if (crashed.length) {
    console.log(`\x1b[31m✗ 렌더 크래시 ${crashed.length}건:\x1b[0m`);
    crashed.forEach(c => console.log(`  ${c.route} (rootLen=${c.rootLen}) ${c.hits.join(' | ')}`));
    fail = 1;
  } else {
    console.log(`\x1b[32m✓ ${TARGETS.length} 라우트 렌더 크래시 0건\x1b[0m`);
  }
  if (silent.length) {
    console.log(`\x1b[31m✗ 무음 사망 의심(XHR 이 HTML 수신 / 5xx / 404) ${silent.length} 라우트:\x1b[0m`);
    silent.forEach(s => { console.log(`  ${s.route}`); s.netBad.forEach(n => console.log(`      ${n}`)); });
    fail = 1;
  } else {
    console.log(`\x1b[32m✓ 무음 사망 시그니처 0건(모든 XHR 이 JSON 으로 응답)\x1b[0m`);
  }
  process.exit(fail);
}
main().catch(e => { console.error(e); process.exit(1); });
