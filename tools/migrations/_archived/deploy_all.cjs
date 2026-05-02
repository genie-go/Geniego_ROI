/**
 * Deploy frontend/dist to BOTH production and demo servers
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!',
};
const LOCAL_DIR = path.join(__dirname, 'frontend', 'dist');
const TARGETS = [
  '/home/wwwroot/roi.geniego.com/frontend/dist',
  '/home/wwwroot/roidemo.geniego.com/frontend/dist',
];

function walkDir(dir, base = dir) {
  let r = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) r = r.concat(walkDir(f, base));
    else r.push({ local: f, rel: path.relative(base, f).split(path.sep).join('/') });
  }
  return r;
}

async function deploy() {
  const files = walkDir(LOCAL_DIR);
  console.log(`[DEPLOY] ${files.length} files`);

  const conn = new Client();
  await new Promise((r, j) => { conn.on('ready', r); conn.on('error', j); conn.connect(CONFIG); });

  const sftp = await new Promise((r, j) => conn.sftp((e, s) => e ? j(e) : r(s)));

  for (const REMOTE of TARGETS) {
    // Clean assets and recreate
    await new Promise(r => {
      conn.exec(`rm -rf ${REMOTE}/assets ${REMOTE}/popup-themes; mkdir -p ${REMOTE}/assets ${REMOTE}/popup-themes`, (_, s) => {
        s.on('close', r); s.resume();
      });
    });

    const dirs = new Set();
    for (const f of files) { const p = f.rel.split('/'); for (let i = 1; i < p.length; i++) dirs.add(p.slice(0, i).join('/')); }
    for (const d of [...dirs].sort()) {
      await new Promise(r => sftp.mkdir(`${REMOTE}/${d}`, () => r()));
    }

    let n = 0;
    for (let i = 0; i < files.length; i += 5) {
      const b = files.slice(i, i + 5);
      await Promise.all(b.map(f => new Promise(r => sftp.fastPut(f.local, `${REMOTE}/${f.rel}`, e => { if (!e) n++; r(); }))));
    }
    console.log(`[DEPLOY] ${REMOTE}: ${n}/${files.length} ✅`);
  }

  // Reload nginx
  await new Promise(r => {
    conn.exec('/usr/local/nginx/sbin/nginx -s reload 2>/dev/null; nginx -s reload 2>/dev/null; echo DONE', (_, s) => {
      s.on('close', r); s.resume();
    });
  });

  conn.end();
  console.log('[DEPLOY] ALL DONE');
}

deploy().catch(e => { console.error(e.message); process.exit(1); });
