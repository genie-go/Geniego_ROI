/**
 * SSH2 프로덕션 배포 v5 — 정확한 서버 경로
 * 경로: /home/wwwroot/roi.genie-go.com/frontend/dist/
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'frontend', 'dist');
const REMOTE_DIR = '/home/wwwroot/roi.genie-go.com/frontend/dist';

const SSH_CONFIG = {
  host: 'roi.genie-go.com',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
  readyTimeout: 30000,
};

function getAllFiles(dir, base = '') {
  let results = [];
  for (const item of fs.readdirSync(dir)) {
    const fp = path.join(dir, item);
    const rp = base ? `${base}/${item}` : item;
    const st = fs.statSync(fp);
    if (st.isDirectory()) {
      results.push({ type: 'dir', relPath: rp });
      results = results.concat(getAllFiles(fp, rp));
    } else {
      results.push({ type: 'file', relPath: rp, fullPath: fp, size: st.size });
    }
  }
  return results;
}

function runSSH(cmd) {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on('ready', () => {
      c.exec(cmd, (err, stream) => {
        if (err) { c.end(); reject(err); return; }
        let out = '';
        stream.on('data', d => { out += d; });
        stream.stderr.on('data', d => { out += d; });
        stream.on('close', (code) => { c.end(); resolve({ code, out }); });
      });
    });
    c.on('error', reject);
    c.connect(SSH_CONFIG);
  });
}

async function main() {
  const all = getAllFiles(DIST);
  const dirs = all.filter(f => f.type === 'dir');
  const files = all.filter(f => f.type === 'file');
  const totalMB = files.reduce((s, f) => s + f.size, 0) / 1048576;
  console.log(`📦 ${files.length} files, ${dirs.length} dirs, ${totalMB.toFixed(1)} MB`);

  // Step 1: 기존 assets 삭제 + 디렉토리 확인
  console.log('\n🗑️  Clearing old assets on server...');
  const r = await runSSH(`rm -rf ${REMOTE_DIR}/assets/* && mkdir -p ${REMOTE_DIR}/assets ${REMOTE_DIR}/popup-themes && ls ${REMOTE_DIR}/ && echo "CLEAR_OK"`);
  console.log('  Server:', r.out.trim());

  // Step 2: SFTP 업로드
  console.log('\n📤 Uploading new build...');
  await new Promise((resolve, reject) => {
    const c = new Client();
    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) { c.end(); reject(err); return; }
        (async () => {
          // Make dirs
          for (const d of dirs) {
            await new Promise(r => sftp.mkdir(`${REMOTE_DIR}/${d.relPath}`, () => r()));
          }

          let ok = 0, fail = 0, bytes = 0;
          for (const f of files) {
            try {
              await new Promise((res, rej) => {
                sftp.fastPut(f.fullPath, `${REMOTE_DIR}/${f.relPath}`, {}, e => e ? rej(e) : res());
              });
              ok++; bytes += f.size;
              if (ok % 10 === 0 || ok === files.length) {
                process.stdout.write(`\r  📤 ${ok}/${files.length} (${(bytes/1048576).toFixed(1)}MB)`);
              }
            } catch (e) {
              fail++;
              console.log(`\n  ❌ ${f.relPath}: ${e.message}`);
            }
          }
          console.log(`\n  ✅ ${ok} uploaded, ${fail} failed, ${(bytes/1048576).toFixed(1)}MB`);
          c.end();
          if (fail > 5) reject(new Error(`${fail} files failed`));
          else resolve();
        })();
      });
    });
    c.on('error', reject);
    c.connect(SSH_CONFIG);
  });

  // Step 3: Verify
  console.log('\n🔍 Verifying deployment...');
  const v = await runSSH(`ls -la ${REMOTE_DIR}/index.html && ls ${REMOTE_DIR}/assets/ | wc -l && echo "VERIFY_OK"`);
  console.log('  Verify:', v.out.trim());

  console.log('\n🎉 Production deployment complete!');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
