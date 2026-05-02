const { Client } = require('ssh2');
function conn() { return new Promise((r,j) => { const c = new Client(); c.on('ready', () => r(c)); c.on('error', j); c.connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'}); }); }
function ex(c, cmd) { return new Promise((r,j) => { c.exec(cmd, (e,s) => { if(e) return j(e); let o=''; s.on('data',d=>o+=d.toString()); s.stderr.on('data',d=>o+=d.toString()); s.on('close',()=>r(o)); }); }); }

(async () => {
  const c = await conn();
  const DEMO = '/home/wwwroot/roidemo.geniego.com';

  // The tar.gz already has the correct files at /tmp/demo_dist.tar.gz
  // The problem was that dist/dist was created (nested)
  // Clean up and extract properly

  console.log('1. Cleaning up dist directory...');
  // Move dist_old content back (it had icons, etc)
  // Then extract tar.gz over it
  await ex(c, `rm -rf ${DEMO}/dist`);
  await ex(c, `mkdir -p ${DEMO}/dist`);

  // Copy back static files from dist_old
  await ex(c, `cp -r ${DEMO}/dist_old/* ${DEMO}/dist/ 2>/dev/null || true`);

  // Extract tar.gz (which has the real built files)
  console.log('2. Extracting tar.gz...');
  const extract = await ex(c, `cd ${DEMO}/dist && tar -xzf /tmp/demo_dist.tar.gz 2>&1`);
  console.log('   Extract result:', extract || 'OK');

  // Check
  const ls = await ex(c, `ls -la ${DEMO}/dist/ | head -20`);
  console.log('3. dist contents:\n', ls);

  const hasIndex = await ex(c, `test -f ${DEMO}/dist/index.html && echo YES || echo NO`);
  console.log('4. index.html exists:', hasIndex.trim());

  const assetsCount = await ex(c, `ls ${DEMO}/dist/assets/ | wc -l`);
  console.log('5. Assets count:', assetsCount.trim());

  // Nginx config check - where does it serve from?
  const nginxConf = await ex(c, `grep -A5 'roidemo' /etc/nginx/sites-enabled/* 2>/dev/null | head -20 || grep -A5 'roidemo' /etc/nginx/conf.d/* 2>/dev/null | head -20`);
  console.log('6. Nginx root:\n', nginxConf);

  // Reload nginx
  await ex(c, 'nginx -s reload');
  console.log('7. Nginx reloaded');

  c.end();
  console.log('\n✅ Done!');
})();
