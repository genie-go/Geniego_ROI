/**
 * deploy_demo_ssh2.cjs — SSH2 기반 데모 서버 빌드 + 배포
 * 1) vite build --mode demo
 * 2) dist → dist_fresh.zip → SFTP 업로드 → 서버 배포
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRONTEND = path.join(__dirname, 'frontend');
const DIST_DIR = path.join(FRONTEND, 'dist');
const LOCAL_ZIP = path.join(__dirname, 'dist_fresh.zip');
const REMOTE_TMP = '/tmp/roidemo_dist.zip';
const REMOTE_DIR = '/home/wwwroot/roidemo.geniego.com/frontend/dist';

const CONFIG = {
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
  readyTimeout: 30000,
  keepaliveInterval: 10000,
};

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '', errOut = '';
      stream.on('data', d => { out += d; });
      stream.stderr.on('data', d => { errOut += d; });
      stream.on('close', (code) => {
        if (code !== 0) return reject(new Error(`cmd failed (${code}): ${errOut || out}`));
        resolve(out.trim());
      });
    });
  });
}

async function deploy() {
  // ── 0. Build ──
  console.log('🔨 0. 데모 모드 빌드 (--mode demo)...');
  try {
    execSync('npx vite build --mode demo', { cwd: FRONTEND, stdio: 'inherit' });
  } catch (e) {
    console.error('❌ 빌드 실패:', e.message);
    process.exit(1);
  }

  // ── 1. Create ZIP ──
  console.log('📦 1. dist_fresh.zip 생성 중...');
  const archiver = require('archiver');
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(LOCAL_ZIP);
    const archive = archiver('zip', { zlib: { level: 6 } });
    output.on('close', () => {
      console.log(`  ✅ zip 생성 완료: ${(archive.pointer() / 1024 / 1024).toFixed(1)} MB`);
      resolve();
    });
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(DIST_DIR, false);
    archive.finalize();
  });

  const zipSize = fs.statSync(LOCAL_ZIP).size;

  // ── 2. SSH2 Connect + Upload ──
  const conn = new Client();

  conn.on('ready', () => {
    console.log('✅ SSH2 connected');

    conn.sftp((err, sftp) => {
      if (err) { console.error('SFTP error:', err); conn.end(); return; }

      console.log('📤 2. zip 업로드 중...');
      const readStream = fs.createReadStream(LOCAL_ZIP);
      const writeStream = sftp.createWriteStream(REMOTE_TMP);

      let uploaded = 0;
      readStream.on('data', (chunk) => {
        uploaded += chunk.length;
        const pct = ((uploaded / zipSize) * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${pct}% (${(uploaded/1024/1024).toFixed(1)}MB/${(zipSize/1024/1024).toFixed(1)}MB)`);
      });

      writeStream.on('close', async () => {
        console.log('\n  ✅ 업로드 완료');

        try {
          // ── 3. Extract on server ──
          console.log('📂 3. 서버에서 압축 해제 + 배포...');
          await exec(conn, `mkdir -p ${REMOTE_DIR}`);
          await exec(conn, `cd ${REMOTE_DIR} && rm -rf assets/* index.html vite.svg 2>/dev/null; true`);

          try {
            await exec(conn, `cd ${REMOTE_DIR} && unzip -o ${REMOTE_TMP}`);
          } catch {
            console.log('   unzip not found, trying python3...');
            await exec(conn, `python3 -c "import zipfile; z=zipfile.ZipFile('${REMOTE_TMP}'); z.extractall('${REMOTE_DIR}'); z.close()"`);
          }

          await exec(conn, `rm -f ${REMOTE_TMP}`);
          console.log('  ✅ 배포 완료');

          // ── 4. Verify ──
          const indexHtml = await exec(conn, `grep '<script' ${REMOTE_DIR}/index.html | head -1`);
          console.log(`📂 4. 배포 확인: ${indexHtml.trim()}`);

          // ── 5. Nginx reload ──
          await exec(conn, 'nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || true');
          console.log('🔄 5. Nginx 리로드 완료');

          console.log('\n✅ 데모 서버 배포 완료!');
          console.log('🌐 https://roidemo.genie-go.com');
        } catch (e) {
          console.error('❌ Server command error:', e.message);
        }

        conn.end();
      });

      readStream.pipe(writeStream);
    });
  });

  conn.on('error', (err) => {
    console.error('❌ SSH2 connection error:', err.message);
    process.exit(1);
  });

  console.log(`🔗 Connecting to ${CONFIG.host}...`);
  conn.connect(CONFIG);
}

deploy();
