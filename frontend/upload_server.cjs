// upload_server.cjs — SFTP 서버 배포 스크립트
// 서버: roi.genie-go.com | IP: 1.201.177.46
// 경로: /home/wwwroot/roi.geniego.com
const path = require('path');
const { execSync } = require('child_process');
let Client;
try { Client = require('ssh2-sftp-client'); } catch {
  console.log('ssh2-sftp-client 없음. 설치 중...');
  execSync('npm install ssh2-sftp-client', { stdio: 'inherit', cwd: __dirname });
  Client = require('ssh2-sftp-client');
}

const sftp = new Client();

const config = {
  host: '1.201.177.46',
  port: 22,
  username: 'root',
  password: 'vot@Wlroi6!',
  readyTimeout: 15000,
};

const LOCAL_DIST = path.join(__dirname, 'dist');
const REMOTE_DIR = '/home/wwwroot/roi.geniego.com/frontend/dist';

(async () => {
  console.log(`\n📦 SFTP 업로드 시작: ${LOCAL_DIST} → ${REMOTE_DIR}`);
  try {
    await sftp.connect(config);
    console.log('✅ SSH 연결 성공');
    await sftp.uploadDir(LOCAL_DIST, REMOTE_DIR);
    console.log('\n🚀 서버 업로드 완료!');
    await sftp.end();
    console.log('✅ SFTP 연결 종료');
  } catch (err) {
    console.error('❌ 업로드 실패:', err.message);
    process.exit(1);
  }
})();
