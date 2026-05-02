const { Client } = require('ssh2');
function conn() { return new Promise((r,j) => { const c = new Client(); c.on('ready', () => r(c)); c.on('error', j); c.connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'}); }); }
function ex(c, cmd) { return new Promise((r,j) => { c.exec(cmd, (e,s) => { if(e) return j(e); let o=''; s.on('data',d=>o+=d.toString()); s.stderr.on('data',d=>o+=d.toString()); s.on('close',()=>r(o)); }); }); }

(async () => {
  const c = await conn();
  const DEMO = '/home/wwwroot/roidemo.geniego.com';

  // Check dist/dist (nested)
  const nested = await ex(c, `ls -la ${DEMO}/dist/dist/ 2>&1 | head -10`);
  console.log('Nested dist/dist:\n', nested);

  const nestedAssets = await ex(c, `ls ${DEMO}/dist/dist/assets/ 2>&1 | head -5`);
  console.log('Nested assets:', nestedAssets.trim().substring(0, 100));

  const nestedIndex = await ex(c, `test -f ${DEMO}/dist/dist/index.html && echo YES || echo NO`);
  console.log('Nested index.html:', nestedIndex.trim());

  if (nestedIndex.trim() === 'YES') {
    // index.html is in dist/dist/ — move everything up
    console.log('\n🔧 Fixing: moving dist/dist/* -> dist/');
    // Move nested content up
    await ex(c, `cp -r ${DEMO}/dist/dist/* ${DEMO}/dist/ 2>/dev/null || true`);
    await ex(c, `cp -r ${DEMO}/dist/dist/.* ${DEMO}/dist/ 2>/dev/null || true`);
    await ex(c, `rm -rf ${DEMO}/dist/dist`);

    const verify = await ex(c, `ls -la ${DEMO}/dist/ | head -20`);
    console.log('After fix:\n', verify);

    const hasIndex = await ex(c, `test -f ${DEMO}/dist/index.html && echo YES || echo NO`);
    console.log('index.html:', hasIndex.trim());

    const assetCount = await ex(c, `ls ${DEMO}/dist/assets/ 2>/dev/null | wc -l`);
    console.log('Assets:', assetCount.trim());
  }

  // Also check nginx root config
  const nginxRoot = await ex(c, `grep -r 'root' /etc/nginx/ 2>/dev/null | grep roidemo`);
  console.log('Nginx root config:', nginxRoot.trim());

  // If no config found, check all vhosts
  if (!nginxRoot.trim()) {
    const allConfs = await ex(c, `ls /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ /usr/local/nginx/conf/vhost/ 2>/dev/null`);
    console.log('Nginx conf dirs:', allConfs.trim());

    const vhosts = await ex(c, `grep -rl 'roidemo\\|geniego' /etc/nginx/ /usr/local/nginx/ 2>/dev/null`);
    console.log('Configs with roidemo:', vhosts.trim());
  }

  await ex(c, 'nginx -s reload 2>/dev/null || true');
  console.log('Nginx reloaded');

  c.end();
})();
