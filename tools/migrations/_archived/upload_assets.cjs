const { Client } = require('ssh2');
const fs = require('fs');

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
  const c = await conn();
  const DEMO = '/home/wwwroot/roidemo.geniego.com';

  // Check the current index.html on server
  const serverIndex = await ex(c, `cat ${DEMO}/dist/index.html`);
  console.log('Server index.html:\n', serverIndex);

  // Check our local index.html
  const localIndex = fs.readFileSync('d:\\project\\GeniegoROI\\frontend\\dist\\index.html', 'utf-8');
  console.log('\nLocal index.html:\n', localIndex);

  // Compare js filenames
  const serverAssets = await ex(c, `ls ${DEMO}/dist/assets/ | grep 'index-' | head -3`);
  console.log('Server assets (index-):', serverAssets.trim());

  const localAssets = fs.readdirSync('d:\\project\\GeniegoROI\\frontend\\dist\\assets').filter(f => f.startsWith('index-'));
  console.log('Local assets (index-):', localAssets.join(', '));

  // If different, upload fresh index.html and new assets
  if (!serverAssets.includes(localAssets[0])) {
    console.log('\n⚠️ Build mismatch! Uploading new index.html and new assets...');

    // Upload index.html
    await sftpUpload(c, 'd:\\project\\GeniegoROI\\frontend\\dist\\index.html', `${DEMO}/dist/index.html`);
    console.log('✅ index.html uploaded');

    // Upload all assets one by one
    const allAssets = fs.readdirSync('d:\\project\\GeniegoROI\\frontend\\dist\\assets');
    console.log(`📤 Uploading ${allAssets.length} assets...`);

    let uploaded = 0;
    for (const file of allAssets) {
      try {
        await sftpUpload(c, `d:\\project\\GeniegoROI\\frontend\\dist\\assets\\${file}`, `${DEMO}/dist/assets/${file}`);
        uploaded++;
        if (uploaded % 10 === 0) console.log(`   ${uploaded}/${allAssets.length}...`);
      } catch(e) {
        console.log(`   ⚠️ Failed: ${file} - ${e.message}`);
        // Wait a bit and retry
        await new Promise(r => setTimeout(r, 500));
        try {
          const c2 = await conn();
          await sftpUpload(c2, `d:\\project\\GeniegoROI\\frontend\\dist\\assets\\${file}`, `${DEMO}/dist/assets/${file}`);
          c2.end();
          uploaded++;
        } catch(e2) {
          console.log(`   ❌ Skipped: ${file}`);
        }
      }
    }
    console.log(`✅ ${uploaded}/${allAssets.length} assets uploaded`);
  } else {
    console.log('✅ Build is current!');
  }

  // Verify final state
  const finalCheck = await ex(c, `cat ${DEMO}/dist/index.html | head -5`);
  console.log('\nFinal index.html:\n', finalCheck);

  await ex(c, 'nginx -s reload');
  console.log('Nginx reloaded');

  c.end();
})();
