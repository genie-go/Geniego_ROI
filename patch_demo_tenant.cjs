/**
 * patch_demo_tenant2.cjs — 데모 서버 핸들러 tenant_id 패턴 분석
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
  const conn = await connectSSH();
  console.log('SSH connected!');

  // 1. 핸들러에서 tenant 추출 패턴
  const handlers = [
    'KrChannel.php', 'GraphScore.php', 'AdPerformance.php',
    'Attribution.php', 'ChannelSync.php', 'Connectors.php',
    'Keys.php', 'EventNorm.php', 'Decisioning.php',
  ];
  
  for (const h of handlers) {
    const path = `${DEMO_BACKEND}/src/Handlers/${h}`;
    const result = await execSSH(conn, `grep -n "tenant\\|\\$this->userId\\|\\$user\\[" ${path} 2>/dev/null | head -10`);
    console.log(`\n=== ${h} ===`);
    console.log(result || '(일치 없음)');
  }

  // 2. routes.php에서 핸들러 호출 방식 (V382, V386 등)
  const v382 = await execSSH(conn, `grep -n "V382\\|V386\\|tenant\\|Rollup\\|Dashboard" ${DEMO_BACKEND}/src/routes.php | head -30`);
  console.log('\n=== routes.php 핸들러 매핑 ===');
  console.log(v382);

  // 3. 가장 중요: routes.php에서 tenant를 $user로부터 추출하는 부분
  const routesLines = await execSSH(conn, `sed -n '580,700p' ${DEMO_BACKEND}/src/routes.php`);
  console.log('\n=== routes.php L580-700 (미들웨어 영역) ===');
  console.log(routesLines.substring(0, 3000));

  // 4. V382 핸들러 (정산/커머스 통합 핸들러)
  const v382Handler = await execSSH(conn, `grep -n "tenant\\|\\$user" ${DEMO_BACKEND}/src/Handlers/V382.php 2>/dev/null | head -20`);
  console.log('\n=== V382.php tenant 패턴 ===');
  console.log(v382Handler || '(없음)');

  // 5. Rollup 핸들러 확인
  const rollupFiles = await execSSH(conn, `ls ${DEMO_BACKEND}/src/Handlers/ | grep -i rollup`);
  console.log('\n=== Rollup 핸들러 ===');
  console.log(rollupFiles || '(없음)');

  const allHandlers = await execSSH(conn, `ls ${DEMO_BACKEND}/src/Handlers/`);
  console.log('\n=== 전체 핸들러 파일 ===');
  console.log(allHandlers);

  conn.end();
}

main().catch(err => {
  console.error('❌:', err.message);
  process.exit(1);
});
