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
  console.log('🚀 데모 모드 빌드 배포 시작...');
  const DEMO = '/home/wwwroot/roidemo.geniego.com';
  const LOCAL_DIST = 'd:\\project\\GeniegoROI\\frontend\\dist';

  const c = await conn();
  console.log('SSH connected');

  // 1. Upload index.html
  await sftpUpload(c, path.join(LOCAL_DIST, 'index.html'), `${DEMO}/dist/index.html`);
  console.log('✅ index.html uploaded');

  // 2. Upload all assets
  const assets = fs.readdirSync(path.join(LOCAL_DIST, 'assets'));
  console.log(`📤 ${assets.length} assets uploading...`);

  let ok = 0, fail = 0;
  for (const file of assets) {
    try {
      await sftpUpload(c, path.join(LOCAL_DIST, 'assets', file), `${DEMO}/dist/assets/${file}`);
      ok++;
      if (ok % 15 === 0) console.log(`   ${ok}/${assets.length}...`);
    } catch(e) {
      // Retry with new connection
      await new Promise(r => setTimeout(r, 300));
      try {
        const c2 = await conn();
        await sftpUpload(c2, path.join(LOCAL_DIST, 'assets', file), `${DEMO}/dist/assets/${file}`);
        c2.end();
        ok++;
      } catch { fail++; console.log(`   ❌ ${file}`); }
    }
  }
  console.log(`✅ ${ok}/${assets.length} uploaded (${fail} failed)`);

  // 3. Verify
  const verify = await ex(c, `head -1 ${DEMO}/dist/index.html && grep 'index-' ${DEMO}/dist/index.html`);
  console.log('Verify:', verify.trim().substring(0, 200));

  // 4. Nginx reload
  await ex(c, 'nginx -s reload');
  console.log('🔄 Nginx reloaded');

  c.end();
  console.log('\n✅ 배포 완료!');
})();
