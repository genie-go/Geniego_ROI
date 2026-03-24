// clear_and_deploy.cjs — 서버 구 파일 삭제 + 최신 dist 전체 재업로드
const path = require('path');
const { execSync } = require('child_process');
let Client;
try { Client = require('ssh2-sftp-client'); } catch {
  execSync('npm install ssh2-sftp-client', { stdio: 'inherit', cwd: __dirname });
  Client = require('ssh2-sftp-client');
}
let ssh2Client;
try { ssh2Client = require('ssh2'); } catch {
  execSync('npm install ssh2', { stdio: 'inherit', cwd: __dirname });
  ssh2Client = require('ssh2');
}

const config = {
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
  readyTimeout: 15000,
};

const LOCAL_DIST = path.join(__dirname, 'dist');
const REMOTE_DIR = '/home/wwwroot/roi.geniego.com';

// Step 1: SSH로 서버 기존 assets 디렉토리 삭제 + Nginx 캐시 초기화
function runSshCommand(command) {
  return new Promise((resolve, reject) => {
    const conn = new ssh2Client.Client();
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) { conn.end(); reject(err); return; }
        let out = '';
        stream.on('data', d => out += d);
        stream.stderr.on('data', d => out += d);
        stream.on('close', () => { conn.end(); resolve(out); });
      });
    }).connect(config);
  });
}

const sftp = new Client();

(async () => {
  console.log('Step 1: Clearing server assets directory...');
  try {
    const r1 = await runSshCommand(`rm -rf ${REMOTE_DIR}/assets && echo "assets deleted"`);
    console.log('Server assets cleared:', r1.trim());
  } catch(e) { console.log('rm warning:', e.message); }

  try {
    const r2 = await runSshCommand('nginx -s reload && echo "nginx reloaded"');
    console.log('Nginx:', r2.trim());
  } catch(e) { console.log('nginx reload:', e.message); }

  console.log('\nStep 2: Uploading fresh dist...');
  await sftp.connect(config);
  console.log('SSH connected');
  await sftp.uploadDir(LOCAL_DIST, REMOTE_DIR);
  console.log('Upload complete!');
  await sftp.end();
  console.log('Done.');
})();
