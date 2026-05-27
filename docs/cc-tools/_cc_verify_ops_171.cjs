/* cc headless verify — 171차 P0 #1 운영 dist 검증 (no live login).
 * fresh headless (no SW/cache) — chunk init order race 확정 패턴 (U-170-A). */
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
  page.on('pageerror', (err) => pageErrors.push(`PAGEERR: ${err.message}\n${err.stack}`));
  page.on('requestfailed', (req) => failedRequests.push(`FAIL: ${req.url()} (${req.failure().errorText})`));

  let exitCode = 0;
  const paths = ['/login', '/admin/plan-pricing', '/admin/menu-tree'];
  for (const p of paths) {
    consoleLogs.length = 0; pageErrors.length = 0; failedRequests.length = 0;
    console.log(`\n=== nav ${TARGET}${p} ===`);
    try {
      await page.goto(`${TARGET}${p}`, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      console.log('GOTO_ERR:', e.message);
      exitCode = 2;
      continue;
    }
    await new Promise((r) => setTimeout(r, 2500));
    const rootLen = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.length : 0;
    });
    const rootHtmlSnip = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.substring(0, 200) : '(no #root)';
    });
    console.log('ROOT_LEN:', rootLen);
    console.log('ROOT_INNER_HTML (first 200):', rootHtmlSnip);
    if (rootLen < 100) {
      console.log('!!! BLANK render — likely chunk init failure');
      exitCode = 1;
    }
    if (pageErrors.length > 0) {
      console.log('PAGE ERRORS:');
      pageErrors.slice(0, 5).forEach((e) => console.log(e));
      exitCode = 1;
    } else {
      console.log('PAGE ERRORS: (none)');
    }
    const localhostFail = failedRequests.filter((r) => r.includes('localhost:8000'));
    if (localhostFail.length > 0) {
      console.log('!!! apiClient localhost:8000 fallback still active:');
      localhostFail.slice(0, 3).forEach((r) => console.log(r));
      exitCode = 1;
    }
    const failedCors = failedRequests.filter((r) => !r.includes('extension')).slice(0, 3);
    if (failedCors.length > 0) {
      console.log('OTHER FAILED REQUESTS:');
      failedCors.forEach((r) => console.log(r));
    }
  }

  console.log(`\n=== sw.js check ===`);
  try {
    const swRes = await page.goto(`${TARGET}/sw.js`, { waitUntil: 'networkidle2', timeout: 15000 });
    console.log('sw.js status:', swRes.status());
    console.log('sw.js content-length:', swRes.headers()['content-length'] || '(none)');
    const swBody = await page.evaluate(() => document.body ? document.body.innerText.substring(0, 120) : '');
    console.log('sw.js body first 120:', swBody);
  } catch (e) {
    console.log('sw.js fetch err:', e.message);
  }

  await browser.close();
  console.log(`\n=== exit code: ${exitCode} ===`);
  process.exit(exitCode);
})();
