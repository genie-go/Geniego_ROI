// check_server_assets.cjs - 서버 assets 디렉토리 파일 목록 확인
const path = require('path');
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

const REMOTE = '/home/wwwroot/roi.geniego.com';
const fs = require('fs');

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
  // 1. 서버 assets 파일 목록
  console.log('=== Server assets directory ===');
  const assetsList = await sshRun(`ls ${REMOTE}/assets/ | grep -E 'i18n|sw' | head -20`);
  console.log(assetsList || '(empty)');
  
  // 2. 서버의 index.html i18n 참조
  console.log('\n=== Server index.html i18n reference ===');
  const indexRef = await sshRun(`grep -o 'i18n-locales-[^"]*' ${REMOTE}/index.html`);
  console.log(indexRef || '(not found)');
  
  // 3. 서버의 sw.js 버전  
  console.log('\n=== Server sw.js cache name ===');
  const swVer = await sshRun(`grep CACHE_NAME ${REMOTE}/sw.js`);
  console.log(swVer || '(not found)');
  
  // 4. 서버에 최신 파일이 있는지 확인
  const hasCfsMXlsp = await sshRun(`ls ${REMOTE}/assets/ | grep CfsMXlsp || echo "NOT FOUND"`);
  console.log('\n=== CfsMXlsp on server:', hasCfsMXlsp);
  
  // 5. 서버 i18n 파일들 모두 보기
  const allI18n = await sshRun(`ls ${REMOTE}/assets/ | grep i18n`);
  console.log('\n=== All i18n files on server:', allI18n);
})();
