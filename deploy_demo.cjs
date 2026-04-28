/**
 * Deploy frontend/dist to DEMO server via SSH2/SFTP
 * Fixed: explicitly use forward slashes for remote paths
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
const REMOTE_DIRS = [
  '/home/wwwroot/roidemo.geniego.com/frontend/dist',
];

function walkDir(dir, base = dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDir(full, base));
    } else {
      // Force forward slashes for remote path
      const rel = path.relative(base, full).split(path.sep).join('/');
      results.push({ local: full, relative: rel });
    }
  }
  return results;
}

async function sftpMkdir(sftp, dirPath) {
  return new Promise((resolve) => {
    sftp.mkdir(dirPath, (err) => resolve());
  });
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

  for (const REMOTE_DIR of REMOTE_DIRS) {
    console.log(`\n[DEPLOY] Target: ${REMOTE_DIR}`);

    // First, clean old broken files via exec
    await new Promise((resolve) => {
      conn.exec(`rm -rf ${REMOTE_DIR}/assets; mkdir -p ${REMOTE_DIR}/assets; mkdir -p ${REMOTE_DIR}/popup-themes`, (err, stream) => {
        if (err) { resolve(); return; }
        stream.on('close', resolve);
        stream.resume();
      });
    });
    console.log('[DEPLOY] Cleaned and created directories on server');

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
      await sftpMkdir(sftp, `${REMOTE_DIR}/${d}`);
    }
    console.log(`[DEPLOY] ${dirs.size} directories ensured`);

    // Upload files in batches
    let uploaded = 0;
    let failed = 0;
    const BATCH = 5;
    for (let i = 0; i < files.length; i += BATCH) {
      const batch = files.slice(i, i + BATCH);
      await Promise.all(batch.map(f => {
        const remotePath = `${REMOTE_DIR}/${f.relative}`;
        return new Promise((resolve) => {
          sftp.fastPut(f.local, remotePath, (err) => {
            if (err) {
              console.error(`\n  FAIL: ${f.relative} -> ${err.message}`);
              failed++;
            } else {
              uploaded++;
            }
            resolve();
          });
        });
      }));
      process.stdout.write(`\r[DEPLOY] ${uploaded}/${files.length} uploaded`);
    }
    console.log(`\n[DEPLOY] ✅ ${uploaded} OK, ${failed} failed -> ${REMOTE_DIR}`);
  }

  // Verify
  await new Promise((resolve) => {
    conn.exec('ls /home/wwwroot/roidemo.geniego.com/frontend/dist/assets/index* 2>&1', (err, stream) => {
      let d = '';
      stream.on('data', x => d += x);
      stream.on('close', () => { console.log('\n[VERIFY]', d.trim()); resolve(); });
    });
  });

  conn.end();
}

deploy().catch(e => { console.error('[DEPLOY] FATAL:', e.message); process.exit(1); });
