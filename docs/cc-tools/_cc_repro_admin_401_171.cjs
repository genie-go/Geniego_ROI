/* cc — 운영 admin 401 재현 + apiClient token storage 검증 */
const puppeteer = require('puppeteer');
const TOKEN = process.env.CC_ADMIN_TOKEN; // SSH로 발급받은 admin token
if (!TOKEN) { console.error('CC_ADMIN_TOKEN env var required'); process.exit(2); }

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });
  const page = await browser.newPage();
  const pageErrors = [];
  const requests = [];
  page.on('pageerror', (e) => pageErrors.push(`PAGEERR: ${e.message}`));
  page.on('request', (r) => {
    if (r.url().includes('/v424/admin/') || r.url().includes('/api/v424/admin/')) {
      requests.push({
        url: r.url(),
        auth: r.headers()['authorization'] || '(none)',
      });
    }
  });

  // 1) login 페이지 진입 (origin localStorage 활성화 위해)
  await page.goto('https://roi.genie-go.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));

  // 2) localStorage에 토큰 + user 정보 주입 (AuthContext 정합)
  const injection = await page.evaluate((tk) => {
    // AuthContext.jsx: TOKEN_KEY = "genie_token" (운영)
    localStorage.setItem('genie_token', tk);
    localStorage.setItem('genie_user', JSON.stringify({
      id: 5,
      email: 'ceo@ociell.com',
      name: 'admin',
      plan: 'admin',
    }));
    return {
      genie_token_len: (localStorage.getItem('genie_token') || '').length,
      genie_user: localStorage.getItem('genie_user'),
      all_keys: Object.keys(localStorage),
    };
  }, TOKEN);
  console.log('=== localStorage injection ===');
  console.log(JSON.stringify(injection, null, 2));

  // 3) /admin/plan-pricing 으로 navigate
  console.log('\n=== nav /admin/plan-pricing ===');
  await page.goto('https://roi.genie-go.com/admin/plan-pricing', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3000));

  // 4) fetch 결과 확인
  console.log('\n=== /v424/admin/* requests ===');
  if (requests.length === 0) console.log('(no admin api calls captured!)');
  requests.slice(0, 10).forEach((r, i) => {
    const authMasked = r.auth === '(none)' ? '(NONE!)' : `Bearer ...${r.auth.slice(-8)}`;
    console.log(`[${i}] ${r.url}`);
    console.log(`    auth=${authMasked}`);
  });

  // 5) 화면에 plans 가 보이는지
  const visibleText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('\n=== visible text (first 500) ===');
  console.log(visibleText);

  // 6) 수동 fetch 호출 — apiClient defaultHeaders 와 동일 패턴
  console.log('\n=== manual fetch with explicit Authorization header ===');
  const manualResult = await page.evaluate(async (tk) => {
    try {
      const res = await fetch('/v424/admin/plans', { headers: { Authorization: `Bearer ${tk}` } });
      return { status: res.status, body: (await res.text()).substring(0, 200) };
    } catch (e) { return { error: e.message }; }
  }, TOKEN);
  console.log(JSON.stringify(manualResult, null, 2));

  console.log('\n=== pageErrors ===');
  if (pageErrors.length === 0) console.log('(none)');
  pageErrors.slice(0, 5).forEach((e) => console.log(e));

  await browser.close();
})();
