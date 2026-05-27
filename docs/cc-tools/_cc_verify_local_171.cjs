/* cc headless verify — 171차 P0 #1 local dist render check (no live login).
 * 운영/데모 deploy 전 vite preview (port 4173) 띄운 상태에서 검증. */
const puppeteer = require('puppeteer');
const TARGET = process.env.CC_TARGET || 'http://localhost:4173';
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
    await new Promise((r) => setTimeout(r, 1500));
    const rootHtml = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.substring(0, 300) : '(no #root)';
    });
    const rootLen = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.length : 0;
    });
    console.log('ROOT_LEN:', rootLen);
    console.log('ROOT_INNER_HTML (first 300):', rootHtml);
    if (rootLen < 50) {
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
    // localhost:8000 fallback 감지 (apiClient base fix verify)
    const localhostFail = failedRequests.filter(r => r.includes('localhost:8000'));
    if (localhostFail.length > 0) {
      console.log('!!! apiClient localhost:8000 fallback still active:');
      localhostFail.slice(0, 3).forEach((r) => console.log(r));
      exitCode = 1;
    }
  }
  await browser.close();
  console.log(`\n=== exit code: ${exitCode} ===`);
  process.exit(exitCode);
})();
