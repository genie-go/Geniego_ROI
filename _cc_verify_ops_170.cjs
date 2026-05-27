/* cc headless verify — 170차 P0 #1 ops white-screen diagnosis */
const puppeteer = require('puppeteer');
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

  try {
    console.log('=== nav https://roi.genie-go.com/login ===');
    await page.goto('https://roi.genie-go.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body ? document.body.innerText.substring(0, 200) : '(no body)');
    const rootHtml = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.substring(0, 500) : '(no #root)';
    });
    console.log('TITLE:', title);
    console.log('BODY_TEXT (first 200):', bodyText);
    console.log('ROOT_INNER_HTML (first 500):', rootHtml);
    console.log('---');
    console.log('CONSOLE LOGS:');
    consoleLogs.slice(0, 20).forEach((l) => console.log(l));
    console.log('---');
    console.log('PAGE ERRORS:');
    pageErrors.slice(0, 10).forEach((e) => console.log(e));
    console.log('---');
    console.log('FAILED REQUESTS:');
    failedRequests.slice(0, 10).forEach((r) => console.log(r));
    console.log('---');
    await page.screenshot({ path: 'E:/project/GeniegoROI/_cc_verify_screenshot_login.png', fullPage: false });
    console.log('SCREENSHOT: E:/project/GeniegoROI/_cc_verify_screenshot_login.png');

    // Try logging in
    console.log('\n=== attempt login ceo@ociell.com ===');
    const hasEmailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
    if (hasEmailInput) {
      await page.type('input[type="email"], input[name="email"]', 'ceo@ociell.com');
      const pwInput = await page.$('input[type="password"]');
      if (pwInput) {
        await page.type('input[type="password"]', 'geniego1721');
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
            submitBtn.click(),
          ]);
          await new Promise((r) => setTimeout(r, 3000));
          const url2 = page.url();
          const rootHtml2 = await page.evaluate(() => {
            const root = document.getElementById('root');
            return root ? root.innerHTML.substring(0, 500) : '(no #root)';
          });
          console.log('AFTER LOGIN URL:', url2);
          console.log('ROOT (first 500):', rootHtml2);
          await page.screenshot({ path: 'E:/project/GeniegoROI/_cc_verify_screenshot_afterlogin.png', fullPage: false });
        } else { console.log('NO submit button'); }
      } else { console.log('NO password input'); }
    } else { console.log('NO email input on /login'); }
  } catch (e) {
    console.log('SCRIPT ERR:', e.message, e.stack);
  } finally {
    await browser.close();
  }
})();
