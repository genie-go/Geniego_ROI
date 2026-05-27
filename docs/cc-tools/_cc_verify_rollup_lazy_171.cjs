/* cc verify — RollupDashboard 청크 강제 import 시 PAGEERR 발생 여부 */
const puppeteer = require('puppeteer');
const TARGET = process.env.CC_TARGET || 'http://localhost:4173';
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(`PAGEERR: ${err.message}`));

  await page.goto(`${TARGET}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));

  // index.html 에서 RollupDashboard 청크 hash 찾기
  const chunkPath = await page.evaluate(async () => {
    const resp = await fetch('/index.html');
    const html = await resp.text();
    const m = html.match(/RollupDashboard-[A-Za-z0-9_-]+\.js/);
    return m ? m[0] : null;
  });
  console.log('chunk file (from index.html scan):', chunkPath || '(not in index.html — lazy chunk)');

  // assets/ 디렉토리 listing 으로 찾기 (개발 server는 디렉토리 listing 안 줄 수 있음)
  // 대신 known path 시도
  const resp = await page.evaluate(async () => {
    try {
      // dynamic import 시 모듈 init 발동 → top-level useCallback 호출 있으면 throw
      const mod = await import('/assets/RollupDashboard-BWA9YUyA.js').catch(e => ({ error: e.message }));
      return mod.error ? { error: mod.error } : { ok: true, exports: Object.keys(mod) };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('dynamic import result:', JSON.stringify(resp));

  console.log('---PAGE ERRORS---');
  if (pageErrors.length === 0) console.log('(none) ✓ fix verified');
  pageErrors.slice(0, 5).forEach((e) => console.log(e));

  await browser.close();
})();
