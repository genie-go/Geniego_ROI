// fix_server_cache.cjs - 서버 nginx 캐시 삭제 및 index.html 강제 재업로드
const path = require('path');
const fs = require('fs');
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

const sshConfig = {
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
  readyTimeout: 15000,
};

const REMOTE = '/home/wwwroot/roi.geniego.com/frontend/dist';

function sshRun(cmd) {
  return new Promise((res, rej) => {
    const conn = new ssh2Client.Client();
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
  // 1. 서버 index.html의 i18n 파일 참조 확인
  console.log('Step 1: Check server index.html...');
  const i18nRef = await sshRun(`grep -o 'i18n-locales-[^"]*\\.js' ${REMOTE}/index.html`);
  console.log('Server i18n bundle:', i18nRef);
  
  const localIndexPath = path.join(__dirname, 'dist/index.html');
  const localContent = fs.readFileSync(localIndexPath, 'utf8');
  const localI18nRef = (localContent.match(/i18n-locales-[^"]*\.js/) || ['NOT FOUND'])[0];
  console.log('Local i18n bundle:', localI18nRef);
  
  // 2. Nginx 캐시 삭제
  console.log('\nStep 2: Clear nginx cache...');
  const cacheClear = await sshRun('find /var/cache/nginx -type f -delete 2>/dev/null && echo "nginx cache cleared" || echo "no nginx cache"');
  console.log(cacheClear);
  
  // 3. proxy cache 삭제 
  const proxyClear = await sshRun('find /tmp/nginx-cache -type f -delete 2>/dev/null; find /var/cache -name "*.html" -delete 2>/dev/null; echo "proxy cache clear attempted"');
  console.log(proxyClear);
  
  // 4. 서버에서 현재 index.html을 삭제하고 latest로 교체  
  console.log('\nStep 3: Force replace index.html...');
  await sshRun(`rm -f ${REMOTE}/index.html`);
  
  // SFTP로 최신 index.html 업로드
  const sftp = new Client();
  await sftp.connect(sshConfig);
  await sftp.put(localIndexPath, `${REMOTE}/index.html`);
  await sftp.end();
  console.log('index.html re-uploaded via SFTP');
  
  // 5. 재확인
  const newRef = await sshRun(`grep -o 'i18n-locales-[^"]*\\.js' ${REMOTE}/index.html`);
  console.log('New server i18n bundle:', newRef);
  
  // 6. Nginx 재시작 시도
  const restart = await sshRun('nginx -s reload 2>&1 || service nginx restart 2>&1 || systemctl restart nginx 2>&1 || echo "restart attempted"');
  console.log('Web server restart:', restart);
  
  console.log('\nDone!');
})();
