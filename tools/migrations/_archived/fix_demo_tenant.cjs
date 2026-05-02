/**
 * fix_demo_tenant.cjs — 데모 서버 ONLY!
 * 
 * 데모 서버(roidemo.geniego.com)의 백엔드에서
 * 모든 유저의 tenant_id를 'demo'로 강제 매핑
 * 
 * ⚠️ 운영서버(roi.genie-go.com)는 절대 건드리지 않음!
 * ⚠️ 데모 서버 경로: /home/wwwroot/roidemo.geniego.com/backend/
 */
const { Client } = require('ssh2');

const DEMO_BACKEND = '/home/wwwroot/roidemo.geniego.com/backend';

function connectSSH() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    conn.connect({ host: '1.201.177.46', port: 22, username: 'root', password: 'vot@Wlroi6!' });
  });
}

function execSSH(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => out += d.toString());
      stream.stderr.on('data', d => out += d.toString());
      stream.on('close', () => resolve(out));
    });
  });
}

async function main() {
  console.log('🔍 데모 서버 백엔드 구조 확인...');
  console.log(`대상: ${DEMO_BACKEND} (데모 서버만!)`);
  console.log('');

  const conn = await connectSSH();
  console.log('SSH connected!');

  // 1. 데모 서버 백엔드 경로 확인
  const lsResult = await execSSH(conn, `ls -la ${DEMO_BACKEND}/src/`);
  console.log('=== 데모 서버 src/ 구조 ===');
  console.log(lsResult);

  // 2. Auth 관련 파일 확인
  const authFiles = await execSSH(conn, `find ${DEMO_BACKEND}/src -name "*.php" | xargs grep -l "requireAuth\\|tenant_id" 2>/dev/null | head -20`);
  console.log('=== tenant_id 관련 PHP 파일 ===');
  console.log(authFiles);

  // 3. Helpers/Auth 확인
  const helpersExist = await execSSH(conn, `ls -la ${DEMO_BACKEND}/src/Helpers/ 2>/dev/null || echo "No Helpers dir"`);
  console.log('=== Helpers 디렉토리 ===');
  console.log(helpersExist);

  // 4. Auth.php 내용 확인
  const authContent = await execSSH(conn, `cat ${DEMO_BACKEND}/src/Auth.php 2>/dev/null || echo "No Auth.php"`);
  console.log('=== Auth.php 내용 ===');
  console.log(authContent);

  // 5. routes.php에서 requireAuth 사용 패턴 확인 (첫 20개)
  const routeAuth = await execSSH(conn, `grep -n "requireAuth\\|tenant_id\\|\\$user\\[.id.\\]" ${DEMO_BACKEND}/src/routes.php 2>/dev/null | head -30`);
  console.log('=== routes.php tenant_id 패턴 ===');
  console.log(routeAuth);

  // 6. .env 파일 확인 (DB 이름 확인)
  const envContent = await execSSH(conn, `cat ${DEMO_BACKEND}/.env 2>/dev/null | grep -i "db\\|demo\\|database" | head -10`);
  console.log('=== .env DB 설정 ===');
  console.log(envContent);

  conn.end();
  console.log('\n✅ 조사 완료');
}

main().catch(err => {
  console.error('❌ 에러:', err.message);
  process.exit(1);
});
