const { Client } = require('ssh2');
function conn() { return new Promise((r,j) => { const c = new Client(); c.on('ready', () => r(c)); c.on('error', j); c.connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'}); }); }
function ex(c, cmd) { return new Promise((r,j) => { c.exec(cmd, (e,s) => { if(e) return j(e); let o=''; s.on('data',d=>o+=d.toString()); s.stderr.on('data',d=>o+=d.toString()); s.on('close',()=>r(o)); }); }); }

(async () => {
  const c = await conn();
  console.log('SSH connected');

  // Test with HTTPS and -L to follow redirects
  const apiTest = await ex(c, "curl -sL -k 'https://roidemo.genie-go.com/api/v423/rollup/summary?period=daily&n=30' -H 'X-Tenant-Id: demo' 2>/dev/null | head -c 1500");
  console.log('Summary API:\n', apiTest.substring(0, 1200));

  console.log('\n---');

  // Also test the sku endpoint  
  const skuTest = await ex(c, "curl -sL -k 'https://roidemo.genie-go.com/api/v423/rollup/sku?period=daily&n=30' -H 'X-Tenant-Id: demo' 2>/dev/null | head -c 500");
  console.log('SKU API:\n', skuTest.substring(0, 500));

  c.end();
})();
