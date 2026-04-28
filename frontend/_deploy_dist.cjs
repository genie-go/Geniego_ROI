// Deploy to ALL environments — ALWAYS creates fresh tar from dist/
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

let archiver;
try { archiver = require('archiver'); } catch {
  require('child_process').execSync('npm install archiver --no-save', { cwd: __dirname, stdio: 'inherit' });
  archiver = require('archiver');
}

const CFG = {
  host: '1.201.177.46', port: 22,
  username: 'root', password: 'vot@Wlroi6!',
};
const DIST_DIR = path.join(__dirname, 'dist');
const LOCAL_TAR = path.join(require('os').tmpdir(), 'dist.tar.gz');
const REMOTE_TMP = '/tmp/dist_deploy.tar.gz';
const TARGETS = [
  '/home/wwwroot/roi.geniego.com/frontend/dist',       // 운영 (roi.geniego.com)
  '/home/wwwroot/roi.genie-go.com/frontend/dist',      // 운영 대체 도메인
  '/home/wwwroot/roidemo.genie-go.com/frontend/dist',  // 데모 대체 경로
  '/home/wwwroot/roidemo.geniego.com/frontend/dist',   // ★ 데모 실제 nginx root
];

if (!fs.existsSync(DIST_DIR)) { console.error('❌ dist/ 디렉토리가 없습니다. npm run build를 먼저 실행하세요.'); process.exit(1); }

// Step 0: Always create fresh tar.gz from current dist/
console.log('[0/4] Creating fresh dist.tar.gz from dist/ ...');
const output = fs.createWriteStream(LOCAL_TAR);
const archive = archiver('tar', { gzip: true });
archive.on('error', err => { throw err; });
archive.pipe(output);
archive.directory(DIST_DIR, false);
archive.finalize();

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(1);
  console.log(`[1/4] Archive created: ${sizeMB} MB`);

  // Step 1: Upload and deploy via SSH
  const conn = new Client();
  conn.on('ready', () => {
    console.log('[2/4] Connected. Uploading...');
    conn.sftp((err, sftp) => {
      if (err) { console.error(err); process.exit(1); }
      const rs = fs.createReadStream(LOCAL_TAR);
      const ws = sftp.createWriteStream(REMOTE_TMP);
      ws.on('close', () => {
        console.log('[3/4] Upload done. Extracting to all targets...');
        const cmds = TARGETS.map(t =>
          `mkdir -p ${t} && rm -rf ${t}/* && tar -xzf ${REMOTE_TMP} -C ${t}/`
        ).join(' && ');
        const fullCmd = cmds + ` && rm ${REMOTE_TMP} && echo ALL_DEPLOY_OK`;
        conn.exec(fullCmd, (e2, stream) => {
          if (e2) { console.error(e2); process.exit(1); }
          stream.on('data', d => process.stdout.write(d));
          stream.stderr.on('data', d => process.stderr.write(d));
          stream.on('close', code => {
            console.log(`[4/4] Done (exit ${code})`);
            conn.end(); process.exit(code || 0);
          });
        });
      });
      ws.on('error', e => { console.error(e); process.exit(1); });
      rs.pipe(ws);
    });
  }).connect(CFG);
});
