/* cc verify — 171차 /rollup 화면오류 root cause 확정 */
const puppeteer = require('puppeteer');
const TARGET = process.env.CC_TARGET || 'https://roi.genie-go.com';
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });
  const page = await browser.newPage();
  const consoleLogs = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => pageErrors.push(`PAGEERR: ${err.message}\n${err.stack || ''}`));
  page.on('requestfailed', (req) => failedRequests.push(`FAIL: ${req.url()} (${req.failure().errorText})`));

  // /rollup 직접 접근 — auth 없으면 login redirect 가 정상.
  // 단, lazy chunk가 import 되면서 RollupDashboard 모듈 init이 트리거 → PAGEERR 발생 예상.
  console.log(`=== nav ${TARGET}/rollup (no auth) ===`);
  try {
    await page.goto(`${TARGET}/rollup`, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log('GOTO_ERR:', e.message);
  }
  await new Promise((r) => setTimeout(r, 2500));
  const url = page.url();
  const rootLen = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML.length : 0;
  });
  const rootSnip = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML.substring(0, 200) : '(no #root)';
  });
  console.log('FINAL_URL:', url);
  console.log('ROOT_LEN:', rootLen);
  console.log('ROOT_SNIP (200):', rootSnip);
  console.log('---PAGE ERRORS---');
  if (pageErrors.length === 0) console.log('(none)');
  pageErrors.slice(0, 6).forEach((e) => console.log(e));
  console.log('---CONSOLE (last 15)---');
  consoleLogs.slice(-15).forEach((l) => console.log(l));
  console.log('---FAILED REQUESTS (excl extension)---');
  failedRequests.filter((r) => !r.includes('extension')).slice(0, 5).forEach((r) => console.log(r));

  await browser.close();
})();
