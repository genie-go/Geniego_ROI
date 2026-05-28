// 175차 S5.1 — invisible text 정확 요소 + selector + parent component 검출
const puppeteer = require('puppeteer');
const fs = require('fs');

const URL_BASE = 'http://localhost:5173';
const KEYS = {
  'genie_token': 'local_admin_s5-' + Date.now(),
  'genie_user': JSON.stringify({ id:'demo-cc', email:'demo@cc.local', name:'S5 Audit', plan:'enterprise', role:'admin' }),
  'tenantId': 'demo',
  'geniego_tour_completed': '1',
  'jb_onboarding_shown': '1',
};

const TARGETS = [
  '/admin', '/report-builder', '/integration-hub', '/ai-rule-engine', '/channel-kpi',
  '/onboarding', '/workspace', '/feedback', '/data-trust', '/developer-hub',
  '/demand-forecast', '/supplier-portal', '/my-coupons', '/case-study',
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(URL_BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((k) => {
    Object.entries(k).forEach(([a,b]) => localStorage.setItem(a, b));
    document.cookie = 'g_gdpr_consent=accepted; path=/';
  }, KEYS);

  const allResults = {};
  for (const route of TARGETS) {
    try {
      await page.goto(URL_BASE + route, { waitUntil: 'networkidle2', timeout: 25000 });
    } catch (e) { allResults[route] = { error: e.message.slice(0, 100) }; continue; }
    await new Promise(r => setTimeout(r, 2500));

    const items = await page.evaluate(() => {
      const main = document.querySelector('.app-content-area') || document.body;
      const invisibles = [];
      const all = main.querySelectorAll('*');
      const rgbEq = (a, b) => a === b;
      const isWhiteish = (c) => {
        if (!c) return false;
        const m = c.match(/rgba?\(([\d.,\s]+)\)/);
        if (!m) return false;
        const parts = m[1].split(',').map(s => parseFloat(s.trim()));
        return parts[0] > 240 && parts[1] > 240 && parts[2] > 240;
      };
      for (const n of all) {
        if (!n.innerText || n.children.length > 0) continue;
        const text = (n.innerText || '').trim();
        if (text.length < 2 || text.length > 100) continue;
        const cs = getComputedStyle(n);
        const rect = n.getBoundingClientRect();
        if (rect.width < 5 || rect.height < 5) continue;
        let p = n;
        let bg = null;
        let depth = 0;
        const chain = [];
        while (p && p !== document.body && depth < 12) {
          const pcs = getComputedStyle(p);
          chain.push(`${p.tagName.toLowerCase()}${p.className ? '.' + (p.className+'').split(' ').filter(Boolean).slice(0,2).join('.') : ''}`);
          if (pcs.backgroundColor && pcs.backgroundColor !== 'rgba(0, 0, 0, 0)' && pcs.backgroundColor !== 'transparent') {
            if (!bg) bg = pcs.backgroundColor;
          }
          p = p.parentElement;
          depth++;
        }
        if (!bg) continue;
        const isInvisible = (cs.color === bg) || (isWhiteish(cs.color) && isWhiteish(bg));
        if (isInvisible) {
          invisibles.push({
            text: text.slice(0, 60),
            color: cs.color,
            bg,
            chain: chain.slice(0, 5).join(' < '),
            tag: n.tagName.toLowerCase(),
            cls: (n.className+'').slice(0, 120),
          });
        }
      }
      return invisibles.slice(0, 8);
    });

    allResults[route] = items;
    console.log(`\n=== ${route} (${items.length} invisible) ===`);
    items.slice(0, 5).forEach((x, i) => {
      console.log(`  [${i+1}] "${x.text}" color=${x.color} bg=${x.bg}`);
      console.log(`      chain: ${x.chain}`);
    });
  }

  fs.writeFileSync('audit_175_invis.json', JSON.stringify(allResults, null, 2));
  console.log('\n[저장] audit_175_invis.json');
  await browser.close();
})();
