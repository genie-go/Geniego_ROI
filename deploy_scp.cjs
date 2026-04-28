/**
 * deploy_scp.cjs — SSH2 기반 프로덕션 배포 스크립트
 * frontend/dist → remote:/home/wwwroot/roi.geniego.com/frontend/dist
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const REMOTE = {
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
  readyTimeout: 30000,
};

const LOCAL_DIR = path.resolve(__dirname, 'frontend', 'dist');
const REMOTE_DIR = '/home/wwwroot/roi.geniego.com/frontend/dist';

// Recursively gather all files in a directory
function walkDir(dir, base = dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDir(full, base));
    } else {
      results.push({ local: full, rel: path.relative(base, full).replace(/\\/g, '/') });
    }
  }
  return results;
}

async function deploy() {
  if (!fs.existsSync(LOCAL_DIR)) {
    console.error(`❌ Build directory not found: ${LOCAL_DIR}`);
    process.exit(1);
  }

  const files = walkDir(LOCAL_DIR);
  console.log(`📦 ${files.length} files to deploy from ${LOCAL_DIR}`);

  const conn = new Client();

  return new Promise((resolve, reject) => {
    conn.on('ready', () => {
      console.log('✅ SSH connected');

      conn.sftp((err, sftp) => {
        if (err) { reject(err); return; }

        // Collect unique remote directories
        const dirs = new Set();
        files.forEach(f => {
          const parts = f.rel.split('/');
          for (let i = 1; i <= parts.length - 1; i++) {
            dirs.add(REMOTE_DIR + '/' + parts.slice(0, i).join('/'));
          }
        });

        // Ensure remote directories exist
        const sortedDirs = [...dirs].sort();
        let dirIdx = 0;

        function ensureDirs(cb) {
          if (dirIdx >= sortedDirs.length) { cb(); return; }
          const d = sortedDirs[dirIdx++];
          sftp.mkdir(d, (err) => {
            // ignore EEXIST
            ensureDirs(cb);
          });
        }

        ensureDirs(() => {
          console.log(`📁 Directories ensured (${sortedDirs.length})`);

          let fileIdx = 0;
          let uploaded = 0;

          function uploadNext() {
            if (fileIdx >= files.length) {
              console.log(`\n✅ Deployment complete — ${uploaded} files uploaded`);
              conn.end();
              resolve();
              return;
            }

            const f = files[fileIdx++];
            const remotePath = REMOTE_DIR + '/' + f.rel;

            sftp.fastPut(f.local, remotePath, (err) => {
              if (err) {
                console.error(`  ❌ ${f.rel}: ${err.message}`);
              } else {
                uploaded++;
                if (uploaded % 20 === 0 || uploaded === files.length) {
                  process.stdout.write(`  📤 ${uploaded}/${files.length} files...\r`);
                }
              }
              uploadNext();
            });
          }

          uploadNext();
        });
      });
    });

    conn.on('error', (err) => {
      console.error('❌ SSH error:', err.message);
      reject(err);
    });

    console.log(`🔗 Connecting to ${REMOTE.host}...`);
    conn.connect(REMOTE);
  });
}

deploy().then(() => {
  console.log('🎉 Production deploy finished');
  process.exit(0);
}).catch(err => {
  console.error('💥 Deploy failed:', err.message);
  process.exit(1);
});
