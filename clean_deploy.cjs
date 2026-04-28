const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

function conn() { return new Promise((r,j) => { const c = new Client(); c.on('ready', () => r(c)); c.on('error', j); c.connect({host:'1.201.177.46',port:22,username:'root',password:'vot@Wlroi6!'}); }); }
function ex(c, cmd) { return new Promise((r,j) => { c.exec(cmd, (e,s) => { if(e) return j(e); let o=''; s.on('data',d=>o+=d.toString()); s.stderr.on('data',d=>o+=d.toString()); s.on('close',()=>r(o)); }); }); }
function sftpUpload(c, localPath, remotePath) {
  return new Promise((r,j) => {
    c.sftp((err, sftp) => {
      if(err) return j(err);
      sftp.fastPut(localPath, remotePath, (err) => {
        sftp.end();
        if(err) return j(err);
        r();
      });
    });
  });
}

(async () => {
  console.log('🧹 완전 클린 배포 시작...');
  const DEMO = '/home/wwwroot/roidemo.geniego.com';
  const LOCAL_DIST = 'd:\\project\\GeniegoROI\\frontend\\dist';

  const c = await conn();
  console.log('SSH connected');

  // 1. DELETE all old assets from server
  console.log('1. 서버 assets 전체 삭제...');
  await ex(c, `rm -rf ${DEMO}/dist/assets/*`);
  
  // 2. Upload index.html 
  await sftpUpload(c, path.join(LOCAL_DIST, 'index.html'), `${DEMO}/dist/index.html`);
  console.log('2. ✅ index.html');

  // 3. Upload sw.js that busts cache
  const swCode = `// v${Date.now()}
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});`;
  await ex(c, `cat > ${DEMO}/dist/sw.js << 'EOF'
${swCode}
EOF`);
  console.log('3. ✅ sw.js (cache killer)');

  // 4. Upload ALL new assets
  const assets = fs.readdirSync(path.join(LOCAL_DIST, 'assets'));
  console.log(`4. 📤 ${assets.length} assets 업로드...`);
  let ok = 0;
  for (const file of assets) {
    try {
      await sftpUpload(c, path.join(LOCAL_DIST, 'assets', file), `${DEMO}/dist/assets/${file}`);
      ok++;
      if (ok % 20 === 0) console.log(`   ${ok}/${assets.length}...`);
    } catch {
      await new Promise(r => setTimeout(r, 300));
      try {
        const c2 = await conn();
        await sftpUpload(c2, path.join(LOCAL_DIST, 'assets', file), `${DEMO}/dist/assets/${file}`);
        c2.end(); ok++;
      } catch { console.log(`   ❌ ${file}`); }
    }
  }
  console.log(`   ✅ ${ok}/${assets.length}`);

  // 5. Verify no old files remain
  const serverAssets = await ex(c, `ls ${DEMO}/dist/assets/ | wc -l`);
  console.log(`5. 서버 assets: ${serverAssets.trim()} (로컬: ${assets.length})`);

  // Check for the new Dashboard chunk
  const dashChunk = await ex(c, `ls ${DEMO}/dist/assets/ | grep Dashboard`);
  console.log(`   Dashboard chunk: ${dashChunk.trim()}`);

  const localDash = assets.filter(f => f.startsWith('Dashboard'));
  console.log(`   Local Dashboard: ${localDash.join(', ')}`);

  // 6. Add Cache-Control headers via .htaccess
  await ex(c, `cat > ${DEMO}/dist/.htaccess << 'EOF'
<IfModule mod_headers.c>
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
  Header set Expires 0
</IfModule>
EOF`);

  await ex(c, 'nginx -s reload');
  console.log('6. ✅ Nginx reloaded');

  c.end();
  console.log('\n🎉 완전 클린 배포 완료!');
})();
