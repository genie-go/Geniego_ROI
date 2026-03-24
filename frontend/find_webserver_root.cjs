// find_webserver_root.cjs - 실제 웹서버 설정 및 루트 경로 확인
const { execSync } = require('child_process');
let ssh2;
try { ssh2 = require('ssh2'); } catch {
  execSync('npm install ssh2', { stdio: 'inherit', cwd: __dirname });
  ssh2 = require('ssh2');
}

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
    }).connect({
      host: '1.201.177.46',
      port: 22,
      username: 'root',
      password: 'vot@Wlroi6!',
      readyTimeout: 15000,
    });
  });
}

(async () => {
  // 1. 포트 80에서 실행 중인 프로세스
  const port80 = await sshRun('ss -tlnp | grep :80 || netstat -tlnp 2>/dev/null | grep :80 || echo "no port 80 info"');
  console.log('Port 80 process:', port80);
  
  // 2. Apache 설정
  const apacheConf = await sshRun('find /etc/apache2 /etc/httpd -name "*.conf" 2>/dev/null | head -5 | xargs grep -l DocumentRoot 2>/dev/null || echo "no apache"');
  console.log('\nApache configs with DocumentRoot:', apacheConf);
  
  // 3. wwwroot 접근 가능 여부
  const wwwroot = await sshRun('ls /home/wwwroot/ 2>/dev/null | head -10 || echo "no /home/wwwroot"');
  console.log('\n/home/wwwroot contents:', wwwroot);
  
  // 4. 실제 웹 루트
  const webRoot = await sshRun('find /var/www /home/wwwroot -name "index.html" 2>/dev/null | head -5 || echo "not found"');
  console.log('\nindex.html locations:', webRoot);
  
  // 5. 실제 서빙 중인 i18n 파일들
  const i18nFiles = await sshRun('find /var/www /home/wwwroot -name "i18n*.js" 2>/dev/null | head -10 || echo "not found"');
  console.log('\ni18n js files:', i18nFiles);
  
  // 6. 프로세스 내에서 웹서버 확인
  const processes = await sshRun('ps aux | grep -E "apache|nginx|node|caddy" | grep -v grep | head -10');
  console.log('\nWeb server processes:', processes);
})();
