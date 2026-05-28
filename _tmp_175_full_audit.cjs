// 175차 cc PM 전수 브라우저 검증 — App.jsx 의 모든 ~90 라우트 일주
// 결함 카탈로그: ReferenceError / ErrorBoundary / raw i18n key / invisible text /
//                console error / mock-data marker / "coming soon" placeholder / 빈 본체
//
// 사용법: node _tmp_175_full_audit.cjs [routes_filter_regex]
// 출력: audit_175_full/<safe_path>.png + audit_175_full/report.json

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL_BASE = process.env.AUDIT_BASE || 'https://roi.genie-go.com';
const OUT_DIR = process.env.AUDIT_OUT || 'audit_176_prod';
const VIEWPORT = { width: 1440, height: 900 };

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// App.jsx 에서 추출한 실제 페이지 라우트 (Navigate redirect 제외)
const ROUTES = [
  '/dashboard',
  '/marketing',
  '/account-performance',
  '/commerce',
  '/amazon-risk',
  '/digital-shelf',
  '/reviews-ugc',
  '/influencer',
  '/writeback',
  '/approvals',
  '/settlements',
  '/reconciliation',
  '/audit',
  '/admin',
  '/admin/menu-tree',
  '/admin/plan-pricing',
  '/me/menu',
  '/pm',
  '/attribution',
  '/graph-score',
  '/kr-channel',
  '/price-opt',
  '/catalog-sync',
  '/order-hub',
  '/operations',
  '/performance',
  '/pnl',
  '/data-schema',
  '/ai-insights',
  '/report-builder',
  '/integration-hub',
  '/pricing',
  '/data-product',
  '/db-admin',
  '/rollup',
  '/ai-rule-engine',
  '/campaign-manager',
  '/omni-channel',
  '/wms-manager',
  '/user-management',
  '/menu-access-manager',
  '/content-calendar',
  '/budget-tracker',
  '/system-monitor',
  '/auto-marketing',
  '/help',
  '/channel-kpi',
  '/pg-config',
  '/crm',
  '/email-marketing',
  '/kakao-channel',
  '/line-channel',
  '/journey-builder',
  '/web-popup',
  '/whatsapp',
  '/sms-marketing',
  '/onboarding',
  '/instagram-dm',
  '/license',
  '/workspace',
  '/feedback',
  '/data-trust',
  '/developer-hub',
  '/demand-forecast',
  '/returns-portal',
  '/supply-chain',
  '/supplier-portal',
  '/my-coupons',
  '/rules-editor-v2',
  '/ai-recommend',
  '/case-study',
];

const _U = JSON.stringify({ id: 'demo-cc', email: 'demo@cc.local', name: 'CC PM Audit', plan: 'enterprise', role: 'admin' });
const _T = 'local_admin_pm-' + Date.now();
const KEYS_DEMO = {
  'genie_token': _T,
  'genie_user': _U,
  'demo_genie_token': _T,
  'demo_genie_user': _U,
  'tenantId': 'demo',
  'genie_menu_access': '{}',
  'geniego_tour_completed': '1',
  'jb_onboarding_shown': '1',
};

// raw i18n key 탐지 패턴: dot.case 또는 namespace.key 패턴이 visible text 에 노출
const RAW_KEY_RX = /(?:^|[^\w])([a-z][a-zA-Z0-9]+(?:\.[a-zA-Z0-9_]+){1,3})(?:[^\w]|$)/;
// Mock 표식
const MOCK_MARKERS_RX = /\b(mock|sample|demo|test|placeholder|coming\s*soon|준비\s*중|미구현|TODO|FIXME)\b/i;

async function auditPage(page, route) {
  const startMs = Date.now();
  const url = URL_BASE + route;
  const consoleErrors = [];
  const consoleWarns = [];
  const pageErrors = [];
  const network404 = [];

  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.removeAllListeners('response');
  page.on('console', m => {
    const txt = m.text();
    if (m.type() === 'error') consoleErrors.push(txt);
    else if (m.type() === 'warning') consoleWarns.push(txt);
  });
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('response', r => {
    if (r.status() >= 400 && r.url().includes('/api/')) network404.push(`${r.status()} ${r.url().substring(0, 120)}`);
  });

  let httpStatus = null;
  let gotoOk = true;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    if (resp) httpStatus = resp.status();
  } catch (e) {
    gotoOk = false;
    return { route, error: 'goto: ' + e.message.substring(0, 200) };
  }

  await new Promise(r => setTimeout(r, 2500));

  // ReferenceError / runtime crash 검출
  const allErrors = [...consoleErrors, ...pageErrors];
  const refError = allErrors.find(s => /ReferenceError|TypeError.*undefined.*reading/i.test(s));

  // ErrorBoundary catch 노출
  const boundaryShown = await page.evaluate(() => {
    const t = document.body.innerText || '';
    return t.includes('An error occurred') || t.includes('Runtime Error') ||
           t.includes('Something went wrong') || t.includes('오류가 발생');
  });

  // 페이지 본체 분석
  const pageMetrics = await page.evaluate(({ rawKeyRx, mockRx }) => {
    const mainArea = document.querySelector('.app-content-area') || document.body;
    const bodyText = (mainArea.innerText || '').slice(0, 8000);

    // raw i18n key 노출 추정
    const rx = new RegExp(rawKeyRx, 'g');
    const rawKeyHits = [];
    let m;
    while ((m = rx.exec(bodyText)) !== null) {
      const k = m[1];
      // false positive 줄이기 — 흔한 영어 문장 단어/이메일/url 제외
      if (k.includes('@') || k.includes('://')) continue;
      if (/^(www|com|net|org|io|http|https)$/i.test(k.split('.').pop())) continue;
      if (rawKeyHits.length < 100) rawKeyHits.push(k);
    }

    // Mock/coming-soon marker
    const mockMatches = (bodyText.match(new RegExp(mockRx, 'gi')) || []).slice(0, 5);

    // 빈 페이지 (visible body 가 너무 짧음 — placeholder 가능성)
    const visibleLen = bodyText.trim().length;

    // invisible text (배경=글자색) 검사
    let invisibleCount = 0;
    const nodes = mainArea.querySelectorAll('*');
    for (const n of nodes) {
      if (!n.innerText || n.children.length > 0) continue;
      const cs = getComputedStyle(n);
      const rect = n.getBoundingClientRect();
      if (rect.width < 5 || rect.height < 5) continue;
      // 부모 chain 의 배경 추적
      let p = n;
      let bg = null;
      while (p && p !== document.body) {
        const pcs = getComputedStyle(p);
        if (pcs.backgroundColor && pcs.backgroundColor !== 'rgba(0, 0, 0, 0)' && pcs.backgroundColor !== 'transparent') {
          bg = pcs.backgroundColor;
          break;
        }
        p = p.parentElement;
      }
      if (!bg) continue;
      if (cs.color === bg) invisibleCount++;
      else if (cs.color === 'rgb(255, 255, 255)' && (bg === 'rgb(255, 255, 255)' || bg === 'rgba(255, 255, 255, 1)')) invisibleCount++;
    }

    return {
      visibleLen,
      rawKeyHits,
      mockMatches,
      invisibleCount,
      hasMainElement: !!document.querySelector('.app-content-area'),
      heroTextSample: bodyText.slice(0, 200),
    };
  }, { rawKeyRx: RAW_KEY_RX.source, mockRx: MOCK_MARKERS_RX.source });

  const safe = route.replace(/[^a-zA-Z0-9]/g, '_') || 'root';
  try {
    await page.screenshot({ path: path.join(OUT_DIR, safe + '.png'), fullPage: false });
  } catch (e) { /* screenshot may fail on detached frame */ }

  return {
    route,
    httpStatus,
    elapsedMs: Date.now() - startMs,
    consoleErrorCount: consoleErrors.length,
    consoleWarnCount: consoleWarns.length,
    pageErrorCount: pageErrors.length,
    network404Count: network404.length,
    refError: refError ? refError.substring(0, 250) : null,
    boundaryShown,
    ...pageMetrics,
    sampleErrors: allErrors.slice(0, 3).map(s => s.substring(0, 200)),
    sample404: network404.slice(0, 3),
  };
}

function tagOf(r) {
  if (r.error) return '❌ GOTO';
  if (r.refError) return '❌ REF';
  if (r.boundaryShown) return '❌ BND';
  if (r.visibleLen < 50) return '⚠️  EMPTY';
  if (r.rawKeyHits && r.rawKeyHits.length >= 3) return '⚠️  RAW-i18n';
  if (r.invisibleCount >= 5) return '⚠️  INVIS';
  if (r.pageErrorCount > 0) return '⚠️  PAGEERR';
  if (r.network404Count > 0) return '⚠️  404';
  return '✅ OK';
}

async function main() {
  const filterRx = process.argv[2] ? new RegExp(process.argv[2]) : null;
  const targets = filterRx ? ROUTES.filter(r => filterRx.test(r)) : ROUTES;

  console.log(`[175차 PM 전수 audit] ${targets.length} 라우트`);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // 초기 demo 우회 + GDPR + 온보딩 dismiss
  await page.goto(URL_BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.evaluate((keys) => {
    Object.entries(keys).forEach(([k, v]) => localStorage.setItem(k, v));
    document.cookie = 'g_gdpr_consent=accepted; path=/; max-age=31536000';
  }, KEYS_DEMO);

  const results = [];
  for (const route of targets) {
    const r = await auditPage(page, route);
    const tag = tagOf(r);
    const summary = `${tag} ${route.padEnd(28)} cErr:${r.consoleErrorCount || 0} pErr:${r.pageErrorCount || 0} 404:${r.network404Count || 0} raw:${(r.rawKeyHits || []).length} inv:${r.invisibleCount || 0} len:${r.visibleLen || 0}`;
    console.log(summary);
    if (r.refError) console.log('    ↳ ' + r.refError.substring(0, 180));
    if (r.rawKeyHits && r.rawKeyHits.length) console.log('    ↳ raw: ' + r.rawKeyHits.slice(0, 5).join(', '));
    results.push(r);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(results, null, 2));

  // 카테고리별 카운트
  const buckets = {};
  results.forEach(r => {
    const t = tagOf(r);
    buckets[t] = (buckets[t] || 0) + 1;
  });
  console.log('\n=== 결함 카탈로그 요약 ===');
  Object.entries(buckets).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`  ${t}  ${n}`));

  await browser.close();
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(2);
});
