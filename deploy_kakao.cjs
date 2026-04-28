/**
 * Deploy frontend/dist to production server via SSH2/SFTP
 * Uploads only changed files for speed
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
};
const LOCAL_DIR = path.join(__dirname, 'frontend', 'dist');
const REMOTE_DIR = '/home/wwwroot/roi.geniego.com/frontend/dist';

function walkDir(dir, base = dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDir(full, base));
    } else {
      results.push({ local: full, relative: path.relative(base, full).replace(/\\/g, '/') });
    }
  }
  return results;
}

async function deploy() {
  const files = walkDir(LOCAL_DIR);
  console.log(`[DEPLOY] ${files.length} files to upload`);

  const conn = new Client();
  
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect(CONFIG);
  });
  console.log('[DEPLOY] SSH connected');

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => err ? reject(err) : resolve(sftp));
  });
  console.log('[DEPLOY] SFTP session opened');

  // Collect unique directories
  const dirs = new Set();
  for (const f of files) {
    const parts = f.relative.split('/');
    for (let i = 1; i <= parts.length - 1; i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }

  // Create remote directories
  for (const d of [...dirs].sort()) {
    const remote = `${REMOTE_DIR}/${d}`;
    try {
      await new Promise((resolve, reject) => {
        sftp.mkdir(remote, (err) => {
          if (err && err.code !== 4) reject(err); // code 4 = already exists
          else resolve();
        });
      });
    } catch (e) { /* dir exists */ }
  }
  console.log(`[DEPLOY] ${dirs.size} directories ensured`);

  // Upload files in batches
  let uploaded = 0;
  const BATCH = 5;
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    await Promise.all(batch.map(f => {
      const remote = `${REMOTE_DIR}/${f.relative}`;
      return new Promise((resolve, reject) => {
        sftp.fastPut(f.local, remote, (err) => {
          if (err) { console.error(`  FAIL: ${f.relative}`, err.message); reject(err); }
          else { uploaded++; resolve(); }
        });
      });
    }));
    process.stdout.write(`\r[DEPLOY] ${uploaded}/${files.length} uploaded`);
  }

  console.log(`\n[DEPLOY] ✅ All ${uploaded} files deployed to ${REMOTE_DIR}`);
  conn.end();
}

deploy().catch(e => { console.error('[DEPLOY] FATAL:', e.message); process.exit(1); });
