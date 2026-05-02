const { Client } = require('ssh2');
function conn() { return new Promise((r,j) => { const c = new Client(); c.on('ready', () => r(c)); c.on('error', j); c.connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'}); }); }
function ex(c, cmd) { return new Promise((r,j) => { c.exec(cmd, (e,s) => { if(e) return j(e); let o=''; s.on('data',d=>o+=d.toString()); s.stderr.on('data',d=>o+=d.toString()); s.on('close',()=>r(o)); }); }); }

(async () => {
  const c = await conn();
  console.log('SSH connected');
  const P = '/home/wwwroot/roidemo.geniego.com/backend/src/Handlers/Rollup.php';

  // 1. Check syntax
  const syntax = await ex(c, `php -l ${P} 2>&1`);
  console.log('Syntax:', syntax.trim());

  // 2. Check file content - verify top_skus format
  const topSkuLines = await ex(c, `grep -n 'top_skus\\|topSkus' ${P}`);
  console.log('top_skus references:\n', topSkuLines);

  // 3. Check what the summary function looks like now
  const summaryFunc = await ex(c, `grep -A 2 'function summary' ${P}`);
  console.log('summary function:\n', summaryFunc);

  // 4. Test the actual API via nginx
  const apiTest = await ex(c, `curl -s -o /tmp/rollup_test.json -w '%{http_code}' 'http://127.0.0.1/api/v423/rollup/summary?period=daily&n=30' -H 'Host: roidemo.genie-go.com' -H 'X-Tenant-Id: demo' 2>/dev/null && cat /tmp/rollup_test.json`);
  console.log('API response:', apiTest.substring(0, 1000));

  // 5. Check PHP error log for any issues
  const errorLog = await ex(c, `tail -20 /var/log/php8.2-fpm.log 2>/dev/null || tail -20 /var/log/php-fpm/error.log 2>/dev/null || echo 'No error log found'`);
  console.log('PHP error log:\n', errorLog.substring(0, 500));

  // 6. Check nginx error log
  const nginxLog = await ex(c, `tail -10 /var/log/nginx/error.log 2>/dev/null || echo 'No nginx error log'`);
  console.log('Nginx error log:\n', nginxLog.substring(0, 500));

  c.end();
})();
