const { Client } = require('ssh2');
function conn() { return new Promise((r,j) => { const c = new Client(); c.on('ready', () => r(c)); c.on('error', j); c.connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'}); }); }
function ex(c, cmd) { return new Promise((r,j) => { c.exec(cmd, (e,s) => { if(e) return j(e); let o=''; s.on('data',d=>o+=d.toString()); s.stderr.on('data',d=>o+=d.toString()); s.on('close',()=>r(o)); }); }); }

(async () => {
  const c = await conn();
  const DEMO = '/home/wwwroot/roidemo.geniego.com';
  const NGINX_ROOT = `${DEMO}/frontend/dist`;

  // Nginx root: /home/wwwroot/roidemo.geniego.com/frontend/dist
  // Files deployed to: /home/wwwroot/roidemo.geniego.com/dist
  // Fix: copy everything from dist/ to frontend/dist/

  console.log('1. Copying files to nginx root...');
  
  // Ensure frontend/dist exists
  await ex(c, `mkdir -p ${NGINX_ROOT}/assets`);

  // Copy index.html
  await ex(c, `cp ${DEMO}/dist/index.html ${NGINX_ROOT}/index.html`);
  
  // Copy sw.js
  await ex(c, `cp ${DEMO}/dist/sw.js ${NGINX_ROOT}/sw.js 2>/dev/null || true`);
  
  // Copy all static files
  await ex(c, `cp ${DEMO}/dist/*.png ${NGINX_ROOT}/ 2>/dev/null || true`);
  await ex(c, `cp ${DEMO}/dist/*.json ${NGINX_ROOT}/ 2>/dev/null || true`);
  await ex(c, `cp ${DEMO}/dist/*.css ${NGINX_ROOT}/ 2>/dev/null || true`);
  await ex(c, `cp ${DEMO}/dist/.htaccess ${NGINX_ROOT}/ 2>/dev/null || true`);

  // Copy ALL assets
  await ex(c, `cp -f ${DEMO}/dist/assets/* ${NGINX_ROOT}/assets/`);
  console.log('   ✅ Files copied');

  // 2. Verify
  const indexExists = await ex(c, `test -f ${NGINX_ROOT}/index.html && echo YES || echo NO`);
  console.log('2. index.html:', indexExists.trim());

  const assetCount = await ex(c, `ls ${NGINX_ROOT}/assets/ | wc -l`);
  console.log('   assets count:', assetCount.trim());

  const dashChunk = await ex(c, `ls ${NGINX_ROOT}/assets/ | grep Dashboard`);
  console.log('   Dashboard chunk:', dashChunk.trim().split('\n')[0]);

  // 3. Check if roidemo code is in the correct Dashboard file
  const hasCode = await ex(c, `grep -c 'roidemo' ${NGINX_ROOT}/assets/Dashboard-CHfqMQdf.js 2>/dev/null`);
  console.log('   "roidemo" in Dashboard:', hasCode.trim());

  // 4. Test via nginx
  const httpTest = await ex(c, `curl -sI 'https://roidemo.genie-go.com/assets/Dashboard-CHfqMQdf.js' -k 2>/dev/null | head -5`);
  console.log('\n3. HTTPS test:', httpTest.trim());

  // 5. Reload nginx
  await ex(c, 'nginx -s reload');
  console.log('\n4. ✅ Nginx reloaded');

  c.end();
  console.log('\n🎉 파일 경로 수정 완료!');
})();
