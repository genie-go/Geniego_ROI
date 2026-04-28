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
  console.log('🚀 운영 서버 배포 시작...');
  const c = await conn();

  // 1. Find production nginx root
  const prodConf = await ex(c, `grep 'root' /usr/local/nginx/conf/vhost/roi.genie-go.com.conf | head -3`);
  console.log('Prod nginx root:', prodConf.trim());

  // Extract root path
  const rootMatch = prodConf.match(/root\s+([^;]+)/);
  const PROD_ROOT = rootMatch ? rootMatch[1].trim() : '/home/wwwroot/roi.geniego.com/frontend/dist';
  console.log('Using root:', PROD_ROOT);

  const LOCAL_DIST = 'd:\\project\\GeniegoROI\\frontend\\dist';

  // 2. Clean assets
  console.log('1. 구 assets 삭제...');
  await ex(c, `rm -rf ${PROD_ROOT}/assets/*`);

  // 3. Upload index.html
  await sftpUpload(c, path.join(LOCAL_DIST, 'index.html'), `${PROD_ROOT}/index.html`);
  console.log('2. ✅ index.html');

  // 4. Upload all assets
  const assets = fs.readdirSync(path.join(LOCAL_DIST, 'assets'));
  console.log(`3. 📤 ${assets.length} assets...`);
  let ok = 0;
  for (const file of assets) {
    try {
      await sftpUpload(c, path.join(LOCAL_DIST, 'assets', file), `${PROD_ROOT}/assets/${file}`);
      ok++;
      if (ok % 20 === 0) console.log(`   ${ok}/${assets.length}`);
    } catch {
      await new Promise(r => setTimeout(r, 300));
      try { const c2 = await conn(); await sftpUpload(c2, path.join(LOCAL_DIST, 'assets', file), `${PROD_ROOT}/assets/${file}`); c2.end(); ok++; } catch { console.log(`   ❌ ${file}`); }
    }
  }
  console.log(`✅ ${ok}/${assets.length}`);

  // 5. Verify
  const idx = await ex(c, `grep 'index-' ${PROD_ROOT}/index.html`);
  console.log('Verify:', idx.trim().substring(0, 100));

  await ex(c, 'nginx -s reload');
  console.log('🔄 Nginx reloaded');

  c.end();
  console.log('\n✅ 운영 서버 배포 완료!');
})();
