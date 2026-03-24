// check_nginx_conf.cjs - Nginx 설정 확인 및 올바른 경로에 재배포
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
  // 1. Nginx 실제 설정에서 roi 사이트 root 확인
  console.log('=== Nginx roi site root ===');
  const nginxRoot = await sshRun('grep -r "roi.geniego.com\\|root" /usr/local/nginx/conf/ 2>/dev/null | grep -v "#" | grep root | head -20');
  console.log(nginxRoot || 'Not found');
  
  // 2. Nginx vhost 파일들
  console.log('\n=== Nginx vhost files ===');
  const vhostFiles = await sshRun('ls /usr/local/nginx/conf/ 2>/dev/null | head -10');
  console.log(vhostFiles);
  
  // 3. 실제 서빙되는 경로의 index.html 확인
  console.log('\n=== roi.geniego.com nginx site config ===');
  const siteConf = await sshRun('cat /usr/local/nginx/conf/vhost/roi.geniego.com.conf 2>/dev/null | grep -E "root|index" | head -10 || echo "not found"');
  console.log(siteConf);
  
  // 4. 만약 /frontend/dist 가 서빙된다면 그곳에도 업로드
  const correctRoot = await sshRun('grep -r "root" /usr/local/nginx/conf/vhost/ 2>/dev/null | grep roi | head -5 || echo "no vhost"');
  console.log('\n=== Correct nginx root (roi) ===');
  console.log(correctRoot);
})();
