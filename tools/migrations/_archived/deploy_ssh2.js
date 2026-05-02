/**
 * Windows-compatible SSH2 deployment script
 * Uses ssh2 npm package for password-based authentication
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
  readyTimeout: 30000,
  keepaliveInterval: 10000,
};

const LOCAL_DIST = path.join(__dirname, 'frontend', 'dist');
const REMOTE_DIST = '/home/wwwroot/roi.geniego.com/frontend/dist';

// Recursively collect all files in a directory
function walkDir(dir, base = '') {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const rel = base ? `${base}/${item}` : item;
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walkDir(full, rel));
    } else {
      files.push({ local: full, remote: rel, size: fs.statSync(full).size });
    }
  }
  return files;
}

// Execute remote command via SSH
function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '', stderr = '';
      stream.on('data', d => { stdout += d; });
      stream.stderr.on('data', d => { stderr += d; });
      stream.on('close', (code) => resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code }));
    });
  });
}

// Upload a single file via SFTP
function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(localPath);
    const writeStream = sftp.createWriteStream(remotePath);
    writeStream.on('close', resolve);
    writeStream.on('error', reject);
    readStream.on('error', reject);
    readStream.pipe(writeStream);
  });
}

// Make remote directory recursively
function mkdirp(sftp, remotePath) {
  return new Promise((resolve) => {
    sftp.mkdir(remotePath, (err) => {
      resolve(); // ignore error — may already exist
    });
  });
}

async function deploy() {
  console.log('═══════════════════════════════════════');
  console.log('  GeniegoROI Production Deployment');
  console.log('  SSH2 Password-based Deploy');
  console.log('═══════════════════════════════════════\n');

  if (!fs.existsSync(LOCAL_DIST)) {
    console.error('❌ Build directory does not exist:', LOCAL_DIST);
    process.exit(1);
  }

  const files = walkDir(LOCAL_DIST);
  console.log(`📁 Local build: ${LOCAL_DIST}`);
  console.log(`📦 Total files: ${files.length}`);
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  console.log(`📊 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`);

  // Collect unique directories
  const dirs = new Set();
  files.forEach(f => {
    const parts = f.remote.split('/');
    for (let i = 1; i <= parts.length - 1; i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  });

  const conn = new Client();

  return new Promise((resolve, reject) => {
    conn.on('ready', async () => {
      console.log('✅ SSH connected to', CONFIG.host);
      
      try {
        // Step 1: Clean old dist
        console.log('\n🧹 Step 1: Cleaning remote dist/assets...');
        const cleanResult = await exec(conn, `rm -rf ${REMOTE_DIST}/assets && mkdir -p ${REMOTE_DIST}/assets`);
        console.log('   ✅ Remote assets cleaned');

        // Step 2: SFTP upload
        console.log('\n📤 Step 2: Starting SFTP upload...');
        
        conn.sftp((err, sftp) => {
          if (err) { console.error('❌ SFTP error:', err.message); conn.end(); reject(err); return; }

          (async () => {
            // Create directories first
            console.log(`   📁 Creating ${dirs.size} directories...`);
            for (const dir of [...dirs].sort()) {
              await mkdirp(sftp, `${REMOTE_DIST}/${dir}`);
            }
            console.log('   ✅ Directories created');

            // Upload files
            let uploaded = 0;
            let failed = 0;
            const startTime = Date.now();

            for (const file of files) {
              try {
                await uploadFile(sftp, file.local, `${REMOTE_DIST}/${file.remote}`);
                uploaded++;
                if (uploaded % 20 === 0 || uploaded === files.length) {
                  const pct = Math.round((uploaded / files.length) * 100);
                  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                  process.stdout.write(`\r   📤 Progress: ${uploaded}/${files.length} (${pct}%) — ${elapsed}s`);
                }
              } catch (e) {
                failed++;
                console.log(`\n   ❌ Failed: ${file.remote} — ${e.message}`);
              }
            }

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`\n\n${'═'.repeat(40)}`);
            console.log(`📊 Deployment Summary:`);
            console.log(`   Total:    ${files.length} files`);
            console.log(`   Uploaded: ${uploaded}`);
            console.log(`   Failed:   ${failed}`);
            console.log(`   Time:     ${totalTime}s`);
            console.log(`   Size:     ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`${'═'.repeat(40)}\n`);

            if (failed === 0) {
              console.log('🎉 Deployment completed successfully!');
              console.log('🌐 Visit: https://roi.genie-go.com');
            } else {
              console.log(`⚠ Partial deployment: ${failed} files failed`);
            }

            sftp.end();
            conn.end();
            resolve();
          })();
        });
      } catch (e) {
        console.error('❌ Deploy error:', e.message);
        conn.end();
        reject(e);
      }
    });

    conn.on('error', (err) => {
      console.error('❌ SSH connection error:', err.message);
      reject(err);
    });

    console.log(`🔌 Connecting to ${CONFIG.host}:${CONFIG.port}...`);
    conn.connect(CONFIG);
  });
}

deploy().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
