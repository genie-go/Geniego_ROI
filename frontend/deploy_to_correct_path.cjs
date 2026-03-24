// deploy_to_correct_path.cjs - Nginx root 경로(/frontend/dist)에 정확히 배포
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
let Client, ssh2;
try { Client = require('ssh2-sftp-client'); } catch {
  execSync('npm install ssh2-sftp-client', { stdio: 'inherit', cwd: __dirname });
  Client = require('ssh2-sftp-client');
}
try { ssh2 = require('ssh2'); } catch {
  execSync('npm install ssh2', { stdio: 'inherit', cwd: __dirname });
  ssh2 = require('ssh2');
}

const sshConfig = {
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
  readyTimeout: 15000,
};

const LOCAL_DIST = path.join(__dirname, 'dist');
// ★ 정확한 Nginx root 경로
const REMOTE_DIR = '/home/wwwroot/roi.geniego.com/frontend/dist';

function sshRun(cmd) {
  return new Promise((res, rej) => {
    const conn = new ssh2.Client();
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) { conn.end(); rej(err); return; }
        let out = '';
        stream.on('data', d => out += d);
        stream.stderr.on('data', d => out += d);
        stream.on('close', () => { conn.end(); res(out.trim()); });
      });
    }).connect(sshConfig);
  });
}

(async () => {
  console.log('Step 1: Delete old assets from correct path...');
  const deleted = await sshRun(`rm -rf ${REMOTE_DIR}/assets && echo "DELETED"`);
  console.log(deleted);
  
  console.log('\nStep 2: Ensure directory exists...');
  const mkdir = await sshRun(`mkdir -p ${REMOTE_DIR} && echo "OK"`);
  console.log(mkdir);
  
  console.log('\nStep 3: Upload fresh dist to correct Nginx root...');
  const sftp = new Client();
  await sftp.connect(sshConfig);
  await sftp.uploadDir(LOCAL_DIST, REMOTE_DIR);
  await sftp.end();
  console.log('Upload complete!');
  
  console.log('\nStep 4: Verify uploaded files...');
  const verify = await sshRun(`ls ${REMOTE_DIR}/assets/ | grep i18n`);
  console.log('i18n files:', verify);
  
  const indexRef = await sshRun(`grep -o 'i18n-locales-[^"]*' ${REMOTE_DIR}/index.html`);
  console.log('index.html i18n ref:', indexRef);
  
  const swVer = await sshRun(`grep "CACHE_NAME = " ${REMOTE_DIR}/sw.js`);
  console.log('sw.js version:', swVer);
  
  console.log('\nDone!');
})();
