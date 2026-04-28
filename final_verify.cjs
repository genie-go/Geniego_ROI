const { Client } = require('ssh2');
function conn() { return new Promise((r,j) => { const c = new Client(); c.on('ready', () => r(c)); c.on('error', j); c.connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'}); }); }
function ex(c, cmd) { return new Promise((r,j) => { c.exec(cmd, (e,s) => { if(e) return j(e); let o=''; s.on('data',d=>o+=d.toString()); s.stderr.on('data',d=>o+=d.toString()); s.on('close',()=>r(o)); }); }); }

(async () => {
  const c = await conn();
  const NGINX_ROOT = '/home/wwwroot/roidemo.geniego.com/frontend/dist';

  // 1. Check index.html points to correct JS
  const refs = await ex(c, `grep 'index-' ${NGINX_ROOT}/index.html`);
  console.log('index.html refs:', refs.trim());

  // 2. Verify those referenced files exist
  const jsFile = refs.match(/index-[a-zA-Z0-9_-]+\.js/);
  if (jsFile) {
    const exists = await ex(c, `test -f ${NGINX_ROOT}/assets/${jsFile[0]} && echo YES || echo NO`);
    console.log(`${jsFile[0]} exists: ${exists.trim()}`);
  }

  // 3. Full test via HTTPS
  const pageTest = await ex(c, `curl -sL -k 'https://roidemo.genie-go.com/' 2>/dev/null | grep 'index-'`);
  console.log('Page test:', pageTest.trim().substring(0, 200));

  // 4. Dashboard chunk test
  const dashTest = await ex(c, `curl -s -o /dev/null -w '%{http_code}' -k 'https://roidemo.genie-go.com/assets/Dashboard-CHfqMQdf.js'`);
  console.log('Dashboard chunk HTTP:', dashTest.trim());

  // 5. API test
  const apiTest = await ex(c, `curl -sL -k 'https://roidemo.genie-go.com/api/v423/rollup/summary?period=daily&n=30' -H 'X-Tenant-Id: demo' 2>/dev/null | head -c 200`);
  console.log('API test:', apiTest.substring(0, 200));

  c.end();
  console.log('\n✅ All checks done!');
})();
